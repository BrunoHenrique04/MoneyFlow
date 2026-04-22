import { prisma } from '../prisma'
import { CreateCategoryInput, UpdateCategoryInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
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
  await prisma.category.findFirstOrThrow({ where: { id } })
  return prisma.category.update({ where: { id }, data })
}

export async function deleteCategory(id: string) {
  const count = await prisma.transaction.count({ where: { categoryId: id } })
  if (count > 0) {
    throw Object.assign(new Error('Category has linked transactions'), {
      code: 'CATEGORY_HAS_TRANSACTIONS',
    })
  }
  return prisma.category.delete({ where: { id } })
}
