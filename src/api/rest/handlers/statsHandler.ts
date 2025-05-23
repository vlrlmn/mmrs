import { FastifyRequest, FastifyReply } from 'fastify';
import { Storage } from '../../../db/Storage'
import { db } from '../../../db/Storage';

export async function statsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const matches = db.prepare(`
      SELECT m.*
      FROM matches m
      JOIN participants p ON m.id = p.match_id
      WHERE p.user_id = ?
      ORDER BY m.date DESC
    `).all(id);

    
    reply.code(200).send(matches);
  } catch (error) {
    console.error('Error in statsHandler:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}
