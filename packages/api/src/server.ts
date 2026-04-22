import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { authMiddleware } from './middleware/auth'
import { userRoutes } from './routes/user'
import { accountRoutes } from './routes/accounts'
import { categoryRoutes } from './routes/categories'
import { transactionRoutes } from './routes/transactions'
import { goalRoutes } from './routes/goals'
import { recommendationRoutes } from './routes/recommendations'
import { reportRoutes } from './routes/reports'
import { settingsRoutes } from './routes/settings'
import { debtRoutes } from './routes/debts'

const app = Fastify({ logger: true })

async function bootstrap() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10 MB

  app.addHook('onRequest', authMiddleware)

  await app.register(
    async (api) => {
      await api.register(userRoutes)
      await api.register(accountRoutes)
      await api.register(categoryRoutes)
      await api.register(transactionRoutes)
      await api.register(goalRoutes)
      await api.register(recommendationRoutes)
      await api.register(reportRoutes)
      await api.register(settingsRoutes)
      await api.register(debtRoutes)
    },
    { prefix: '/api/v1' },
  )

  app.get('/health', async () => ({ status: 'ok' }))

  const port = Number(process.env.PORT ?? 3001)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`MoneyFlow API running on http://localhost:${port}/api/v1`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
