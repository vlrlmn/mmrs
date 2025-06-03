import { FastifyRequest, FastifyReply } from 'fastify'
import { Storage } from '../../../storage/Storage'

export async function pingHandler(request: FastifyRequest, reply: FastifyReply) {
  const storage = new Storage()
  const result = await storage.testRequestToDB()
  return { pong: result }
}
