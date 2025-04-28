import { FastifyInstance, FastifyRequest } from 'fastify'
import { MatchmakingService } from '../../domain/matchmaking/MatchmakingService'

const matchmaker = new MatchmakingService()

export async function registerWsRoutes(app: FastifyInstance) {
  app.get('/matchmaking', { websocket: true }, (socket: any, req: FastifyRequest) => {
    
    const { id, name, mmr } = req.query as any
    
    const player = {
      id, 
      name,
      mmr: parseInt(mmr),
      socket,
      joinedAt: Date.now()
    }

    console.log(`${name} (${id} joined waiting for a match)`)
    matchmaker.addPlayer(player)
    socket.send(JSON.stringify( { type: 'waiting' }))

    socket.on('message', (rawMessage: string) => {
      try {
        const message = JSON.parse(rawMessage);
        if (message.type === 'confirm_match') {
          console.log(`${name} (${id}) confirmed the match`)
          const success = matchmaker.confirmMatch(id)

          if (!success) {
            console.log(`No pendong match found for ${id} yet`)
          }
        }
      } catch (error) {
          console.error('Invalid message format:', error)
      }
    });

    socket.on('close', () => {
      matchmaker.removePlayer(id)
      console.log(`${name} (${id}) left matchmaking`)
      })
  })

  setInterval(() => {
    matchmaker.processQueue()
  }, 1000)
}