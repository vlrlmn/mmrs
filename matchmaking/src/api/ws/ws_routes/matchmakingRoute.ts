import { FastifyRequest } from 'fastify';
import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';
import { createPlayer } from '../utils/createPlayer';
import { handleMessage } from '../handlers/onMessage';
import { handleClose } from '../handlers/onClose';

export function matchmakingHandler(matchmaker: MatchmakingService) {
  return (socket: any, req: FastifyRequest) => {
    const { id, name, mmr } = req.query as any;
    const player = createPlayer(id, name, mmr, socket);

    console.log(`${name} (${id}) joined waiting for a match`);
    matchmaker.addPlayer(player);
    socket.send(JSON.stringify({ type: 'waiting' }));

    socket.on('message', handleMessage(socket, id, name, matchmaker));
    socket.on('close', handleClose(id, name, socket, matchmaker));
  };
}
