import { FastifyRequest } from 'fastify';
import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';
import { createPlayer } from '../utils/createPlayer';
import { handleMessage } from '../handlers/onMessage';
import { handleClose } from '../handlers/onClose';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';

export function matchmakingHandler(matchmaker: MatchmakingService) {
return async (socket: any, req: FastifyRequest) => {
  const payload = await isTokenValid(req);
  if (!payload) {
    socket.send(JSON.stringify({type: 'error', message: 'Unauthorized'}));
    socket.close();
    return;
  }

  const userId = payload.userId;
  const user = await getUserById(userId);
  if (!user) {
    socket.send(JSON.stringify({type: 'error', message: 'user not found'}));
    socket.close();
    return;
  }

  const { name, mmr } = user;
  const player = createPlayer(userId.toString(), name, mmr, socket);

  console.log(`${name} (${userId}) joined waiting for a match`);
  matchmaker.addPlayer(player);
  socket.send(JSON.stringify({type: 'waiting'}));

  socket.on('message', handleMessage(socket, userId.toString(), name, matchmaker));
  socket.on('close', handleClose(userId.toString(), name, socket, matchmaker));
  };
}

// export function matchmakingHandler(matchmaker: MatchmakingService) {
//   return (socket: any, req: FastifyRequest) => {
//     const { id, name, mmr } = req.query as any;
//     const player = createPlayer(id, name, mmr, socket);

//     console.log(`${name} (${id}) joined waiting for a match`);
//     matchmaker.addPlayer(player);
//     socket.send(JSON.stringify({ type: 'waiting' }));

//     socket.on('message', handleMessage(socket, id, name, matchmaker));
//     socket.on('close', handleClose(id, name, socket, matchmaker));
//   };
// }
