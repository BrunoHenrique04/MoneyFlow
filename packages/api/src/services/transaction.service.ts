import { addMonths } from 'date-fns'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { CreateTransactionInput, UpdateTransactionInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

function toMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getAffectedMonths(dates: Date[]): string[] {
  return [...new Set(dates.map(toMonthStr))]
}

export async function listTransactions(filters: {
  month?: string
  accountId?: string
  categoryId?: string
  type?: string
  status?: string
  utilityTag?: string
}) {
  const userId = await getUserId()
  const where: Record<string, unknown> = { userId }

  if (filters.month) {
    const [y, m] = filters.month.split('-').map(Number)
    where.dueDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
  }
  if (filters.accountId) where.accountId = filters.accountId
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.type) where.type = filters.type
  if (filters.status) where.status = filters.status
  if (filters.utilityTag) where.utilityTag = filters.utilityTag

  const items = await prisma.transaction.findMany({
    where,
    include: { account: true, category: true },
    orderBy: { dueDate: 'asc' },
  })

  const essential = items.filter((t) => t.utilityTag === 'ESSENTIAL').reduce((s, t) => s + t.amount, 0)
  const nonEssential = items.filter((t) => t.utilityTag === 'NON_ESSENTIAL').reduce((s, t) => s + t.amount, 0)
  const investment = items.filter((t) => t.utilityTag === 'INVESTMENT').reduce((s, t) => s + t.amount, 0)

  return {
    items,
    total: items.length,
    summary: {
      totalAmount: items.reduce((s, t) => s + t.amount, 0),
      essential,
      nonEssential,
      investment,
    },
  }
}

export async function createTransaction(input: CreateTransactionInput) {
  const userId = await getUserId()

  if (input.type === 'INSTALLMENT') {
    const group = await prisma.installmentGroup.create({
      data: {
        userId,
        description: input.description,
        totalAmount: input.totalAmount,
        totalInstallments: input.totalInstallments,
        firstDueDate: new Date(input.firstDueDate),
      },
    })

    const baseAmount = Math.floor((input.totalAmount / input.totalInstallments) * 100) / 100
    const remainder = +(input.totalAmount - baseAmount * input.totalInstallments).toFixed(2)
    const dueDates: Date[] = []

    const installments = Array.from({ length: input.totalInstallments }, (_, i) => {
      const isLast = i === input.totalInstallments - 1
      const amount = isLast ? +(baseAmount + remainder).toFixed(2) : baseAmount
      const dueDate = addMonths(new Date(input.firstDueDate), i)
      dueDates.push(dueDate)

      return {
        userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        installmentGroupId: group.id,
        description: input.description,
        amount,
        type: 'INSTALLMENT' as const,
        utilityTag: input.utilityTag,
        status: 'PENDING' as const,
        dueDate,
        installmentNumber: i + 1,
        notes: input.notes ?? null,
      }
    })

    await prisma.transaction.createMany({ data: installments })
    recalculate(userId, getAffectedMonths(dueDates)).catch(console.error)

    return prisma.installmentGroup.findUniqueOrThrow({
      where: { id: group.id },
      include: { transactions: true },
    })
  }

  if (input.type === 'RECURRING') {
    const dueDates: Date[] = []
    const rows = Array.from({ length: input.recurrenceMonths }, (_, i) => {
      const dueDate = addMonths(new Date(input.firstDueDate), i)
      dueDates.push(dueDate)
      return {
        userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        type: 'RECURRING' as const,
        utilityTag: input.utilityTag,
        status: 'PENDING' as const,
        dueDate,
        notes: input.notes ?? null,
      }
    })

    await prisma.transaction.createMany({ data: rows })
    recalculate(userId, getAffectedMonths(dueDates)).catch(console.error)
    return { created: rows.length }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      type: input.type,
      utilityTag: input.utilityTag,
      status: 'PENDING',
      dueDate: new Date(input.dueDate),
      notes: input.notes ?? null,
    },
    include: { account: true, category: true },
  })

  recalculate(userId, [toMonthStr(new Date(input.dueDate))]).catch(console.error)
  return transaction
}

export async function updateTransaction(id: string, data: UpdateTransactionInput) {
  const userId = await getUserId()
  const existing = await prisma.transaction.findFirstOrThrow({ where: { id } })

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    },
    include: { account: true, category: true },
  })

  recalculate(userId, [toMonthStr(existing.dueDate)]).catch(console.error)
  return updated
}

export async function deleteTransaction(id: string, cancelFuture: boolean) {
  const userId = await getUserId()
  const tx = await prisma.transaction.findFirstOrThrow({ where: { id } })

  if (cancelFuture && tx.installmentGroupId && tx.installmentNumber != null) {
    await prisma.transaction.updateMany({
      where: {
        installmentGroupId: tx.installmentGroupId,
        installmentNumber: { gte: tx.installmentNumber },
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    })

    const future = await prisma.transaction.findMany({
      where: {
        installmentGroupId: tx.installmentGroupId,
        installmentNumber: { gte: tx.installmentNumber },
      },
    })

    recalculate(userId, getAffectedMonths(future.map((f) => f.dueDate))).catch(console.error)
  } else {
    await prisma.transaction.update({ where: { id }, data: { status: 'CANCELLED' } })
    recalculate(userId, [toMonthStr(tx.dueDate)]).catch(console.error)
  }
}

export async function payTransaction(id: string, paidAt?: string) {
  const tx = await prisma.transaction.findFirstOrThrow({ where: { id } })

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status: 'PAID', paidAt: paidAt ? new Date(paidAt) : new Date() },
  })

  await prisma.account.update({
    where: { id: tx.accountId },
    data: { balance: { decrement: tx.amount } },
  })

  return updated
}
