import { ITournament } from "../ITournament";
import { Player } from "../../matchmaking/types";
import { IStorage } from '../../../storage/IStorage';
import CacheStorage from "../../cache/CacheStorage";
import Config from "../../../config/Config";
import { processTournamentResult } from "../../../api/internal/processMatchResult";
import { TournamentManager } from "../TournamentManager";
import TournamentMatch from "./TournmanetMatch";

export class TournamentService implements ITournament {
    private tournamentId?: number;

    private tournamentPlayers: Map<string, Player> = new Map();
    private socketToPlayerId: Map<any, string> = new Map();
    private readonly onComplete?: () => void;
    private semifinalWinners: number[] = [];
    private lostPlayers: number[] = [];
    private semifinalMatchIds: number[] = [];
    private finalMatchId: number | null = null;
    private matches: Map<number, TournamentMatch> = new Map();
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
        return res;
    }

    async failed(matches: Array<TournamentMatch>) {
        for (const match of matches) {
            try {
                match.setStatus('failed');
                await match.removeUsersInfo();
                match.broadcast('match_failed', { message: 'Match failed. Tournament failed.' });
                match.closeBroadcast();
            } catch (error) {
                console.error(`TournamentService failed: error handling match ${match.id}:`, error);
            }
        }
        if (this.tournamentId) {
            this.storage.setMatchStatus(this.tournamentId, 'failed');
        }
        this.onComplete?.();
    }

    private saveTournament(): boolean {
        const tournamentId = this.storage.addMatch(2, false);
        if (!tournamentId) {
            return false;
        }
        this.tournamentId = tournamentId;
        this.tournamentPlayers.forEach((player: Player) => {
            this.storage.addParticipant(tournamentId, parseInt(player.id));
        })
        return true;
    }

    async addPlayer(player: Player): Promise<boolean> {

        // Save player to Map as participant
        this.tournamentPlayers.set(player.id, player);
        this.socketToPlayerId.set(player.socket, player.id);

        // If all players are added, start the tournament
        if (this.tournamentPlayers.size !== 4) {
            return true;
        }
        
        if (!this.saveTournament()) {
            return false;
        }
        const players = Array.from(this.tournamentPlayers.values()).sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const matches = [
            new TournamentMatch([players[0], players[1]], this.storage),
            new TournamentMatch([players[2], players[3]], this.storage)
        ]
        matches.forEach((match:TournamentMatch) => match.save());
        
        matches.forEach((match:TournamentMatch) => TournamentManager.register(match.id, this))
        matches.forEach((match:TournamentMatch) => this.matches.set(match.id, match));

        // Save users data in cache
        let failedMatch1: Error | undefined = await matches[0].cacheUsersInfo();   
        let failedMatch2: Error | undefined = await matches[1].cacheUsersInfo();
        if (failedMatch1 !== undefined || failedMatch2 !== undefined) {
            this.failed(matches);
            return false;
        }

        // Notify game server about matches
        failedMatch1 = await matches[0].notifyGameServer();
        failedMatch2 = await matches[1].notifyGameServer();
        if (failedMatch1 !== undefined || failedMatch2 !== undefined) {
            this.failed(matches);
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

    public removePlayer(playerId: string): void {
        if (this.tournamentPlayers.has(playerId)) {
            const player = this.tournamentPlayers.get(playerId);
            if (player) {
                this.socketToPlayerId.delete(player.socket);
            }

            this.tournamentPlayers.delete(playerId);
        }

       if (this.tournamentPlayers.size === 0) {
            if (this.isFinalMatchCreated && this.isFinalMatchCompleted) {
                this.onComplete?.();
            }
        }
    }

    public getPlayerIdBySocket(socket: any): string | undefined {
        return this.socketToPlayerId.get(socket);
    }

    public  getPlayerCount(): number {
        return this.tournamentPlayers.size;
    }


    public  getTournamentId(): number | undefined {
        if (!this.tournamentId)
            return ;
        return this.tournamentId;
    }

    private async handleFinalMatchCreation() {
        const [w1, w2] = this.semifinalWinners;

        const reconnected = await this.waitForReconnect([w1.toString(), w2.toString()], 60000);
        if (!reconnected) {
            await this.failed([...this.matches.values()]);
            console.error(`TournamentService error: Players ${w1} and ${w2} did not reconnect in time`);
            return;
        }

        const player1 = this.tournamentPlayers.get(w1.toString());
        const player2 = this.tournamentPlayers.get(w2.toString());
        if (!player1 || !player2) {
            await this.failed([...this.matches.values()]);
            console.error(`TournamentService error: Players ${w1} or ${w2} not found in tournament`);
            return;
        }

        const finalMatch = new TournamentMatch([player1, player2], this.storage);
        finalMatch.save();
        TournamentManager.register(finalMatch.id, this);

        this.finalMatchId = finalMatch.id;
        this.isFinalMatchCreated = true;

        const cacheError = await finalMatch.cacheUsersInfo();
        if (cacheError) {
            await this.failed([...this.matches.values()]);
            
            console.error(`TournamentService error: Failed to cache users info for final match`, cacheError);
            return;
        }

        this.matches.set(finalMatch.id, finalMatch);

        const notifyError = await finalMatch.notifyGameServer();
        if (notifyError) {
            await this.failed([...this.matches.values()]);
            console.error(`TournamentService error: Failed to notify game server about final match`, notifyError);
            return;
        }

        finalMatch.broadcastMatchReady();
        finalMatch.closeBroadcast();
    }

    public async handleMatchResult(matchId: number, results: Array<{ userId: number, place: number }>) {

        // Check if matchId is valid
        const match = this.matches.get(matchId);
        if (!match) {
            return;
        }

        // Check if results are valid
        match.uploadResults(results);
        const matchResult = match?.result;
        if (!matchResult) {
            return;
        }

        // Check if match is final
        if (this.finalMatchId && matchId === this.finalMatchId) {
            if (!this.tournamentId) {
                return ;
            }
            const finalResults = [
                { place: 0, userId: matchResult.winner,  },
                { place: 1, userId: matchResult.loser,   },
                { place: 2, userId: this.lostPlayers[0], },
                { place: 3, userId: this.lostPlayers[1], },
            ];

            await processTournamentResult({
                tournamentId: this.tournamentId,
                winnerId: matchResult.winner,
                results: finalResults,
                status: 1,
            });

            const cache = CacheStorage.getInstance();
            for (const result of finalResults) {
                await cache.deletePlayerMatch(result.userId.toString());
                await cache.deleteUserRating(result.userId);
            }
            
            this.isFinalMatchCompleted = true;
            this.onComplete?.();
            return
        }

        // Check if match is semifinal
        if (!this.semifinalMatchIds.includes(matchId)) {
            return ;
        }

        this.lostPlayers.push(matchResult.loser);
        
        this.semifinalWinners.push(matchResult.winner);
        
        if (this.semifinalWinners.length < 2) {
            return ;
        }

        await this.handleFinalMatchCreation()
    }

    public hasPlayer(id: string): boolean {
        return this.tournamentPlayers.has(id);
    }

    public waitForReconnect = async (userId: string[], timeout = 60000): Promise<boolean> => {
        return new Promise(resolve => {
            const interval = setInterval(() => {
            if (this.hasPlayer(userId[0]) && this.hasPlayer(userId[1])) {
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
            player.socket.removeAllListeners();
            player.socket = socket;
            socket.on('error', (err: any) => console.error('Socket error:', err));
            this.socketToPlayerId.set(socket, id);
        }
        if (this.isFinalMatchCreated && this.finalMatchId !== null) {
            const userId = parseInt(id, 10);
            if (this.semifinalWinners.includes(userId)) {
                socket.send(JSON.stringify({ type: 'match_ready', matchId: this.finalMatchId }));
            }
        }
    }

    public getAllMatches(): TournamentMatch[] {
		return Array.from(this.matches.values());
	}

}
