import { FastifyRequest, FastifyReply } from 'fastify';
import CacheStorage from '../../../domain/cache/CacheStorage';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';

export async function rateMatchHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const matchIdRaw = (req.params as any).matchId;
    const matchId = parseInt(matchIdRaw, 10);

    if (isNaN(matchId)) {
      return reply.code(400).send({ error: 'Invalid match ID' });
    }

    const { status, results } = req.body as {
      status: number,
      results: Array<{ userId: number; place: number }>
    };

    if (!Array.isArray(results) || typeof status !== 'number') {
      return reply.code(400).send({ error: 'Invalid payload format' });
    }

    if (status === 2) {
      return reply.code(200).send({ message: 'Match failed, no MMR changes made' });
    }

    const updates: Array<{ id: number, rating: number }> = [];
    const cache = CacheStorage.getInstance();

    if (results.length === 2) {
      for (const result of results) {
        if (typeof result.userId !== 'number' || typeof result.place !== 'number') {
          return reply.code(400).send({ error: 'Invalid userId or place format' });
        }

        const currentRating = await cache.getUserRating(result.userId) as number;
        let ratingChange = 0;

        if (result.place === 1) {
          ratingChange = 25;
        } else {
          ratingChange = (currentRating - 25 < 0) ? -currentRating : -25;
        }
        updates.push({ id: result.userId, rating: ratingChange });
      }
    } else if (results.length === 4) {
      for (const result of results) {
        if (typeof result.userId !== 'number' || typeof result.place !== 'number') {
          return reply.code(400).send({ error: 'Invalid userId or place format' });
        }

        const currentRating = await cache.getUserRating(result.userId) as number;
        let ratingChange = 0;

        switch (result.place) {
          case 1:
            ratingChange = 25;
            break;
          case 2:
            ratingChange = 12;
            break;
          case 3:
          case 4:
            ratingChange = (currentRating - 12 < 0) ? -currentRating : -12;
            break;
          default:
            return reply.code(400).send({ error: 'Invalid place for tournament' });
        }

        updates.push({ id: result.userId, rating: ratingChange });
      }
    } else {
      return reply.code(400).send({ error: 'Unsupported match format' });
    }

    req.server.storage.updateRatingTransaction(updates);
    const winner = results.find(r => r.place === 1);
    if (winner) {
      req.server.storage.updateMatchWinner(matchId, winner.userId);
    }
    for (const result of results) {
      await cache.deletePlayerMatch(result.userId.toString());
      await cache.deleteUserRating(result.userId);
    }

    return reply.code(200).send({ success: true, updated: updates.length });
  } catch (error: any) {
    console.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}
