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

	public async saveUserRating(userId: number, rating: number, ttl: number = 3600): Promise<void> {
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
			const response = await this.radishClient.set(`mmr:${userId}`, rating.toString(), ttl);
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
			console.log("User info saved in database. User id: ", userId);
		} catch (error) {
			console.error(`CacheStorage error: failed to save MMR for user ${userId}`, error);
			throw error;
		}
	}

	public async getUserRating(userId: number): Promise<number | null> {
		const response = await this.radishClient.get(`mmr:${userId}`);
		if (response.status !== 200) {
			throw CacheGetError;
		}
		return response.value ? parseInt(response.value) : null;
	}

	public async deleteUserRating(userId: number): Promise<void> {
		const response = await this.radishClient.delete(`mmr:${userId}`);
		if (response.status !== 200) {
			throw CacheDeleteError;
		}
	}
}
