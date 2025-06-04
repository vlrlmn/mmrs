export interface Player {
    id: string
    mmr: number
    socket: any
    joinedAt: number
}

export interface PendingMatch {
    // id: number
    isActive: boolean
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
    id: number;
    startedAt: string;
    winnerId: number | null;
    mode: number;
    status: number;
}
export interface MatchRecord {
  player1: Player;
  player2: Player;
  winner?: Player;
  isConfirmed: boolean;
}
