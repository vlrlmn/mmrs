import { FastifyInstance, FastifyRequest } from 'fastify';
import { MatchmakingService } from '../../domain/matchmaking/services/MatchmakingService';
import { TournamentService } from '../../domain/tournament/services/TournamentService';
import { tournamentHandler } from './ws_routes/tournamentRoute';
import { matchmakingHandler } from './ws_routes/matchmakingRoute';
import { createPlayer } from './utils/createPlayer';

const matchmaker = new MatchmakingService();
const tournaments: Map<string, TournamentService> = new Map();

export async function registerWsRoutes(app: FastifyInstance) {
  app.get('/matchmaking', { websocket: true }, matchmakingHandler(matchmaker));

  app.get('/tournament', { websocket: true }, (socket: any, req: FastifyRequest) => {
    const { id, name, mmr, tid } = req.query as any;

    if (!tid) {
      socket.send(JSON.stringify({ type: 'error', message: 'Tournament ID (tid) is required' }));
      socket.close();
      return;
    }

    const player = createPlayer(id, name, parseInt(mmr), socket);

    let tournament = tournaments.get(tid);
    if (!tournament) {
      tournament = new TournamentService(() => {
        tournaments.delete(tid);
        console.log(`Tournament ${tid} removed`);
      });
      tournaments.set(tid, tournament);
    }
    
    const added = tournament.addPlayer(player);
    if (!added) {
      socket.send(JSON.stringify({ type: 'error', message: 'Tournament already in progress' }));
      socket.close();
      return;
    }

    tournamentHandler(socket, req, id, name, mmr, tournament);
  });

  setInterval(() => {
    matchmaker.processQueue();
    matchmaker.checkPendingMatches();
  }, 1000);
}
