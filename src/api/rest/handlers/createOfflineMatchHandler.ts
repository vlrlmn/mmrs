import { FastifyReply, FastifyRequest } from "fastify";
import { Storage } from "../../../storage/Storage";

interface OfflineMatchRequest {
    mode: number;
}

export async function createOfflineMatchHandler(request: FastifyRequest, reply: FastifyReply) {
    const storage = new Storage();
    const body = request.body as OfflineMatchRequest;

    if (typeof body.mode !== 'number' || ![0, 1, 2].includes(body.mode)) {
        reply.status(400).send({error: 'Invalid mode. Must be 0, 1, or 2.'});
        return;
    }

    const matchId = storage.addOfflineMatch(body.mode);
    console.log(`Offline match created: id = ${matchId}, mode = ${body.mode}`);
    reply.status(200).send({id: matchId});
}