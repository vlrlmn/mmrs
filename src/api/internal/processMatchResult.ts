import Config from "../../config/Config";
import CacheStorage from "../../domain/cache/CacheStorage";

export async function processMatchResult(  
    matchId: number,
    status: number,
    results: { userId: number; place: number }[]
) {
    const cache = CacheStorage.getInstance();
    const updates: Array<{ id: number, rating: number }> = [];
    const storage = new Storage();
    
    for (const result of results) {
        const currentRating = await cache.getUserRating(result.userId);
        if (currentRating === null) {
            throw new Error(`MMR for user ${result.userId} not found in cache`);
        }
        let newRating = currentRating;

        switch (result.place) {
        case 1:
            newRating += 25;
            break;
        case 2:
            newRating += 12;
            break;
        case 3:
        case 4:
            newRating = Math.max(0, currentRating - 12);
            break;
        default:
            throw new Error('Invalid place in tournament result');
        }
        updates.push({ id: result.userId, rating: newRating });
    }
    console.log('Applying rating updates:', updates);
    storage.updateRatingTransaction(matchId, updates);
    const winner = results.find(r => r.place === 1);
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