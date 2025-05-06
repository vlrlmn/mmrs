import { FastifyInstance, FastifyRegister, FastifyRequest} from 'fastify'
import { MatchmakingService } from '../../domain/matchmaking/services/MatchmakingService'
import { tournamentHandler } from './ws_routes/tournamentRoute'
import { TournamentService } from '../../domain/tournament/services/TournamentService';
import { matchmakingHandler } from './ws_routes/matchmakingRoute';

const matchmaker = new MatchmakingService();
const tournament = new TournamentService();

export async function registerWsRoutes(app: FastifyInstance) {
  app.get('/matchmaking', { websocket: true }, matchmakingHandler(matchmaker));

  setInterval(() => {
    matchmaker.processQueue();
    matchmaker.checkPendingMatches();
  }, 1000);
}

export function registerTournamnetRoute(app: FastifyInstance) {
  app.get('/tournament', {websocket: true}, (socket: any, req: FastifyRequest) => {
    const {id, name, mmr} = req.query as any;
    tournamentHandler(socket, req, id, name, mmr, tournament)
  }); 
}