import { FastifyInstance } from 'fastify'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { ok, fail, currentMonth } from '../helpers'

export async function recommendationRoutes(app: FastifyInstance) {
  app.get('/recommendations/current', async (_req, reply) => {
    const user = await prisma.user.findFirst()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)

    const month = currentMonth()
    const rec = await prisma.recommendation.findUnique({
      where: { userId_referenceMonth: { userId: user.id, referenceMonth: month } },
    })

    if (!rec) return fail(reply, 'NOT_FOUND', 'No recommendation for current month', 404)

    return ok(reply, {
      ...rec,
      alerts: JSON.parse(rec.alerts as string),
      suggestions: JSON.parse(rec.suggestions as string),
      leisureDetails: JSON.parse(rec.leisureDetails as string),
    })
  })

  app.get('/recommendations', async (req, reply) => {
    const user = await prisma.user.findFirst()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)

    const { months = '6' } = req.query as { months?: string }
    const recs = await prisma.recommendation.findMany({
      where: { userId: user.id },
      orderBy: { referenceMonth: 'desc' },
      take: parseInt(months),
    })

    return ok(reply, recs.map((r) => ({
      ...r,
      alerts: JSON.parse(r.alerts as string),
      suggestions: JSON.parse(r.suggestions as string),
    })))
  })

  app.post('/recommendations/recalculate', async (_req, reply) => {
    const user = await prisma.user.findFirst()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)
    await recalculate(user.id)
    return ok(reply, { recalculated: true })
  })
}
