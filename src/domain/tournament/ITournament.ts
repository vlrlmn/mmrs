import {Player} from '../matchmaking/types'
export interface ITournament {
    addPlayer(player: Player): Promise<boolean>;
    removePlayer(playerId: string): void;
}