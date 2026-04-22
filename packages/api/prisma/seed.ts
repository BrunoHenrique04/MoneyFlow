import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: 'utensils', color: '#F59E0B' },
  { name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { name: 'Moradia', icon: 'home', color: '#8B5CF6' },
  { name: 'Saúde', icon: 'heart', color: '#EF4444' },
  { name: 'Educação', icon: 'book', color: '#10B981' },
  { name: 'Lazer', icon: 'gamepad', color: '#F97316' },
  { name: 'Tecnologia', icon: 'monitor', color: '#6366F1' },
  { name: 'Vestuário', icon: 'shirt', color: '#EC4899' },
  { name: 'Outros', icon: 'tag', color: '#6B7280' },
]

async function main() {
  const existing = await prisma.user.findFirst()
  if (existing) {
    console.log('Seed already ran — skipping.')
    return
  }

  const user = await prisma.user.create({
    data: {
      name: 'Usuário',
      monthlyIncome: 0,
    },
  })

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      userId: user.id,
      isDefault: true,
    })),
  })

  await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Carteira',
      color: '#10B981',
      icon: 'wallet',
      balance: 0,
    },
  })

  console.log(`Seed concluído. User id: ${user.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
