import { ITournament } from "../ITournament";
import { MatchRecord, Player, TournamentStage, Match } from "../../matchmaking/types";
import {
    findMatchForWinner,
    confirmWinner,
    getConfirmedWinners,
    createNextRoundMatches,
    handleStageProgression
} from "../utils/TournamentUtils"

export class TournamentService implements ITournament {
    private tournamentPlayers: Player[] = []
    private stage: TournamentStage = 'registration';
    private currentMatches: MatchRecord[] = [];
    private champion?: Player;
    private readonly onComplete?: () => void;

    constructor(onComplete?: () => void) {
        this.onComplete = onComplete;
    }

    resetTournament(): void {
        this.tournamentPlayers = [];
        this.currentMatches = [];
        this.stage = 'registration';
        this.champion = undefined;
    }

    addPlayer(player: Player): boolean {
        if (this.stage !== 'registration') return false;

        this.tournamentPlayers.push(player);
        if (this.tournamentPlayers.length === 8) {
            this.stage = 'quarter';
            this.currentMatches = createNextRoundMatches(this.tournamentPlayers, this.stage);
        }
        return true;
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

    confirmMatchResult(winner: Player): void {
        if (!this.currentMatches.length) return;

        const match = findMatchForWinner(this.currentMatches, winner);
        if (!match || match.isConfirmed) return;

        confirmWinner(match, winner);
        const confirmedWinners = getConfirmedWinners(this.currentMatches);

        handleStageProgression({
            currentStage: this.stage,
            confirmedWinners,
            setStage: (s) => this.stage = s,
            setMatches: (m) => this.currentMatches = m,
            onWin: (champion) => {
                this.champion = champion;
                champion.socket.send(JSON.stringify({
                    type: 'tournamnent_winner'
                }));

                setTimeout(() => {
                    this.resetTournament();
                    console.log("New tournament");
                    this.onComplete?.();
                }, 3000);
            }
        });
    }
}
