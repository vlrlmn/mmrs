import { WebsocketHandler } from "@fastify/websocket";
import { IMatchmaking } from "../IMatchmaking";
import { Player, PendingMatch } from '../types';
import { IStorage } from '../../../storage/IStorage';
import {
    getDynamicWindow,
    isWithinMatchWindow,
    createMatch,
    evaluateMatchTimeout
} from '../utils/MatchmakingUtils';
import CacheStorage from "../../cache/CacheStorage";
import Config from "../../../config/Config";

export class MatchmakingService implements IMatchmaking {
    private queue: Player[] = []
    private pendingMatches: PendingMatch[] = []
    private confirmationTimeout = 20000;
    private activeMatches: Map<string, PendingMatch> = new Map();
    private socketToPlayerId: Map<any, string> = new Map();

    constructor (private readonly storage: IStorage) {}

    addPlayer(player: Player): void {
        this.queue.push(player);
        this.socketToPlayerId.set(player.socket, player.id);
    }

    removePlayer(id: string): void {
       this.queue = this.queue.filter(p => p.id !== id)
       this.activeMatches.delete(id);
       for (const [sock, playerId] of this.socketToPlayerId.entries()) {
            if (playerId === id) {
                this.socketToPlayerId.delete(sock);
                break;
            }
        }
        console.log(`Removed player (${id}) from matchmaking`);
    }

    getActiveMatchOf(id: string): PendingMatch | undefined {
        return this.activeMatches.get(id);
    }

    removeActiveMatchPlayer(id: string): void {
        const match = this.activeMatches.get(id);
        if (match) {
            this.activeMatches.delete(match.player1.id);
            this.activeMatches.delete(match.player2.id);
        }
    }

    processQueue(): void {
        if (this.queue.length < 2) return;

        for (let i = 0; i < this.queue.length - 1; i++) {
            const player1 = this.queue[i];

            const window = getDynamicWindow(player1);

            for (let j = i + 1; j < this.queue.length; j++) {
                const player2 = this.queue[j]
                if (player1.id === player2.id) {
                    continue;
                }
                
                if (isWithinMatchWindow(player1, player2, window)) {

                    this.queue = this.queue.filter(p => p.id !== player1.id && p.id !== player2.id);
                    const match = createMatch(player1, player2, this.confirmationTimeout);
                    this.pendingMatches.push(match);
                    return;
                }
            }
        }
    }

async confirmMatch(playerId: string): Promise<boolean> {
    for (const match of this.pendingMatches) {
        if (match.confirmations.hasOwnProperty(playerId)) {
            match.confirmations[playerId] = true;

            const allConfirmed =
                match.confirmations[match.player1.id] &&
                match.confirmations[match.player2.id];

            if (allConfirmed) {
                match.isActive = true;
                this.pendingMatches = this.pendingMatches.filter(m => m !== match);
                this.activeMatches.set(match.player1.id, match);
                this.activeMatches.set(match.player2.id, match);
                const matchId = this.storage.addMatch(1);
                
                this.storage.addParticipant(matchId, parseInt(match.player1.id));
                this.storage.addParticipant(matchId, parseInt(match.player2.id));

                const cache = CacheStorage.getInstance();
                await cache.saveUserRating(parseInt(match.player1.id), match.player1.mmr);
                await cache.saveUserRating(parseInt(match.player2.id), match.player2.mmr);

                console.log("Match saved in database with id: ", matchId);

                try {
                    await fetch(`http://${Config.getInstance().getGameAddr()}/internal/match`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: matchId,
                            players: [
                                parseInt(match.player1.id),
                                parseInt(match.player2.id)
                            ]
                        })
                    });
                    this.storage.setMatchStatus(matchId, 'active');
                    console.log(`Game server notified: match ${matchId} created.`);
                    await cache.savePlayerMatch(`${match.player1.id}`, matchId.toString());
                    await cache.savePlayerMatch(`${match.player2.id}`, matchId.toString());
                } catch (error) {
                    console.error(`Failed to notify game server about match ${matchId}:`, error);
                    this.storage.setMatchStatus(matchId, "failed");
                    this.activeMatches.delete(match.player1.id);
                    this.activeMatches.delete(match.player2.id);
                    this.addPlayer(match.player1);
                    this.addPlayer(match.player2);

                     match.player1.socket.send(JSON.stringify({
                        type: 'match_failed',
                        reason: 'Game server did not respond'
                    }));
                    match.player2.socket.send(JSON.stringify({
                        type: 'match_failed',
                        reason: 'Game server did not respond'
                    }));

                    return false;
                }
                match.player1.socket.send(JSON.stringify({ type: 'match_ready'}));
                match.player2.socket.send(JSON.stringify({ type: 'match_ready'}));
                return true;
            }
        }
    }
    return false;
}


    checkPendingMatches(): void {
        const now = Date.now();
        this.pendingMatches = this.pendingMatches.filter( match => {
            const keep = evaluateMatchTimeout(match, now, this.confirmationTimeout, this.addPlayer.bind(this));
            if (!keep) {
                this.activeMatches.delete(match.player1.id);
                this.activeMatches.delete(match.player2.id);
            }
            return keep;
        });
    }


    findPendingMatch(playerId: string): PendingMatch | undefined {
        return this.pendingMatches.find(
            match => match.player1.id === playerId || match.player2.id === playerId
        );
    }

    removePendingMatch(match: PendingMatch): void {
        this.pendingMatches = this.pendingMatches.filter(m => m !== match);
    }

    public getPlayerIdBySocket(socket: any): string | undefined {
        return this.socketToPlayerId.get(socket);
    }

}