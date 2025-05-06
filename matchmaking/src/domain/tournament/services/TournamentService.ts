import { ITournament } from "../ITournament";
import { Player, TournamentStage, Match } from "../../matchmaking/types";


export class TournamentService implements ITournament {
    private tournamentPlayers: Player[] = []
    private stage: TournamentStage = 'registration';
    private quarterWinners: Player[] = [];
    private semiWinners: Player[] = [];
    private currentMatches: Match[] = [];
    private champion?: Player;
    
    addPlayer(player: Player): void {
        if (this.stage !== 'registration') return;

        this.tournamentPlayers.push(player);
        if (this.tournamentPlayers.length === 8) {
            this.stage = 'quarter';
            this.startNextRound(this.tournamentPlayers);
        }
    }

    registerPlayers(player: Player): void {
        this.tournamentPlayers.push(player);
    }
    
    getCurrentStage(): string {
        return this.stage;
    }

    confirmMatchResult(winner: Player): void {
        if (!this.currentMatches.length) return;

        const match = this.currentMatches.find(
            (m) => m.player1.id === winner.id || m.player2.id === winner.id
        );

        if (match) {
            match.winner = winner;
            match.isConfirmed = true;
        }

        const confirmedWinners = this.currentMatches
        .filter((m) => m.isConfirmed && m.winner)
        .map((m) => m.winner!)

        if (this.stage === 'quarter' && confirmedWinners.length === 4) {
            this.quarterWinners = confirmedWinners;
            this.stage = 'semi';
            this.startNextRound(this.quarterWinners);
        }
        else if (this.stage === 'semi' && confirmedWinners.length === 2) {
            this.semiWinners = confirmedWinners;
            this.stage = 'final';
            this.startNextRound(this.semiWinners);
        }
        else if (this.stage === 'final' && confirmedWinners.length === 1) {
            this.champion = confirmedWinners[0];
            this.stage = 'complete';
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
    }
}