import { FastifyInstance } from 'fastify'
import { CategoryLimitSchema } from '@moneyflow/shared'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { ok, fail, currentMonth } from '../helpers'

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings/category-limits', async (_req, reply) => {
    const userId = await getUserId()
    const limits = await prisma.categoryLimit.findMany({
      where: { userId },
      include: { category: true },
    })
    return ok(reply, limits)
  })

  app.post('/settings/category-limits', async (req, reply) => {
    const userId = await getUserId()
    const parsed = CategoryLimitSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)

    const limit = await prisma.categoryLimit.upsert({
      where: { userId_categoryId: { userId, categoryId: parsed.data.categoryId } },
      create: { userId, ...parsed.data },
      update: { limitValue: parsed.data.limitValue },
    })

    recalculate(userId, [currentMonth()]).catch(console.error)
    return ok(reply, limit, 201)
  })

  app.delete('/settings/category-limits/:categoryId', async (req, reply) => {
    const userId = await getUserId()
    const { categoryId } = req.params as { categoryId: string }

    await prisma.categoryLimit.delete({
      where: { userId_categoryId: { userId, categoryId } },
    })

    recalculate(userId, [currentMonth()]).catch(console.error)
    return ok(reply, { deleted: true })
  })
}
