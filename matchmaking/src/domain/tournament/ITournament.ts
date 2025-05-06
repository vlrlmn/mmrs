import {Player} from '../matchmaking/types'

export interface ITournament {
    registerPlayers(player: Player): void;
    addPlayer(player: Player): void;
    confirmMatchResult(winner: Player): void;
    getCurrentStage(): string;
}