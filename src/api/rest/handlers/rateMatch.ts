import { FastifyRequest, FastifyReply } from 'fastify';
import { Storage } from '../../../db/Storage'

export async function rateMatchHandler(req: FastifyRequest, reply: FastifyReply) {
  const storage = new Storage();
  const result = await storage.testRequestToDB()
}
