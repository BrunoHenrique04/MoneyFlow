import { differenceInMonths } from 'date-fns'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { CreateGoalInput, UpdateGoalInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function enrichGoal(goal: {
  targetAmount: number
  savedAmount: number
  targetDate: Date
  monthlyAporte: number
  [key: string]: unknown
}) {
  const progressPercent = goal.targetAmount > 0
    ? +((goal.savedAmount / goal.targetAmount) * 100).toFixed(1)
    : 0
  const monthsRemaining = Math.max(0, differenceInMonths(goal.targetDate, new Date()))
  return { ...goal, progressPercent, monthsRemaining }
}

export async function listGoals(status?: string) {
  const userId = await getUserId()
  const where = status ? { userId, status } : { userId }
  const goals = await prisma.goal.findMany({ where, orderBy: { createdAt: 'desc' } })
  return goals.map(enrichGoal)
}

export async function createGoal(data: CreateGoalInput) {
  const userId = await getUserId()
  const targetDate = new Date(data.targetDate)
  const monthsRemaining = Math.max(1, differenceInMonths(targetDate, new Date()))
  const monthlyAporte = +((data.targetAmount - (data.savedAmount ?? 0)) / monthsRemaining).toFixed(2)

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      savedAmount: data.savedAmount ?? 0,
      targetDate,
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

  const targetAmount = data.targetAmount ?? existing.targetAmount
  const savedAmount = data.savedAmount ?? existing.savedAmount
  const targetDate = data.targetDate ? new Date(data.targetDate) : existing.targetDate
  const monthsRemaining = Math.max(1, differenceInMonths(targetDate, new Date()))
  const monthlyAporte = +((targetAmount - savedAmount) / monthsRemaining).toFixed(2)

  const goal = await prisma.goal.update({
    where: { id },
    data: { ...data, targetDate, monthlyAporte },
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

export async function depositGoal(id: string, amount: number) {
  const userId = await getUserId()
  const goal = await prisma.goal.findFirstOrThrow({ where: { id } })
  const newSaved = goal.savedAmount + amount
  const isCompleted = newSaved >= goal.targetAmount

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      savedAmount: newSaved,
      status: isCompleted ? 'COMPLETED' : undefined,
    },
  })

  recalculate(userId).catch(console.error)
  return enrichGoal(updated)
}
