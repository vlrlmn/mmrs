import { ITournament } from "../ITournament";
import { Player, TournamentStage } from "../../matchmaking/types";
import { IStorage } from '../../../storage/IStorage';
import CacheStorage from "../../cache/CacheStorage";
import Config from "../../../config/Config";


export class TournamentService implements ITournament {
    private tournamentPlayers: Map<string, Player> = new Map();
    private socketToPlayerId: Map<any, string> = new Map();
    private readonly onComplete?: () => void;

    constructor(private readonly storage: IStorage, onComplete?: () => void) {
        this.onComplete = onComplete;
    }

    async notifyGameServer(matchId: number, players: number[]) {
        const res = await fetch(`http://${Config.getInstance().getGameAddr()}/internal/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: matchId, players})
        });
        console.log('Notify game server', res);
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

                cache.savePlayerMatch(p1.id, match1.toString());
                cache.savePlayerMatch(p2.id, match1.toString());
                cache.savePlayerMatch(p3.id, match2.toString());
                cache.savePlayerMatch(p4.id, match2.toString());
                console.log('savePlayerMatch, player sent');
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
                console.log('Err!');
                return false;
            }
            p1.socket.send(JSON.stringify({ type: 'match_ready', matchId: match1 }));
            p2.socket.send(JSON.stringify({ type: 'match_ready', matchId: match1 }));
            p3.socket.send(JSON.stringify({ type: 'match_ready', matchId: match2 }));
            p4.socket.send(JSON.stringify({ type: 'match_ready', matchId: match2 }));
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

    removePlayer(playerId: string): void {
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
            console.log("All players left. Ending tournament.");
            this.onComplete?.();
        }
    }

    public getPlayerIdBySocket(socket: any): string | undefined {
        return this.socketToPlayerId.get(socket);
    }

    public  getPlayerCount(): number {
        return this.tournamentPlayers.size;
    }
}
