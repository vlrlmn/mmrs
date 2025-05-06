import { FastifyRequest } from "fastify";
import { TournamentService } from "../../../domain/tournament/services/TournamentService";

export function tournamentHandler(
    socket: any,
    req: FastifyRequest,
    id: string,
    name: string, 
    mmr: string,
    tournament: TournamentService
) {
    
}
