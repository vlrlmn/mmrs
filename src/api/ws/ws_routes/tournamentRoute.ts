import { FastifyRequest } from "fastify";
import { TournamentService } from "../../../domain/tournament/services/TournamentService";
import { createPlayer } from "../utils/createPlayer";
import { Player } from "../../../domain/matchmaking/types";

export function tournamentHandler(
    socket: any,
    req: FastifyRequest,
    id: string,
    name: string, 
    mmr: string,
    tournament: TournamentService
) {
    const player: Player = createPlayer(id, name, parseInt(mmr), socket);
    console.log(`${name} (${id}) joined tournament`);
    socket.send(JSON.stringify({type: 'registered', stage: tournament.getCurrentStage()}));

    socket.on('message', (raw: string) => {
        try {
            const message = JSON.parse(raw);

            if (message.type === 'match_result') {
                console.log(`${name} (${id}) confirmed match`);
                tournament.confirmMatchResult(player);

                const stage = tournament.getCurrentStage();

                if(stage === 'complete') {
                    socket.send(JSON.stringify({type: 'tournament_winner', winner: player.name}));
                } else {
                    socket.send(JSON.stringify({type: 'next_stage', stage}));
                }
            }
        } catch (e) {
            console.error ('Invalid tournament message: ', e);
            socket.send(JSON.stringify({type: 'error', message: 'Invalid message'}));
        }
    });

    socket.on('close', () => {
        console.log(`${name} (${id}) disconnected from tournament`);
    })
}
