import { differenceInMonths, addMonths, format } from 'date-fns'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { computeNeededAporte } from '../brain/goal-allocator'
import { GoalWithAllocation } from '../brain/types'
import { CreateGoalInput, UpdateGoalInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function buildDepositHistory(goalId: string, months: number) {
  const now = new Date()
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(now, -i)
    const month = format(d, 'yyyy-MM')
    const deposit = await prisma.goalDeposit.findFirst({ where: { goalId, month } })
    result.push({ month, deposited: deposit?.amount ?? 0, expected: 0 })
  }
  return result
}

async function enrichGoal(goal: {
  id: string
  userId: string
  name: string
  goalMode: string
  targetAmount: number | null
  savedAmount: number
  targetDate: Date | null
  fixedMonthlyAporte: number | null
  priority: string
  status: string
  monthlyAporte: number
  createdAt: Date
  updatedAt: Date
}) {
  const now = new Date()
  const month = currentMonth()

  const depositsThisMonth = await prisma.goalDeposit.findMany({ where: { goalId: goal.id, month } })
  const depositedThisMonth = depositsThisMonth.reduce((s, d) => s + d.amount, 0)

  const depositHistory = await buildDepositHistory(goal.id, 6)

  const goalForCalc: GoalWithAllocation = {
    id: goal.id,
    name: goal.name,
    goalMode: goal.goalMode,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    targetDate: goal.targetDate,
    fixedMonthlyAporte: goal.fixedMonthlyAporte,
    priority: goal.priority,
    status: goal.status,
    monthlyAporte: goal.monthlyAporte,
    depositedThisMonth,
  }
  const needed = computeNeededAporte(goalForCalc)
  const remainingThisMonth = Math.max(0, needed - depositedThisMonth)

  let progressPercent: number | null = null
  let monthsRemaining: number | null = null
  let estimatedDeadline: string | null = null
  let projectedTotal: number | null = null

  if (goal.targetAmount != null) {
    progressPercent = +(goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0).toFixed(1)
  }
  if (goal.targetDate != null) {
    monthsRemaining = Math.max(0, differenceInMonths(goal.targetDate, now))
  }
  if (goal.goalMode === 'FIXED_APORTE_TARGET' && goal.fixedMonthlyAporte && goal.targetAmount) {
    const remaining = goal.targetAmount - goal.savedAmount
    const months = remaining > 0 ? Math.ceil(remaining / goal.fixedMonthlyAporte) : 0
    estimatedDeadline = format(addMonths(now, months), 'yyyy-MM')
  }
  if (goal.goalMode === 'FIXED_APORTE_DEADLINE' && goal.fixedMonthlyAporte && goal.targetDate) {
    const months = Math.max(0, differenceInMonths(goal.targetDate, now))
    projectedTotal = +(goal.savedAmount + goal.fixedMonthlyAporte * months).toFixed(2)
  }

  const onTrack = remainingThisMonth <= 0 || depositedThisMonth >= needed * 0.8

  // Fill expected in history using current monthlyAporte as proxy
  const history = depositHistory.map((h) => ({ ...h, expected: +(needed).toFixed(2) }))

  return {
    ...goal,
    targetDate: goal.targetDate?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    progressPercent,
    monthsRemaining,
    depositedThisMonth,
    remainingThisMonth: +remainingThisMonth.toFixed(2),
    estimatedDeadline,
    projectedTotal,
    onTrack,
    depositHistory: history,
  }
}

export async function listGoals(status?: string) {
  const userId = await getUserId()
  const where = status ? { userId, status } : { userId }
  const goals = await prisma.goal.findMany({ where, orderBy: { createdAt: 'desc' } })
  return Promise.all(goals.map(enrichGoal))
}

export async function createGoal(data: CreateGoalInput) {
  const userId = await getUserId()

  let monthlyAporte = 0
  if (data.goalMode === 'DEADLINE_TARGET') {
    const months = Math.max(1, differenceInMonths(new Date(data.targetDate), new Date()))
    monthlyAporte = +((data.targetAmount - (data.savedAmount ?? 0)) / months).toFixed(2)
  } else if ('fixedMonthlyAporte' in data) {
    monthlyAporte = data.fixedMonthlyAporte ?? 0
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: data.name,
      goalMode: data.goalMode,
      targetAmount: 'targetAmount' in data ? data.targetAmount : null,
      savedAmount: data.savedAmount ?? 0,
      targetDate: 'targetDate' in data && data.targetDate ? new Date(data.targetDate) : null,
      fixedMonthlyAporte: 'fixedMonthlyAporte' in data ? data.fixedMonthlyAporte : null,
      priority: data.priority ?? 'MEDIUM',
      monthlyAporte,
    },
  })

  recalculate(userId).catch(console.error)
  return enrichGoal(goal)
}

export async function updateGoal(id: string, data: UpdateGoalInput) {
  const userId = await getUserId()
  const existing = await prisma.goal.findFirstOrThrow({ where: { id } })

  const goalMode = data.goalMode ?? existing.goalMode
  const targetAmount = data.targetAmount !== undefined ? data.targetAmount : existing.targetAmount
  const savedAmount = data.savedAmount ?? existing.savedAmount
  const targetDate = data.targetDate !== undefined
    ? (data.targetDate ? new Date(data.targetDate) : null)
    : existing.targetDate
  const fixedMonthlyAporte = data.fixedMonthlyAporte !== undefined ? data.fixedMonthlyAporte : existing.fixedMonthlyAporte

  let monthlyAporte = existing.monthlyAporte
  if (goalMode === 'DEADLINE_TARGET' && targetAmount && targetDate) {
    const months = Math.max(1, differenceInMonths(targetDate, new Date()))
    monthlyAporte = +((targetAmount - savedAmount) / months).toFixed(2)
  } else if (fixedMonthlyAporte != null) {
    monthlyAporte = fixedMonthlyAporte
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      name: data.name,
      goalMode,
      targetAmount,
      savedAmount,
      targetDate,
      fixedMonthlyAporte,
      priority: data.priority,
      status: data.status,
      monthlyAporte,
    },
  })

  recalculate(userId).catch(console.error)
  return enrichGoal(goal)
}

export async function deleteGoal(id: string) {
  const userId = await getUserId()
  await prisma.goal.findFirstOrThrow({ where: { id } })
  await prisma.goal.delete({ where: { id } })
  recalculate(userId).catch(console.error)
}

export async function depositGoal(id: string, amount: number, month?: string, note?: string) {
  const userId = await getUserId()
  const targetMonth = month ?? currentMonth()

  const existing = await prisma.goalDeposit.findFirst({ where: { goalId: id, month: targetMonth } })

  if (existing) {
    await prisma.goalDeposit.update({
      where: { id: existing.id },
      data: { amount: existing.amount + amount, note: note ?? existing.note },
    })
  } else {
    await prisma.goalDeposit.create({
      data: { goalId: id, userId, month: targetMonth, amount, note: note ?? null },
    })
  }

  // savedAmount always derived from SUM of all deposits
  const agg = await prisma.goalDeposit.aggregate({ _sum: { amount: true }, where: { goalId: id } })
  const newSaved = agg._sum.amount ?? 0

  const goal = await prisma.goal.findFirstOrThrow({ where: { id } })
  const isCompleted = goal.targetAmount != null && newSaved >= goal.targetAmount

  const updated = await prisma.goal.update({
    where: { id },
    data: { savedAmount: newSaved, status: isCompleted ? 'COMPLETED' : undefined },
  })

  recalculate(userId).catch(console.error)
  return enrichGoal(updated)
}

export async function getGoalDeposits(id: string) {
  const deposits = await prisma.goalDeposit.findMany({
    where: { goalId: id },
    orderBy: { month: 'desc' },
  })
  return deposits
}

export async function pauseGoal(id: string) {
  const userId = await getUserId()
  const goal = await prisma.goal.update({ where: { id }, data: { status: 'PAUSED' } })
  recalculate(userId).catch(console.error)
  return enrichGoal(goal)
}

export async function resumeGoal(id: string) {
  const userId = await getUserId()
  const goal = await prisma.goal.update({ where: { id }, data: { status: 'ACTIVE' } })
  recalculate(userId).catch(console.error)
  return enrichGoal(goal)
}
