import { FastifyInstance, FastifyRequest } from 'fastify';
import { TournamentService } from '../../../domain/tournament/services/TournamentService';
import { createPlayer } from '../utils/createPlayer';
import { Storage } from '../../../storage/Storage';

const tournaments: Map<string, TournamentService> = new Map();

export async function registerTournamentRoute(app: FastifyInstance) {
  app.get('/tournament', { websocket: true }, async (socket: any, req: FastifyRequest) => {
    const { id, mmr, tid } = req.query as any;

    if (!tid) {
      socket.send(JSON.stringify({ type: 'error', message: 'Tournament ID (tid) is required' }));
      socket.close();
      return;
    }

    const player = createPlayer(id, parseInt(mmr), socket);

    let tournament = tournaments.get(tid);
    if (!tournament) {
      const storage = new Storage();
      tournament = new TournamentService(storage, () => {
        tournaments.delete(tid);
        console.log(`Tournament ${tid} removed`);
      });
      tournaments.set(tid, tournament);
    }

    const added = await tournament.addPlayer(player);
    if (!added) {
      socket.send(JSON.stringify({ type: 'error', message: 'Tournament already in progress' }));
      socket.close();
      return;
    }
  });
}
// tournamentHandler(socket, req, id, mmr, tournament);
