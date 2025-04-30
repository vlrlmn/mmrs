import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';

export function handleClose(id: string, name: string, socket: any, matchmaker: MatchmakingService) {
  return () => {
    console.log(`${name} (${id}) left match`);
    const match = matchmaker.findPendingMatch(id);
    if (match) {
      const opponent = match.player1.id === id ? match.player2 : match.player1;
      if (opponent.socket.readyState === 1) {
        opponent.socket.send(JSON.stringify({ type: 'opponent_left' }));
      }
      matchmaker.removePendingMatch(match);
      matchmaker.addPlayer(opponent);
    }
    matchmaker.removePlayer(id);
  };
}
