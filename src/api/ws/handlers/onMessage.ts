import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';

export function handleMessage(socket: any, id: string, name: string, matchmaker: MatchmakingService) {
  return (rawMessage: string) => {
    try {
      const message = JSON.parse(rawMessage);

      if (message.type === 'confirm_match') {
        console.log(`${name} (${id}) confirmed the match`);
        const success = matchmaker.confirmMatch(id);
        if (!success) {
          console.log(`No pending match found for ${id} yet`);
        }
      } else if (message.type === 'reject_match') {
        console.log(`${name} (${id}) rejected the match`);
        const match = matchmaker.findPendingMatch(id);
        if (match) {
          const opponent = match.player1.id === id ? match.player2 : match.player1;
          if (opponent.socket.readyState === 1) {
            opponent.socket.send(JSON.stringify({ type: 'opponent_rejected' }));
          }
          matchmaker.removePendingMatch(match);
          matchmaker.addPlayer(opponent);
        }
        matchmaker.removePlayer(id);
        socket.send(JSON.stringify({ type: 'rejected' }));
      }
    } catch (error) {
      console.error('Invalid message format:', error);
    }
  };
}
