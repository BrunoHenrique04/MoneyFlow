import { FastifyInstance } from 'fastify'
import { CreateDebtSchema, UpdateDebtSchema } from '@moneyflow/shared'
import * as debtService from '../services/debt.service'
import { ok, fail } from '../helpers'

export async function debtRoutes(app: FastifyInstance) {
  app.get('/debts', async (req, reply) => {
    const { pessoa, situacao } = req.query as { pessoa?: string; situacao?: string }
    return ok(reply, await debtService.listDebts({ pessoa, situacao }))
  })

  app.post('/debts', async (req, reply) => {
    const parsed = CreateDebtSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await debtService.createDebt(parsed.data), 201)
  })

  app.patch('/debts/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateDebtSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await debtService.updateDebt(id, parsed.data))
  })

  app.delete('/debts/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await debtService.deleteDebt(id)
    return ok(reply, { deleted: true })
  })

  // ODS file import
  app.post('/debts/import', async (req, reply) => {
    const data = await req.file()
    if (!data) return fail(reply, 'VALIDATION_ERROR', 'Nenhum arquivo enviado', 400)

    const ext = data.filename.split('.').pop()?.toLowerCase()
    if (!ext || !['ods', 'xlsx', 'xls', 'csv'].includes(ext)) {
      return fail(reply, 'VALIDATION_ERROR', 'Formato inválido. Use ODS, XLSX ou CSV.', 400)
    }

    const buffer = await data.toBuffer()
    try {
      const result = await debtService.importFromOds(buffer)
      return ok(reply, result, 201)
    } catch (e: unknown) {
      const err = e as { code?: string; message: string }
      if (err.code === 'EMPTY_FILE') return fail(reply, 'VALIDATION_ERROR', err.message, 400)
      throw e
    }
  })
}
