import { FastifyRequest, FastifyReply } from 'fastify';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';

export async function statsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await isTokenValid(request);
    if (!payload || !payload.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { p } = request.query as { p?: string};
    const page = parseInt(p || '0');
    if (isNaN(page)) {
      return reply.code(400).send({ error: 'Invalid page number' });
    }

    const storage = request.server.storage;
    const matches = storage.getMatchesForUser(payload.userId, page);

    if (!matches || matches.length === 0) {
      return reply.code(204).send();
    }
    return reply.code(200).send(matches);
  } catch (error) {
    console.error('Error in statsHandler:', error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}
