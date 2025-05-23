import { FastifyRequest, FastifyReply } from 'fastify';
import { mmrsService } from '../../rest/services/mmrsServices'

type StatsRequest = {
  Querystring: {
    p: number;
  };
};

export async function statsHandler(req: FastifyRequest<StatsRequest>, reply: FastifyReply) {
  const page = req.query.p || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const matches = await mmrsService.getStats(offset, limit);
  return reply.send(matches);
}
