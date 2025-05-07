import { FastifyInstance, FastifyRegister, FastifyRequest} from 'fastify'
import { MatchmakingService } from '../../domain/matchmaking/services/MatchmakingService'
import { tournamentHandler } from './ws_routes/tournamentRoute'
import { TournamentService } from '../../domain/tournament/services/TournamentService';
import { matchmakingHandler } from './ws_routes/matchmakingRoute';
import { TournamentManager } from '../../domain/tournament/services/TournamentManager';
import { createPlayer } from './utils/createPlayer';

const matchmaker = new MatchmakingService();
const tournament = new TournamentService();
const manager = new TournamentManager();

export async function registerWsRoutes(app: FastifyInstance) {
  app.get('/matchmaking', { websocket: true }, matchmakingHandler(matchmaker));

  app.get('/tournament', {websocket: true}, (socket: any, req: FastifyRequest) => {
    const {id, name, mmr} = req.query as any;
    const player = createPlayer(id, name, parseInt(mmr), socket);

    const tournament = manager.addPlayer(player);
    tournamentHandler(socket, req, id, name, mmr, tournament)
  });

  app.post('/reset-tournament', async (req, res) => {
    tournament.resetTournament();
    res.send({ message: 'Tournament reset' });
  });

  setInterval(() => {
    matchmaker.processQueue();
    matchmaker.checkPendingMatches();
  }, 1000);
}