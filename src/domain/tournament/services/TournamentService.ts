import { ITournament } from "../ITournament";
import { Player, TournamentStage } from "../../matchmaking/types";

export class TournamentService implements ITournament {
    private tournamentPlayers: Player[] = []
    private stage: TournamentStage = 'registration';
    private readonly onComplete?: () => void;

    constructor(onComplete?: () => void) {
        this.onComplete = onComplete;
    }

    resetTournament(): void {
        this.tournamentPlayers = [];
        this.stage = 'registration';
    }

    addPlayer(player: Player): boolean {
        if (this.stage !== 'registration') return false;

        this.tournamentPlayers.push(player);
        this.broadcastPlayersStatus();
        if (this.tournamentPlayers.length === 4) {
            this.stage = 'quarter';
            // this.currentMatches = createNextRoundMatches(this.tournamentPlayers, this.stage);
        }
        return true;
    }

    private broadcastPlayersStatus(): void {
        const count = this.registerPlayers.length;
        const message =  {
            message: 'progress',
            current: count,
            total: 4
        }
        for (const player of this.tournamentPlayers) {
            if (player.socket.readyState === 1) {
                player.socket.send(message);
            }
        }
    }

    getPlayerCount(): number {
        return this.tournamentPlayers.length;
    }
    
    registerPlayers(player: Player): void {
        this.tournamentPlayers.push(player);
    }
    
    getCurrentStage(): string {
        return this.stage;
    }
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
