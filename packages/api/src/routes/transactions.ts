import { FastifyInstance } from 'fastify'
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  PayTransactionSchema,
} from '@moneyflow/shared'
import * as txService from '../services/transaction.service'
import { ok, fail } from '../helpers'

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/transactions', async (req, reply) => {
    const q = req.query as Record<string, string>
    return ok(reply, await txService.listTransactions(q))
  })

  app.post('/transactions', async (req, reply) => {
    const parsed = CreateTransactionSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await txService.createTransaction(parsed.data), 201)
  })

  app.patch('/transactions/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateTransactionSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await txService.updateTransaction(id, parsed.data))
  })

  app.delete('/transactions/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { cancelFuture } = req.query as { cancelFuture?: string }
    await txService.deleteTransaction(id, cancelFuture === 'true')
    return ok(reply, { cancelled: true })
  })

  app.patch('/transactions/:id/pay', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = PayTransactionSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await txService.payTransaction(id, parsed.data.paidAt))
  })
}
