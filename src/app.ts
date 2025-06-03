import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { registerWsRoutes } from './api/ws/ws'
import { registerRestRoutes } from './api/rest/rest'
import cors from '@fastify/cors'
import Config from './config/Config'
import fp from 'fastify-plugin'
import { Storage } from './storage/Storage'

const app = Fastify({
  logger: true,
})

async function main() {
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  
  await app.register(websocket);
  
  const storagePlugin = fp(async (app) => {
    const storage = new Storage();
    app.decorate('storage', storage);
    app.addHook('onClose', (app, done) => {
      storage.close();
      done();
    });
  });
  
  
  await app.register(storagePlugin);
  await registerRestRoutes(app);
  await registerWsRoutes(app);

  app.listen({ port: Config.getInstance().getPort() }, (err, address) => {
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
