import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.client.orm.public.User
      .where({ email: email.trim().toLowerCase() })
      .first();
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.email) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const migration = await this.firebaseAdmin.createLegacyMigrationToken({
      uid: user.id,
      email: user.email,
      password,
      displayName: user.name,
    });
    if (user.firebaseUid !== migration.uid) {
      await this.prisma.client.orm.public.User
        .where({ id: user.id })
        .update({ firebaseUid: migration.uid });
    }

    return {
      customToken: migration.customToken,
    };
  }

  async exchangeFirebaseToken(idToken: string) {
    const decoded = await this.firebaseAdmin.verifyIdToken(idToken);
    const email =
      typeof decoded.email === 'string'
        ? decoded.email.trim().toLowerCase()
        : null;
    if (!email) {
      throw new UnauthorizedException(
        'A verified email address is required to use SWEPack.',
      );
    }

    let user = await this.prisma.client.orm.public.User
      .where({ firebaseUid: decoded.uid })
      .first();
    if (!user) {
      if (decoded.email_verified !== true) {
        throw new UnauthorizedException(
          'Verify your email address before signing in.',
        );
      }

      const existingUser = await this.prisma.client.orm.public.User
        .where({ email })
        .first();
      if (existingUser) {
        if (
          existingUser.firebaseUid &&
          existingUser.firebaseUid !== decoded.uid
        ) {
          throw new ConflictException(
            'This email is linked to a different Firebase account.',
          );
        }
        const nextTokenVersion = existingUser.tokenVersion + 1;
        await this.prisma.client.orm.public.User
          .where({ id: existingUser.id })
          .update({
            firebaseUid: decoded.uid,
            tokenVersion: nextTokenVersion,
          });
        user = {
          ...existingUser,
          firebaseUid: decoded.uid,
          tokenVersion: nextTokenVersion,
        };
      } else {
        user = await this.prisma.client.orm.public.User.create({
          name:
            typeof decoded.name === 'string' && decoded.name.trim()
              ? decoded.name.trim().slice(0, 100)
              : email.split('@')[0],
          email,
          firebaseUid: decoded.uid,
        });
      }
    } else if (decoded.email_verified === true && user.email !== email) {
      user = await this.prisma.client.orm.public.User
        .where({ id: user.id })
        .update({ email })
        .then((updated) => updated ?? user);
    }

    if (user.password) {
      await this.prisma.client.transaction(async (tx) => {
        const current = await tx.orm.public.User
          .where({ id: user.id })
          .first();
        await tx.orm.public.User.where({ id: user.id }).update({
          password: null,
          tokenVersion: (current?.tokenVersion ?? 0) + 1,
        });
        await tx.orm.public.PasswordResetToken
          .where({ userId: user.id })
          .deleteAll();
      });
      user = {
        ...user,
        password: null,
        tokenVersion: user.tokenVersion + 1,
      };
    }

    const accessToken = await this.createAccessToken(user);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        githubConnected: false,
      },
    };
  }

  createAccessToken(user: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    tokenVersion: number;
  }) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tokenVersion: user.tokenVersion,
    });
  }

  async logout(userId: string) {
    await this.prisma.client.transaction(async (tx) => {
      const current = await tx.orm.public.User.where({ id: userId }).first();
      await tx.orm.public.User.where({ id: userId }).update({
        tokenVersion: (current?.tokenVersion ?? 0) + 1,
      });
    });
    return { message: 'You have been signed out.' };
  }

  async getAccountDeletionRequest(userId: string) {
    return this.prisma.client.orm.public.AccountDeletionRequest
      .where({ userId })
      .select('status', 'requestedAt')
      .first();
  }

  async requestAccountDeletion(userId: string) {
    const request = await this.prisma.client.orm.public.AccountDeletionRequest
      .upsert({
        create: { userId },
        update: {},
        conflictOn: { userId },
      });
    return {
      status: request.status,
      requestedAt: request.requestedAt,
      message:
        'Your account deletion request has been submitted for review. Your account remains active until the review is complete.',
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    this.assertPasswordRecoveryEnabled();

    const user = await this.prisma.client.orm.public.User
      .where({ email: email.trim().toLowerCase() })
      .first();

    if (user?.email && user.password) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await this.prisma.client.orm.public.PasswordResetToken
        .where({ userId: user.id })
        .deleteAll();
      await this.prisma.client.orm.public.PasswordResetToken.create({
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      const sent = await this.emailService.sendPasswordResetEmail(
        user.email,
        token,
      );
      if (!sent) {
        this.logger.warn('Password reset email could not be delivered.');
      }
    }

    return {
      message:
        'If an account exists for that email, and email delivery is available, reset instructions will arrive shortly.',
    };
  }

  async resetPassword({ token, password }: ResetPasswordDto) {
    this.assertPasswordRecoveryEnabled();

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.client.orm.public.PasswordResetToken
      .where({ tokenHash })
      .first();
    if (!resetToken || resetToken.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'This password reset link is invalid or expired.',
      );
    }

    await this.prisma.client.transaction(async (tx) => {
      const current = await tx.orm.public.User
        .where({ id: resetToken.userId })
        .first();
      await tx.orm.public.User.where({ id: resetToken.userId }).update({
        password: await bcrypt.hash(password, 12),
        tokenVersion: (current?.tokenVersion ?? 0) + 1,
      });
      await tx.orm.public.PasswordResetToken
        .where({ id: resetToken.id })
        .delete();
      await tx.orm.public.PasswordResetToken
        .where({ userId: resetToken.userId })
        .deleteAll();
    });

    return { message: 'Your password has been reset. You can now sign in.' };
  }

  private assertPasswordRecoveryEnabled() {
    if (process.env.PASSWORD_RESET_ENABLED !== 'true') {
      throw new ServiceUnavailableException(
        'Password recovery is temporarily unavailable. Please try again later.',
      );
    }
  }
}
