import { FastifyInstance } from 'fastify'
import { CreateGoalSchema, UpdateGoalSchema, GoalDepositSchema } from '@moneyflow/shared'
import * as goalService from '../services/goal.service'
import { ok, fail } from '../helpers'

export async function goalRoutes(app: FastifyInstance) {
  app.get('/goals', async (req, reply) => {
    const { status } = req.query as { status?: string }
    return ok(reply, await goalService.listGoals(status))
  })

  app.post('/goals', async (req, reply) => {
    const parsed = CreateGoalSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await goalService.createGoal(parsed.data), 201)
  })

  app.patch('/goals/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateGoalSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await goalService.updateGoal(id, parsed.data))
  })

  app.delete('/goals/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await goalService.deleteGoal(id)
    return ok(reply, { deleted: true })
  })

  app.post('/goals/:id/deposit', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = GoalDepositSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    const { amount, month, note } = parsed.data
    return ok(reply, await goalService.depositGoal(id, amount, month, note))
  })

  app.get('/goals/:id/deposits', async (req, reply) => {
    const { id } = req.params as { id: string }
    return ok(reply, await goalService.getGoalDeposits(id))
  })

  app.patch('/goals/:id/pause', async (req, reply) => {
    const { id } = req.params as { id: string }
    return ok(reply, await goalService.pauseGoal(id))
  })

  app.patch('/goals/:id/resume', async (req, reply) => {
    const { id } = req.params as { id: string }
    return ok(reply, await goalService.resumeGoal(id))
  })
}
