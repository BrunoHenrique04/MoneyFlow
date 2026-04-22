import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',  icon: 'utensils',    color: '#F59E0B', categoryType: 'FOOD'       },
  { name: 'Transporte',   icon: 'car',         color: '#3B82F6', categoryType: 'TRANSPORT'  },
  { name: 'Moradia',      icon: 'home',        color: '#8B5CF6', categoryType: 'FIXED'      },
  { name: 'Luz / Água',   icon: 'zap',         color: '#EAB308', categoryType: 'FIXED'      },
  { name: 'Internet',     icon: 'wifi',        color: '#06B6D4', categoryType: 'FIXED'      },
  { name: 'Saúde',        icon: 'heart',       color: '#EF4444', categoryType: 'HEALTH'     },
  { name: 'Farmácia',     icon: 'pill',        color: '#F87171', categoryType: 'HEALTH'     },
  { name: 'Educação',     icon: 'book',        color: '#10B981', categoryType: 'EDUCATION'  },
  { name: 'Lazer',        icon: 'gamepad',     color: '#F97316', categoryType: 'LEISURE'    },
  { name: 'Streaming',    icon: 'tv',          color: '#A855F7', categoryType: 'LEISURE'    },
  { name: 'Tecnologia',   icon: 'monitor',     color: '#6366F1', categoryType: 'OTHER'      },
  { name: 'Vestuário',    icon: 'shirt',       color: '#EC4899', categoryType: 'OTHER'      },
  { name: 'Investimento', icon: 'trending-up', color: '#22C55E', categoryType: 'INVESTMENT' },
  { name: 'Outros',       icon: 'tag',         color: '#6B7280', categoryType: 'OTHER'      },
]

async function main() {
  const existing = await prisma.user.findFirst()
  if (existing) {
    console.log('Seed already ran — skipping.')
    return
  }

  const user = await prisma.user.create({
    data: { name: 'Usuário', monthlyIncome: 0 },
  })

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id, isDefault: true })),
  })

  await prisma.account.create({
    data: { userId: user.id, name: 'Carteira', color: '#10B981', icon: 'wallet', balance: 0 },
  })

  console.log(`Seed concluído. User id: ${user.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
