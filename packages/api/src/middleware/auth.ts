import { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    reply.code(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } })
  }
}
