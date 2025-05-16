import * as dotenv from 'dotenv';

dotenv.config();

// export class Config { 
//   static readonly PORT = parseInt(process.env.PORT || '3000', 10);
//   static readonly ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
//   private readonly radishHost = process.env.RADISH_HOST || "localhost";
//   private readonly radishPort = Number(process.env.RADISH_PORT) || 5100;
// }

export default class Config {
  private static instance: Config;
  private mode: string;
  private readonly radishHost: string;
  private readonly radishPort: number;
  private readonly port: number;
  private readonly allowedOrigin: string;

  private constructor() {
    this.mode = process.env.MODE || "develop";
    this.radishHost = process.env.RADISH_HOST  || "localhost";
    this.radishPort = Number(process.env.RADISH_PORT)  || 5100;
    this.port = Number(process.env.PORT) || 3000;
    this.allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public getRadishHost(): string {
    return this.radishHost;
  }

  public getRadishPort(): number {
    return this.radishPort;
  }

  public getHost(): string {
    if (this.mode === "production") {
      return "0.0.0.0";
    } 
    return "localhost";
  }

  public getPort(): number {
    return this.port;
  }

  public getAllowedOrigin() : string {
    return this.allowedOrigin;
  }
};