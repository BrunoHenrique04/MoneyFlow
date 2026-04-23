import { FastifyInstance } from 'fastify'
import { CreateRecurringTemplateSchema, UpdateRecurringTemplateSchema } from '@moneyflow/shared'
import * as recurringService from '../services/recurring.service'
import { ok, fail } from '../helpers'

export async function recurringRoutes(app: FastifyInstance) {
  app.get('/recurring-templates', async (_req, reply) => {
    return ok(reply, await recurringService.listTemplates())
  })

  app.post('/recurring-templates', async (req, reply) => {
    const parsed = CreateRecurringTemplateSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await recurringService.createTemplate(parsed.data), 201)
  })

  app.patch('/recurring-templates/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateRecurringTemplateSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await recurringService.updateTemplate(id, parsed.data))
  })

  app.delete('/recurring-templates/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await recurringService.deactivateTemplate(id)
    return ok(reply, { deactivated: true })
  })

  // Manual trigger: generate transactions for a given month
  app.post('/recurring-templates/generate', async (req, reply) => {
    const { month } = req.query as { month?: string }
    const target = month ?? (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })()
    return ok(reply, await recurringService.generateAllForMonth(target))
  })
}
