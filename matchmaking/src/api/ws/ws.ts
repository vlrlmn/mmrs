import { FastifyInstance} from 'fastify'
import { MatchmakingService } from '../../domain/matchmaking/services/MatchmakingService'
import { matchmakingHandler } from './ws_routes/matchmakingRoute'

const matchmaker = new MatchmakingService();

export async function registerWsRoutes(app: FastifyInstance) {
  app.get('/matchmaking', { websocket: true }, matchmakingHandler(matchmaker));

  setInterval(() => {
    matchmaker.processQueue();
    matchmaker.checkPendingMatches();
  }, 1000);
}