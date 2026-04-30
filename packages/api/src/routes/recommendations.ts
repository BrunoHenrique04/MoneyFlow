import { FastifyInstance } from 'fastify'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import { ok, fail, currentMonth } from '../helpers'

function parseRec(rec: Record<string, unknown>) {
  return {
    ...rec,
    alerts: JSON.parse(rec.alerts as string),
    suggestions: JSON.parse(rec.suggestions as string),
    leisureDetails: JSON.parse((rec.leisureDetails as string) || 'null'),
  }
}

// Returns a fresh recommendation for the given month, recalculating if needed.
// Triggers recalculate when: record is missing, totalIncome is 0 while user has income
// (stale/corrupt data), or the month is current/future (projections change over time).
async function freshRec(userId: string, month: string, userIncome: number) {
  const isFutureOrCurrent = month >= currentMonth()

  let rec = await prisma.recommendation.findUnique({
    where: { userId_referenceMonth: { userId, referenceMonth: month } },
  })

  const isStale = !rec || (rec.totalIncome === 0 && userIncome > 0)

  if (isStale || isFutureOrCurrent) {
    await recalculate(userId, [month])
    rec = await prisma.recommendation.findUnique({
      where: { userId_referenceMonth: { userId, referenceMonth: month } },
    })
  }

  return rec
}

export async function recommendationRoutes(app: FastifyInstance) {
  app.get('/recommendations/current', async (_req, reply) => {
    const user = await prisma.user.findFirst()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)

    const month = currentMonth()
    const rec = await freshRec(user.id, month, user.monthlyIncome)
    if (!rec) return fail(reply, 'NOT_FOUND', 'No recommendation for current month', 404)

    return ok(reply, parseRec(rec as unknown as Record<string, unknown>))
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

  app.get('/recommendations/:month', async (req, reply) => {
    const user = await prisma.user.findFirst()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)

    const { month } = req.params as { month: string }
    const rec = await freshRec(user.id, month, user.monthlyIncome)
    if (!rec) return fail(reply, 'NOT_FOUND', 'No recommendation for this month', 404)

    return ok(reply, parseRec(rec as unknown as Record<string, unknown>))
  })

  app.post('/recommendations/recalculate', async (_req, reply) => {
    const user = await prisma.user.findFirst()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)
    await recalculate(user.id)
    return ok(reply, { recalculated: true })
  })
}
