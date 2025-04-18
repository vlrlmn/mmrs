import { FastifyInstance, FastifyRequest } from 'fastify'

const waitingPlayers: any[] = []

export async function registerWsRoutes(app: FastifyInstance) {

  app.get('/matchmaking', { websocket: true }, (socket: any, req: FastifyRequest) => {
    console.log("Looking for a player")
    socket.send('something in resp');

    waitingPlayers.push(socket)
    if (waitingPlayers.length >= 2) {
        const player1 = waitingPlayers.shift()
        const player2 = waitingPlayers.shift()
        player1.send(JSON.stringify({ type: 'match_found', opponent: 'Player2' }))
        player2.send(JSON.stringify({ type: 'match_found', opponent: 'Player1' }))
    }
    socket.on('close', () => {
        console.log('Player disconnected')
        const index = waitingPlayers.indexOf(socket)
        if (index !== -1) waitingPlayers.splice(index, 1)
      })
  })
}