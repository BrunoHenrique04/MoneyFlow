import * as XLSX from 'xlsx'
import { addMonths, parse, isValid } from 'date-fns'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import type { CreateTransactionInput, UpdateTransactionInput } from '@moneyflow/shared'

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

function currentMonth(): string {
  const now = new Date()
  return toMonthStr(now)
}

export async function listTransactions(filters: {
  month?: string
  accountId?: string
  categoryId?: string
  type?: string
  status?: string
  utilityTag?: string
  pessoa?: string
  situacao?: string
  includeFuture?: string   // "true" to include projected months
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
  if (filters.pessoa) where.pessoa = { contains: filters.pessoa }
  if (filters.situacao) where.situacao = filters.situacao

  const items = await prisma.transaction.findMany({
    where,
    include: { account: true, category: true },
    orderBy: { dueDate: 'asc' },
  })

  const active = items.filter((t) => t.status !== 'CANCELLED')

  const essential    = active.filter((t) => t.utilityTag === 'ESSENTIAL').reduce((s, t) => s + t.amount, 0)
  const nonEssential = active.filter((t) => t.utilityTag === 'NON_ESSENTIAL').reduce((s, t) => s + t.amount, 0)
  const investment   = active.filter((t) => t.utilityTag === 'INVESTMENT').reduce((s, t) => s + t.amount, 0)
  const receivable   = active.filter((t) => t.situacao === 'RECEBER').reduce((s, t) => s + t.amount, 0)

  // Saldo por pessoa (quem deve ao usuário)
  const pessoaMap = new Map<string, number>()
  for (const t of active) {
    if (!t.pessoa) continue
    const prev = pessoaMap.get(t.pessoa) ?? 0
    if (t.situacao === 'RECEBER') {
      pessoaMap.set(t.pessoa, prev + t.amount)
    } else if (t.situacao === 'NAO_PAGO') {
      pessoaMap.set(t.pessoa, prev - t.amount)
    }
  }
  const porPessoa = [...pessoaMap.entries()].map(([pessoa, saldo]) => ({ pessoa, saldo }))

  return {
    items,
    total: items.length,
    summary: {
      totalAmount: active.reduce((s, t) => s + t.amount, 0),
      essential,
      nonEssential,
      investment,
      receivable,
      porPessoa,
    },
  }
}

// Projections: return scheduled transactions for a future month (installments, fixed, recurring)
// plus RecurringTemplate previews where no transaction has been generated yet
export async function getProjections(month: string) {
  const userId = await getUserId()
  const [y, m] = month.split('-').map(Number)
  const range = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }

  // Real transactions already in DB for this month
  const existing = await prisma.transaction.findMany({
    where: { userId, dueDate: range, status: { not: 'CANCELLED' } },
    include: { account: true, category: true },
    orderBy: { dueDate: 'asc' },
  })

  // RecurringTemplates that should cover this month but have no transaction yet
  const templates = await prisma.recurringTemplate.findMany({
    where: {
      userId,
      isActive: true,
      startMonth: { lte: month },
      OR: [{ endMonth: null }, { endMonth: { gte: month } }],
    },
    include: { account: true, category: true },
  })

  const existingTemplateIds = new Set(existing.map((t) => t.recurringTemplateId).filter(Boolean))
  const previews = templates
    .filter((tpl) => !existingTemplateIds.has(tpl.id))
    .map((tpl) => {
      const day = Math.min(tpl.dayOfMonth, new Date(y, m, 0).getDate())
      return {
        id: `preview-${tpl.id}`,
        userId: tpl.userId,
        accountId: tpl.accountId,
        categoryId: tpl.categoryId,
        installmentGroupId: null,
        recurringTemplateId: tpl.id,
        description: tpl.description,
        amount: tpl.amount,
        totalAmount: null,
        pessoa: null,
        situacao: null,
        type: 'FIXED',
        utilityTag: tpl.utilityTag,
        status: 'PENDING',
        dueDate: new Date(y, m - 1, day).toISOString(),
        paidAt: null,
        installmentNumber: null,
        notes: tpl.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        account: tpl.account,
        category: tpl.category,
        isFuture: true,
      }
    })

  return {
    items: [...existing.map(t => ({ ...t, isFuture: false })), ...previews],
    isPureProjection: existing.length === 0 && previews.length > 0,
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
        accountId: input.accountId ?? null,
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
        pessoa: input.pessoa ?? null,
        situacao: input.situacao ?? null,
        totalAmount: null,
      }
    })

    await prisma.transaction.createMany({ data: installments })
    recalculate(userId, getAffectedMonths(dueDates)).catch(console.error)

    return prisma.installmentGroup.findUniqueOrThrow({
      where: { id: group.id },
      include: { transactions: { include: { account: true, category: true } } },
    })
  }

  if (input.type === 'RECURRING') {
    const dueDates: Date[] = []
    const rows = Array.from({ length: input.recurrenceMonths }, (_, i) => {
      const dueDate = addMonths(new Date(input.firstDueDate), i)
      dueDates.push(dueDate)
      return {
        userId,
        accountId: input.accountId ?? null,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        type: 'RECURRING' as const,
        utilityTag: input.utilityTag,
        status: 'PENDING' as const,
        dueDate,
        notes: input.notes ?? null,
        pessoa: input.pessoa ?? null,
        situacao: input.situacao ?? null,
        totalAmount: null,
      }
    })

    await prisma.transaction.createMany({ data: rows })
    recalculate(userId, getAffectedMonths(dueDates)).catch(console.error)
    return { created: rows.length }
  }

  const amount = Math.abs((input as { amount: number }).amount)
  const dueDate = new Date((input as { dueDate: string }).dueDate)

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: input.accountId ?? null,
      categoryId: input.categoryId,
      description: input.description,
      amount,
      totalAmount: ('totalAmount' in input ? input.totalAmount : null) ?? null,
      type: input.type,
      utilityTag: input.utilityTag,
      status: 'PENDING',
      dueDate,
      notes: input.notes ?? null,
      pessoa: input.pessoa ?? null,
      situacao: input.situacao ?? null,
    },
    include: { account: true, category: true },
  })

  recalculate(userId, [toMonthStr(dueDate)]).catch(console.error)
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
    data: {
      status: 'PAID',
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      situacao: tx.situacao === 'RECEBER' ? 'PAGO' : tx.situacao,
    },
  })

  if (tx.accountId) {
    await prisma.account.update({
      where: { id: tx.accountId },
      data: { balance: { decrement: tx.amount } },
    })
  }

  return updated
}

// Migra todos os registros da tabela Debt para Transaction
export async function migrateDebtsToTransactions() {
  const userId = await getUserId()

  const debts = await prisma.debt.findMany({ where: { userId } })
  if (!debts.length) return { migrated: 0 }

  const undefinedCat = await prisma.category.findFirstOrThrow({
    where: { userId, name: 'Não Definida', isDefault: true },
  })

  const months = new Set<string>()

  for (const debt of debts) {
    const amount = Math.abs(debt.valorAPagar)
    const dueDate = debt.dataVencimento ?? debt.dataCompra ?? new Date()

    // Determina situacao com base nos dados originais
    let situacao: 'PAGO' | 'NAO_PAGO' | 'RECEBER' = debt.situacao as 'PAGO' | 'NAO_PAGO' | 'RECEBER'
    if (!['PAGO', 'NAO_PAGO', 'RECEBER'].includes(situacao)) {
      situacao = debt.valorAPagar < 0 ? 'NAO_PAGO' : 'RECEBER'
    }

    const status = situacao === 'PAGO' ? 'PAID' : 'PENDING'

    await prisma.transaction.create({
      data: {
        userId,
        accountId: null,
        categoryId: undefinedCat.id,
        description: debt.descricao,
        amount,
        totalAmount: debt.valorTotalCompra !== amount ? debt.valorTotalCompra : null,
        type: 'SHARED',
        utilityTag: 'NON_ESSENTIAL',
        status,
        dueDate,
        notes: debt.observacoes ?? null,
        pessoa: debt.pessoa,
        situacao,
      },
    })

    months.add(toMonthStr(new Date(dueDate)))
  }

  // Recalculate brain for affected months
  recalculate(userId, [...months]).catch(console.error)

  return { migrated: debts.length }
}

// ─── ODS / XLSX / CSV Import ──────────────────────────────────────────────────

function parseDateImport(raw: unknown): Date | null {
  if (!raw || String(raw).includes('?')) return null
  const str = String(raw).trim()
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) return new Date(date.y, date.m - 1, date.d)
  }
  for (const fmt of ['dd/MM/yy', 'dd/MM/yyyy']) {
    const parsed = parse(str, fmt, new Date())
    if (isValid(parsed)) return parsed
  }
  return null
}

function parseValueImport(raw: unknown): number {
  if (raw == null || raw === '') return 0
  const str = String(raw).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

function parseSituacaoImport(raw: unknown): 'PAGO' | 'NAO_PAGO' | 'RECEBER' {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s.includes('pago') && !s.includes('não') && !s.includes('nao')) return 'PAGO'
  if (s.includes('receber')) return 'RECEBER'
  return 'NAO_PAGO'
}

export async function importFromFile(buffer: Buffer) {
  const userId = await getUserId()

  const undefinedCat = await prisma.category.findFirstOrThrow({
    where: { userId, name: 'Não Definida', isDefault: true },
  })

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })

  const get = (row: Record<string, unknown>, keys: string[]): unknown => {
    for (const k of keys) {
      const match = Object.keys(row).find(
        (rk) => rk.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, ''),
      )
      if (match !== undefined) return row[match]
    }
    return ''
  }

  const months = new Set<string>()
  let imported = 0

  for (const row of rows) {
    const pessoa = String(get(row, ['Pessoa', 'pessoa']) ?? '').trim()
    if (!pessoa) continue

    const valorAPagar = parseValueImport(get(row, ['valor a pagar', 'ValorAPagar', 'Valor a pagar']))
    const valorTotal = parseValueImport(get(row, ['Valor Total da compra', 'ValorTotalDaCompra', 'valor total']))
    const dueDate = parseDateImport(get(row, ['Data Vencimento', 'DataVencimento', 'data vencimento']))
      ?? parseDateImport(get(row, ['data', 'Data', 'DataCompra']))
      ?? new Date()

    const situacao = parseSituacaoImport(get(row, ['Situação', 'Situacao', 'situação', 'situacao']))
    const status = situacao === 'PAGO' ? ('PAID' as const) : ('PENDING' as const)
    const amount = Math.abs(valorAPagar)

    await prisma.transaction.create({
      data: {
        userId,
        accountId: null,
        categoryId: undefinedCat.id,
        description: String(get(row, ['descrição', 'descricao', 'Descrição', 'Descricao']) ?? '').trim() || pessoa,
        amount,
        totalAmount: valorTotal && valorTotal !== amount ? valorTotal : null,
        type: 'SHARED',
        utilityTag: 'NON_ESSENTIAL',
        status,
        dueDate,
        notes: String(get(row, ['Banco', 'banco']) ?? '').trim() || null,
        pessoa,
        situacao,
      },
    })

    months.add(toMonthStr(new Date(dueDate)))
    imported++
  }

  if (!imported) throw Object.assign(new Error('Nenhuma linha válida encontrada no arquivo'), { code: 'EMPTY_FILE' })

  recalculate(userId, [...months]).catch(console.error)
  return { imported }
}
