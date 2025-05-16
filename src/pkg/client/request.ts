import net from 'net';

type RequestType = 'GET' | 'SET' | 'DEL'

export default class RadishRequest {
    type: RequestType;
    body: Record<string, any>;

    private constructor(type: RequestType, data: Record<string, any>) {
        this.type = type;
        this.body = data;
    }

    toJSON() {
        return JSON.stringify({
            type: this.type,
            data: this.body
        });
    }

    send(conn: net.Socket) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
			conn.write(this.toJSON() + '\n', (err) => {
				if (err) {
					return reject(err);
				}
			});

			conn.once('data', (data) => {
				resolve(data.toString());
			});

			conn.once('error', (err) => {
				reject(err);
			});
		});
    }

    static request(type: RequestType, data: Record<string, any>) {
        return new RadishRequest(type, data);
    }

    static get(key:string) {
        return new RadishRequest('GET', { key });
    }

    static set(key:string, value:string, expire?:number) {
        return new RadishRequest('SET', { key, value, expire});
    }

    static del(key:string) {
        return new RadishRequest('DEL', { key });
    }
}