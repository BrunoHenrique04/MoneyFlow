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
    try {
      return ok(reply, await categoryService.updateCategory(id, parsed.data))
    } catch (e: unknown) {
      const err = e as { code?: string; message: string }
      if (err.code === 'CANNOT_EDIT_DEFAULT_CATEGORY') {
        return fail(reply, 'FORBIDDEN', err.message, 403)
      }
      throw e
    }
  })

  app.delete('/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await categoryService.deleteCategory(id)
      return ok(reply, { deleted: true })
    } catch (e: unknown) {
      const err = e as { code?: string; message: string }
      if (err.code === 'CANNOT_DELETE_DEFAULT_CATEGORY') {
        return fail(reply, 'FORBIDDEN', err.message, 403)
      }
      throw e
    }
  })
}
