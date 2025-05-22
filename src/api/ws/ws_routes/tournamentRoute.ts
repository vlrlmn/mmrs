import { FastifyInstance, FastifyRequest } from 'fastify';
import { TournamentService } from '../../../domain/tournament/services/TournamentService';
import { createPlayer } from '../utils/createPlayer';
import { tournamentHandler } from '../handlers/tournamentHandler';

const tournaments: Map<string, TournamentService> = new Map();

export async function registerTournamentRoute(app: FastifyInstance) {
  app.get('/tournament', { websocket: true }, (socket: any, req: FastifyRequest) => {
    const { id, name, mmr, tid } = req.query as any;

    if (!tid) {
      socket.send(JSON.stringify({ type: 'error', message: 'Tournament ID (tid) is required' }));
      socket.close();
      return;
    }

    const player = createPlayer(id, parseInt(mmr), socket);

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
    tournamentHandler(socket, req, id, mmr, tournament);
  });
}
