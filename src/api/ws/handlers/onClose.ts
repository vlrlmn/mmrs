import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';

export function handleClose(id: string, name: string, socket: any, matchmaker: MatchmakingService) {
  return () => {
    console.log(`${name} (${id}) left match`);

    const activeMatch = matchmaker.getActiveMatchOf(id);
    if (activeMatch) {
      const opponent = activeMatch.player1.id === id ? activeMatch.player2 : activeMatch.player1;
      matchmaker.removeActiveMatchPlayer(id);

        if (opponent.socket.readyState === 1) {
          opponent.socket.send(JSON.stringify({
            type: 'victory_by_default',
            message: `${name} disconnected. You win by default.`
          }));
        }
        return;
    }
  
    const pending = matchmaker.findPendingMatch(id);
    if (pending) {
      const opponent = pending.player1.id === id ? pending.player2 : pending.player1;
      if (opponent.socket.readyState === 1) {
        opponent.socket.send(JSON.stringify({ 
          type: 'opponent_left',
          message: `${name} left. Searching for a new opponent...`
        }));
      }
      matchmaker.removePendingMatch(pending);
      matchmaker.addPlayer(opponent);
    }
    matchmaker.removePlayer(id);
  };
}
