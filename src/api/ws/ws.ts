import { FastifyInstance, FastifyRequest } from 'fastify';
import { registerTournamentRoute} from './ws_routes/tournamentRoute';
import { registerMatchmakingRoute } from './ws_routes/matchmakingRoute';

export async function registerWsRoutes(app: FastifyInstance) {
  await registerMatchmakingRoute(app);
  await registerTournamentRoute(app);
}
