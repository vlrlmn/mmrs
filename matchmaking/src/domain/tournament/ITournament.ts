import {Player, Tournament} from '../matchmaking/types'

export interface ITournament {
    registerPlayers(player: Player): void;
    semiTournament(): Player[];
    quarterTournament(): Player[];
    finalTournament(): Player;
    addPlayer(player: Player): void;
    confirmMatchResult(winner: Player): void;
}