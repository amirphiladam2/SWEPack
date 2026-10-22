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
import { FirebaseAdminService } from './firebase-admin.service';

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
  const firebaseAdmin = {
    createLegacyMigrationToken: jest.fn(),
    verifyIdToken: jest.fn(),
  };
  let service: AuthService;
  const originalPasswordResetEnabled = process.env.PASSWORD_RESET_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PASSWORD_RESET_ENABLED = 'true';
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      emailService as unknown as EmailService,
      firebaseAdmin as unknown as FirebaseAdminService,
    );
    emailService.sendPasswordResetEmail.mockResolvedValue(true);
    firebaseAdmin.createLegacyMigrationToken.mockResolvedValue({
      uid: 'firebase-user-1',
      customToken: 'firebase-custom-token',
    });
    prisma.$transaction.mockResolvedValue([]);
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

  it('migrates valid legacy credentials into Firebase', async () => {
    const password = await bcrypt.hash('strong-password', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Member',
      email: 'member@example.com',
      role: 'ADMIN',
      password,
      tokenVersion: 3,
    });
    const result = await service.login({
      email: 'MEMBER@example.com',
      password: 'strong-password',
    });

    expect(firebaseAdmin.createLegacyMigrationToken).toHaveBeenCalledWith({
      uid: 'user-1',
      email: 'member@example.com',
      password: 'strong-password',
      displayName: 'Member',
    });
    expect(result).toEqual({
      customToken: 'firebase-custom-token',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { firebaseUid: 'firebase-user-1' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a SWEPack user for a verified Firebase account', async () => {
    firebaseAdmin.verifyIdToken.mockResolvedValue({
      uid: 'firebase-user-1',
      email: 'member@example.com',
      email_verified: true,
      name: 'Member',
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Member',
      email: 'member@example.com',
      firebaseUid: 'firebase-user-1',
      role: 'USER',
      tokenVersion: 0,
    });
    jwtService.signAsync.mockResolvedValue('jwt-token');

    await expect(
      service.exchangeFirebaseToken('firebase-id-token'),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'user-1',
        name: 'Member',
        email: 'member@example.com',
        role: 'USER',
        githubConnected: false,
      },
    });
    expect(firebaseAdmin.verifyIdToken).toHaveBeenCalledWith(
      'firebase-id-token',
    );
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Member',
        email: 'member@example.com',
        firebaseUid: 'firebase-user-1',
      },
    });
  });

  it('links a verified Firebase account to an existing SWEPack user', async () => {
    firebaseAdmin.verifyIdToken.mockResolvedValue({
      uid: 'firebase-user-1',
      email: 'member@example.com',
      email_verified: true,
    });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'user-1',
      name: 'Member',
      email: 'member@example.com',
      password: 'legacy-hash',
      firebaseUid: null,
      role: 'ADMIN',
      tokenVersion: 0,
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Member',
      email: 'member@example.com',
      password: 'legacy-hash',
      firebaseUid: 'firebase-user-1',
      role: 'ADMIN',
      tokenVersion: 1,
    });
    jwtService.signAsync.mockResolvedValue('jwt-token');

    await service.exchangeFirebaseToken('firebase-id-token');

    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1' },
      data: { firebaseUid: 'firebase-user-1', tokenVersion: { increment: 1 } },
    });
    expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
      data: { password: null, tokenVersion: { increment: 1 } },
    });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'member@example.com',
      role: 'ADMIN',
      name: 'Member',
      tokenVersion: 2,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not create a SWEPack user for an unverified Firebase email', async () => {
    firebaseAdmin.verifyIdToken.mockResolvedValue({
      uid: 'firebase-user-1',
      email: 'member@example.com',
      email_verified: false,
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.exchangeFirebaseToken('firebase-id-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.create).not.toHaveBeenCalled();
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
      password: 'legacy-hash',
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

  it('does not send legacy reset email for Firebase-linked accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'member@example.com',
      password: null,
      firebaseUid: 'firebase-user-1',
    });

    await service.forgotPassword({ email: 'member@example.com' });

    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
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
