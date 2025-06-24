import Config from "../../config/Config";
import CacheStorage from "../../domain/cache/CacheStorage";
import { Storage } from "../../storage/Storage";

type ProcessTournamentResultsParams = {
    tournamentId: number,
    status: number,
    winnerId?: number,
    results?: { userId: number; place: number }[]
}

export async function processTournamentResult(params: ProcessTournamentResultsParams) {
   
    const storage = new Storage();
    if (params.results) {
        const ratingUpdates: Array<{ id: number, rating: number }> = await resultsToUpdates(params.results);
        console.log('processMatchResult: Applying rating updates:', ratingUpdates);
        storage.updateRatingTransaction(params.tournamentId, ratingUpdates);
        sendUpdatesToUMS(ratingUpdates);
    }

    if (params.winnerId) {
        storage.updateMatchWinner(params.tournamentId, params.winnerId);
    }

    if (params.status === 2) {
        storage.setMatchStatus(params.tournamentId, 'failed');
    }
}

function getUpdatedRating(oldRating:number, place:number) {
    let newRating = oldRating;
    switch (place) {
        case 0:
            newRating += 25;
            break;
        case 1:
            newRating += 12;
            break;
        case 2:
            newRating = Math.max(0, oldRating - 12);
            break;
        case 3:
            newRating = Math.max(0, oldRating - 12);
            break;
        default:
            throw new Error('Invalid place in tournament result');
    }
    return newRating;
}

async function resultsToUpdates(results: { userId: number; place: number }[]) {
    const cache = CacheStorage.getInstance();
    const updates: Array<{ id: number, rating: number }> = [];
    
    for (const result of results) {
        const currentRating = await cache.getUserRating(result.userId);
        if (currentRating === null) {
            throw new Error(`MMR for user ${result.userId} not found in cache`);
        }
        updates.push({ 
            id: result.userId, 
            rating: getUpdatedRating(currentRating, result.place) 
        });
    }
    return updates;
}

async function sendUpdatesToUMS(updates: Array<{ id: number, rating: number }>) {
    try {
        const res = await fetch(`http://${Config.getInstance().getUmsAddr()}/internal/rating/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!res.ok) {
            console.error('UMS update failed', res.status);
        } else {
            console.log('UMS rating update succeeded');
        }
    } catch (e) {
        console.error('Failed to notify UMS:', e);
    }
}

