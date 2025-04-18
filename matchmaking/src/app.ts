import Fastify from 'fastify'
import websocket from '@fastify/websocket'

import { registerWsRoutes } from './api/ws/ws'
import { registerRestRoutes } from './api/rest/rest'

const app =  Fastify();

async function main() {
  await app.register(websocket);

  await registerRestRoutes(app)
  await registerWsRoutes(app)

  app.listen({ port: 3000 }, (err, address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
    console.log("Server listening at " + address)
  })

}

main()
