import { WebsocketHandler } from "@fastify/websocket";
import { IMatchmaking } from "../IMatchmaking";
import { Player, PendingMatch } from '../types';
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

    addPlayer(player: Player): void {
        this.queue.push(player)
    }

    removePlayer(id: string): void {
       this.queue = this.queue.filter(p => p.id !== id)
    }

    processQueue(): void {
        if (this.queue.length < 2) return;

        for (let i = 0; i < this.queue.length - 1; i++) {
            const player1 = this.queue[i];
            const window = getDynamicWindow(player1);

            for (let j = i + 1; j < this.queue.length; j++) {
                const player2 = this.queue[j]
                
                if (isWithinMatchWindow(player1, player2, window)) {
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

                if (match.confirmations[match.player1.id] && match.confirmations[match.player2.id]) {
                    match.player1.socket.send(JSON.stringify({type: 'match_found', opponent: match.player2.name}));
                    match.player2.socket.send(JSON.stringify({type: 'match_found', opponent: match.player2.name}));
                    this.pendingMatches = this.pendingMatches.filter(m => m !== match);

                    return true;
                }
            }
        }
        return false;
    }

    checkPendingMatches(): void {
        const now = Date.now();
        this.pendingMatches = this.pendingMatches.filter(
            match => evaluateMatchTimeout(match, now, this.confirmationTimeout, this.addPlayer.bind(this))
        );
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