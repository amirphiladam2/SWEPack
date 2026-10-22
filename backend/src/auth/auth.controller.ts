import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { GithubOAuthService } from './github-oauth.service';
import { GithubExchangeDto } from './dto/github-exchange.dto';
import { FirebaseTokenDto } from './dto/firebase-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly githubOAuthService: GithubOAuthService,
  ) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('firebase/exchange')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  exchangeFirebaseToken(@Body() dto: FirebaseTokenDto) {
    return this.authService.exchangeFirebaseToken(dto.idToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() request: Request) {
    const user = request.user as AuthenticatedUser;
    return this.authService.logout(user.userId);
  }

  @Get('deletion-request')
  @UseGuards(JwtAuthGuard)
  getAccountDeletionRequest(@Req() request: Request) {
    const user = request.user as AuthenticatedUser;
    return this.authService.getAccountDeletionRequest(user.userId);
  }

  @Post('deletion-request')
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  requestAccountDeletion(@Req() request: Request) {
    const user = request.user as AuthenticatedUser;
    return this.authService.requestAccountDeletion(user.userId);
  }

  @Get('github/authorize')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  authorizeGithub() {
    return this.githubOAuthService.beginLogin();
  }

  @Post('github/authorize-link')
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  authorizeGithubLink(@Req() request: Request) {
    const user = request.user as AuthenticatedUser;
    return this.githubOAuthService.beginLink(user.userId);
  }

  @Post('github/exchange')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  exchangeGithubCode(@Body() dto: GithubExchangeDto) {
    return this.githubOAuthService.exchange(dto.code, dto.state);
  }

  @Post('github/link/exchange')
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  exchangeGithubLink(@Body() dto: GithubExchangeDto, @Req() request: Request) {
    const user = request.user as AuthenticatedUser;
    return this.githubOAuthService.exchangeLink(
      dto.code,
      dto.state,
      user.userId,
    );
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: Request) {
    const user = request.user as AuthenticatedUser;
    return {
      id: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      githubConnected: user.githubConnected,
    };
  }
}
