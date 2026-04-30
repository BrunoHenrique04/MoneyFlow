import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const start = new Date(2026, 3, 1)  // Apr 1
  const end   = new Date(2026, 4, 1)  // May 1 (exclusive)

  const txs = await prisma.transaction.findMany({
    where: { dueDate: { gte: start, lt: end } },
  })

  console.log(`Encontradas ${txs.length} transações em abril/2026`)

  for (const t of txs) {
    const d = new Date(t.dueDate)
    d.setMonth(4) // 4 = maio
    await prisma.transaction.update({ where: { id: t.id }, data: { dueDate: d } })
  }

  console.log(`Movidas para maio/2026: ${txs.length}`)

  // Recalculate Brain for May
  const user = await prisma.user.findFirstOrThrow()
  const { recalculate } = await import('../src/brain')
  await recalculate(user.id, ['2026-05'])
  console.log('Brain recalculado para 2026-05')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
