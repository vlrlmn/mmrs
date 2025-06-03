import 'fastify';
import { IStorage } from '../storage/IStorage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: IStorage;
  }

    interface FastifyRequest {
    server: FastifyInstance;
  }
}
 