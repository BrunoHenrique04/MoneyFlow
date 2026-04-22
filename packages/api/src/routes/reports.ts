import { FastifyInstance } from 'fastify'
import * as reportService from '../services/report.service'
import { ok } from '../helpers'

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/monthly', async (req, reply) => {
    const { month } = req.query as { month?: string }
    return ok(reply, await reportService.getMonthlyReport(month))
  })

  app.get('/reports/installment-timeline', async (req, reply) => {
    const { months } = req.query as { months?: string }
    return ok(reply, await reportService.getInstallmentTimeline(months ? parseInt(months) : 6))
  })
}
