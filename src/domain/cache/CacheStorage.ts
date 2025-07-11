import RadishClient from '../../pkg/client/client';
import Config from '../../config/Config';

export const CacheSetError = new Error('CacheStorage error: failed to set key');
export const CacheGetError = new Error('CacheStorage error: failed to get key');
export const CacheDeleteError = new Error('CacheStorage error: failed to delete key');

export default class CacheStorage {
	private static instance: CacheStorage;
	private readonly radishClient: RadishClient;

	private constructor() {
		const host = Config.getInstance().getRadishHost();
		const port = Config.getInstance().getRadishPort();
		this.radishClient = new RadishClient({ host, port });
	}

	public static getInstance(): CacheStorage {
		if (!CacheStorage.instance) {
			CacheStorage.instance = new CacheStorage();
		}
		return CacheStorage.instance;
	}

	public async saveUserRating(userId: number, rating: number): Promise<void> {
		try {
			const key = `mmr:${userId}`;
			let keyExists = false;

			try {
				const getResponse = await this.radishClient.get(key);
				keyExists = getResponse && getResponse.status === 200;
			} catch (error) {
				keyExists = false;
			}
			if (keyExists) {
				await this.radishClient.delete(key);
			}
			const response = await this.radishClient.set(`mmr:${userId}`, rating.toString());
			if (!response || typeof response.status !== 'number') {
				throw new Error('Invalid response from Radish');
			}
			if (response.status !== 201) {
				switch (response.status) {
					case 400:
						console.warn(`Radish warning: bad request when saving MMR for user ${userId}`);
						break;
					case 409:
						console.warn(`Radish warning: conflict when saving MMR for user ${userId}`);
						break;
					case 500:
						console.error(`Radish error: internal server error while saving MMR for user ${userId}`);
						break;
				}
				throw CacheSetError;
			}
		} catch (error) {
			console.error(`CacheStorage error: failed to save MMR for user ${userId}`, error);
			throw error;
		}
	}

	public async getUserRating(userId: number): Promise<number | null> {
		const response = await this.radishClient.get(`mmr:${userId}`);
		if (response.status !== 200) {
			return null;
		}
		return response.value ? parseInt(response.value) : null;
	}

	public async deleteUserRating(userId: number): Promise<void> {
		const response = await this.radishClient.delete(`mmr:${userId}`);
		if (response.status !== 200) {
			throw CacheDeleteError;
		}
	}

	public async savePlayerMatch(playerId: string, matchId: string): Promise<void> {
		const key = `playing-${playerId}`;

		try {
			const existing = await this.radishClient.get(key);
			if (existing && existing.status === 200) {
				await this.radishClient.delete(key);
			}
			const response = await this.radishClient.set(key, matchId);
			if (!response || typeof response.status !== 'number' || response.status !== 201) {
				throw CacheSetError;
			}
		} catch (error) {
			console.error(`CacheStorage error: failed to save player match ${playerId}`, error);
			throw CacheSetError;
		}
	}


	public async getPlayerMatch(playerId: string): Promise<string | undefined> {
		try {
			const key = `playing-${playerId}`;
			const response = await this.radishClient.get(key);
			if (response.status !== 200) {
				return undefined;
			}
			return response.value;
		} catch (error) {
			console.error(`CacheStorage error: failed to get player match ${playerId}`, error);
			throw CacheGetError;
		}
	}

	public async deletePlayerMatch(playerId: string): Promise<void> {
		try {
			const key = `playing-${playerId}`;
			const response = await this.radishClient.delete(key);
			if (response.status !== 200) {
				throw CacheDeleteError;
			}
		} catch (error) {
			console.error(`CacheStorage error: failed to delete player match ${playerId}`, error);
			throw CacheDeleteError;
		}
	}
}
