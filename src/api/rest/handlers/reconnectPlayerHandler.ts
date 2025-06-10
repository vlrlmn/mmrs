import { FastifyRequest, FastifyReply } from 'fastify';
import CacheStorage from '../../../domain/cache/CacheStorage';

export async function reconnectPlayerHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const userIdRaw = (req.query as any).userId;
        const userId = parseInt(userIdRaw, 10);

        if (isNaN(userId)) {
            return reply.code(400).send({ error: 'Invalid userId' });
        }

        const cache = CacheStorage.getInstance();
        const matchId = await cache.getPlayerMatch(userId.toString());

        if (!matchId) {
            return reply.code(204).send();
        }

        return reply.code(200).send({ matchId });
    } catch (error) {
        console.error('ReconnectPlayerHandler error:', error);
        return reply.code(500).send({ error: 'Internal server error' });
    }
}
