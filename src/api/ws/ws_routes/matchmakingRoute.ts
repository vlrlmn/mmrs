import { FastifyInstance, FastifyRequest } from 'fastify';
import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';
import { matchmakingHandler } from '../handlers/matchmakingHandler';
import { handleClose } from '../handlers/disconnectHandler';

export async function registerMatchmakingRoute(app: FastifyInstance) {
  const matchmaker = new MatchmakingService(app.storage);

  app.get('/matchmaking', { websocket: true }, (socket: any, req: FastifyRequest) => {
    socket.on('message', matchmakingHandler(socket, matchmaker));
    socket.on('close', handleClose(socket, matchmaker));
  });

  setInterval(() => {
    matchmaker.processQueue();
    matchmaker.checkPendingMatches();
  }, 1000);
}


