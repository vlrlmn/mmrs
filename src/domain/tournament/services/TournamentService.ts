import { ITournament } from "../ITournament";
import { Player, TournamentStage } from "../../matchmaking/types";
import { IStorage } from '../../../storage/IStorage';
import CacheStorage from "../../cache/CacheStorage";
import Config from "../../../config/Config";
import { processMatchResult } from "../../../api/internal/processMatchResult";
import { TournamentManager } from "../TournamentManager";


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
        console.log('Notify game server');
        return res;
    }

      
    async addPlayer(player: Player): Promise<boolean> {
        console.log('before set');
        this.tournamentPlayers.set(player.id, player);
        this.socketToPlayerId.set(player.socket, player.id);
        console.log('Values set');
        // this.broadcastPlayersStatus();

        if (this.tournamentPlayers.size === 4) {
            console.log('Check for 4 players');
            const players = Array.from(this.tournamentPlayers.values()).sort((a, b) => parseInt(a.id) - parseInt(b.id));
            const match1 = this.storage.addMatch(2, true);
            const match2 = this.storage.addMatch(2, true);
            TournamentManager.register(match1, this);
            TournamentManager.register(match2, this);
            const [p1, p2, p3, p4] = players;
            console.log('Created players', p1, p2, p3, p4);
            this.storage.addParticipant(match1, parseInt(p1.id));
            this.storage.addParticipant(match1, parseInt(p2.id));
            this.storage.addParticipant(match2, parseInt(p3.id));
            this.storage.addParticipant(match2, parseInt(p4.id));
            const cache = CacheStorage.getInstance();
            console.log('Caching players');
            for (const player of players) {
                await cache.saveUserRating(parseInt(player.id), player.mmr);
            }
            try {
                const res1 = await this.notifyGameServer(match1, [parseInt(p1.id), parseInt(p2.id)]);
                const res2 = await this.notifyGameServer(match2, [parseInt(p3.id), parseInt(p4.id)]);

                console.log(`Game server notified: match ${match2} created.`);
                this.storage.setMatchStatus(match1, 'active');
                this.storage.setMatchStatus(match2, 'active');
                
                console.log(await res1.text());
                console.log(await res2.text());
                try {
                    await cache.savePlayerMatch(p1.id, match1.toString());
                    await cache.savePlayerMatch(p2.id, match1.toString());
                } catch(error) {
                    console.log('Not cached! savePlayerMatch: ', error);
                }
                try {
                    await cache.savePlayerMatch(p3.id, match2.toString());
                    await cache.savePlayerMatch(p4.id, match2.toString());
                } catch(error) {
                    console.log('Not cached! savePlayerMatch: ', error);
                }
                    console.log('savePlayerMatch, player sent');
                    this.semifinalMatchIds = [Number(match1), Number(match2)];
                    console.log('Match ids: ', match1, match2);
            } catch (error) {
                console.error(`Failed to notify game server about match ${match1}:`, error);
                console.error(`Failed to notify game server about match ${match2}:`, error);
                this.storage.setMatchStatus(match1, "failed");
                this.storage.setMatchStatus(match2, "failed");
                p1.socket.send(JSON.stringify({
                    type: 'match_failed',
                    reason: 'Game server did not respond'
                }));
                p2.socket.send(JSON.stringify({
                    type: 'match_failed',
                    reason: 'Game server did not respond'
                }));
                p3.socket.send(JSON.stringify({
                    type: 'match_failed',
                    reason: 'Game server did not respond'
                }));
                p4.socket.send(JSON.stringify({
                    type: 'match_failed',
                    reason: 'Game server did not respond'
                }));
                return false;
            }
            p1.socket.send(JSON.stringify({ type: 'match_ready', matchId: match1 }));
            p2.socket.send(JSON.stringify({ type: 'match_ready', matchId: match1 }));
            p3.socket.send(JSON.stringify({ type: 'match_ready', matchId: match2 }));
            p4.socket.send(JSON.stringify({ type: 'match_ready', matchId: match2 }));

            // p1.socket.close();
            // p2.socket.close();
            // p3.socket.close();
            // p4.socket.close();
            console.log('Added player, sent match ready');
            return true;
        }
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
            this.broadcastPlayersStatus();
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
        results = results
        .map(r => ({
            ...r,
            place: r.place === 0 ? 2 : r.place
        }))
        .sort((a, b) => a.place - b.place); 
        const winner = results.find(r => r.place === 1);
        const loser = results.find(r => r.place === 2);
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
                const res = await this.notifyGameServer(finalMatchId, [w1, w2]);
                console.log(`Final match started: with ${w1} and ${w2}`);
                const player1 = this.tournamentPlayers.get(w1.toString());
                const player2 = this.tournamentPlayers.get(w2.toString());
                
                console.log(`Waiting for ${w1} to reconnect...`);
                const ok1 = await this.waitForReconnect(w1.toString(), 10000);
                console.log(`Reconnect for ${w1}: ${ok1}`);

                console.log(`Waiting for ${w2} to reconnect...`);
                const ok2 = await this.waitForReconnect(w2.toString(), 10000);
                console.log(`Reconnect for ${w2}: ${ok2}`);
                if (ok1 && player1?.socket?.readyState === 1) {
                    player1.socket.send(JSON.stringify({ type: 'match_ready', matchId: finalMatchId }));
                } else {
                    console.warn(`Player ${w1} did not reconnect in time`);
                }
                if (ok2 && player2?.socket?.readyState === 1) {
                    player2.socket.send(JSON.stringify({ type: 'match_ready', matchId: finalMatchId }));
                } else {
                    console.warn(`Player ${w2} did not reconnect in time`);
                }

                // if (player1?.socket?.readyState === 1) {
                //     player1.socket.send(JSON.stringify({ type: 'match_ready', matchId: finalMatchId }));
                // } else {
                //     console.warn(`Socket for player ${w1} not ready to send final match notification`);
                // }

                // if (player2?.socket?.readyState === 1) {
                //     player2.socket.send(JSON.stringify({ type: 'match_ready', matchId: finalMatchId }));
                // } else {
                //     console.warn(`Socket for player ${w2} not ready to send final match notification`);
                // }
                return;
            }
        } else if (this.finalMatchId && matchId === this.finalMatchId) {
            console.log('Final match completed');

            const finalResults = [
                { userId: winner.userId, place: 1 },
                { userId: loser.userId, place: 2 },
                { userId: this.lostPlayers[0], place: 3 },
                { userId: this.lostPlayers[1], place: 4 },
            ];

            for (const r of finalResults) {
                await cache.saveUserRating(r.userId, this.tournamentPlayers.get(r.userId.toString())?.mmr || 1000);
                await cache.deletePlayerMatch(r.userId.toString());
            }

            await processMatchResult(matchId, 1, finalResults);
            this.isFinalMatchCompleted = true;
            this.onComplete?.();
        }
    }

    public hasPlayer(id: string): boolean {
        return this.tournamentPlayers.has(id);
    }

    public waitForReconnect = async (userId: string, timeout = 10000): Promise<boolean> => {
        return new Promise(resolve => {
            const interval = setInterval(() => {
            if (this.hasPlayer(userId)) {
                console.log('Has player ', userId);
                const player = this.tournamentPlayers.get(userId);
                if (player?.socket?.readyState === 1) {
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

    // public updatePlayerSocket(id: string, socket: any): void {
    //     const player = this.tournamentPlayers.get(id);
    //     if (player) {
    //         console.log(`Updating socket for player ${id}`);
    //         console.log('Old socket listeners:', player.socket.listenerCount('error'));
    //         player.socket.removeAllListeners();
    //         player.socket = socket;
    //         socket.on('error', (err: any) => console.error('Socket error:', err));
            
    //         console.log('New socket listeners:', socket.listenerCount('error'));
    //         this.socketToPlayerId.set(socket, id);
    //     }
    //     if (this.isFinalMatchCreated && this.finalMatchId !== null) {
    //     const userId = parseInt(id, 10);
    //     if (this.semifinalWinners.includes(userId)) {
    //         console.log(`Player ${id} reconnected during final match — sending match_ready`);
    //         socket.send(JSON.stringify({ type: 'match_ready', matchId: this.finalMatchId }));
    //     }
    // }
    // }
    public async updatePlayerSocket(id: string, socket: any): Promise<void> {
        const cache = CacheStorage.getInstance();
        let player = this.tournamentPlayers.get(id);

        if (player) {
            console.log(`Updating socket for player ${id}`);
            player.socket.removeAllListeners();
            player.socket = socket;
            socket.on('error', (err: any) => console.error('Socket error:', err));
        } else {
            // 👇 Получаем MMR из кэша
            let mmr: number = 1000;
            try {
                const cached = await cache.getUserRating(parseInt(id));
                if (cached !== null) {
                    mmr = cached;
                } else {
                    console.warn(`MMR not found in cache for player ${id}, using default`);
                }
            } catch (err) {
                console.error(`Failed to get MMR for player ${id}:`, err);
            }

            player = { id, mmr, socket, joinedAt: Date.now() };
            this.tournamentPlayers.set(id, player);
            console.log(`Re-added player ${id} to tournamentPlayers`);
        }

        this.socketToPlayerId.set(socket, id);
        socket.on('error', (err: any) => console.error('Socket error:', err));

        if (this.isFinalMatchCreated && this.finalMatchId !== null) {
            const userId = parseInt(id, 10);
            if (this.semifinalWinners.includes(userId)) {
                console.log(`Player ${id} reconnected during final match — sending match_ready`);
                socket.send(JSON.stringify({ type: 'match_ready', matchId: this.finalMatchId }));
            }
        }
    }

}
