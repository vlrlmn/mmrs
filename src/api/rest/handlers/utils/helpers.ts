import { FastifyRequest, FastifyReply } from 'fastify';

export function parseMatchId(req: FastifyRequest, reply: FastifyReply): number | null {
  const matchIdRaw = (req.params as any).matchId;
  const matchId = parseInt(matchIdRaw, 10);

  if (isNaN(matchId)) {
    reply.code(400).send({ type: 'error', message: 'Invalid match ID' });
    return null;
  }

  return matchId;
}

export function validatePayload(
  status: number,
  results: Array<any>,
  reply: FastifyReply
): boolean {
  if (!Array.isArray(results) || typeof status !== 'number') {
    reply.code(400).send({ type: 'error', message: 'Invalid payload format' });
    return false;
  }

  for (const r of results) {
    if (typeof r.userId !== 'number' || typeof r.place !== 'number') {
      reply.code(400).send({ type: 'error', message: 'Invalid result entry' });
      return false;
    }
  }
  return true;
}
