import {Player} from '../matchmaking/types'

export interface ITournament {
    registerPlayers(player: Player): void;
    addPlayer(player: Player): boolean;
    getCurrentStage(): string;
}