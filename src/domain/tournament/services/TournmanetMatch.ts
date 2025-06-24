import Config from "../../../config/Config";
import { IStorage } from "../../../storage/IStorage";
import CacheStorage from "../../cache/CacheStorage";
import { Player } from "../../matchmaking/types";


async function notifyGameServer(matchId: number, players: number[]) {
    return await fetch(`http://${Config.getInstance().getGameAddr()}/internal/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, players, mode: 2})
    });
}

export default class TournamentMatch {

    private _id:number = 0;
    private status:string = 'active';

    private readonly storage:IStorage;
    private readonly players:Array<Player>;

    private _result?: {winner: number, loser: number};
    
    constructor(players:Array<Player> ,storage:IStorage) {
        this.storage = storage;
        if (!players || players.length === 0) {
            throw new Error("TournamentMatch error: players array cannot be empty.");
        }
        this.players = players;
    }

    public get id(): number {
        return this._id;
    }

    // Save match and its participants to the database.
    public save() {
        this._id = this.storage.addMatch(2, true);
        this.players.forEach((player: Player) => {
            this.storage.addParticipant(this._id, parseInt(player.id));
        })
    }

    // Save players mmr and playing status to the cache
    public async cacheUsersInfo() : Promise<Error | undefined> {
        const cache = CacheStorage.getInstance();
        try {
            await cache.saveUserRating(parseInt(this.players[0].id), this.players[0].mmr);
            await cache.saveUserRating(parseInt(this.players[1].id), this.players[1].mmr);

            await cache.savePlayerMatch(this.players[0].id, this._id.toString());
            await cache.savePlayerMatch(this.players[1].id, this._id.toString());
            return undefined;
        } catch (error){
            console.log("TournamentMatch error: failed to cache users info", error);
            return error as Error;
        }   
    }

    // Remove players mmr and playing status from the cache
    public async removeUsersInfo() : Promise<Error | undefined> {
        const cache = CacheStorage.getInstance();

        try {
            await cache.deleteUserRating(parseInt(this.players[0].id));
            await cache.deleteUserRating(parseInt(this.players[1].id));
    
            await cache.deletePlayerMatch(this.players[0].id);   
            await cache.deletePlayerMatch(this.players[1].id); 
            return undefined;
        } catch (error) {
            console.log("TournamentMatch error: failed to remove users info from cache", error);
            return error as Error;
        }
    }

    // Notify game server about the match and its participants.
    public async notifyGameServer() : Promise<Error | undefined> {
        try {
            const playersIds = this.players.map(player => parseInt(player.id));
            console.log(`Notify game server about match ${this._id} with players: ${playersIds.join(', ')}`);
            await notifyGameServer(this._id, playersIds);
            this.setStatus('active');
            return undefined;
        } catch (error) {
            console.error("TournamentMatch error: failed to notify game server", error);
            return error as Error;
        }
    }

    public setStatus(status: 'active' | 'failed') {
        this.storage.setMatchStatus(this._id, status);
    }

    private broadcast(type: string, data:any) {
        this.players.forEach((player: Player) => {
            if (player.socket && player.socket.readyState === player.socket.OPEN) {
                player.socket.send(JSON.stringify({ type, ...data }));
            }
        });
    }   

    public broadcastMatchReady() {
        this.broadcast('match_ready', { matchId: this._id})
    }

    public closeBroadcast() {
        this.players.forEach((player: Player) => {
            player.socket.close();
        });
    }

    public uploadResults(places: Array<{ userId: number, place: number }>) {
        
        const winnerId = places.find(place => place.place === 0)?.userId;
        const loserId = places.find(place => place.place === 1)?.userId;
        if (winnerId === undefined || loserId === undefined) {
            throw new Error("TournamentMatch error: winner or loser id not found in places array.");
        }
        this.storage.updateMatchWinner(this._id, winnerId);
        this._result = { winner: winnerId, loser: loserId };
    }

    public get result() {
        return this._result;
    }
}   