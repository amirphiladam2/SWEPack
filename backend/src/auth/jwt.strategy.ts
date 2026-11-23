import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BACKEND_INPUT, type BackendInput } from '../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BACKEND_INPUT) input: BackendInput,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: input.jwtSecret.expose(),
    });
  }

  async validate(payload: {
    sub: string;
    email: string | null;
    role: string;
    name?: string;
    tokenVersion?: number;
  }): Promise<AuthenticatedUser> {
    const user = await this.prisma.client.orm.public.User.select(
      'id',
      'name',
      'email',
      'role',
      'tokenVersion',
    )
      .include('githubAccounts', (accounts) =>
        accounts.select('id').limit(1),
      )
      .first({ id: payload.sub });
    if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Your session is no longer valid.');
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      githubConnected: user.githubAccounts.length > 0,
    };
  }
}
