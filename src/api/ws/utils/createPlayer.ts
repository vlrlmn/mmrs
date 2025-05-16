import { Player } from '../../../domain/matchmaking/types';

export function createPlayer(id: string, name: string, mmr: number, socket: any): Player {
  return {
    id,
    name,
    mmr: parseInt(mmr.toString(), 10),
    socket,
    joinedAt: Date.now()
  };
}
