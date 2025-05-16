import { stringToSeconds } from './jwtUtils';
import {JwtGeneratorConfigError} from './jwtErrors';

export class JwtGeneratorConfig {
    public readonly secret: string;
    public readonly salt: string;
    public readonly accessExpiresIn: number;
    public readonly refreshExpiresIn: number;
  
    constructor() {
        const secret = process.env.JWT_SECRET
        const salt = process.env.JWT_SALT
        if (!secret || !salt) {
            throw JwtGeneratorConfigError;
        }  
        this.secret = secret;
        this.salt = salt;
        try {
            this.accessExpiresIn = stringToSeconds(process.env.JWT_ACCESS_EXPIRES_IN || '15m');
            this.refreshExpiresIn = stringToSeconds(process.env.JWT_REFRESH_EXPIRES_IN || '90d');
        } catch {
            throw JwtGeneratorConfigError;
        }
    }
};