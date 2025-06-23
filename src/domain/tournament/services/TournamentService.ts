import { ITournament } from "../ITournament";
import { Player } from "../../matchmaking/types";
import { IStorage } from '../../../storage/IStorage';
import CacheStorage from "../../cache/CacheStorage";
import Config from "../../../config/Config";
import { processMatchResult } from "../../../api/internal/processMatchResult";
import { TournamentManager } from "../TournamentManager";
import TournamentMatch from "./TournmanetMatch";
import { match } from "assert";


export class TournamentService implements ITournament {
    private tournamentPlayers: Map<string, Player> = new Map();
    private socketToPlayerId: Map<any, string> = new Map();
    private readonly onComplete?: () => void;
    private semifinalWinners: number[] = [];
    private lostPlayers: number[] = [];
    private semifinalMatchIds: number[] = [];
    private finalMatchId: number | null = null;
    private isFinalMatchCreated = false;
    private isFinalMatchCompleted = false;


    constructor(private readonly storage: IStorage, onComplete?: () => void) {
        this.onComplete = onComplete;
    }

    async notifyGameServer(matchId: number, players: number[]) {
        const res = await fetch(`http://${Config.getInstance().getGameAddr()}/internal/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: matchId, players, mode: 2})
        });
        this.storage.setMatchStatus(matchId, "active");
        console.log('Notify game server');
        return res;
    }

    async failed(matches: Array<TournamentMatch>) {
        matches.forEach(async (match: TournamentMatch) => {
        // } catch (error) {
        //     console.error(`Failed to notify game server about match ${match1}:`, error);
        //     console.error(`Failed to notify game server about match ${match2}:`, error);
        //     this.storage.setMatchStatus(match1, "failed");
        //     this.storage.setMatchStatus(match2, "failed");
        //     p1.socket.send(JSON.stringify({
        //         type: 'match_failed',
        //         message: 'Game server did not respond'
        //     }));
        //     p2.socket.send(JSON.stringify({
        //         type: 'match_failed',
        //         message: 'Game server did not respond'
        //     }));
        //     p3.socket.send(JSON.stringify({
        //         type: 'match_failed',
        //         message: 'Game server did not respond'
        //     }));
        //     p4.socket.send(JSON.stringify({
        //         type: 'match_failed',
        //         message: 'Game server did not respond'
        //     }));
        //     p1.socket.close();
        //     p2.socket.close();
        //     p3.socket.close();
        //     p4.socket.close();
        //     return false;
        // }
        })
    }

    async addPlayer(player: Player): Promise<boolean> {

        // Save player to Map as participant
        this.tournamentPlayers.set(player.id, player);
        this.socketToPlayerId.set(player.socket, player.id);

        // If all players are added, start the tournament
        if (this.tournamentPlayers.size !== 4) {
            return true;
        }

        // Define players and matches. All matches declare in TournamentMananger
        const players = Array.from(this.tournamentPlayers.values()).sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const matches = [
            new TournamentMatch([players[0], players[1]], this.storage),
            new TournamentMatch([players[2], players[3]], this.storage)
        ]
        matches.forEach((match:TournamentMatch) => TournamentManager.register(match.id, this))
        
        // Save matches/participants to the database
        matches.forEach((match:TournamentMatch) => match.save());
        
        
        // Save users data in cache
        let failedMatch1: Error | undefined = await matches[0].cacheUsersInfo();   
        let failedMatch2: Error | undefined = await matches[1].cacheUsersInfo();
        if (failedMatch1 !== undefined || failedMatch2 !== undefined) {
            this.failed(matches);
            console.log("TournamentService error : failed to cache users info for match");
            return false;
        }


        // Notify game server about matches
        failedMatch1 = await matches[0].notifyGameServer();
        failedMatch2 = await matches[1].notifyGameServer();
        if (failedMatch1 !== undefined || failedMatch2 !== undefined) {
            this.failed(matches);
            console.log("TournamentService error : failed to notify game server about match");
            return false;
        }

        
        // Recording semifinal match ids
        this.semifinalMatchIds = matches.map((match:TournamentMatch) => match.id);

        // Notify players about match ready
        matches.forEach((match:TournamentMatch) => match.broadcastMatchReady());

        // Close all sockets of players
        matches.forEach((match:TournamentMatch) => match.closeBroadcast());

        return true;
    }

    private broadcastPlayersStatus(): void {
        const count = this.tournamentPlayers.size;
        const message =  JSON.stringify ({
            message: 'lobby_status',
            current: count,
            total: 4
        });

        for (const player of this.tournamentPlayers.values()) {
            if (player.socket.readyState === 1) {
                player.socket.send(message);
            }
        }
    }

    public removePlayer(playerId: string): void {
        if (this.tournamentPlayers.has(playerId)) {
            const player = this.tournamentPlayers.get(playerId);
            if (player) {
                this.socketToPlayerId.delete(player.socket);
            }

            this.tournamentPlayers.delete(playerId);
            console.log(`Removed player ${playerId} from tournament`);
            // this.broadcastPlayersStatus();
        }

       if (this.tournamentPlayers.size === 0) {
            if (this.isFinalMatchCreated && this.isFinalMatchCompleted) {
                console.log("All players left. Ending tournament.");
                this.onComplete?.();
            } else {
                console.log("Players left early, but final not finished — delaying cleanup");
            }
        }
    }

    public getPlayerIdBySocket(socket: any): string | undefined {
        return this.socketToPlayerId.get(socket);
    }

    public  getPlayerCount(): number {
        return this.tournamentPlayers.size;
    }

    public async handleMatchResult(matchId: number, results: { userId: number; place: number }[]) {
        console.log(`[handleMatchResult] Called for match ${matchId}`);
        console.log(`typeof matchId:`, typeof matchId);
        console.log(`typeof semifinalMatchIds[0]:`, typeof this.semifinalMatchIds[0]);
        results = results; 
        const winner = results.find(r => r.place === 0);
        const loser = results.find(r => r.place === 1);
        console.log(`[handleMatchResult] Results:`, results);
        
        if (!winner || !loser) {
            console.log(`Invalid tournament match results for match ${matchId}`);
            return;
        }

        const cache = CacheStorage.getInstance();
        console.log(`[handleMatchResult] Called with matchId=${matchId}`);
        console.log(`[handleMatchResult] semifinalMatchIds=`, this.semifinalMatchIds);
        console.log(`[handleMatchResult] includes=`, this.semifinalMatchIds.includes(matchId));

        if (this.semifinalMatchIds.includes(matchId)) {
            this.semifinalWinners.push(winner.userId);
            this.lostPlayers.push(loser.userId);
            console.log(`Semifinal ${matchId}: winner ${winner.userId}, loser ${loser.userId}`);

            if (this.semifinalWinners.length === 2) {
                const [w1, w2] = this.semifinalWinners;
                const finalMatchId = this.storage.addMatch(2, true);
                this.finalMatchId = finalMatchId;
                this.isFinalMatchCreated = true;

                this.storage.addParticipant(finalMatchId, w1);
                this.storage.addParticipant(finalMatchId, w2);
                TournamentManager.register(finalMatchId, this);
                try {
                    await cache.saveUserRating(w1, this.tournamentPlayers.get(w1.toString())?.mmr || 1000);
                    await cache.saveUserRating(w2, this.tournamentPlayers.get(w2.toString())?.mmr || 1000);
                } catch(error) {
                    console.error('Cache saveUserRating failed:', error);
                }
                try {
                    await cache.savePlayerMatch(w1.toString(), finalMatchId.toString());
                    await cache.savePlayerMatch(w2.toString(), finalMatchId.toString());
                } catch(error) {
                    console.error('Cache savePlayerMatch failed:', error);
                }
                console.log(`Sending final match creation to game server: ${finalMatchId}, players: [${w1}, ${w2}]`);
                try {
                    await this.notifyGameServer(finalMatchId, [w1, w2]);
                } catch (error) {
                    this.storage.setMatchStatus(finalMatchId, "failed");
                    await cache.deletePlayerMatch(w1.toString());
                    await cache.deleteUserRating(w1);
                    await cache.deletePlayerMatch(w2.toString());
                    await cache.deleteUserRating(w2); 
                }
                console.log(`Waiting for ${w1} to reconnect...`);
                const reconnected = await this.waitForReconnect([w1.toString(), w2.toString()], 20000);

                console.log(`Final match started: with ${w1} and ${w2}`);
                const player1 = this.tournamentPlayers.get(w1.toString());
                const player2 = this.tournamentPlayers.get(w2.toString());
                if (reconnected && player1?.socket?.readyState === 1 && player2?.socket?.readyState === 1) {
                    console.log(`Both players reconnected, sending match_ready`);
                    player1.socket.send(JSON.stringify({ type: 'match_ready', matchId: finalMatchId }));
                    player2.socket.send(JSON.stringify({ type: 'match_ready', matchId: finalMatchId }));
                } else {
                    console.warn(`Not all players reconnected in time`);
                    if (!reconnected) console.warn(`Player ${w1} did not reconnect`);
                    this.storage.setMatchStatus(finalMatchId, "failed");
                    await cache.deletePlayerMatch(w1.toString());
                    await cache.deleteUserRating(w1);
                    await cache.deletePlayerMatch(w2.toString());
                    await cache.deleteUserRating(w2); 
                    player1?.socket.send(JSON.stringify({
                        type: 'match_failed',
                        message: 'Game server did not respond'
                    }));
                    player2?.socket.send(JSON.stringify({
                        type: 'match_failed',
                        message: 'Game server did not respond'
                    }));
                    player1?.socket.close();
                    player2?.socket.close();
                }
                return;
            }
        } else if (this.finalMatchId && matchId === this.finalMatchId) {
            console.log('Final match completed');

            const finalResults = [
                { userId: winner.userId, place: 0 },
                { userId: loser.userId, place: 1 },
                { userId: this.lostPlayers[0], place: 2 },
                { userId: this.lostPlayers[1], place: 3 },
            ];
            await processMatchResult(matchId, 1, finalResults);
            this.isFinalMatchCompleted = true;
            this.onComplete?.();
        }
    }

    public hasPlayer(id: string): boolean {
        return this.tournamentPlayers.has(id);
    }

    public waitForReconnect = async (userId: string[], timeout = 20000): Promise<boolean> => {
        return new Promise(resolve => {
            const interval = setInterval(() => {
            if (this.hasPlayer(userId[0]) && this.hasPlayer(userId[1])) {
                console.log('Has players: ', userId[0], userId[1]);
                const player1 = this.tournamentPlayers.get(userId[0]);
                const player2 = this.tournamentPlayers.get(userId[1]);
                if (player1?.socket?.readyState === 1 && player2?.socket?.readyState === 1) {
                    clearInterval(interval);
                    resolve(true);
                }
            }
            }, 1000);

            setTimeout(() => {
            clearInterval(interval);
            resolve(false);
            }, timeout);
        });
    };

    public updatePlayerSocket(id: string, socket: any): void {
        const player = this.tournamentPlayers.get(id);
        if (player) {
            console.log(`Updating socket for player ${id}`);
            console.log('Old socket listeners:', player.socket.listenerCount('error'));
            player.socket.removeAllListeners();
            player.socket = socket;
            socket.on('error', (err: any) => console.error('Socket error:', err));
            
            console.log('New socket listeners:', socket.listenerCount('error'));
            this.socketToPlayerId.set(socket, id);
        }
        if (this.isFinalMatchCreated && this.finalMatchId !== null) {
            const userId = parseInt(id, 10);
            if (this.semifinalWinners.includes(userId)) {
                console.log(`Player ${id} reconnected during final match — sending match_ready`);
                socket.send(JSON.stringify({ type: 'match_ready', matchId: this.finalMatchId }));
            }
        }
    }

}
