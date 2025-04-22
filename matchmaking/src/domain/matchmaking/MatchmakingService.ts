import { WebsocketHandler } from "@fastify/websocket"
import { IMatchmaking } from "./IMatchmaking"

export interface Player {
    id: string
    name: string
    mmr: number
    socket: any
    joinedAt: number
}

export class MatchmakingService implements IMatchmaking {

    private queue: Player[] = []

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

                    player1.socket.send(JSON.stringify({type: 'match_found', opponent: player2.name}))
                    player2.socket.send(JSON.stringify({type: 'match_found', opponent: player1.name}))

                    return
                }
            }
        }
    }
}