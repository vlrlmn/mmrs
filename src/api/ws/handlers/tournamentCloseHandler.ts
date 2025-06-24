import { TournamentService } from "../../../domain/tournament/services/TournamentService";

export function tournamentCloseHandler(socket: any, tournament: TournamentService, tid: number) {
    return () => {
        const playerId = tournament.getPlayerIdBySocket(socket);
        if (playerId) {
            tournament.removePlayer(playerId);
        }
    }
}

