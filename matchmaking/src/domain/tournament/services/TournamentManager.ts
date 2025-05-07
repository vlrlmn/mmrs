import { TournamentService } from "./TournamentService";
import { Player } from "../../matchmaking/types";

export class TournamentManager {
    private tournaments: TournamentService[] = [];

    addPlayer(player: Player): TournamentService {

        let available = this.tournaments.find(t =>
            t.getCurrentStage() === 'registration' && t.getPlayerCount() < 8  
        );

        if (!available) {
            available = new TournamentService();
            this.tournaments.push(available);
        }
        available.addPlayer(player);
        return available;
    }
}