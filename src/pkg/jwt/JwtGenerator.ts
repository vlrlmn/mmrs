import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import RadishClient from "../client/client"
import Config from "../../config/Config"
import { JwtGeneratorConfig } from "./JwtGeneratorConfig"
import { JwtSignError, JwtCachError, JwtTokenVerificationError } from './jwtErrors';

function setUpJwtGenerator(): void {
	JwtGenerator.getInstance();
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
	Refresh = 'refresh'
}

export enum TokensToDelete {
	All = 0,
	RefreshOnly = 1
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

	public async deleteToken(token: string) {
		const status = await this.radishClient.delete(token);
		if (status.status != 200) {
			throw JwtCachError;
		}
	}
};

async function deleteJwtToken(request: FastifyRequest, type: TokenType): Promise<boolean> {
	const token = await getTokenFromRequest(request, type);
	if (!token) {
		return false;
	}
	try {
		const insatnce = JwtGenerator.getInstance();
		insatnce.deleteToken(`${type}-${token}`);
	} catch (err: any) {
		return false;
	}
	return true;
}

async function deleteJwtTokenPair(request: FastifyRequest, tokens: TokensToDelete = TokensToDelete.All): Promise<boolean> {

	if (!deleteJwtToken(request, TokenType.Refresh))
		return false;

	if (tokens === TokensToDelete.All)
	{
		if (!deleteJwtToken(request, TokenType.Access))
			return false;
	}
	return true;
}

async function getTokenFromRequest(request: FastifyRequest, type: TokenType): Promise<string | undefined>
{
	let token: string;
	if (type === TokenType.Access) {
		token = request.headers.authorization?.replace('Bearer ', '') as string;
	} else {
		const body = request.body as { refreshToken: string };
		token = body.refreshToken;
	}
	return token;
}

//return undefined if error was caught, in handler reply 401
async function isTokenValid(request: FastifyRequest | string, type: TokenType = TokenType.Access): Promise<JwtPayload | undefined>
{
	let token: string | undefined
	if (typeof request === 'string') {
		token = request
	} else {
		token = await getTokenFromRequest(request, type);
	}

	if (!token) {
		return undefined;
	}
	try {
		return await JwtGenerator.getInstance().verifyToken(token, type);
	} catch (err: any) {
		return undefined;
	}
}

//in handler reply 500
async function generateJwtTokenPair(payload: JwtPayload): Promise<TokenPair | undefined> 
{
	try {
		return JwtGenerator.getInstance().generateTokenPair(payload);
	} catch (err: any) {
		return undefined;
	}
}

export {
	isTokenValid,
	generateJwtTokenPair,
	getTokenFromRequest,
	setUpJwtGenerator,
	deleteJwtTokenPair
}