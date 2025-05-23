import { Player, PendingMatch } from './types';
export interface IMatchmaking {
    addPlayer(player: Player): void;
    removePlayer(id: string): void;
    processQueue(): void;
    confirmMatch(playerId: string): Promise<boolean>;
    checkPendingMatches(): void;
    findPendingMatch(playerId: string): PendingMatch | undefined ;
    removePendingMatch(match: PendingMatch): void ;
}