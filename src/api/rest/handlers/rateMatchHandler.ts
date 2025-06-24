import { FastifyRequest, FastifyReply } from 'fastify';
import { updateRatings } from './utils/updateRatings';
import { updateUMS } from './utils/updateUMS';
import { parseMatchId, validatePayload } from './utils/helpers';
import { TournamentManager } from '../../../domain/tournament/TournamentManager';
import { Storage } from '../../../storage/Storage';
import CacheStorage from '../../../domain/cache/CacheStorage';

export async function rateMatchHandler(req: FastifyRequest, reply: FastifyReply) {
	try {
		const storage = new Storage();
		const cache = CacheStorage.getInstance();
		const matchId = parseMatchId(req, reply);
		if (matchId === null) return;

		const { status, results, isTournament } = req.body as {
			status: number;
			results: Array<{ userId: number; place: number }>;
			isTournament?: boolean;
		};

		if (!validatePayload(status, results, reply)) {
			return reply.code(400).send({ type: 'error', message: 'Invalid payload' });
		}

		if (status === 2) {
			console.log("rateMatchHandler : Match failed, no MMR changes made");
			if (isTournament && TournamentManager.has(matchId)) {
				const tournament = TournamentManager.getTournamentByMatchId(matchId);
				if (!tournament) return;

				const tournamentId = tournament.getTournamentId();
				if (tournamentId !== undefined) {
					// storage.setMatchStatus(tournamentId, 'failed');
					const allMatches = tournament.getAllMatches();
					await tournament.failed(allMatches);
					return reply.code(200);
					// for (const match of allMatches) {
					// 	storage.setMatchStatus(match.id, 'failed');
					// }
				}
			}

			storage.setMatchStatus(matchId, "failed");
			for (const { userId } of results) {
				try {
					await cache.deletePlayerMatch(userId.toString());
					await cache.deleteUserRating(userId);
					console.log(`Cleaned up cache for user ${userId}`);
				} catch (error) {
					console.error(`Failed to clean cache for user ${userId}:`, error);
				}
			}
			return reply.code(200).send(JSON.stringify({
				type: 'match_failed',
				message: 'Match failed, no MMR changes made' 
			}));
		}

		if (isTournament && TournamentManager.has(matchId)) {
			console.log('rateMatchHandler : Tournament match result received');
			const tournament = TournamentManager.getTournamentByMatchId(matchId);
			if (!tournament) {
				return reply.code(400).send({ type: 'error', message: 'Tournament not found for this match' });
			}
			await tournament.handleMatchResult(matchId, results);
			console.log('rateMatchHandler : Tournament match handled');
			return reply.code(200).send({ message: 'Tournament match result received' });
		}


		const updates = await updateRatings(matchId, results, req);
		await updateUMS(updates);
		return reply.code(200).send({ updated: updates.length });
	} catch (err) {
		return reply.code(500).send({ type: 'error', message: 'Internal server error' });
	}
}
