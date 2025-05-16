import { FastifyInstance } from 'fastify'
import { IHandler } from '../../pkg/handler/handler'
import { pingHandler } from './handlers/ping'
import { rootHandler } from './handlers/root'

const routes: IHandler[] = [
  {
    method: 'GET',
    route: '/ping',
    handler: pingHandler
  },
  {
    method: 'GET',
    route: '/',
    handler: rootHandler
  }
]

export async function registerRestRoutes(app: FastifyInstance) {
  for (const route of routes) {
    app.route({
      method: route.method,
      url: route.route,
      handler: route.handler
    })
  }
}
