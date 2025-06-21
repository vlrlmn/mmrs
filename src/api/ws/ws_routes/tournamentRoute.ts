import { FastifyInstance, FastifyRequest } from 'fastify';
import { TournamentService } from '../../../domain/tournament/services/TournamentService';
import { Storage } from '../../../storage/Storage';
import { tournamentHandler } from '../handlers/tournamentHandler';
import { tournamentCloseHandler } from '../handlers/tournamentCloseHandler';

const tournaments: Map<number, TournamentService> = new Map();
let tournamentCounter = 1;

function getAvailableTournament(): { id: number, tournament: TournamentService } {
  const currentId = tournamentCounter;
  let current = tournaments.get(currentId);

  if (!current || current.getPlayerCount() >= 4) {
    tournamentCounter++;
    const newId = tournamentCounter;
    const storage = new Storage();
    current = new TournamentService(storage, () => {
      tournaments.delete(newId);
      console.log(`Tournament ${newId} removed`);
    });
    tournaments.set(newId, current);
    return { id: newId, tournament: current };
  }

  return { id: currentId, tournament: current };
}

export async function registerTournamentRoute(app: FastifyInstance) {
  app.get('/mmrs/api/ws/tournament', { websocket: true }, async (socket: any, _req: FastifyRequest) => {
    const { id, tournament } = getAvailableTournament();
    console.log(`Tournament handler. ID: ${id}`);

    socket.on('message', tournamentHandler(socket, tournament, id));
    socket.on('close', tournamentCloseHandler(socket, tournament, id));
    console.log(`Socket listeners count before adding error listener:`, socket.listenerCount('error'));
    socket.on('error', (err: any) => {
      console.error('Socket error:', err);
    });
    console.log(`Socket listeners count after adding error listener:`, socket.listenerCount('error'));

  });
}
