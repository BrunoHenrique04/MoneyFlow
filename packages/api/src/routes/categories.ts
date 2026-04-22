import { FastifyInstance } from 'fastify'
import { CreateCategorySchema, UpdateCategorySchema } from '@moneyflow/shared'
import * as categoryService from '../services/category.service'
import { ok, fail } from '../helpers'

export async function categoryRoutes(app: FastifyInstance) {
  app.get('/categories', async (_req, reply) => {
    return ok(reply, await categoryService.listCategories())
  })

  app.post('/categories', async (req, reply) => {
    const parsed = CreateCategorySchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await categoryService.createCategory(parsed.data), 201)
  })

  app.patch('/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateCategorySchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await categoryService.updateCategory(id, parsed.data))
  })

  app.delete('/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await categoryService.deleteCategory(id)
      return ok(reply, { deleted: true })
    } catch (e: unknown) {
      const err = e as { code?: string; message: string }
      if (err.code === 'CATEGORY_HAS_TRANSACTIONS') {
        return fail(reply, 'CONFLICT', err.message, 409)
      }
      throw e
    }
  })
}
