import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { registerWsRoutes } from './api/ws/ws'
import { registerRestRoutes } from './api/rest/rest'
import { readFileSync } from 'fs'

const options = {
  key: readFileSync('./localhost+2-key.pem'),
  cert: readFileSync('./localhost+2.pem'),
}

const app = Fastify({
  logger: true,
  https: options
})

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
