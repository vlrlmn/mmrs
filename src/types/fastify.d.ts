import 'fastify';
import Storage from '../storage/IStorage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage;
  }
}
