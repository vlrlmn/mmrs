// import { FastifyRequest, FastifyReply } from 'fastify';
// import { Storage } from '../../../storage/Storage';
// import CacheStorage from '../../../domain/cache/CacheStorage';

// export async function handleTournamentResults(req: FastifyRequest, reply: FastifyReply) {
//   try {
//     const { matchId, results } = req.body as {
//       matchId: number;
//       results: number[];
//     };

//     if (!matchId || !Array.isArray(results) || results.length !== 4) {
//       return reply.code(400).send({ error: 'Invalid data' });
//     }

//     const ratingUpdates = [
//       { id: results[0], rating: 25 },
//       { id: results[1], rating: 12 },
//       { id: results[2], rating: -12 },
//       { id: results[3], rating: -12 }
//     ];

//     const storage = new Storage();
//     storage.updateRatingTransaction(matchId, ratingUpdates);
//     const cache = CacheStorage.getInstance();
//     for (const userId of results) {
//       await cache.deletePlayerMatch(userId.toString());
//       await cache.deleteUserRating(userId);
//     }
//     return reply.code(200).send({ message: 'Ratings updated' });
//   } catch (err) {
//     console.error(err);
//     return reply.code(500).send({ error: 'Internal server error' });
//   }
// }
