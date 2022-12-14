import {
	Controller,
	Post,
	UseGuards,
	Req,
	Res,
	Body,
	UnauthorizedException, HttpStatus, Redirect,
} from '@nestjs/common';
import { TwoFactorAuthenticationService } from './tfa.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import RequestWithUser from '../auth/requestWithUser.interface';
import { TwoFactorAuthenticationCodeDto } from '../auth/auth.dto'
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { Response } from 'express';

@Controller('2fa')
export class TwoFactorAuthenticationController {
	constructor(
		private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
		private readonly userService: UserService,
		private readonly authenticationService: AuthService,
	) {}

	// generate code for authApp and display qrCode
	@Post('generate')
	@UseGuards(JwtAuthGuard)
	async register(@Res() response: Response, @Req() request: RequestWithUser) {
		if (!request.user.isTwoFactorAuthenticationEnabled) {
			const { otpauthUrl } = await this.twoFactorAuthenticationService.generateTwoFactorAuthenticationSecret(request.user);
			return this.twoFactorAuthenticationService.pipeQrCodeStream(response, otpauthUrl);
		}
	}

	// if the code send by user is valid: turn on 2fa
	@Post('turn-on')
	@UseGuards(JwtAuthGuard)
	async turnOnTwoFactorAuthentication(@Req() request: RequestWithUser, @Res() res: Response, @Body() { code } : TwoFactorAuthenticationCodeDto) {
		const isCodeValid = this.twoFactorAuthenticationService.isTwoFactorAuthenticationCodeValid(code, request.user);
		if (!isCodeValid) {
			res.sendStatus(HttpStatus.UNAUTHORIZED)
			return ;
		}
		await this.userService.turnOnTwoFactorAuthentication(request.user.id);
		res.sendStatus(HttpStatus.OK)
		return ;
	}

	@Post('turn-off')
	@UseGuards(JwtAuthGuard)
	async turnOffTwoFactorAuthentication(@Req() request: RequestWithUser) {
		await this.userService.turnOffTwoFactorAuthentication(request.user.id);
		return HttpStatus.OK
	}

	// route that allows the user to send the 2fa code.
	@Post('authenticate')
	//@UseGuards(JwtAuthGuard)
	async authenticate(@Req() req: RequestWithUser, @Body() { code, id }): Promise<Object | never> {
		let user = await this.userService.getById(id)
		const isCodeValid = this.twoFactorAuthenticationService.isTwoFactorAuthenticationCodeValid(code, user);
		if (!isCodeValid) {
			throw new UnauthorizedException('Wrong authentication code');
		}
		return {token:this.authenticationService.createToken(user)}
	}
}
