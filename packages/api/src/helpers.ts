import { FastifyReply } from 'fastify'

export function ok<T>(reply: FastifyReply, data: T, status = 200) {
  return reply.code(status).send({ data, error: null })
}

export function fail(reply: FastifyReply, code: string, message: string, status: number) {
  return reply.code(status).send({ data: null, error: { code, message } })
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
