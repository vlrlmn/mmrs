import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';
import { createPlayer } from '../utils/createPlayer';
import radish from '../../../domain/cache/CacheStorage';

export function matchmakingHandler(socket: any, matchmaker: MatchmakingService) {
  let id : number | undefined;
  return async (rawMessage: string) => {
    try {
      const message = JSON.parse(rawMessage);
      if (message.type === 'join') {
          const payload = await isTokenValid(message.token);
          if (!payload) {
            socket.send(JSON.stringify({type: 'unauthorized', message: 'Unauthorized'}));
            socket.close();
            return;
          }
          const userId = payload.userId;
          
          let mmr = 1000;
          const res = await fetch(`http://localhost:5000/auth/internal/user/${userId}`);
          const userInfo = await res.json() as {rating: number};
          mmr = userInfo.rating;
          const player = createPlayer(userId.toString(), mmr, socket);
        
          console.log(`(${userId}) joined searching for a match`);
          matchmaker.addPlayer(player);
          socket.send(JSON.stringify({type: 'searching'}));
      } else if (message.type === 'match_found') {
        if (!id)
        {
            socket.send(JSON.stringify({type: 'unauthorized', message: 'Unauthorized'}));
            return ;
        }
        console.log(`(${id}) confirmed the match`);
        const success = matchmaker.confirmMatch(id.toString());
        if (!success) {
          console.log(`No pending match found for ${id} yet`);
        }
      } else if (message.type === 'reject_match') {
          if (!id)
          {
              socket.send(JSON.stringify({type: 'error', message: 'Unauthorized'}));
              return ;
          }
        console.log(`(${id}) rejected the match`);
        const match = matchmaker.findPendingMatch(id.toString());
        if (match) {
          const opponent = match.player1.id === id.toString() ? match.player2 : match.player1;
          if (opponent.socket.readyState === 1) {
            opponent.socket.send(JSON.stringify({ type: 'opponent_rejected' }));
          }
          matchmaker.removePendingMatch(match);
          matchmaker.addPlayer(opponent);
        }
        matchmaker.removePlayer(id.toString());
        socket.send(JSON.stringify({ type: 'rejected' }));
      }
    } catch (error) {
      console.error('Invalid message format:', error);
    }
  };
}
