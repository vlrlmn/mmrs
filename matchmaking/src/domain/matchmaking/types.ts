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

export type TournamentStage =
    'registration'
    | 'semi' 
    | 'quarter' 
    | 'final' 
    | 'complete';

export interface Match {
    player1: Player;
    player2: Player;
    winner?: Player;
    isConfirmed: boolean;
}