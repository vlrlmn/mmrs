import { ITournament } from "../ITournament";
import { Player, TournamentStage } from "../../matchmaking/types";
import { IStorage } from '../../../storage/IStorage';

export class TournamentService implements ITournament {
    private tournamentPlayers: Player[] = []
    private stage: TournamentStage = 'registration';
    private readonly onComplete?: () => void;

    constructor(private readonly storage: IStorage, onComplete?: () => void) {
        this.onComplete = onComplete;
    }

    async addPlayer(player: Player): Promise<boolean> {
        if (this.stage !== 'registration') return false;

        this.tournamentPlayers.push(player);
        this.broadcastPlayersStatus();
        if (this.tournamentPlayers.length === 4) {
            
            const matchId = this.storage.addMatch(2);
            for (const player of this.tournamentPlayers ) {
                this.storage.addParticipant(matchId, parseInt(player.id));
            }
            const playersIds = this.tournamentPlayers.map( p => parseInt(p.id));
            await fetch('http://localhost:5002/start-tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, playersIds })
            });
        }
        return true;
    }

    private broadcastPlayersStatus(): void {
        const count = this.tournamentPlayers.length;
        const message =  {
            message: 'tournamnet_lobby_counter',
            current: count,
            total: 4
        }
        for (const player of this.tournamentPlayers) {
            if (player.socket.readyState === 1) {
                player.socket.send(message);
            }
        }
    }

    // getCurrentStage(): string {
    //     return this.stage;
    // }
}

//     confirmMatchResult(winner: Player): void {
//         if (!this.currentMatches.length) return;

//         const match = findMatchForWinner(this.currentMatches, winner);
//         if (!match || match.isConfirmed) return;

//         confirmWinner(match, winner);
//         const confirmedWinners = getConfirmedWinners(this.currentMatches);

//         handleStageProgression({
//             currentStage: this.stage,
//             confirmedWinners,
//             setStage: (s) => this.stage = s,
//             setMatches: (m) => this.currentMatches = m,
//             onWin: (champion) => {
//                 this.champion = champion;
//                 champion.socket.send(JSON.stringify({
//                     type: 'tournamnent_winner'
//                 }));

//                 setTimeout(() => {
//                     this.resetTournament();
//                     console.log("New tournament");
//                     this.onComplete?.();
//                 }, 3000);
//             }
//         });
//     }
// }
