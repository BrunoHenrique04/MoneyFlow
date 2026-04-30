/**
 * seed-personal.ts
 * Populates the database with Bruno's April/2026 transactions.
 * Run with:  pnpm --filter @moneyflow/api exec tsx prisma/seed-personal.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseAmount(raw: string): number {
  return Math.abs(
    parseFloat(raw.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim()),
  )
}

function parseDate(raw: string, fallback: Date): Date {
  if (!raw || !raw.trim()) return fallback
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return fallback
  const [d, m, y] = parts.map(Number)
  // 2-digit year: 00-50 → 2000s, 51-99 → 1900s (but year-2000 rows are placeholders → use fallback)
  const fullYear = y < 50 && y > 25 ? 2000 + y : y <= 25 ? 2000 + y : 1900 + y
  if (fullYear < 2020) return fallback // old placeholder dates → use fallback
  return new Date(fullYear, m - 1, d)
}

async function findOrCreate<T extends { id: string }>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  return (await find()) ?? (await create())
}

async function main() {
  const user = await prisma.user.findFirstOrThrow()
  const uid = user.id

  // Update user name
  await prisma.user.update({ where: { id: uid }, data: { name: 'Bruno' } })

  const fallbackDue = new Date(2026, 4, 31) // May 31 2026

  // ── Accounts ─────────────────────────────────────────────────────────────
  async function acc(name: string, color: string): Promise<string> {
    const a = await findOrCreate(
      () => prisma.account.findFirst({ where: { userId: uid, name } }),
      () => prisma.account.create({ data: { userId: uid, name, color, icon: 'credit-card', balance: 0 } }),
    )
    return a.id
  }

  const A = {
    Ju:     await acc('Ju',       '#EC4899'),
    Folha:  await acc('Folha',    '#10B981'),
    Nu:     await acc('Nubank',   '#8B5CF6'),
    C6:     await acc('C6 Bank',  '#F59E0B'),
    Marcos: await acc('Marcos',   '#6B7280'),
    Neon:   await acc('Neon',     '#06B6D4'),
    Itau:   await acc('Itaú',     '#F97316'),
    Inter:  await acc('Inter',    '#EA580C'),
  }

  // ── Categories (resolve existing seed categories by name) ─────────────────
  async function cat(name: string, type: string, color: string, icon: string): Promise<string> {
    const c = await findOrCreate(
      () => prisma.category.findFirst({ where: { userId: uid, name } }),
      () => prisma.category.create({ data: { userId: uid, name, categoryType: type, color, icon } }),
    )
    return c.id
  }

  const C = {
    Luz:        await cat('Luz / Água',  'FIXED',     '#EAB308', 'zap'),
    Saude:      await cat('Saúde',       'HEALTH',    '#EF4444', 'heart'),
    Streaming:  await cat('Streaming',   'LEISURE',   '#A855F7', 'tv'),
    Tecnologia: await cat('Tecnologia',  'OTHER',     '#6366F1', 'monitor'),
    Internet:   await cat('Internet',    'FIXED',     '#06B6D4', 'wifi'),
    Lazer:      await cat('Lazer',       'LEISURE',   '#F97316', 'gamepad'),
    Educacao:   await cat('Educação',    'EDUCATION', '#10B981', 'book'),
    Outros:     await cat('Outros',      'OTHER',     '#6B7280', 'tag'),
    Vestuario:  await cat('Vestuário',   'OTHER',     '#EC4899', 'shirt'),
    Transporte: await cat('Transporte',  'TRANSPORT', '#3B82F6', 'car'),
    Renda:      await cat('Renda',       'INCOME',    '#22C55E', 'trending-up'),
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  // Helper to create only if description+dueDate not already present this month
  async function tx(data: Parameters<typeof prisma.transaction.create>[0]['data']) {
    const existing = await prisma.transaction.findFirst({
      where: {
        userId: uid,
        description: data.description as string,
        dueDate: data.dueDate as Date,
        pessoa: (data.pessoa as string | null | undefined) ?? null,
      },
    })
    if (existing) { console.log(`  skip: ${data.description}`); return }
    await prisma.transaction.create({ data })
    console.log(`  + ${data.description}`)
  }

  const rows: Parameters<typeof prisma.transaction.create>[0]['data'][] = [
    // 1. Conta de Luz (Ju paga)
    {
      userId: uid, accountId: A.Ju, categoryId: C.Luz,
      description: 'Conta de Luz',
      amount: 350, totalAmount: 350,
      type: 'FIXED', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('05/05/26', fallbackDue),
    },
    // 2. Academia 2/12 — Bruno
    {
      userId: uid, accountId: A.Folha, categoryId: C.Saude,
      description: 'Academia 2/12',
      amount: 110, totalAmount: 110,
      type: 'INSTALLMENT', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO', installmentNumber: 2,
      dueDate: fallbackDue,
    },
    // 3. Academia 2/12 — Ju (pessoa)
    {
      userId: uid, accountId: A.Folha, categoryId: C.Saude,
      description: 'Academia 2/12',
      amount: 99, totalAmount: 99,
      type: 'INSTALLMENT', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO', installmentNumber: 2,
      pessoa: 'Ju',
      dueDate: fallbackDue,
    },
    // 4. Max (streaming)
    {
      userId: uid, accountId: A.Nu, categoryId: C.Streaming,
      description: 'Max',
      amount: 40, totalAmount: 40,
      type: 'FIXED', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 5. Google One
    {
      userId: uid, accountId: A.C6, categoryId: C.Tecnologia,
      description: 'Google One',
      amount: 10, totalAmount: 8,
      type: 'FIXED', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('15/05/26', fallbackDue),
    },
    // 6. Recarga Celular
    {
      userId: uid, accountId: A.Nu, categoryId: C.Internet,
      description: 'Recarga Celular',
      amount: 40, totalAmount: 40,
      type: 'FIXED', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 7. TV (via Marcos)
    {
      userId: uid, accountId: A.Marcos, categoryId: C.Lazer,
      description: 'TV',
      amount: 50, totalAmount: 50,
      type: 'FIXED', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 8. Suporte Monitor (TikTok Shop)
    {
      userId: uid, accountId: A.C6, categoryId: C.Tecnologia,
      description: 'Suporte Monitor (TikTok Shop)',
      amount: 43.68, totalAmount: 33.49,
      type: 'SINGLE', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('15/05/26', fallbackDue),
    },
    // 9. Notebook 6/10
    {
      userId: uid, accountId: A.Neon, categoryId: C.Tecnologia,
      description: 'Notebook 6/10',
      amount: 330, totalAmount: 330,
      type: 'INSTALLMENT', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO', installmentNumber: 6,
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 10. Salário (a receber)
    {
      userId: uid, accountId: A.Itau, categoryId: C.Renda,
      description: 'Salário',
      amount: 1000, totalAmount: 900,
      type: 'INCOME', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'RECEBER',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 11. Vale (a receber)
    {
      userId: uid, accountId: A.Itau, categoryId: C.Renda,
      description: 'Vale',
      amount: 900, totalAmount: 600,
      type: 'INCOME', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'RECEBER',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 12. Viella São Bento
    {
      userId: uid, accountId: A.Nu, categoryId: C.Lazer,
      description: 'Viella São Bento',
      amount: 71.56, totalAmount: 71.56,
      type: 'SINGLE', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 13. Anthropic API
    {
      userId: uid, accountId: A.Nu, categoryId: C.Educacao,
      description: 'Anthropic API',
      amount: 31.31, totalAmount: 31.31,
      type: 'SINGLE', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 14. Anthropic Subscription
    {
      userId: uid, accountId: A.Nu, categoryId: C.Educacao,
      description: 'Anthropic Subscription',
      amount: 114.51, totalAmount: 114.51,
      type: 'SINGLE', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 15. Anthropic (extra charge)
    {
      userId: uid, accountId: A.Nu, categoryId: C.Educacao,
      description: 'Anthropic (cobrança adicional)',
      amount: 10.42, totalAmount: 10.42,
      type: 'SINGLE', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 16. IOF
    {
      userId: uid, accountId: A.Nu, categoryId: C.Outros,
      description: 'IOF',
      amount: 5.35, totalAmount: 10.42,
      type: 'SINGLE', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 17. Bota 2/6
    {
      userId: uid, accountId: A.Nu, categoryId: C.Vestuario,
      description: 'Bota 2/6',
      amount: 114.83, totalAmount: 114.83,
      type: 'INSTALLMENT', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO', installmentNumber: 2,
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 18. Uber
    {
      userId: uid, accountId: A.Inter, categoryId: C.Transporte,
      description: 'Uber',
      amount: 23.95, totalAmount: 23.95,
      type: 'SINGLE', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 19. Posto de Gasolina — Adilson
    {
      userId: uid, accountId: A.Inter, categoryId: C.Transporte,
      description: 'Posto de Gasolina',
      amount: 100, totalAmount: 100,
      type: 'SINGLE', utilityTag: 'ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      pessoa: 'Adilson',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
    // 20. Bolsa — Jucilene
    {
      userId: uid, accountId: A.Inter, categoryId: C.Vestuario,
      description: 'Bolsa',
      amount: 99.95, totalAmount: 99.95,
      type: 'SINGLE', utilityTag: 'NON_ESSENTIAL', status: 'PENDING',
      situacao: 'NAO_PAGO',
      pessoa: 'Jucilene',
      dueDate: parseDate('20/05/26', fallbackDue),
    },
  ]

  console.log('Inserindo transações...')
  for (const row of rows) await tx(row)

  // Trigger Brain recalculate so dashboard reflects the new data
  const { recalculate } = await import('../src/brain')
  await recalculate(uid)

  console.log('\nImportação concluída.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
