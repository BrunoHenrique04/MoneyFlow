import { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Browsers send OPTIONS preflight without auth headers.
  if (request.method === 'OPTIONS') return

  const apiKey = request.headers['x-api-key']
  const expectedKey = process.env.API_KEY ?? 'dev-secret-key'
  if (apiKey !== expectedKey) {
    reply.code(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } })
  }
}
