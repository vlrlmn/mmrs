import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';

export function matchCloseHandler(socket: any, matchmaker: MatchmakingService) {
  return () => {
    const id = matchmaker.getPlayerIdBySocket(socket);
    if (!id) {
      console.log(`Unknown socket disconnected from matchmaking`);
      return;
    }

    console.log(`(${id}) disconnected`);

    const pending = matchmaker.findPendingMatch(id);
    if (pending) {
      const opponent = pending.player1.id === id ? pending.player2 : pending.player1;
      if (opponent.socket.readyState === 1) {
        opponent.socket.send(JSON.stringify({ 
          type: 'opponent_left',
          message: `(${id}) left. Searching for a new opponent...`
        }));
      }
      matchmaker.removePendingMatch(pending);
      matchmaker.addPlayer(opponent);
    }
    matchmaker.removePlayer(id);
  };
}
