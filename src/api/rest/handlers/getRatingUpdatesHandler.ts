import { FastifyRequest, FastifyReply } from 'fastify';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';

export async function getRatingUpdatesHandler(request: FastifyRequest, reply: FastifyReply) {
  const token = (request.headers.authorization || '').replace('Bearer ', '');
  const payload = await isTokenValid(token);

  if (!payload) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  const { userId: rawUserId } = request.params as { userId: string };
  const userId = parseInt(rawUserId, 10);

  if (isNaN(userId)) {
    return reply.code(400).send({ error: 'Bad Request: userId must be a number' });
  }

  try {
    const storage = request.server.storage;

    const player = storage.getPlayer(userId);
    if (!player) {
      return reply.code(400).send({ error: 'Bad Request: user does not exist' });
    }
  
    const data = storage.getRatingUpdates(userId);
    if (data.playedMatches === 0) {
      return reply.code(200).send({
        playedMatches: 0,
        updates: []
      });
    }

    return reply.code(200).send(data);
  } catch (err) {
    console.error('Error in getRatingUpdatesHandler:', err);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}

