import * as XLSX from 'xlsx'
import { parse, isValid } from 'date-fns'
import { prisma } from '../prisma'
import type { CreateDebtInput, UpdateDebtInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

// ─── ODS Parsing ─────────────────────────────────────────────────────────────

function parseDate(raw: unknown): Date | null {
  if (!raw || String(raw).includes('?')) return null

  const str = String(raw).trim()

  // Excel serial number (xlsx converts dates to numbers)
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) return new Date(date.y, date.m - 1, date.d)
  }

  // dd/MM/yy or dd/MM/yyyy
  for (const fmt of ['dd/MM/yy', 'dd/MM/yyyy']) {
    const parsed = parse(str, fmt, new Date())
    if (isValid(parsed)) return parsed
  }

  return null
}

function parseValue(raw: unknown): number {
  if (raw == null || raw === '') return 0
  const str = String(raw)
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

function parseSituacao(raw: unknown): string {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s.includes('pago') && !s.includes('não') && !s.includes('nao')) return 'PAGO'
  if (s.includes('receber')) return 'RECEBER'
  return 'NAO_PAGO'
}

export interface DebtRow {
  pessoa: string
  dataCompra: Date | null
  descricao: string
  banco: string | null
  valorAPagar: number
  valorTotalCompra: number
  situacao: string
  dataVencimento: Date | null
}

export function parseOdsBuffer(buffer: Buffer): DebtRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  })

  const results: DebtRow[] = []

  for (const row of rows) {
    // Flexible header matching (handles accent/case variations)
    const get = (keys: string[]): unknown => {
      for (const k of keys) {
        const match = Object.keys(row).find(
          (rk) => rk.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, ''),
        )
        if (match !== undefined) return row[match]
      }
      return ''
    }

    const pessoa = String(get(['Pessoa', 'pessoa']) ?? '').trim()
    if (!pessoa) continue // skip empty rows

    results.push({
      pessoa,
      dataCompra: parseDate(get(['data', 'Data', 'DataCompra'])),
      descricao: String(get(['descrição', 'descricao', 'Descrição', 'Descricao']) ?? '').trim(),
      banco: String(get(['Banco', 'banco']) ?? '').trim() || null,
      valorAPagar: parseValue(get(['valor a pagar', 'ValorAPagar', 'Valor a pagar', 'valorapagar'])),
      valorTotalCompra: parseValue(
        get(['Valor Total da compra', 'ValorTotalDaCompra', 'valor total', 'Valor total']),
      ),
      situacao: parseSituacao(get(['Situação', 'Situacao', 'situação', 'situacao'])),
      dataVencimento: parseDate(get(['Data Vencimento', 'DataVencimento', 'data vencimento'])),
    })
  }

  return results
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listDebts(filters: { pessoa?: string; situacao?: string }) {
  const userId = await getUserId()
  const where: Record<string, unknown> = { userId }
  if (filters.pessoa) where.pessoa = filters.pessoa
  if (filters.situacao) where.situacao = filters.situacao

  const debts = await prisma.debt.findMany({
    where,
    orderBy: [{ pessoa: 'asc' }, { dataVencimento: 'asc' }],
  })

  const summary = {
    totalAPagar: debts
      .filter((d) => d.situacao === 'NAO_PAGO' && d.valorAPagar < 0)
      .reduce((s, d) => s + Math.abs(d.valorAPagar), 0),
    totalAReceber: debts
      .filter((d) => d.situacao === 'RECEBER' || (d.situacao !== 'PAGO' && d.valorAPagar > 0))
      .reduce((s, d) => s + d.valorAPagar, 0),
    totalPago: debts
      .filter((d) => d.situacao === 'PAGO')
      .reduce((s, d) => s + Math.abs(d.valorAPagar), 0),
    porPessoa: Object.entries(
      debts.reduce<Record<string, number>>((acc, d) => {
        if (d.pessoa === 'Bruno' || d.situacao === 'PAGO') return acc
        acc[d.pessoa] = (acc[d.pessoa] ?? 0) + d.valorAPagar
        return acc
      }, {}),
    ).map(([pessoa, saldo]) => ({ pessoa, saldo })),
  }

  return { items: debts, summary }
}

export async function createDebt(data: CreateDebtInput) {
  const userId = await getUserId()
  return prisma.debt.create({
    data: {
      userId,
      pessoa: data.pessoa,
      dataCompra: data.dataCompra ? new Date(data.dataCompra) : null,
      descricao: data.descricao,
      banco: data.banco ?? null,
      valorAPagar: data.valorAPagar,
      valorTotalCompra: data.valorTotalCompra,
      situacao: data.situacao ?? 'NAO_PAGO',
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      observacoes: data.observacoes ?? null,
    },
  })
}

export async function updateDebt(id: string, data: UpdateDebtInput) {
  await prisma.debt.findFirstOrThrow({ where: { id } })
  return prisma.debt.update({
    where: { id },
    data: {
      ...data,
      dataCompra: data.dataCompra ? new Date(data.dataCompra) : undefined,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
    },
  })
}

export async function deleteDebt(id: string) {
  await prisma.debt.findFirstOrThrow({ where: { id } })
  return prisma.debt.delete({ where: { id } })
}

export async function importFromOds(buffer: Buffer) {
  const userId = await getUserId()
  const rows = parseOdsBuffer(buffer)

  if (!rows.length) throw Object.assign(new Error('Nenhuma linha válida encontrada no arquivo'), { code: 'EMPTY_FILE' })

  await prisma.debt.createMany({
    data: rows.map((r) => ({
      userId,
      pessoa: r.pessoa,
      dataCompra: r.dataCompra,
      descricao: r.descricao,
      banco: r.banco,
      valorAPagar: r.valorAPagar,
      valorTotalCompra: r.valorTotalCompra,
      situacao: r.situacao,
      dataVencimento: r.dataVencimento,
    })),
  })

  return { imported: rows.length }
}
