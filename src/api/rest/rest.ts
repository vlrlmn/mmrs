import { FastifyInstance } from 'fastify'
import { IHandler } from '../../pkg/handler/handler'
import { pingHandler } from './handlers/ping'
import { rootHandler } from './handlers/root'
import { statsHandler } from './handlers/statsHandler'
import { rateMatchHandler } from './handlers/rateMatch'

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
  },
  {
    method: 'GET',
    route: '/mmrs/api/rest/stats',
    handler: statsHandler
  },
  {
    method: 'POST',
    route: '/mmrs/internal/match/:matchId/rate',
    handler: rateMatchHandler
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
