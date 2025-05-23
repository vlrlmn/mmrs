import { FastifyRequest, FastifyReply } from 'fastify';
import { mmrsService } from '../../rest/services/mmrsServices';

type RateRequest = {
  Params: {
    matchId: number;
  };
  Body: {
    status: number;
    placements: { userId: number; place: number }[];
  };
};

export async function rateMatchHandler(req: FastifyRequest<RateRequest>, reply: FastifyReply) {
  const { matchId } = req.params;
  const { status, placements } = req.body;

  if (status === 2) {
    return reply.code(204).send();
  }

  await mmrsService.rateMatch(matchId, placements);
  return reply.code(200).send({ message: 'Ratings updated' });
}
