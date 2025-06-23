import { FastifyRequest, FastifyReply } from 'fastify';
import { updateRatings } from './utils/updateRatings';
import { updateUMS } from './utils/updateUMS';
import { parseMatchId, validatePayload } from './utils/helpers';
import { TournamentManager } from '../../../domain/tournament/TournamentManager';
import { TournamentService } from '../../../domain/tournament/services/TournamentService';
export async function rateMatchHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const matchId = parseMatchId(req, reply);
    if (matchId === null) return;

    const { status, results, isTournament } = req.body as {
      status: number;
      results: Array<{ userId: number; place: number }>;
      isTournament?: boolean;
    };

    if (!validatePayload(status, results, reply)) return;

    if (status === 2) {
      return reply.code(200).send(JSON.stringify({
        type: 'match_failed', 
        message: 'Match failed, no MMR changes made' 
      }));
      // storage.setMatchStatus(matchId, "failed");
      // change status == 'failed + remove caching
    }

    if (TournamentManager.has(matchId)) {
      const tournament = TournamentManager.getTournamentByMatchId(matchId);
       if (tournament) {
        await tournament.handleMatchResult(matchId, results);
        console.log('Tournament match handled');
        return reply.code(200).send({ success: true, message: 'Tournament match result received' });
      }
      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found for this match' });
      }

      return reply.code(200).send({ success: true, message: 'Tournament match result received' });
    }

    const updates = await updateRatings(matchId, results, req);
    await updateUMS(updates);
    console.log('Updated rating and UMS ', updates);
    return reply.code(200).send({ success: true, updated: updates.length });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}
