import { ITournament } from "../ITournament";
import { Player, TournamentStage, Match } from "../../matchmaking/types";
import {
    findMatchForWinner,
    confirmWinner,
    getConfirmedWinners
} from "../utils/TournamentUtils"

export class TournamentService implements ITournament {
    private tournamentPlayers: Player[] = []
    private stage: TournamentStage = 'registration';
    private currentMatches: Match[] = [];
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
            this.startNextRound(this.tournamentPlayers);
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

        if (this.stage === 'quarter' && confirmedWinners.length === 4) {
            this.stage = 'semi';
            this.startNextRound(confirmedWinners);
        }
        else if (this.stage === 'semi' && confirmedWinners.length === 2) {
            this.stage = 'final';
            this.startNextRound(confirmedWinners);
        }
        else if (this.stage === 'final' && confirmedWinners.length === 1) {
            this.champion = confirmedWinners[0];
            this.stage = 'complete';

            this.champion.socket.send(JSON.stringify({
                type: 'tournament_winner',
                winner: this.champion.name
            }));

            setTimeout(() => {
                this.resetTournament();
                console.log("New tournament");
                this.onComplete?.();
            }, 3000);
        }
    }
    
    private startNextRound(players: Player[]): void {
        const randomize = [...players].sort(() => Math.random() - 0.5);
        this.currentMatches = [];

        for (let i = 0; i < randomize.length; i += 2) {
            const match: Match = {
                player1: randomize[i],
                player2: randomize[i + 1],
                isConfirmed: false,
            };
            this.currentMatches.push(match);
        }

        for (const match of this.currentMatches) {
            const {player1, player2} = match;

            if (player1.socket.readyState === 1) {
                player1.socket.send(JSON.stringify({
                    type: 'next_stage',
                    stage: this.stage,
                    opponent: player2.name,
                }));
            }

            if (player2.socket.readyState === 1) {
                player2.socket.send(JSON.stringify({
                    type: 'next_stage',
                    stage: this.stage,
                    opponent: player1.name,
                }))
            }
        }
    }
}