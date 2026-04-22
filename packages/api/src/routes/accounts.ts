import { FastifyInstance } from 'fastify'
import { CreateAccountSchema, UpdateAccountSchema } from '@moneyflow/shared'
import * as accountService from '../services/account.service'
import { ok, fail } from '../helpers'

export async function accountRoutes(app: FastifyInstance) {
  app.get('/accounts', async (_req, reply) => {
    return ok(reply, await accountService.listAccounts())
  })

  app.post('/accounts', async (req, reply) => {
    const parsed = CreateAccountSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await accountService.createAccount(parsed.data), 201)
  })

  app.patch('/accounts/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateAccountSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await accountService.updateAccount(id, parsed.data))
  })

  app.delete('/accounts/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await accountService.deleteAccount(id)
      return ok(reply, { deleted: true })
    } catch (e: unknown) {
      const err = e as { code?: string; message: string }
      if (err.code === 'ACCOUNT_HAS_TRANSACTIONS') {
        return fail(reply, 'ACCOUNT_HAS_TRANSACTIONS', err.message, 409)
      }
      throw e
    }
  })
}
