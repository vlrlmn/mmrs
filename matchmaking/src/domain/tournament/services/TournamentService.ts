import { ITournament } from "../ITournament";
import { Player, TournamentStage } from "../../matchmaking/types";


export class TournamentService implements ITournament {
    private tournamentPlayers: Player[] = []
    stage: TournamentStage = 'registration';
    registerPlayers(player: Player): void {
        this.tournamentPlayers.push(player);
    }

    semiTournament(): Player[] {
        throw new Error("Method not implemented.");
    }

    quarterTournament(): Player[] {
        throw new Error("Method not implemented.");
    }

    finalTournament(): Player {
        throw new Error("Method not implemented.");
    }

    addPlayer(player: Player): void {

    }

    confirmMatchResult(winner: Player): void {
        throw new Error("Method not implemented.");
    }
    
}