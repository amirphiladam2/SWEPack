import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './dto/roles.guard';
import { GithubOAuthService } from './github-oauth.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { BACKEND_INPUT, backendInput } from '../config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [BACKEND_INPUT],
      useFactory: (input: ReturnType<typeof backendInput>) => ({
        secret: input.jwtSecret.expose(),
        signOptions: { expiresIn: '7d' as const },
      }),
    }),
    PrismaModule,
  ],
  providers: [
    {
      provide: BACKEND_INPUT,
      useFactory: backendInput,
    },
    AuthService,
    GithubOAuthService,
    FirebaseAdminService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    EmailService,
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
