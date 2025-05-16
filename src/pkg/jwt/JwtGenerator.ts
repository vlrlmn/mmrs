import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import RadishClient from "../client/client"
import Config from "../../config/Config"
import { JwtGeneratorConfig } from "./JwtGeneratorConfig"
import { JwtSignError, JwtCachError, JwtTokenVerificationError } from './jwtErrors';

function setUpJwtGenerator(): void {
	JwtGenerator.getInstance();
	console.log("set up JwtGenerator instance successfuly")
} 

interface JwtPayload {
	userId: number;
}

interface TokenPair {
	accessToken: string;
	refreshToken: string 
}

export enum TokenType {
	Access = 'access',
	Refresh = 'refresh',
}

class JwtGenerator {

	private static instance: JwtGenerator;
	private readonly config: JwtGeneratorConfig;
	private radishClient: RadishClient;

	private constructor() {
		this.config = new JwtGeneratorConfig();
		const host = Config.getInstance().getRadishHost();
		const port = Config.getInstance().getRadishPort();
		this.radishClient = new RadishClient({ host, port});
	}

	public static getInstance(): JwtGenerator {
		if (!JwtGenerator.instance) {
			JwtGenerator.instance = new JwtGenerator();
		}
		return JwtGenerator.instance;
	}
	
	private generateToken(payload: JwtPayload, expiresIn: number): string {
		try {
			return jwt.sign(payload as jwt.JwtPayload, this.config.secret + this.config.salt, {
				expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
			});
		} catch (error: any) {
			throw JwtSignError;
		} 
	}
  
	public async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
		const accessToken = this.generateToken(payload, this.config.accessExpiresIn);
		const refreshToken = this.generateToken(payload, this.config.refreshExpiresIn);
		const accessResponse = await this.radishClient.set(`access-${accessToken}`, "true");
		if (accessResponse.status !== 201)
			throw JwtCachError;
		const refreshResponse = await this.radishClient.set(`refresh-${refreshToken}`, "true");
		if (refreshResponse.status !== 201)
			throw JwtCachError;
		return { accessToken, refreshToken };
	}
  
	public async verifyToken(token: string, type: TokenType): Promise<JwtPayload> {
		
		const key = `${type}-${token}`;
		const status = await this.radishClient.get(key);
		if (status.status != 200) {
			throw JwtCachError;
		}
		try {
			return jwt.verify(token, this.config.secret + this.config.salt) as JwtPayload;
		} catch (error) {
			throw JwtTokenVerificationError;
		}
	}
};

//return undefined if error was caught, in handler reply 401
async function isTokenValid(request: FastifyRequest, type: TokenType = TokenType.Access): Promise<JwtPayload | undefined>
{
	let token: string;
	if (type === TokenType.Access) {
		token = request.headers.authorization?.replace('Bearer ', '') as string;
	} else {
		const body = request.body as { refreshToken: string };
		token = body.refreshToken;
	}
	if (!token) {
		console.log(`${type} token excraction failed`);
		return undefined;
	}
	try {
		return await JwtGenerator.getInstance().verifyToken(token, type);
	} catch (err: any) {
		console.log(err);
		return undefined;
	}
}

//in handler reply 500
async function generateJwtTokenPair(payload: JwtPayload): Promise<TokenPair | undefined> 
{
	try {
		return JwtGenerator.getInstance().generateTokenPair(payload);
	} catch (err: any) {
		console.log(err);
		return undefined;
	}
}

export {
	isTokenValid,
	generateJwtTokenPair,
	setUpJwtGenerator
}