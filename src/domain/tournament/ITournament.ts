import {Player} from '../matchmaking/types'

export interface ITournament {
    registerPlayers(player: Player): void;
    addPlayer(player: Player): boolean;
    confirmMatchResult(winner: Player): void;
    getCurrentStage(): string;
}