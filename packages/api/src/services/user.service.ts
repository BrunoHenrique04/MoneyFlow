import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { UpdateUserInput } from '@moneyflow/shared'

export async function getUser() {
  return prisma.user.findFirst()
}

export async function updateUser(data: UpdateUserInput) {
  const user = await prisma.user.findFirstOrThrow()
  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  })
  if (data.monthlyIncome !== undefined) {
    recalculate(user.id).catch(console.error)
  }
  return updated
}
