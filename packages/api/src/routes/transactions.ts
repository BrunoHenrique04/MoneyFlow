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

  app.get('/transactions/projections', async (req, reply) => {
    const { month } = req.query as { month?: string }
    const now = new Date()
    const m = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return ok(reply, await txService.getProjections(m))
  })

  app.post('/transactions', async (req, reply) => {
    const parsed = CreateTransactionSchema.safeParse(req.body)
    if (!parsed.success) return fail(reply, 'VALIDATION_ERROR', parsed.error.message, 400)
    return ok(reply, await txService.createTransaction(parsed.data), 201)
  })

  app.post('/transactions/import', async (req, reply) => {
    const data = await req.file()
    if (!data) return fail(reply, 'VALIDATION_ERROR', 'Nenhum arquivo enviado', 400)
    const ext = data.filename.split('.').pop()?.toLowerCase()
    if (!ext || !['ods', 'xlsx', 'xls', 'csv'].includes(ext)) {
      return fail(reply, 'VALIDATION_ERROR', 'Formato inválido. Use ODS, XLSX ou CSV.', 400)
    }
    const buffer = await data.toBuffer()
    try {
      const result = await txService.importFromFile(buffer)
      return ok(reply, result, 201)
    } catch (e: unknown) {
      const err = e as { code?: string; message: string }
      if (err.code === 'EMPTY_FILE') return fail(reply, 'VALIDATION_ERROR', err.message, 400)
      throw e
    }
  })

  app.get('/transactions/export', async (req, reply) => {
    const { month } = req.query as { month?: string }
    const buffer = await txService.exportTransactions(month)
    const filename = month ? `lancamentos-${month}.xlsx` : 'lancamentos.xlsx'
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
    return reply.send(buffer)
  })

  app.post('/transactions/migrate-debts', async (req, reply) => {
    return ok(reply, await txService.migrateDebtsToTransactions())
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
