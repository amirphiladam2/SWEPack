import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { AuthService } from './auth.service';
import { GithubOAuthService } from './github-oauth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GithubOAuthService', () => {
  const prisma = {
    githubOAuthState: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    githubAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const authService = { createAccessToken: jest.fn() };
  let service: GithubOAuthService;
  const originalEnvironment = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  };

  function stateRecord(
    purpose: 'LOGIN' | 'LINK' = 'LOGIN',
    userId: string | null = null,
    expiresAt = new Date(Date.now() + 60_000),
  ) {
    const state = randomBytes(32).toString('base64url');
    return {
      state,
      record: {
        id: 'state-1',
        stateHash: createHash('sha256').update(state).digest('hex'),
        purpose,
        userId,
        expiresAt,
      },
    };
  }

  function mockGithubResponses(emailList: unknown[] = []) {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'github-temporary-token' }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 123456, login: 'octocat', name: null }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(emailList), { status: 200 }),
      );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_CLIENT_ID = 'github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'github-client-secret';
    process.env.GITHUB_CALLBACK_URL =
      'https://swepack.vercel.app/api/auth/github/callback';
    prisma.githubOAuthState.deleteMany.mockResolvedValue({ count: 1 });
    prisma.githubAccount.findUnique.mockResolvedValue(null);
    prisma.githubAccount.create.mockResolvedValue({});
    prisma.githubOAuthState.create.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'new-user',
      name: 'octocat',
      email: null,
      role: 'USER',
      tokenVersion: 0,
    });
    authService.createAccessToken.mockResolvedValue('swepack-jwt');
    service = new GithubOAuthService(
      prisma as unknown as PrismaService,
      authService as unknown as AuthService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalEnvironment.clientId === undefined) {
      delete process.env.GITHUB_CLIENT_ID;
    } else {
      process.env.GITHUB_CLIENT_ID = originalEnvironment.clientId;
    }
    if (originalEnvironment.clientSecret === undefined) {
      delete process.env.GITHUB_CLIENT_SECRET;
    } else {
      process.env.GITHUB_CLIENT_SECRET = originalEnvironment.clientSecret;
    }
    if (originalEnvironment.callbackUrl === undefined) {
      delete process.env.GITHUB_CALLBACK_URL;
    } else {
      process.env.GITHUB_CALLBACK_URL = originalEnvironment.callbackUrl;
    }
  });

  it('creates expiring state and requests only identity and email permissions', async () => {
    const result = await service.beginLogin();
    const authorizationUrl = new URL(result.authorizationUrl);

    expect(authorizationUrl.hostname).toBe('github.com');
    expect(authorizationUrl.searchParams.get('scope')).toBe(
      'read:user user:email',
    );
    expect(authorizationUrl.searchParams.get('state')).toBe(result.state);
    expect(prisma.githubOAuthState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purpose: 'LOGIN',
        stateHash: createHash('sha256').update(result.state).digest('hex'),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('creates a standard user when GitHub has no verified email', async () => {
    const { state, record } = stateRecord();
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    mockGithubResponses([]);

    const result = await service.exchange('github-code', state);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'octocat',
        email: null,
        password: null,
        role: 'USER',
        githubAccounts: {
          create: {
            provider: 'GITHUB',
            providerAccountId: '123456',
          },
        },
      },
    });
    expect(result).toMatchObject({
      linked: false,
      accessToken: 'swepack-jwt',
      user: { id: 'new-user', role: 'USER', email: null },
    });
  });

  it('logs in a returning linked account using its stable provider ID', async () => {
    const { state, record } = stateRecord();
    const existingUser = {
      id: 'existing-user',
      name: 'Member',
      email: 'member@example.com',
      role: 'ADMIN',
      tokenVersion: 4,
    };
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    prisma.githubAccount.findUnique.mockResolvedValue({
      userId: existingUser.id,
      user: existingUser,
    });
    mockGithubResponses([
      { email: 'member@example.com', primary: true, verified: true },
    ]);

    const result = await service.exchange('github-code', state);

    expect(prisma.githubAccount.findUnique).toHaveBeenCalledWith({
      where: {
        provider_providerAccountId: {
          provider: 'GITHUB',
          providerAccountId: '123456',
        },
      },
      include: { user: true },
    });
    expect(result).toMatchObject({
      accessToken: 'swepack-jwt',
      user: { id: 'existing-user', role: 'ADMIN' },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not link a matching email automatically', async () => {
    const { state, record } = stateRecord();
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    prisma.user.findUnique.mockResolvedValue({ id: 'email-owner' });
    prisma.user.create.mockResolvedValue({
      id: 'new-github-user',
      name: 'octocat',
      email: null,
      role: 'USER',
      tokenVersion: 0,
    });
    mockGithubResponses([
      { email: 'member@example.com', primary: true, verified: true },
    ]);

    await service.exchange('github-code', state);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: null }),
      }),
    );
    expect(prisma.githubAccount.create).not.toHaveBeenCalled();
  });

  it('recovers from concurrent first-time logins without duplicating users', async () => {
    const { state, record } = stateRecord();
    const existingUser = {
      id: 'concurrent-user',
      name: 'octocat',
      email: null,
      role: 'USER',
      tokenVersion: 0,
    };
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    prisma.user.create.mockRejectedValueOnce({ code: 'P2002' });
    prisma.githubAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: existingUser.id, user: existingUser });
    mockGithubResponses([]);

    const result = await service.exchange('github-code', state);

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      user: { id: 'concurrent-user' },
      accessToken: 'swepack-jwt',
    });
  });

  it('allows a signed-in user to link a GitHub account explicitly', async () => {
    const { state, record } = stateRecord('LINK', 'user-1');
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    mockGithubResponses([]);

    await expect(
      service.exchangeLink('github-code', state, 'user-1'),
    ).resolves.toEqual({ linked: true });
    expect(prisma.githubAccount.create).toHaveBeenCalledWith({
      data: {
        provider: 'GITHUB',
        providerAccountId: '123456',
        userId: 'user-1',
      },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects linking a GitHub account already connected elsewhere', async () => {
    const { state, record } = stateRecord('LINK', 'user-1');
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    prisma.githubAccount.findUnique.mockResolvedValue({
      userId: 'user-2',
      user: { id: 'user-2' },
    });
    mockGithubResponses([]);

    await expect(
      service.exchangeLink('github-code', state, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.githubAccount.create).not.toHaveBeenCalled();
  });

  it('rejects an account-link callback from a different signed-in user', async () => {
    const { state, record } = stateRecord('LINK', 'user-1');
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    const fetchMock = jest.spyOn(global, 'fetch');

    await expect(
      service.exchangeLink('github-code', state, 'user-2'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired state before calling GitHub', async () => {
    const { state, record } = stateRecord(
      'LOGIN',
      null,
      new Date(Date.now() - 1),
    );
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    const fetchMock = jest.spyOn(global, 'fetch');

    await expect(service.exchange('github-code', state)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid GitHub authorization codes', async () => {
    const { state, record } = stateRecord();
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad_verification_code' }), {
        status: 401,
      }),
    );

    await expect(
      service.exchange('invalid-code', state),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reports GitHub API failures without creating an account', async () => {
    const { state, record } = stateRecord();
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'temporary-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }));

    await expect(service.exchange('github-code', state)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports GitHub network failures without creating an account', async () => {
    const { state, record } = stateRecord();
    prisma.githubOAuthState.findUnique.mockResolvedValue(record);
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network failure'));

    await expect(service.exchange('github-code', state)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
