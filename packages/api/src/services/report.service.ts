import { addMonths } from 'date-fns'
import { prisma } from '../prisma'
import { calcBudgetLayers } from '../brain/calculator'
import type { GoalWithAllocation, TransactionWithCategory } from '../brain/types'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

function monthToRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function getMonthlyReport(month: string = currentMonth()) {
  const userId = await getUserId()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const range = monthToRange(month)

  const transactions = await prisma.transaction.findMany({
    where: { userId, dueDate: range, status: { not: 'CANCELLED' } },
    include: { account: true, category: true },
  })

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0)

  const byCategoryMap = new Map<string, { categoryId: string; name: string; color: string; amount: number }>()
  const byAccountMap = new Map<string, { accountId: string; name: string; amount: number }>()

  for (const t of transactions) {
    const catKey = t.categoryId
    if (!byCategoryMap.has(catKey)) {
      byCategoryMap.set(catKey, { categoryId: catKey, name: t.category.name, color: t.category.color, amount: 0 })
    }
    byCategoryMap.get(catKey)!.amount += t.amount

    const accKey = t.accountId
    if (!byAccountMap.has(accKey)) {
      byAccountMap.set(accKey, { accountId: accKey, name: t.account.name, amount: 0 })
    }
    byAccountMap.get(accKey)!.amount += t.amount
  }

  const byCategory = [...byCategoryMap.values()].map((c) => ({
    ...c,
    percent: totalSpent > 0 ? +((c.amount / totalSpent) * 100).toFixed(1) : 0,
  }))

  return {
    month,
    totalIncome: user.monthlyIncome,
    totalSpent,
    byCategory,
    byAccount: [...byAccountMap.values()],
    byUtility: {
      essential: transactions.filter((t) => t.utilityTag === 'ESSENTIAL').reduce((s, t) => s + t.amount, 0),
      nonEssential: transactions.filter((t) => t.utilityTag === 'NON_ESSENTIAL').reduce((s, t) => s + t.amount, 0),
      investment: transactions.filter((t) => t.utilityTag === 'INVESTMENT').reduce((s, t) => s + t.amount, 0),
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      utilityTag: t.utilityTag,
      status: t.status,
      categoryName: t.category.name,
      categoryColor: t.category.color,
      categoryType: t.category.categoryType,
    })),
  }
}

export async function getBudgetTimeline(futurMonths = 9, pastMonths = 3) {
  const userId = await getUserId()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const rawGoals = await prisma.goal.findMany({ where: { userId, status: 'ACTIVE' } })
  const goals: GoalWithAllocation[] = rawGoals.map((g) => ({ ...g, targetDate: new Date(g.targetDate) }))

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const result = []

  for (let i = -pastMonths; i < futurMonths; i++) {
    const date = addMonths(now, i)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const range = monthToRange(month)
    const isCurrent = month === currentMonthStr
    const isFuture = month > currentMonthStr

    const txs = await prisma.transaction.findMany({
      where: { userId, dueDate: range },
      include: { category: true },
    }) as TransactionWithCategory[]

    const layers = calcBudgetLayers(user.monthlyIncome, txs, goals, isCurrent)
    result.push({ month, isFuture, isCurrent, ...layers })
  }

  return result
}

export async function getInstallmentTimeline(months = 6) {
  const userId = await getUserId()
  const result = []
  const now = new Date()

  for (let i = 0; i < months; i++) {
    const date = addMonths(now, i)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const range = monthToRange(month)

    const installments = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['INSTALLMENT', 'RECURRING'] },
        dueDate: range,
        status: { not: 'CANCELLED' },
      },
      include: { installmentGroup: true },
    })

    result.push({
      month,
      installments: installments.map((t) => ({
        description: t.description,
        amount: t.amount,
        installmentNumber: t.installmentNumber,
        of: t.installmentGroup?.totalInstallments ?? null,
      })),
      totalInstallments: installments.reduce((s, t) => s + t.amount, 0),
    })
  }

  return result
}
