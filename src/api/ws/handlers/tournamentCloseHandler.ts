import { TournamentService } from "../../../domain/tournament/services/TournamentService";

export function tournamentCloseHandler(socket: any, tournament: TournamentService, tid: number) {
    return () => {
        const playerId = tournament.getPlayerIdBySocket(socket);
        if (playerId) {
            console.log(`(${playerId}) disconnected from tournament ${tid}`);
            tournament.removePlayer(playerId);
        } else {
            console.log(`Unknown socket disconnected from tournament ${tid}`);
        }
    }
}

