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

    async addPlayer(player: Player): Promise<boolean> {
        this.tournamentPlayers.set(player.id, player);
        this.socketToPlayerId.set(player.socket, player.id);
        this.broadcastPlayersStatus();

        if (this.tournamentPlayers.size === 4) {
            const matchId = this.storage.addMatch(2);
            for (const player of this.tournamentPlayers.values()) {
                this.storage.addParticipant(matchId, parseInt(player.id));
            }

            const cache = CacheStorage.getInstance();
            for (const player of this.tournamentPlayers.values()) {
                await cache.saveUserRating(parseInt(player.id), player.mmr);
            }
            const playersIds = Array.from(this.tournamentPlayers.values()).map(p => parseInt(p.id));
            await fetch(`http://${Config.getInstance().getGameAddr()}/internal/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, playersIds })
            });

            for (const player of this.tournamentPlayers.values()) {
                try {
                    player.socket.send(JSON.stringify({type: 'start_game', message: 'Tournament started!'}));
                    player.socket.close();
                } catch(error) {
                    console.log(`Failed to close socket for player ${player.id}`);
                }
            }
            this.onComplete?.();
        }
        return true;
    }

    private broadcastPlayersStatus(): void {
        const count = this.tournamentPlayers.size;
        const message =  JSON.stringify ({
            message: 'tournamnet_lobby_counter',
            current: count,
            total: 4
        });

        for (const player of this.tournamentPlayers.values()) {
            if (player.socket.readyState === 1) {
                player.socket.send(JSON.stringify({ type: 'start_game', message: 'Tournament started!' }));
                player.socket.close();
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
