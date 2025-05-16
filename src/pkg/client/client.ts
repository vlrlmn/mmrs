import net from 'net';
import RadishRequest from './request';
import RadishResponse from './response';
import RequestQueue from './queue';

type RadishClientConfig = {
	host: string;
	port: number;
	onConnect?: () => void;
}

export default class RadishClient {
	private conn: net.Socket;
	private config: RadishClientConfig;
	isConnected: boolean = false;
	private reconnecting: boolean = false;
	private queue: RequestQueue = new RequestQueue(this);

	constructor(config: RadishClientConfig) {
		if (!config.host || !config.port) {
			throw new Error('RadishClient error : host and port are required.');
		}

		this.config = config;
		this.conn = this.connect();
	}

	private connect(): net.Socket {
		const port = this.config.port;
		const host = this.config.host;

		const socket = net.createConnection({ port, host }, () => {
			this.isConnected = true;
			this.reconnecting = false;
			this.config.onConnect?.();
			console.log('RadishClient info : connected to server.');
		});

		socket.on('error', (err) => {
			console.error('RadishClient error : connection establishment failed :', err.message);
		});

		socket.on('close', () => {
			if (this.isConnected) {
				console.error('RadishClient error : connection closed.');
			}
			this.isConnected = false;
			if (!this.reconnecting) {
				this.reconnect();
			}
		});

		this.conn = socket;
		return socket;
	}

	private reconnect() {
		this.reconnecting = true;
		const attemptReconnect = () => {
			if (this.isConnected) {
				this.reconnecting = false;
				return;
			}

			console.log('RadishClient info : Attempting to reconnect...');
			this.conn = this.connect();
			
			// Wait 1 second before next attempt
			setTimeout(() => {
				if (!this.isConnected) {
					attemptReconnect();
				}
			}, 1000);
		};

		attemptReconnect();
	}

	close() {
		this.conn.end();
		this.conn.destroy();
		this.isConnected = false;
		this.reconnecting = false;
	}

	async get(key: string) {
		const request = RadishRequest.get(key);
		const data = await this.queue.add(() => request.send(this.conn));
		return new RadishResponse(data);
	}

	async set(key: string, value: string, expire?: number) {
		const request = RadishRequest.set(key, value, expire);
		const data = await this.queue.add(() => request.send(this.conn));
		return new RadishResponse(data);
	}

	async delete(key: string) {
		const request = RadishRequest.del(key);
		const data = await this.queue.add(() => request.send(this.conn));
		return new RadishResponse(data);
	}
}
