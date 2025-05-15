import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { registerWsRoutes } from './api/ws/ws'
import { registerRestRoutes } from './api/rest/rest'
import { readFileSync } from 'fs'
import cors from '@fastify/cors'

const options = {
  key: readFileSync('./localhost+2-key.pem'),
  cert: readFileSync('./localhost+2.pem'),
}

const app = Fastify({
  logger: true,
  https: options
})

async function main() {
  await app.register(cors, {
    origin: ['http://localhost:3000'],
    credentials: true
  });
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

  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT (Ctrl+C). Shutting down gracefully...')
    await app.close()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...')
    await app.close()
    process.exit(0)
  })
  
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    process.exit(1)
  })
}

main()
