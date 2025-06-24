import 'fastify'
import { Match } from "../domain/matchmaking/types"
export interface IStorage {
    updateMatchWinner(matchId: number, winnerId: number): void;
    updateRatingTransaction( matchId: number, updates: { id: number; rating: number }[]): void;
    getMatchesForUser(userId: number, page: number): any[];
    addMatch(mode: number, isTournamentPart: boolean): number;
    getPlayer(id: number): any ;
    close(): void;
    testRequestToDB(): Promise<string>;
    addParticipant(matchId: number, userId: number): void;
    getRatingUpdates(userId: number): {
        playedMatches: number;
        updates: { date: string; rate: number }[];
    };
    setMatchStatus(matchId: number, status: 'active' | 'failed'): void;
};

export default IStorage