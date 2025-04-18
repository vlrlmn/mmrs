import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Matchmaker } from '../domain/matchmaking/matchmaker'

const matchmaker = new Matchmaker()

export async function registerMatchmakingRoutes(app: FastifyInstance) {
  app.post('/match', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, skill } = request.body as { userId: number; skill: number }

    matchmaker.addToQueue({ userId, skill })

    const match = matchmaker.findMatch()

    if (match) {
      return reply.send(match)
    } else {
      return reply.send({ message: 'Waiting for match...' })
    }
  })
}
