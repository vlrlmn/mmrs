import Config from "../../config/Config";
import CacheStorage from "../../domain/cache/CacheStorage";
import { Storage } from "../../storage/Storage";

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

export async function processMatchResult(  
    matchId: number,
    status: number,
    results: { userId: number; place: number }[]
) {
    const cache = CacheStorage.getInstance();
    const storage = new Storage();
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
    console.log('processMatchResult: Applying rating updates:', updates);
    storage.updateRatingTransaction(matchId, updates);
    const winner = results.find(r => r.place === 0);
    if (winner) {
        storage.updateMatchWinner(matchId, winner.userId);
    }

    for (const result of results) {
        await cache.deletePlayerMatch(result.userId.toString());
        await cache.deleteUserRating(result.userId);
    }

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