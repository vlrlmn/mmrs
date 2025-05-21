import 'fastify';
import { IStorage } from '../db/IStorage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: IStorage;
  }

    interface FastifyRequest {
    server: FastifyInstance;
  }
}
 