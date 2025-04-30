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
