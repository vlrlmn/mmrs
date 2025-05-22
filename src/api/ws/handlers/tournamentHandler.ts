import { FastifyRequest } from 'fastify';
import { TournamentService } from '../../../domain/tournament/services/TournamentService';
import { Player } from '../../../domain/matchmaking/types';
import { createPlayer } from '../utils/createPlayer';
export function tournamentHandler(
    socket: any,
    req: FastifyRequest,
    id: string,
    mmr: string,
    tournament: TournamentService
) {
    const player: Player = createPlayer(id, parseInt(mmr), socket);
    console.log(`(${id}) joined tournament`);
    socket.send(JSON.stringify({type: 'registered', stage: tournament.getCurrentStage()}));

    socket.on('message', (raw: string) => {
        try {
            const message = JSON.parse(raw);

            if (message.type === 'match_result') {
                console.log(`(${id}) confirmed match`);
                tournament.confirmMatchResult(player);

                const stage = tournament.getCurrentStage();

                if(stage === 'complete') {
                    socket.send(JSON.stringify({type: 'tournament_winner', winner: ""})); // TO_DO put winner id
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
        console.log(`(${id}) disconnected from tournament`);
    })
}
