import { prisma } from '../prisma'
import { distributeGoalAportes, computeNeededAporte } from './goal-allocator'
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

function isIncomeTransaction(t: TransactionWithCategory): boolean {
  return t.type === 'INCOME' || t.situacao === 'RECEBER'
}

export function calcBudgetLayers(
  baseIncome: number,
  txs: TransactionWithCategory[],
  goals: GoalWithAllocation[],
  isCurrentMonth: boolean,
): BudgetLayers {
  const active = txs.filter((t) => t.status !== 'CANCELLED')

  // Income transactions boost income for this month only — never counted as expense
  const incomeTxs = active.filter(isIncomeTransaction)
  const extraIncome = sum(incomeTxs)
  const income = baseIncome + extraIncome

  // Only expense transactions flow into budget buckets
  const expenses = active.filter((t) => !isIncomeTransaction(t))

  // Each expense is counted in exactly ONE bucket (priority order)
  const fixed = expenses.filter(
    (t) =>
      t.type === 'FIXED' ||
      t.category.categoryType === 'FIXED',
  )
  const fixedIds = new Set(fixed.map((t) => t.id))

  const health = expenses.filter(
    (t) => !fixedIds.has(t.id) && t.category.categoryType === 'HEALTH',
  )
  const healthIds = new Set(health.map((t) => t.id))

  const installmentsOnly = expenses.filter(
    (t) =>
      !fixedIds.has(t.id) &&
      !healthIds.has(t.id) &&
      t.type === 'INSTALLMENT',
  )
  const installIds = new Set(installmentsOnly.map((t) => t.id))

  const essentialOnly = expenses.filter(
    (t) =>
      !fixedIds.has(t.id) &&
      !healthIds.has(t.id) &&
      !installIds.has(t.id) &&
      t.utilityTag === 'ESSENTIAL',
  )

  const nonEssential = expenses.filter(
    (t) =>
      !fixedIds.has(t.id) &&
      !healthIds.has(t.id) &&
      !installIds.has(t.id) &&
      t.utilityTag === 'NON_ESSENTIAL',
  )

  const fixedExpenses     = sum(fixed)
  const healthExpenses    = sum(health)
  const installments      = sum(installmentsOnly)
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
    extraIncome,
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
  const month0 = currentMonth()
  const depositsThisMonth = await prisma.goalDeposit.findMany({ where: { userId, month: month0 } })
  const depositsByGoal = new Map(depositsThisMonth.map((d) => [d.goalId, d.amount]))

  const goals: GoalWithAllocation[] = rawGoals.map((g) => ({
    ...g,
    goalMode: g.goalMode,
    targetAmount: g.targetAmount,
    targetDate: g.targetDate ? new Date(g.targetDate) : null,
    fixedMonthlyAporte: g.fixedMonthlyAporte,
    depositedThisMonth: depositsByGoal.get(g.id) ?? 0,
  }))

  // Persist computed monthlyAporte back to DB so frontend can display without recalculating
  for (const goal of goals) {
    const needed = computeNeededAporte(goal)
    await prisma.goal.update({ where: { id: goal.id }, data: { monthlyAporte: +needed.toFixed(2) } })
  }

  const limits = await prisma.categoryLimit.findMany({
    where: { userId },
    include: { category: true },
  })

  for (const month of months) {
    const range = monthToDateRange(month)
    const [y, mo] = month.split('-').map(Number)

    const transactions = await prisma.transaction.findMany({
      where: { userId, dueDate: range },
      include: { category: true },
    }) as TransactionWithCategory[]

    // RecurringTemplate previews not yet confirmed as real transactions
    const activeTemplates = await prisma.recurringTemplate.findMany({
      where: {
        userId,
        isActive: true,
        startMonth: { lte: month },
        OR: [{ endMonth: null }, { endMonth: { gte: month } }],
      },
      include: { category: true },
    })
    const existingTemplateIds = new Set(transactions.map((t) => t.recurringTemplateId).filter(Boolean))
    const previews: TransactionWithCategory[] = activeTemplates
      .filter((tpl) => !existingTemplateIds.has(tpl.id))
      .map((tpl) => ({
        id: `preview-${tpl.id}`,
        amount: tpl.amount,
        type: tpl.type,
        utilityTag: tpl.utilityTag,
        categoryId: tpl.categoryId,
        status: 'PENDING',
        situacao: null,
        recurringTemplateId: tpl.id,
        category: tpl.category,
      }))

    const allTransactions = [...transactions, ...previews]

    const layers = calcBudgetLayers(
      user.monthlyIncome,
      allTransactions,
      goals,
      month === currentMonth(),
    )

    const alerts = generateAlerts({
      layers,
      transactions: allTransactions,
      goals,
      limits,
    })

    const suggestions = generateSuggestions({ goals, layers, months: months.length })

    // Leisure availability formula — only real paid transactions count as spent
    const leisureSpent = transactions
      .filter((t) => t.status !== 'CANCELLED' && t.type !== 'INCOME' && t.category.categoryType === 'LEISURE')
      .reduce((s, t) => s + t.amount, 0)
    const totalGoals = goals.length
    const goalGap = goals.reduce((s, g) => s + Math.max(0, g.monthlyAporte - (g.allocatedAporte ?? 0)), 0)
    const riskCount = goals.filter((g) => g.onTrackWarning).length
    const riskRatio = totalGoals > 0 ? riskCount / totalGoals : 0
    const goalPressure = Math.min(1, Math.max(0, 0.70 * (goalGap / Math.max(1, layers.income)) + 0.30 * riskRatio))
    const leisureFactor = Math.max(0.15, 1 - 2.5 * goalPressure)
    const leisureAvailable = Math.max(0, layers.freeBudget * leisureFactor - leisureSpent)
    const leisureDetails = JSON.stringify({ leisureSpent, goalGap, goalPressure, leisureFactor, riskCount, totalGoals, freeBudget: layers.freeBudget })

    await prisma.recommendation.upsert({
      where: { userId_referenceMonth: { userId, referenceMonth: month } },
      create: {
        userId,
        referenceMonth: month,
        totalIncome: layers.income,
        essentialBudget: layers.fixedExpenses + layers.healthExpenses + layers.essentialExpenses,
        installments: layers.installments,
        investmentBudget: layers.goalAporte,
        freeBudget: layers.freeBudget,
        alerts: JSON.stringify(alerts),
        suggestions: JSON.stringify(suggestions),
        leisureAvailable,
        leisureDetails,
      },
      update: {
        totalIncome: layers.income,
        essentialBudget: layers.fixedExpenses + layers.healthExpenses + layers.essentialExpenses,
        installments: layers.installments,
        investmentBudget: layers.goalAporte,
        freeBudget: layers.freeBudget,
        alerts: JSON.stringify(alerts),
        suggestions: JSON.stringify(suggestions),
        leisureAvailable,
        leisureDetails,
        calculatedAt: new Date(),
      },
    })
    // totalSpent uses only real DB transactions (previews are not confirmed yet)
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
