import { FastifyInstance } from 'fastify'
import { UpdateUserSchema } from '@moneyflow/shared'
import * as userService from '../services/user.service'
import { ok, fail } from '../helpers'

export async function userRoutes(app: FastifyInstance) {
  app.get('/user', async (_req, reply) => {
    const user = await userService.getUser()
    if (!user) return fail(reply, 'NOT_FOUND', 'No user found', 404)
    return ok(reply, user)
  })

  app.patch('/user', async (req, reply) => {
    const parsed = UpdateUserSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    const user = await userService.updateUser(parsed.data)
    return ok(reply, user)
  })
}
