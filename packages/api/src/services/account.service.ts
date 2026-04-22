import { prisma } from '../prisma'
import { CreateAccountInput, UpdateAccountInput } from '@moneyflow/shared'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

export async function listAccounts() {
  const userId = await getUserId()
  return prisma.account.findMany({ where: { userId, isActive: true } })
}

export async function createAccount(data: CreateAccountInput) {
  const userId = await getUserId()
  return prisma.account.create({ data: { ...data, userId } })
}

export async function updateAccount(id: string, data: UpdateAccountInput) {
  await prisma.account.findFirstOrThrow({ where: { id } })
  return prisma.account.update({ where: { id }, data })
}

export async function deleteAccount(id: string) {
  const futurePending = await prisma.transaction.count({
    where: {
      accountId: id,
      status: 'PENDING',
      dueDate: { gt: new Date() },
    },
  })
  if (futurePending > 0) {
    throw Object.assign(new Error('Account has pending future transactions'), {
      code: 'ACCOUNT_HAS_TRANSACTIONS',
    })
  }
  return prisma.account.update({ where: { id }, data: { isActive: false } })
}
