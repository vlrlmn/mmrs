import { FastifyInstance } from 'fastify'
import { IHandler } from '../../pkg/handler/handler'
import { pingHandler } from './handlers/ping'
import { rootHandler } from './handlers/root'
import { statsHandler } from './handlers/statsHandler'
import { opponentConfirmedHandler } from './handlers/opponentConfirmed'
import { getRatingUpdatesHandler } from './handlers/getRatingUpdatesHandler'
import { reconnectPlayerHandler } from './handlers/reconnectPlayerHandler'
import { rateMatchHandler } from './handlers/rateMatchHandler'

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
    method: 'GET',
    route: '/mmrs/api/rest/stats/:userId',
    handler: statsHandler
  },
  {
    method: 'POST',
    route: '/mmrs/internal/match/:matchId/rate',
    handler: rateMatchHandler
  },
  {
    method: 'POST',
    route: '/mmrs/internal/opponent-confirmed',
    handler: opponentConfirmedHandler
  },
  {
    method: 'GET',
    route: '/mmrs/api/rest/rating/updates/:userId',
    handler: getRatingUpdatesHandler
  },
  {
    method: 'GET',
    route: '/mmrs/api/rest/reconnect',
    handler: reconnectPlayerHandler
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
