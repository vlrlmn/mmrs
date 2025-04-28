import { Player } from "./MatchmakingService";

export interface IMatchmaking {
    addPlayer(player: Player): void;
    removePlayer(id: string): void;
    processQueue(): void;
    confirmMatch(playerId: string): boolean;
    checkPendingMatches(): void;
}