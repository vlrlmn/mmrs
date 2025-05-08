// import { TournamentService } from "./TournamentService";
// import { Player } from "../../matchmaking/types";

// export class TournamentManager {
//     private tournaments: TournamentService[] = [];

//     addPlayer(player: Player): TournamentService {

//         for (const t of this.tournaments) {
//             if (t.getCurrentStage() === 'registration' && t.getPlayerCount() < 8) {
//               const added = t.addPlayer(player);
//               if (added) return t;
//             }
//           }
        
//           const newTournament = new TournamentService();
//           newTournament.addPlayer(player);
//           this.tournaments.push(newTournament);
//           return newTournament;
//     }
// }