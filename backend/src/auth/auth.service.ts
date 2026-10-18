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
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register({ name, email, password }: RegisterDto) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(password, 10),
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tokenVersion: user.tokenVersion,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    this.assertPasswordRecoveryEnabled();

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user) {
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
