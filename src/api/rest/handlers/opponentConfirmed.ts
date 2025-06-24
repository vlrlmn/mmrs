import { FastifyRequest, FastifyReply } from 'fastify';

export async function opponentConfirmedHandler(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request.body as { userId: number };

  if (!userId) {
    reply.status(400).send({ error: 'Missing userId' });
    return;
  }
  reply.status(200).send({ status: 'ok' });
}
