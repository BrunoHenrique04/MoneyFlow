/**
 * Converte transações recorrentes avulsas de maio/2026 em RecurringTemplates.
 * Run: pnpm --filter @moneyflow/api exec tsx prisma/fix-recurring-templates.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_MONTH = '2026-05'

async function main() {
  const user = await prisma.user.findFirstOrThrow()
  const uid = user.id

  async function accId(name: string) {
    return (await prisma.account.findFirstOrThrow({ where: { userId: uid, name } })).id
  }
  async function catId(name: string) {
    return (await prisma.category.findFirstOrThrow({ where: { userId: uid, name } })).id
  }

  const templateDefs = [
    {
      description: 'Conta de Luz',
      amount: 350, dayOfMonth: 5,
      accountId: await accId('Ju'),
      categoryId: await catId('Luz / Água'),
      utilityTag: 'ESSENTIAL', endMonth: null,
    },
    {
      description: 'Max',
      amount: 40, dayOfMonth: 20,
      accountId: await accId('Nubank'),
      categoryId: await catId('Streaming'),
      utilityTag: 'NON_ESSENTIAL', endMonth: null,
    },
    {
      description: 'Google One',
      amount: 10, dayOfMonth: 15,
      accountId: await accId('C6 Bank'),
      categoryId: await catId('Tecnologia'),
      utilityTag: 'NON_ESSENTIAL', endMonth: null,
    },
    {
      description: 'Recarga Celular',
      amount: 40, dayOfMonth: 20,
      accountId: await accId('Nubank'),
      categoryId: await catId('Internet'),
      utilityTag: 'ESSENTIAL', endMonth: null,
    },
    {
      description: 'TV',
      amount: 50, dayOfMonth: 20,
      accountId: await accId('Marcos'),
      categoryId: await catId('Lazer'),
      utilityTag: 'NON_ESSENTIAL', endMonth: null,
    },
    {
      description: 'Academia',
      amount: 110, dayOfMonth: 20,
      accountId: await accId('Folha'),
      categoryId: await catId('Saúde'),
      utilityTag: 'ESSENTIAL', endMonth: '2027-03', // 12 meses a partir de Abr/2026
    },
  ]

  // Nomes que existem no banco como transações avulsas (seed antigo)
  const orphanDescriptions = ['Conta de Luz', 'Max', 'Google One', 'Recarga Celular', 'TV', 'Academia 2/12']

  // Deletar transações avulsas de maio (sem recurringTemplateId)
  const mayStart = new Date(2026, 4, 1)
  const mayEnd   = new Date(2026, 5, 1)
  const deleted = await prisma.transaction.deleteMany({
    where: {
      userId: uid,
      description: { in: orphanDescriptions },
      dueDate: { gte: mayStart, lt: mayEnd },
      recurringTemplateId: null,
    },
  })
  console.log(`Deletadas ${deleted.count} transações avulsas recorrentes de maio`)

  // Criar templates e gerar a transação de maio para cada um
  const { generateForMonth } = await import('../src/services/recurring.service')

  for (const def of templateDefs) {
    const existing = await prisma.recurringTemplate.findFirst({
      where: { userId: uid, description: def.description, isActive: true },
    })
    if (existing) {
      console.log(`  skip (já existe): ${def.description}`)
      continue
    }

    const tpl = await prisma.recurringTemplate.create({
      data: {
        userId: uid,
        description: def.description,
        amount: def.amount,
        accountId: def.accountId,
        categoryId: def.categoryId,
        utilityTag: def.utilityTag,
        dayOfMonth: def.dayOfMonth,
        startMonth: TARGET_MONTH,
        endMonth: def.endMonth ?? null,
        isActive: true,
      },
    })

    await generateForMonth(tpl.id, TARGET_MONTH)
    console.log(`  + template criado + transação mai/2026: ${def.description}`)
  }

  // Recalcular Brain para maio
  const { recalculate } = await import('../src/brain')
  await recalculate(uid, [TARGET_MONTH])
  console.log('\nBrain recalculado para', TARGET_MONTH)
  console.log('Pronto. Abra Configurações → Gastos Fixos/Recorrentes para ver os templates.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
