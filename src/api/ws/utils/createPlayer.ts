import { Player } from '../../../domain/matchmaking/types';

export function createPlayer(id: string, mmr: number, socket: any): Player {
  return {
    id,
    mmr: parseInt(mmr.toString(), 10),
    socket,
    joinedAt: Date.now()
  };
}
