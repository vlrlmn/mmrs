import { FastifyRequest, FastifyReply } from 'fastify'

export async function rootHandler(request: FastifyRequest, reply: FastifyReply) {
  return { pong: "server is responding" }
}
