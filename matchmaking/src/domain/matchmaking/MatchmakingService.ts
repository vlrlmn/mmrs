import { WebsocketHandler } from "@fastify/websocket"
import { IMatchmaking } from "./IMatchmaking"
import { match } from "assert"

export interface Player {
    id: string
    name: string
    mmr: number
    socket: any
    joinedAt: number
}

export interface PendingMatch {
    player1: Player
    player2: Player
    confirmations: { [id: string]: boolean}
    createdAt: number
}


export class MatchmakingService implements IMatchmaking {

    private queue: Player[] = []
    private pendingMatches: PendingMatch[] = []
    private confirmationTimeout = 18000;

    private getDynamicWindow(player: Player): number {
        const elapsed = Date.now() - player.joinedAt

        return 100 + Math.floor(elapsed / 5000) * 100
    }

    addPlayer(player: Player): void {
        this.queue.push(player)
    }

    removePlayer(id: string): void {
       this.queue = this.queue.filter(p => p.id !== id)
    }

    processQueue(): void {
        if (this.queue.length < 2) return

        for (let i = 0; i < this.queue.length - 1; i++) {
            const player1 = this.queue[i];
            const window = this.getDynamicWindow(player1)

            for (let j = i + 1; j < this.queue.length; j++) {
                const player2 = this.queue[j]

                if (Math.abs(player1.mmr - player2.mmr) <= window) {
                    this.queue = this.queue.filter(p => p.id !== player1.id && p.id !== player2.id)
                    const match: PendingMatch = {
                        player1,
                        player2,
                        confirmations: {
                            [player1.id]: false,
                            [player2.id]: false
                        },
                        createdAt: Date.now()
                    };
                    this.pendingMatches.push(match)
                    const remainingSeconds = Math.floor(this.confirmationTimeout / 1000);

                    player1.socket.send(JSON.stringify({ 
                        type: 'confirm_match', 
                        opponent: player2.name,
                        timeLeft: remainingSeconds
                    }));

                    player2.socket.send(JSON.stringify({ 
                        type: 'confirm_match', 
                        opponent: player1.name,
                        timeLeft: remainingSeconds
                    }));

                    return
                }
            }
        }
    }

    confirmMatch(playerId: string): boolean {
        for (const match of this.pendingMatches) {
            if (match.confirmations.hasOwnProperty(playerId)) {
                match.confirmations[playerId] = true

                if (match.confirmations[match.player1.id] && match.confirmations[match.player2.id]) {
                    match.player1.socket.send(JSON.stringify({type: 'match_found', opponent: match.player2.name}))
                    match.player2.socket.send(JSON.stringify({type: 'match_found', opponent: match.player2.name}))

                    this.pendingMatches = this.pendingMatches.filter(m => m !== match)

                    return true
                }
            }
        }
        return false
    }

    checkPendingMatches(): void {
        const now = Date.now()
        this.pendingMatches = this.pendingMatches.filter(match => {
            if (now - match.createdAt > this.confirmationTimeout) {
                if (match.player1.socket.readyState === 1) {
                    match.player1.socket.send(JSON.stringify({type: 'match_timeout'}));
                }
                if (match.player2.socket.readyState === 1) {
                    match.player2.socket.send(JSON.stringify({type: 'match_timeout'}));
                }

                if (!match.confirmations[match.player1.id]) {
                    this.addPlayer(match.player1);
                }
                if (!match.confirmations[match.player2.id]) {
                    this.addPlayer(match.player2);
                }
                return false;
            }
            return true;
        })
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