import { prisma } from '../prisma'
import { distributeGoalAportes } from './goal-allocator'
import { generateAlerts } from './alert-generator'
import { generateSuggestions } from './suggestion-engine'
import { GoalWithAllocation } from './types'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthToDateRange(month: string): { gte: Date; lt: Date } {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 1)
  return { gte: start, lt: end }
}

export async function recalculate(userId: string, months: string[] = [currentMonth()]) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const rawGoals = await prisma.goal.findMany({
    where: { userId, status: 'ACTIVE' },
  })

  const goals: GoalWithAllocation[] = rawGoals.map((g) => ({
    ...g,
    targetDate: new Date(g.targetDate),
  }))

  const limits = await prisma.categoryLimit.findMany({
    where: { userId },
    include: { category: true },
  })

  for (const month of months) {
    const range = monthToDateRange(month)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        dueDate: range,
        status: { not: 'CANCELLED' },
      },
    })

    const essential = transactions
      .filter((t) => t.utilityTag === 'ESSENTIAL')
      .reduce((s, t) => s + t.amount, 0)

    const installments = transactions
      .filter((t) => t.type === 'INSTALLMENT' || t.type === 'RECURRING')
      .reduce((s, t) => s + t.amount, 0)

    const available = user.monthlyIncome - essential - installments
    const isCurrentMonth = month === currentMonth()

    const goalAporte = isCurrentMonth
      ? distributeGoalAportes(goals, Math.max(0, available))
      : 0

    const freeBudget = user.monthlyIncome - essential - installments - goalAporte

    const alerts = generateAlerts({
      userId,
      freeBudget,
      monthlyIncome: user.monthlyIncome,
      transactions,
      goals,
      limits,
    })

    const suggestions = generateSuggestions(goals, freeBudget)

    await prisma.recommendation.upsert({
      where: { userId_referenceMonth: { userId, referenceMonth: month } },
      create: {
        userId,
        referenceMonth: month,
        essentialBudget: essential,
        investmentBudget: goalAporte,
        freeBudget,
        alerts: JSON.stringify(alerts),
        suggestions: JSON.stringify(suggestions),
      },
      update: {
        essentialBudget: essential,
        investmentBudget: goalAporte,
        freeBudget,
        alerts: JSON.stringify(alerts),
        suggestions: JSON.stringify(suggestions),
        calculatedAt: new Date(),
      },
    })

    const totalSpent = transactions.reduce((s, t) => s + t.amount, 0)

    await prisma.budgetSnapshot.upsert({
      where: { userId_month: { userId, month } },
      create: {
        userId,
        month,
        totalIncome: user.monthlyIncome,
        totalEssential: essential,
        totalInstallments: installments,
        totalGoalAporte: goalAporte,
        totalFree: freeBudget,
        totalSpent,
      },
      update: {
        totalIncome: user.monthlyIncome,
        totalEssential: essential,
        totalInstallments: installments,
        totalGoalAporte: goalAporte,
        totalFree: freeBudget,
        totalSpent,
      },
    })
  }
}
