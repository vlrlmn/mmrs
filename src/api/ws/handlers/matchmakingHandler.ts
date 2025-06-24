import Config from '../../../config/Config';
import { MatchmakingService } from '../../../domain/matchmaking/services/MatchmakingService';
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator';
import { createPlayer } from '../utils/createPlayer';
// import { notifyMMRSOpponentConfirmed } from  '../utils/notifyMMRS'

export function matchmakingHandler(socket: any, matchmaker: MatchmakingService) {
  let id: number | undefined;

  return async (rawMessage: string) => {
    try {
      const message = JSON.parse(rawMessage);

      if (message.type === 'join') {
        const payload = await isTokenValid(message.token);
        if (!payload) {
          socket.send(JSON.stringify({ type: 'unauthorized', message: 'Unauthorized' }));
          socket.close();
          return;
        }

        const userId = payload.userId;
        id = userId;

        let mmr = 1000;
        try {
          const res = await fetch(`http://${Config.getInstance().getUmsAddr()}/internal/user/${userId}`);
          const userInfo = await res.json() as { rating: number };
          mmr = userInfo.rating;
        } catch (error) {
          console.error('Invalid request:', error);
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
          socket.close();
        } 
        const player = createPlayer(userId.toString(), mmr, socket);
        matchmaker.addPlayer(player);
        socket.send(JSON.stringify({ type: 'searching' }));
      } else if (message.type === 'match_confirmed') {
          if (!id) {
            socket.send(JSON.stringify({ type: 'unauthorized', message: 'Unauthorized' }));
            return;
          }
          const match = matchmaker.findPendingMatch(id.toString());

          if (!match) {
            return;
          }

        const success = await matchmaker.confirmMatch(id.toString());
        if (!success) {
          const opponent = match.player1.id === id.toString() ? match.player2 : match.player1;
          if (opponent.socket.readyState === 1) {
            opponent.socket.send(JSON.stringify({ type: 'opponent_confirmed' }));
          }
        }

      } else if (message.type === 'reject_match') {
        if (!id) {
          socket.send(JSON.stringify({ type: 'unauthorized', message: 'Unauthorized' }));
          return;
        }

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
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  };
}
