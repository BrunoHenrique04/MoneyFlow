import { prisma } from '../prisma'
import { distributeGoalAportes } from './goal-allocator'
import { generateAlerts } from './alert-generator'
import { generateSuggestions } from './suggestion-engine'
import { GoalWithAllocation, TransactionWithCategory, BudgetLayers } from './types'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthToDateRange(month: string) {
  const [year, m] = month.split('-').map(Number)
  return { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) }
}

function sum(txs: TransactionWithCategory[]) {
  return txs.reduce((s, t) => s + t.amount, 0)
}

export function calcBudgetLayers(
  income: number,
  txs: TransactionWithCategory[],
  goals: GoalWithAllocation[],
  isCurrentMonth: boolean,
): BudgetLayers {
  const active = txs.filter((t) => t.status !== 'CANCELLED')

  // Each transaction is counted in exactly ONE bucket (priority order)
  const fixed = active.filter(
    (t) =>
      t.type === 'RECURRING' ||
      t.category.categoryType === 'FIXED',
  )
  const fixedIds = new Set(fixed.map((t) => t.id))

  const health = active.filter(
    (t) => !fixedIds.has(t.id) && t.category.categoryType === 'HEALTH',
  )
  const healthIds = new Set(health.map((t) => t.id))

  const installmentsOnly = active.filter(
    (t) =>
      !fixedIds.has(t.id) &&
      !healthIds.has(t.id) &&
      t.type === 'INSTALLMENT',
  )
  const installIds = new Set(installmentsOnly.map((t) => t.id))

  const essentialOnly = active.filter(
    (t) =>
      !fixedIds.has(t.id) &&
      !healthIds.has(t.id) &&
      !installIds.has(t.id) &&
      t.utilityTag === 'ESSENTIAL',
  )

  const nonEssential = active.filter(
    (t) =>
      !fixedIds.has(t.id) &&
      !healthIds.has(t.id) &&
      !installIds.has(t.id) &&
      t.utilityTag === 'NON_ESSENTIAL',
  )

  const fixedExpenses    = sum(fixed)
  const healthExpenses   = sum(health)
  const installments     = sum(installmentsOnly)
  const essentialExpenses = sum(essentialOnly)
  const nonEssentialTotal = sum(nonEssential)

  const totalCommitted = fixedExpenses + healthExpenses + installments + essentialExpenses

  const availableForGoals = Math.max(0, income - totalCommitted)
  const goalAporte = isCurrentMonth
    ? distributeGoalAportes(goals, availableForGoals)
    : 0

  const freeBudget = income - totalCommitted - goalAporte
  const commitRatio = income > 0 ? (totalCommitted / income) * 100 : 0

  return {
    income,
    fixedExpenses,
    healthExpenses,
    essentialExpenses,
    installments,
    nonEssential: nonEssentialTotal,
    goalAporte,
    freeBudget,
    totalCommitted,
    commitRatio,
  }
}

export async function recalculate(userId: string, months: string[] = [currentMonth()]) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const rawGoals = await prisma.goal.findMany({ where: { userId, status: 'ACTIVE' } })
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
      where: { userId, dueDate: range },
      include: { category: true },
    }) as TransactionWithCategory[]

    const layers = calcBudgetLayers(
      user.monthlyIncome,
      transactions,
      goals,
      month === currentMonth(),
    )

    const alerts = generateAlerts({
      layers,
      transactions,
      goals,
      limits,
    })

    const suggestions = generateSuggestions({ goals, layers, months: months.length })

    await prisma.recommendation.upsert({
      where: { userId_referenceMonth: { userId, referenceMonth: month } },
      create: {
        userId,
        referenceMonth: month,
        essentialBudget: layers.fixedExpenses + layers.healthExpenses + layers.essentialExpenses,
        investmentBudget: layers.goalAporte,
        freeBudget: layers.freeBudget,
        alerts: JSON.stringify(alerts),
        suggestions: JSON.stringify(suggestions),
      },
      update: {
        essentialBudget: layers.fixedExpenses + layers.healthExpenses + layers.essentialExpenses,
        investmentBudget: layers.goalAporte,
        freeBudget: layers.freeBudget,
        alerts: JSON.stringify(alerts),
        suggestions: JSON.stringify(suggestions),
        calculatedAt: new Date(),
      },
    })

    const totalSpent = transactions
      .filter((t) => t.status !== 'CANCELLED')
      .reduce((s, t) => s + t.amount, 0)

    await prisma.budgetSnapshot.upsert({
      where: { userId_month: { userId, month } },
      create: {
        userId,
        month,
        totalIncome: layers.income,
        totalEssential: layers.fixedExpenses + layers.healthExpenses + layers.essentialExpenses,
        totalInstallments: layers.installments,
        totalGoalAporte: layers.goalAporte,
        totalFree: layers.freeBudget,
        totalSpent,
      },
      update: {
        totalIncome: layers.income,
        totalEssential: layers.fixedExpenses + layers.healthExpenses + layers.essentialExpenses,
        totalInstallments: layers.installments,
        totalGoalAporte: layers.goalAporte,
        totalFree: layers.freeBudget,
        totalSpent,
      },
    })
  }
}
