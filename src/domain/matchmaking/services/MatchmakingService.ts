import { WebsocketHandler } from "@fastify/websocket";
import { IMatchmaking } from "../IMatchmaking";
import { Player, PendingMatch } from '../types';
import { IStorage } from '../../../db/IStorage';
import {
    getDynamicWindow,
    isWithinMatchWindow,
    createMatch,
    evaluateMatchTimeout
} from '../utils/MatchmakingUtils';

export class MatchmakingService implements IMatchmaking {
    private queue: Player[] = []
    private pendingMatches: PendingMatch[] = []
    private confirmationTimeout = 20000;
    private activeMatches: Map<string, PendingMatch> = new Map();

    constructor (private readonly storage: IStorage) {
        
    }

    addPlayer(player: Player): void {
        this.queue.push(player)
    }

    removePlayer(id: string): void {
       this.queue = this.queue.filter(p => p.id !== id)
       this.activeMatches.delete(id);
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
                
                if (player1.id !== player2.id && isWithinMatchWindow(player1, player2, window)) {
                    this.queue = this.queue.filter(p => p.id !== player1.id && player1.id !== player2.id);
                    const match = createMatch(player1, player2, this.confirmationTimeout);
                    this.pendingMatches.push(match);
                    return;
                }
            }
        }
    }

    confirmMatch(playerId: string): boolean {
        for (const match of this.pendingMatches) {
            if (match.confirmations.hasOwnProperty(playerId)) {
                match.confirmations[playerId] = true;

                const allConfirmed = match.confirmations[match.player1.id] && match.confirmations[match.player2.id];
                if (allConfirmed) {
                    match.isActive = true;
                    this.pendingMatches = this.pendingMatches.filter(m => m !== match);
                    this.activeMatches.set(match.player1.id, match);
                    this.activeMatches.set(match.player2.id, match);
                    const matchId = this.storage.addMatch(1, [
                        parseInt(match.player1.id),
                        parseInt(match.player2.id)
                    ]);
                    console.log("Match saved in database with id: ", matchId);
                    match.player1.socket.send(JSON.stringify({type: 'match_ready'}));
                    match.player2.socket.send(JSON.stringify({type: 'match_ready'}));

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
}