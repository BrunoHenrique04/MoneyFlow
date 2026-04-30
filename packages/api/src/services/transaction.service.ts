import * as XLSX from 'xlsx'
import { addMonths, parse, isValid, format as fmtDate } from 'date-fns'
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
    include: { account: true, category: true, installmentGroup: { select: { totalInstallments: true } } },
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
    include: { account: true, category: true, installmentGroup: { select: { totalInstallments: true } } },
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
        type: tpl.type,
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
  const { scope, ...rest } = data

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...rest,
      dueDate: rest.dueDate ? new Date(rest.dueDate) : undefined,
      paidAt: rest.paidAt ? new Date(rest.paidAt) : undefined,
    },
    include: { account: true, category: true, installmentGroup: { select: { totalInstallments: true } } },
  })

  if (scope === 'this_and_future' && existing.installmentGroupId && existing.installmentNumber != null) {
    const metaFields: (keyof typeof rest)[] = ['description', 'amount', 'categoryId', 'accountId', 'utilityTag', 'notes', 'pessoa', 'situacao']
    const metaUpdate: Record<string, unknown> = {}
    for (const f of metaFields) {
      if (rest[f] !== undefined) metaUpdate[f] = rest[f]
    }

    const futureInstallments = await prisma.transaction.findMany({
      where: {
        installmentGroupId: existing.installmentGroupId,
        installmentNumber: { gt: existing.installmentNumber },
        status: { not: 'CANCELLED' },
      },
    })

    if (rest.dueDate) {
      // Propagate only the day-of-month; each installment keeps its own month/year
      const newDay = new Date(rest.dueDate).getDate()
      for (const fi of futureInstallments) {
        const d = new Date(fi.dueDate)
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        const clampedDay = Math.min(newDay, daysInMonth)
        await prisma.transaction.update({
          where: { id: fi.id },
          data: { ...metaUpdate, dueDate: new Date(d.getFullYear(), d.getMonth(), clampedDay) },
        })
      }
    } else if (Object.keys(metaUpdate).length > 0) {
      await prisma.transaction.updateMany({
        where: {
          installmentGroupId: existing.installmentGroupId,
          installmentNumber: { gt: existing.installmentNumber },
          status: { not: 'CANCELLED' },
        },
        data: metaUpdate,
      })
    }

    const affectedMonths = futureInstallments.map(fi => toMonthStr(fi.dueDate))
    recalculate(userId, [...new Set([toMonthStr(existing.dueDate), ...affectedMonths])]).catch(console.error)
  } else {
    const affectedMonths = [toMonthStr(existing.dueDate)]
    if (rest.dueDate) affectedMonths.push(toMonthStr(new Date(rest.dueDate)))
    recalculate(userId, affectedMonths).catch(console.error)
  }

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

// ─── ODS / XLSX / CSV Import & Export ────────────────────────────────────────

// Export columns labels (used for both export generation and import detection)
const EXPORT_COLS = [
  'Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Tag', 'Pessoa', 'Status',
  'Valor Total', 'Valor', 'Parcela', 'Total Parcelas', 'Grupo ID', 'Pago Em', 'Notas',
]

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

function parseStatusImport(raw: unknown): { status: 'PAID' | 'PENDING' | 'CANCELLED'; situacao: 'PAGO' | 'NAO_PAGO' | 'RECEBER' | null } {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'pago' || s === 'paid') return { status: 'PAID', situacao: 'PAGO' }
  if (s === 'a receber' || s === 'receber' || s === 'receivable') return { status: 'PENDING', situacao: 'RECEBER' }
  if (s === 'cancelado' || s === 'cancelled' || s === 'canceled') return { status: 'CANCELLED', situacao: null }
  if (s === 'nao_pago' || s === 'nao pago') return { status: 'PENDING', situacao: 'NAO_PAGO' }
  return { status: 'PENDING', situacao: 'NAO_PAGO' }
}

function parseTagImport(raw: unknown): 'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT' {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'essencial' || s === 'essential') return 'ESSENTIAL'
  if (s === 'investimento' || s === 'investment') return 'INVESTMENT'
  return 'NON_ESSENTIAL'
}

function parseTypeImport(raw: unknown): string {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'receita' || s === 'income') return 'INCOME'
  if (s === 'compartilhado' || s === 'shared') return 'SHARED'
  if (s === 'fixo' || s === 'fixed') return 'FIXED'
  // parcela/recorrente importada como SINGLE para evitar duplicar grupos
  return 'SINGLE'
}

function get(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const match = Object.keys(row).find(
      (rk) => rk.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, ''),
    )
    if (match !== undefined) return row[match]
  }
  return ''
}

function isTableFormat(row: Record<string, unknown>): boolean {
  const keys = Object.keys(row).map((k) => k.toLowerCase().replace(/\s+/g, ''))
  return keys.includes('tipo') || keys.includes('categoria') || keys.includes('tag')
}

export async function importFromFile(buffer: Buffer) {
  const userId = await getUserId()

  const categories = await prisma.category.findMany({ where: { userId } })
  const accounts   = await prisma.account.findMany({ where: { userId, isActive: true } })
  const fallbackCat = categories.find((c) => c.isDefault && c.name === 'Não Definida')
    ?? categories.find((c) => c.isDefault)
    ?? categories[0]

  const wb    = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows  = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })

  if (!rows.length) throw Object.assign(new Error('Arquivo vazio'), { code: 'EMPTY_FILE' })

  const newFormat = rows[0] ? isTableFormat(rows[0]) : false

  const months = new Set<string>()
  let imported = 0

  if (newFormat) {
    // ── Phase 1: separate installment-group rows from simple rows ─────────────
    // Rows with the same non-empty "Grupo ID" and type INSTALLMENT are grouped
    // together and reconstructed as a proper InstallmentGroup + Transactions.
    const installmentBuckets = new Map<string, Record<string, unknown>[]>()
    const simpleRows: Record<string, unknown>[] = []

    for (const row of rows) {
      const rawType = parseTypeImport(get(row, ['tipo']))
      const grupoId = String(get(row, ['grupoid', 'grupo id']) ?? '').trim()
      if (rawType === 'INSTALLMENT' && grupoId) {
        const bucket = installmentBuckets.get(grupoId) ?? []
        bucket.push(row)
        installmentBuckets.set(grupoId, bucket)
      } else {
        simpleRows.push(row)
      }
    }

    // ── Phase 2: simple (non-installment-group) rows ──────────────────────────
    for (const row of simpleRows) {
      const description = String(get(row, ['descrição', 'descricao']) ?? '').trim()
      const amount      = parseValueImport(get(row, ['valor']))
      if (!description || !amount) continue

      const dueDate = parseDateImport(get(row, ['data'])) ?? new Date()

      const catName  = String(get(row, ['categoria']) ?? '').trim()
      const category = (catName && categories.find((c) => c.name.toLowerCase() === catName.toLowerCase()))
        ?? fallbackCat
      if (!category) continue

      const accName = String(get(row, ['conta']) ?? '').trim()
      const account = accName ? accounts.find((a) => a.name.toLowerCase() === accName.toLowerCase()) : null

      const { status, situacao } = parseStatusImport(get(row, ['status']))
      const utilityTag           = parseTagImport(get(row, ['tag']))
      const type                 = parseTypeImport(get(row, ['tipo']))
      const pessoa               = String(get(row, ['pessoa']) ?? '').trim() || null
      const totalAmountRaw       = parseValueImport(get(row, ['valortotal', 'valor total']))
      const notes                = String(get(row, ['notas', 'observações', 'observacoes']) ?? '').trim() || null
      const paidAtRaw            = parseDateImport(get(row, ['pagoem', 'pago em', 'data pagamento']))

      await prisma.transaction.create({
        data: {
          userId,
          accountId:   account?.id ?? null,
          categoryId:  category.id,
          description,
          amount:      Math.abs(amount),
          totalAmount: totalAmountRaw && totalAmountRaw !== Math.abs(amount) ? totalAmountRaw : null,
          type,
          utilityTag,
          status,
          dueDate,
          paidAt: paidAtRaw ?? (status === 'PAID' ? new Date() : null),
          notes,
          pessoa,
          situacao,
        },
      })

      months.add(toMonthStr(dueDate))
      imported++
    }

    // ── Phase 3: installment groups ───────────────────────────────────────────
    // Reconstruct each group: create InstallmentGroup, then insert each Transaction
    // directly (bypassing the auto-generate logic which would duplicate rows).
    for (const [, groupRows] of installmentBuckets) {
      if (!groupRows.length) continue

      // Sort by installment number so row 1 is used as the reference
      groupRows.sort((a, b) => {
        const na = parseInt(String(get(a, ['parcela']) ?? '0')) || 0
        const nb = parseInt(String(get(b, ['parcela']) ?? '0')) || 0
        return na - nb
      })

      const firstRow       = groupRows[0]
      const description    = String(get(firstRow, ['descrição', 'descricao']) ?? '').trim()
      if (!description) continue

      const totalParcelasRaw = parseInt(String(get(firstRow, ['totalparcelas', 'total parcelas']) ?? '0')) || 0
      const totalInstallments = Math.max(totalParcelasRaw, groupRows.length)

      const totalAmountRaw = parseValueImport(get(firstRow, ['valortotal', 'valor total']))
      const totalAmount    = totalAmountRaw || groupRows.reduce((s, r) => s + parseValueImport(get(r, ['valor'])), 0)

      const firstDueDate = parseDateImport(get(firstRow, ['data'])) ?? new Date()

      const group = await prisma.installmentGroup.create({
        data: { userId, description, totalAmount, totalInstallments, firstDueDate },
      })

      for (const r of groupRows) {
        const amount = parseValueImport(get(r, ['valor']))
        if (!amount) continue

        const dueDate = parseDateImport(get(r, ['data'])) ?? new Date()

        const catName  = String(get(r, ['categoria']) ?? '').trim()
        const category = (catName && categories.find((c) => c.name.toLowerCase() === catName.toLowerCase()))
          ?? fallbackCat
        if (!category) continue

        const accName = String(get(r, ['conta']) ?? '').trim()
        const account = accName ? accounts.find((a) => a.name.toLowerCase() === accName.toLowerCase()) : null

        const { status, situacao } = parseStatusImport(get(r, ['status']))
        const utilityTag           = parseTagImport(get(r, ['tag']))
        const pessoa               = String(get(r, ['pessoa']) ?? '').trim() || null
        const notes                = String(get(r, ['notas', 'observações', 'observacoes']) ?? '').trim() || null
        const installmentNumber    = parseInt(String(get(r, ['parcela']) ?? '0')) || null
        const paidAtRaw            = parseDateImport(get(r, ['pagoem', 'pago em', 'data pagamento']))

        await prisma.transaction.create({
          data: {
            userId,
            accountId:          account?.id ?? null,
            categoryId:         category.id,
            installmentGroupId: group.id,
            description,
            amount:             Math.abs(amount),
            totalAmount:        null,
            type:               'INSTALLMENT',
            utilityTag,
            status,
            dueDate,
            paidAt:             paidAtRaw ?? (status === 'PAID' ? new Date() : null),
            installmentNumber,
            notes,
            pessoa,
            situacao,
          },
        })

        months.add(toMonthStr(dueDate))
        imported++
      }
    }
  } else {
    // ── Legacy debt/shared format (backwards compat) ──────────────────────────
    for (const row of rows) {
      const pessoa = String(get(row, ['Pessoa', 'pessoa']) ?? '').trim()
      if (!pessoa) continue

      const valorAPagar = parseValueImport(get(row, ['valor a pagar', 'ValorAPagar', 'Valor a pagar']))
      const valorTotal  = parseValueImport(get(row, ['Valor Total da compra', 'ValorTotalDaCompra', 'valor total']))
      const dueDate     = parseDateImport(get(row, ['Data Vencimento', 'DataVencimento', 'data vencimento']))
        ?? parseDateImport(get(row, ['data', 'Data', 'DataCompra']))
        ?? new Date()

      const situacao = parseSituacaoImport(get(row, ['Situação', 'Situacao', 'situação', 'situacao']))
      const status   = situacao === 'PAGO' ? ('PAID' as const) : ('PENDING' as const)
      const amount   = Math.abs(valorAPagar)

      await prisma.transaction.create({
        data: {
          userId,
          accountId:   null,
          categoryId:  fallbackCat?.id ?? categories[0].id,
          description: String(get(row, ['descrição', 'descricao', 'Descrição', 'Descricao']) ?? '').trim() || pessoa,
          amount,
          totalAmount: valorTotal && valorTotal !== amount ? valorTotal : null,
          type:        'SHARED',
          utilityTag:  'NON_ESSENTIAL',
          status,
          dueDate,
          notes:       String(get(row, ['Banco', 'banco']) ?? '').trim() || null,
          pessoa,
          situacao,
        },
      })

      months.add(toMonthStr(dueDate))
      imported++
    }
  }

  if (!imported) throw Object.assign(new Error('Nenhuma linha válida encontrada no arquivo'), { code: 'EMPTY_FILE' })

  recalculate(userId, [...months]).catch(console.error)
  return { imported }
}

function statusLabel(t: { status: string; situacao: string | null }): string {
  if (t.situacao === 'RECEBER') return 'A Receber'
  if (t.status === 'PAID' || t.situacao === 'PAGO') return 'Pago'
  if (t.status === 'CANCELLED') return 'Cancelado'
  return 'Pendente'
}

function typeLabel(type: string): string {
  const m: Record<string, string> = {
    SINGLE: 'Único', INSTALLMENT: 'Parcela',
    FIXED: 'Fixo', INCOME: 'Receita', SHARED: 'Compartilhado',
  }
  return m[type] ?? type
}

function tagLabel(tag: string): string {
  if (tag === 'ESSENTIAL') return 'Essencial'
  if (tag === 'INVESTMENT') return 'Investimento'
  return 'Não Essencial'
}

export async function exportTransactions(month?: string): Promise<Buffer> {
  const userId = await getUserId()
  const now = new Date()
  const curMonth = toMonthStr(now)

  // Real DB transactions
  const where: Record<string, unknown> = { userId }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    where.dueDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
  }

  const dbItems = await prisma.transaction.findMany({
    where,
    include: { account: true, category: true, installmentGroup: true },
    orderBy: { dueDate: 'asc' },
  })

  // Recurring template previews for current + future months
  // (only rows not yet generated as real transactions)
  const templates = await prisma.recurringTemplate.findMany({
    where: { userId, isActive: true },
    include: { account: true, category: true },
  })

  // Map: month → set of templateIds already covered by a real transaction
  const coveredByMonth = new Map<string, Set<string>>()
  for (const t of dbItems) {
    if (!t.recurringTemplateId) continue
    const m = toMonthStr(new Date(t.dueDate))
    if (!coveredByMonth.has(m)) coveredByMonth.set(m, new Set())
    coveredByMonth.get(m)!.add(t.recurringTemplateId)
  }

  // Which months to project: if month-specific, just that month (if current/future);
  // if all-months export, project current month + next 11 months
  const monthsToProject: string[] = []
  if (month) {
    if (month >= curMonth) monthsToProject.push(month)
  } else {
    for (let i = 0; i < 12; i++) {
      monthsToProject.push(toMonthStr(addMonths(now, i)))
    }
  }

  type DbItem = (typeof dbItems)[0]
  const previews: (DbItem & { isProjection: true })[] = []

  for (const m of monthsToProject) {
    const [y, mo] = m.split('-').map(Number)
    const covered = coveredByMonth.get(m) ?? new Set()

    for (const tpl of templates) {
      if (covered.has(tpl.id)) continue
      if (tpl.startMonth > m) continue
      if (tpl.endMonth && tpl.endMonth < m) continue

      const day = Math.min(tpl.dayOfMonth, new Date(y, mo, 0).getDate())
      previews.push({
        id: `preview-${tpl.id}-${m}`,
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
        type: 'FIXED',
        utilityTag: tpl.utilityTag,
        status: 'PENDING',
        dueDate: new Date(y, mo - 1, day),
        paidAt: null,
        installmentNumber: null,
        notes: tpl.notes ?? null,
        createdAt: now,
        updatedAt: now,
        account: tpl.account,
        category: tpl.category,
        installmentGroup: null,
        isProjection: true,
      } as DbItem & { isProjection: true })
    }
  }

  const allItems = [...dbItems, ...previews].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )

  const rows = allItems.map((t) => ({
    [EXPORT_COLS[0]]: fmtDate(new Date(t.dueDate), 'dd/MM/yyyy'),
    [EXPORT_COLS[1]]: t.description,
    [EXPORT_COLS[2]]: typeLabel(t.type),
    [EXPORT_COLS[3]]: t.category.name,
    [EXPORT_COLS[4]]: t.account?.name ?? '',
    [EXPORT_COLS[5]]: tagLabel(t.utilityTag),
    [EXPORT_COLS[6]]: t.pessoa ?? '',
    [EXPORT_COLS[7]]: (t as typeof t & { isProjection?: boolean }).isProjection
      ? 'Projeção'
      : statusLabel(t),
    [EXPORT_COLS[8]]: t.type === 'INSTALLMENT'
      ? (t.installmentGroup?.totalAmount ?? t.totalAmount ?? '')
      : (t.totalAmount ?? ''),
    [EXPORT_COLS[9]]: t.amount,
    [EXPORT_COLS[10]]: t.installmentNumber ?? '',
    [EXPORT_COLS[11]]: t.installmentGroup?.totalInstallments ?? '',
    [EXPORT_COLS[12]]: t.installmentGroupId ?? '',
    [EXPORT_COLS[13]]: t.paidAt ? fmtDate(new Date(t.paidAt), 'dd/MM/yyyy HH:mm') : '',
    [EXPORT_COLS[14]]: t.notes ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLS })
  XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
