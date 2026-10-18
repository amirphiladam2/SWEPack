import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    name?: string;
    tokenVersion?: number;
  }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    });
    if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Your session is no longer valid.');
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
