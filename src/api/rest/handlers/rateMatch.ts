import { FastifyRequest, FastifyReply } from 'fastify';

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

    for (const result of results) {
      if (typeof result.userId !== 'number' || typeof result.place !== 'number') {
        return reply.code(400).send({ error: 'Invalid userId or place format' });
      }

      if (result.place === 1) {
        updates.push({ id: result.userId, rating: 25 });
      }
    }

    if (updates.length === 0) {
      return reply.code(204).send();
    }

    req.server.storage.updateRatingTransaction(updates);
    return reply.code(200).send({ success: true, updated: updates.length });
  } catch (error: any) {
    console.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}
