import { Player } from '../../../domain/matchmaking/types';

export function createPlayer(id: string, mmr: number, socket: any): Player {
  return {
    id,
    mmr,
    socket,
    joinedAt: Date.now()
  };
}
