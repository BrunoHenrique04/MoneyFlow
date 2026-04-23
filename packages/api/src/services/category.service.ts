import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { CreateCategoryInput, UpdateCategoryInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

async function getOrCreateUndefinedCategory(userId: string) {
  const existing = await prisma.category.findFirst({
    where: { userId, name: 'Não Definida', isDefault: true },
  })
  if (existing) return existing

  return prisma.category.create({
    data: {
      userId,
      name: 'Não Definida',
      icon: 'help-circle',
      color: '#9CA3AF',
      isDefault: true,
      categoryType: 'OTHER',
    },
  })
}

export async function listCategories() {
  const userId = await getUserId()
  return prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } })
}

export async function createCategory(data: CreateCategoryInput) {
  const userId = await getUserId()
  return prisma.category.create({ data: { ...data, userId } })
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  const category = await prisma.category.findFirstOrThrow({ where: { id } })

  if (category.isDefault) {
    throw Object.assign(new Error('Categorias padrão não podem ser editadas'), {
      code: 'CANNOT_EDIT_DEFAULT_CATEGORY',
    })
  }

  return prisma.category.update({ where: { id }, data })
}

export async function deleteCategory(id: string) {
  const userId = await getUserId()
  const category = await prisma.category.findFirstOrThrow({ where: { id } })

  if (category.isDefault) {
    throw Object.assign(new Error('Categorias padrão não podem ser excluídas'), {
      code: 'CANNOT_DELETE_DEFAULT_CATEGORY',
    })
  }

  const undefinedCat = await getOrCreateUndefinedCategory(userId)

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { categoryId: id, userId },
      data: { categoryId: undefinedCat.id },
    }),
    prisma.categoryLimit.deleteMany({ where: { categoryId: id, userId } }),
    prisma.category.delete({ where: { id } }),
  ])

  recalculate(userId).catch(console.error)
}
