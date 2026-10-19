import * as bcrypt from 'bcrypt';
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { JwtService } from '@nestjs/jwt';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn() };
  const emailService = { sendPasswordResetEmail: jest.fn() };
  let service: AuthService;
  const originalPasswordResetEnabled = process.env.PASSWORD_RESET_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PASSWORD_RESET_ENABLED = 'true';
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      emailService as unknown as EmailService,
    );
    emailService.sendPasswordResetEmail.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue({});
    prisma.passwordResetToken.delete.mockResolvedValue({});
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterAll(() => {
    if (originalPasswordResetEnabled === undefined) {
      delete process.env.PASSWORD_RESET_ENABLED;
    } else {
      process.env.PASSWORD_RESET_ENABLED = originalPasswordResetEnabled;
    }
  });

  it('creates a password-hashed account', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: 'user-1',
        role: 'USER',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const result = await service.register({
      name: 'Member',
      email: ' MEMBER@example.com ',
      password: 'strong-password',
    });

    const created = prisma.user.create.mock.calls[0][0].data;
    await expect(
      bcrypt.compare('strong-password', created.password),
    ).resolves.toBe(true);
    expect(created.email).toBe('member@example.com');
    expect(result).not.toHaveProperty('password');
  });

  it('returns an access token for valid credentials', async () => {
    const password = await bcrypt.hash('strong-password', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Member',
      email: 'member@example.com',
      role: 'ADMIN',
      password,
      tokenVersion: 3,
    });
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({
      email: 'MEMBER@example.com',
      password: 'strong-password',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'member@example.com',
      role: 'ADMIN',
      name: 'Member',
      tokenVersion: 3,
    });
    expect(result.accessToken).toBe('jwt-token');
  });

  it('does not accept a password for a passwordless GitHub account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'github-user',
      name: 'GitHub member',
      email: null,
      role: 'USER',
      password: null,
      tokenVersion: 0,
    });

    await expect(
      service.login({ email: 'member@example.com', password: 'password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('revokes existing sessions on logout', async () => {
    await expect(service.logout('user-1')).resolves.toEqual({
      message: 'You have been signed out.',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('uses a generic response when no recovery account exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.forgotPassword({
      email: 'nobody@example.com',
    });

    expect(result.message).toBe(
      'If an account exists for that email, and email delivery is available, reset instructions will arrive shortly.',
    );
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('rejects recovery requests while password reset is disabled', async () => {
    process.env.PASSWORD_RESET_ENABLED = 'false';

    await expect(
      service.forgotPassword({ email: 'member@example.com' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      service.resetPassword({ token: 'reset-token', password: 'new-password' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it('returns a generic recovery response when email delivery fails', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'member@example.com',
    });
    emailService.sendPasswordResetEmail.mockResolvedValue(false);

    const result = await service.forgotPassword({
      email: 'MEMBER@example.com',
    });

    expect(result.message).toBe(
      'If an account exists for that email, and email delivery is available, reset instructions will arrive shortly.',
    );
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('invalidates existing sessions while resetting a password', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.$transaction.mockResolvedValue([]);

    await expect(
      service.resetPassword({ token: 'reset-token', password: 'new-password' }),
    ).resolves.toEqual({
      message: 'Your password has been reset. You can now sign in.',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        password: expect.any(String),
        tokenVersion: { increment: 1 },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
