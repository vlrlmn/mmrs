import { FastifyRequest, FastifyReply } from 'fastify';
import CacheStorage from '../../../domain/cache/CacheStorage';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';
import { TokenType } from '../../../pkg/jwt/JwtGenerator';

export async function reconnectPlayerHandler(req: FastifyRequest, reply: FastifyReply) {
	try {
		const payload = await isTokenValid(req, TokenType.Access);

		if (!payload) {
			return reply.code(401).send({ error: 'Invalid or missing token' });
		}

		const userId = payload.userId;

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
