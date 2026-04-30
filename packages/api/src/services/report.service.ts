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

function isIncome(t: { type: string; situacao: string | null }) {
  return t.type === 'INCOME' || t.situacao === 'RECEBER'
}

export async function getMonthlyReport(month: string = currentMonth()) {
  const userId = await getUserId()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const range = monthToRange(month)

  const transactions = await prisma.transaction.findMany({
    where: { userId, dueDate: range, status: { not: 'CANCELLED' } },
    include: { account: true, category: true },
  })

  // Split income (INCOME type + RECEBER) from expenses
  const incomes = transactions.filter((t) => isIncome(t))
  const expenses = transactions.filter((t) => !isIncome(t))

  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0)

  const byCategoryMap = new Map<string, { categoryId: string; name: string; color: string; amount: number }>()
  const byAccountMap = new Map<string, { accountId: string; name: string; amount: number }>()

  for (const t of expenses) {
    const catKey = t.categoryId
    if (!byCategoryMap.has(catKey)) {
      byCategoryMap.set(catKey, { categoryId: catKey, name: t.category.name, color: t.category.color, amount: 0 })
    }
    byCategoryMap.get(catKey)!.amount += t.amount

    if (t.accountId && t.account) {
      const accKey = t.accountId
      if (!byAccountMap.has(accKey)) {
        byAccountMap.set(accKey, { accountId: accKey, name: t.account.name, amount: 0 })
      }
      byAccountMap.get(accKey)!.amount += t.amount
    }
  }

  const byCategory = [...byCategoryMap.values()].map((c) => ({
    ...c,
    percent: totalSpent > 0 ? +((c.amount / totalSpent) * 100).toFixed(1) : 0,
  }))

  return {
    month,
    totalIncome,
    totalSpent,
    byCategory,
    byAccount: [...byAccountMap.values()],
    byUtility: {
      essential: expenses.filter((t) => t.utilityTag === 'ESSENTIAL').reduce((s, t) => s + t.amount, 0),
      nonEssential: expenses.filter((t) => t.utilityTag === 'NON_ESSENTIAL').reduce((s, t) => s + t.amount, 0),
      investment: expenses.filter((t) => t.utilityTag === 'INVESTMENT').reduce((s, t) => s + t.amount, 0),
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      situacao: t.situacao,
      utilityTag: t.utilityTag,
      status: t.status,
      isIncome: isIncome(t),
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
  const goals: GoalWithAllocation[] = rawGoals.map((g) => ({
    ...g,
    targetDate: g.targetDate ? new Date(g.targetDate) : null,
    depositedThisMonth: 0,
  }))

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Pre-fetch active templates once for projecting future months
  const allTemplates = await prisma.recurringTemplate.findMany({
    where: { userId, isActive: true },
    include: { category: true },
  })

  const result = []

  for (let i = -pastMonths; i < futurMonths; i++) {
    const date = addMonths(now, i)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const [y, m] = month.split('-').map(Number)
    const range = monthToRange(month)
    const isCurrent = month === currentMonthStr
    const isFuture = month > currentMonthStr

    const dbTxs = await prisma.transaction.findMany({
      where: { userId, dueDate: range, status: { not: 'CANCELLED' } },
      include: { category: true },
    }) as TransactionWithCategory[]

    // Supplement with template previews for any month (current or future) where no DB tx exists yet
    let txs = dbTxs
    if (isFuture || isCurrent) {
      const coveredTemplateIds = new Set(dbTxs.map((t) => t.recurringTemplateId).filter(Boolean))
      const previews = allTemplates
        .filter((tpl) =>
          !coveredTemplateIds.has(tpl.id) &&
          tpl.startMonth <= month &&
          (!tpl.endMonth || tpl.endMonth >= month),
        )
        .map((tpl) => ({
          id: `preview-${tpl.id}-${month}`,
          userId,
          accountId: tpl.accountId,
          categoryId: tpl.categoryId,
          installmentGroupId: null,
          recurringTemplateId: tpl.id,
          description: tpl.description,
          amount: tpl.amount,
          totalAmount: null,
          pessoa: null,
          situacao: null,
          type: tpl.type,
          utilityTag: tpl.utilityTag,
          status: 'PENDING',
          dueDate: new Date(y, m - 1, Math.min(tpl.dayOfMonth, new Date(y, m, 0).getDate())),
          paidAt: null,
          installmentNumber: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: tpl.category,
        })) as unknown as TransactionWithCategory[]
      txs = [...dbTxs, ...previews]
    }

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
        type: { in: ['INSTALLMENT'] },
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
