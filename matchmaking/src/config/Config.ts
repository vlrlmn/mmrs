import * as dotenv from 'dotenv';

dotenv.config();

export class Config {
  static readonly PORT = parseInt(process.env.PORT || '3000', 10);
  static readonly ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
}
