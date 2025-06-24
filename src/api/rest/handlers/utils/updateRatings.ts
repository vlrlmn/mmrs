import CacheStorage from '../../../../domain/cache/CacheStorage';
import { FastifyRequest } from 'fastify';

export async function updateRatings(
  matchId: number,
  results: Array<{ userId: number; place: number }>,
  req: FastifyRequest
) {
  const cache = CacheStorage.getInstance();
  const updates: Array<{ id: number; rating: number }> = [];

  for (const result of results) {
    const currentRating = await cache.getUserRating(result.userId);
    if (currentRating === null) {
      throw new Error(`User ${result.userId} has no rating in cache`);
    }

    let newRating = currentRating;

    if (results.length === 2) {
      newRating = result.place === 0
        ? currentRating + 25
        : Math.max(0, currentRating - 25);
    } else if (results.length === 4) {
      switch (result.place) {
        case 0: newRating = 25; break;
        case 1: newRating = 12; break;
        case 2:
        case 3: newRating = (currentRating - 12 < 0) ? -currentRating : -12; break;
        default: throw new Error('Invalid place for tournament');
      }
    } else {
      throw new Error('Unsupported match format');
    }
    updates.push({ id: result.userId, rating: newRating });
  }

  req.server.storage.updateRatingTransaction(matchId, updates);
  const winner = results.find(r => r.place === 0);
  if (winner) {
    req.server.storage.updateMatchWinner(matchId, winner.userId);
  }

  for (const result of results) {
    await cache.deletePlayerMatch(result.userId.toString());
    await cache.deleteUserRating(result.userId);
  }

  return updates;
}
