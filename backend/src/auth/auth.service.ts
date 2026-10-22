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
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
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
      await this.prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: migration.uid },
      });
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

    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    if (!user) {
      if (decoded.email_verified !== true) {
        throw new UnauthorizedException(
          'Verify your email address before signing in.',
        );
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        if (
          existingUser.firebaseUid &&
          existingUser.firebaseUid !== decoded.uid
        ) {
          throw new ConflictException(
            'This email is linked to a different Firebase account.',
          );
        }
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firebaseUid: decoded.uid,
            tokenVersion: { increment: 1 },
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            name:
              typeof decoded.name === 'string' && decoded.name.trim()
                ? decoded.name.trim().slice(0, 100)
                : email.split('@')[0],
            email,
            firebaseUid: decoded.uid,
          },
        });
      }
    } else if (decoded.email_verified === true && user.email !== email) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }

    if (user.password) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            password: null,
            tokenVersion: { increment: 1 },
          },
        }),
        this.prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        }),
      ]);
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'You have been signed out.' };
  }

  getAccountDeletionRequest(userId: string) {
    return this.prisma.accountDeletionRequest.findUnique({
      where: { userId },
      select: {
        status: true,
        requestedAt: true,
      },
    });
  }

  async requestAccountDeletion(userId: string) {
    const request = await this.prisma.accountDeletionRequest.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: {
        status: true,
        requestedAt: true,
      },
    });
    return {
      ...request,
      message:
        'Your account deletion request has been submitted for review. Your account remains active until the review is complete.',
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    this.assertPasswordRecoveryEnabled();

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user?.email && user.password) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });
      await this.prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
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
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!resetToken || resetToken.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'This password reset link is invalid or expired.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: await bcrypt.hash(password, 12),
          tokenVersion: { increment: 1 },
        },
      }),
      this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

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
