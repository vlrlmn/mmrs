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
		const response = await this.radishClient.set(`mmr:${userId}`, rating.toString(), ttl);
		if (response.status !== 201) {
			throw CacheSetError;
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
