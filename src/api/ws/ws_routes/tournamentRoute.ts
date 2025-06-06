import { FastifyInstance, FastifyRequest } from 'fastify';
import { TournamentService } from '../../../domain/tournament/services/TournamentService';
import { Storage } from '../../../storage/Storage';
import { tournamentHandler } from '../handlers/tournamentHandler';
import { tournamentCloseHandler } from '../handlers/tournamentCloseHandler';

const tournaments: Map<string, TournamentService> = new Map();

export async function registerTournamentRoute(app: FastifyInstance) {
  app.get('/tournament', { websocket: true }, async (socket: any, req: FastifyRequest) => {
    const { tid } = req.query as any; 

    if (!tid) {
      socket.send(JSON.stringify({ type: 'error', message: 'Tournament ID (tid) is required' }));
      socket.close();
      return;
    }

    let tournament = tournaments.get(tid);
    if (!tournament) {
      const storage = new Storage();
      tournament = new TournamentService(storage, () => {
        tournaments.delete(tid);
        console.log(`Tournament ${tid} removed`);
      });
      tournaments.set(tid, tournament);
    }
    socket.on('message', tournamentHandler(socket, tournament, tid));
    socket.on('close', tournamentCloseHandler(socket, tournament, tid));
  });
}
