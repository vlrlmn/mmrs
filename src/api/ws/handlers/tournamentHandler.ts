import { TournamentService } from '../../../domain/tournament/services/TournamentService'
import { isTokenValid } from '../../../pkg/jwt/JwtGenerator'
import { createPlayer } from '../utils/createPlayer'

export function tournamentHandler(socket: any, tournament: TournamentService, tid: string) {
    let id: string | undefined;

    return async (rawMessage: string ) => {
        try {
            const message = JSON.parse(rawMessage);

            if (message.type === 'join') {
                const payload = await isTokenValid(message.token);
                if (!payload) {
                    socket.send(JSON.stringify( {type: 'unauthorized', message: 'Unauthorized'}));
                    socket.close();
                    return;
                }

                const userId = payload.userId;
                id = userId.toString();

                let mmr = 1000;
                try {
                    const res = await fetch(`http://localhost:5050/auth/internal/user/${userId}`);
                    const userInfo = await res.json() as {rating: number};
                    if (typeof userInfo.rating !== 'number') {
                        throw new Error('Invalid rating format');
                    }
                    mmr = userInfo.rating;
                } catch (error) {
                    console.error('Failed to fetch user MMR: ', error);
                    socket.send(JSON.stringify({type: 'error', message: 'Failed to fetch user MMR'}));
                    socket.close();
                    return;
                }

                const player = createPlayer(id, mmr, socket);
                console.log(`(${id}) joined tournament ${tid} with MMR ${mmr}`);

                const added = await tournament.addPlayer(player);
                if (!added) {
                    socket.send(JSON.stringify({type: 'error', message: 'Tournament already in progress'}));
                    socket.close();
                    return;
                }
                socket.send(JSON.stringify({type: 'joined', message: 'Successfully joined tournament'}));
            }
            else if (message.type === 'leave_tournement') {
                if (!id) {
                    socket.send(JSON.stringify({type: 'unauthorized', message: 'Unauthorized'}));
                    return;
                }
                console.log(`(${id}) is leaving tournament ${tid}`);
                tournament.removePlayer(id);
                socket.send(JSON.stringify({type: 'left', message: 'Left tournament'}));
                socket.close();
            }
            else {
                socket.send(JSON.stringify({ type: 'error', message: 'No such message type' }));
            }
        } catch(error) {
            console.error('Invalid request: ', error);
            socket.send(JSON.stringify({type: 'error', message: 'Invalid request'}));
        }
    }
}