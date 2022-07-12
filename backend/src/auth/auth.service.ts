import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/models/user.entity';
import { Repository, getConnection } from 'typeorm';
import { RegisterDto, LoginDto } from './auth.dto';
import { AuthHelper } from './auth.helper';
import { UserService } from 'src/user/user.service';
import { HTTP_STATUS, status} from 'src/common/types';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import TokenPayload from './tokenPayload.interface';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';


@Injectable()
export class JwtTwoFactorStrategy extends PassportStrategy(
	Strategy,
	'jwt-two-factor'
) {
	constructor(
		private readonly configService: ConfigService,
		private readonly userService: UserService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([(request: Request) => {
				return request?.cookies?.Authentication;
			}]),
			secretOrKey: configService.get('JWT_ACCESS_TOKEN_SECRET'),
		});
	}

	async validate(payload: TokenPayload) {
		const user = await this.userService.getById(payload.userId);
		if (!user.isTwoFactorAuthenticationEnabled) {
			return user;
		}
		if (payload.isSecondFactorAuthenticated) {
			return user;
		}
	}
}

@Injectable()
export class AuthService {
	@InjectRepository(User)
	private readonly repository: Repository<User>;
	@Inject(UserService)
	private readonly userService: UserService;
	@Inject(AuthHelper)
	private readonly helper: AuthHelper;

	constructor(
		private readonly UserService: UserService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService
	) {}
	
	public getCookieWithJwtAccessToken(userId: number, isSecondFactorAuthenticated = false) {
	const payload: TokenPayload = { userId, isSecondFactorAuthenticated };
	const token = this.jwtService.sign(payload, {
		secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
		expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`
	});
	return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}`;
	}

	/*
		create user in db, if username exist return HTTP C409 (CONFLICT)
	*/
	public async register(body: RegisterDto): Promise<User | never> {
		const { username }: RegisterDto = body;
		let user: User = await this.repository.findOne({ where: { username } });

		if (user) 
			throw new HttpException(HTTP_STATUS.ALREADY_EXIST, HttpStatus.CONFLICT);
		user = new User();
		user.username = username;
		return this.repository.save(user);
	}

	/*
		login user if user exist in db, else create it, update status of user, return JWT token
	*/
	public async login(body: LoginDto): Promise<Object | never> {
		const { username }: LoginDto = body;
		var user: User = await this.repository.findOne({ where: { username } });

		if (!user) {
			await this.register(body);
			user = await this.repository.findOne({ where: { username } });
		}
		if (this.userService.getUserStatus(user.id) != status.Disconnected)
			throw new HttpException(HTTP_STATUS.ALREADY_CONNECTED, HttpStatus.CONFLICT);
		return {token:this.helper.generateToken(user)};
	}
	public createToken(user: User): string{
		return this.helper.generateToken(user);
	}

	public async registerIntra(userData: any): Promise<User | never> {
		var user: User = new User();
		user.username = userData.login;
		user.intraID = userData.id;
		user.profilIntraUrl = userData.image_url;
		return this.repository.save(user);
	}

	public async loginIntra(userData: any): Promise<Object | never> {
		var user: User = await this.userService.findUserByIntra(userData.id);
		if (!user)
			user = await this.registerIntra(userData);
		return user;
	}
	public async validToken(jwt: string): Promise<boolean> {
		return this.helper.validate(jwt);
	}
	public async refresh(user: User): Promise<string> {
		return this.helper.generateToken(user);
	}
}