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

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
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
