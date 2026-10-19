import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

type GithubAccessTokenResponse = {
  access_token?: string;
  error?: string;
};

type GithubProfile = {
  id?: number;
  login?: string;
  name?: string | null;
};

type GithubEmail = {
  email?: string;
  primary?: boolean;
  verified?: boolean;
};

@Injectable()
export class GithubOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async beginLogin() {
    return this.beginFlow('LOGIN');
  }

  async beginLink(userId: string) {
    return this.beginFlow('LINK', userId);
  }

  async exchange(code: string, state: string) {
    const oauthState = await this.consumeState(state);
    if (oauthState.purpose !== 'LOGIN') {
      throw new UnauthorizedException(
        'The GitHub authorization state is invalid.',
      );
    }
    const identity = await this.getGithubIdentity(code);

    const user = await this.findOrCreateUser(identity);
    return {
      linked: false,
      accessToken: await this.authService.createAccessToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        githubConnected: true,
      },
    };
  }

  async exchangeLink(code: string, state: string, userId: string) {
    const oauthState = await this.consumeState(state);
    if (oauthState.purpose !== 'LINK' || oauthState.userId !== userId) {
      throw new UnauthorizedException(
        'The GitHub account-link request is invalid or expired.',
      );
    }
    const identity = await this.getGithubIdentity(code);
    await this.linkAccount(userId, identity);
    return { linked: true };
  }

  private async beginFlow(purpose: 'LOGIN' | 'LINK', userId?: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !process.env.GITHUB_CLIENT_SECRET || !callbackUrl) {
      throw new ServiceUnavailableException(
        'GitHub sign-in is not configured yet.',
      );
    }

    await this.prisma.githubOAuthState.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });

    const state = randomBytes(32).toString('base64url');
    await this.prisma.githubOAuthState.create({
      data: {
        stateHash: this.hashState(state),
        purpose,
        ...(userId ? { userId } : {}),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const authorizationUrl = new URL(
      'https://github.com/login/oauth/authorize',
    );
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('scope', 'read:user user:email');
    authorizationUrl.searchParams.set('state', state);

    return { state, authorizationUrl: authorizationUrl.toString() };
  }

  private async consumeState(state: string) {
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(state)) {
      throw new UnauthorizedException(
        'The GitHub authorization state is invalid.',
      );
    }

    const stateHash = this.hashState(state);
    const record = await this.prisma.githubOAuthState.findUnique({
      where: { stateHash },
    });
    if (!record || record.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'The GitHub authorization state is invalid or expired.',
      );
    }

    const consumed = await this.prisma.githubOAuthState.deleteMany({
      where: { id: record.id, expiresAt: { gt: new Date() } },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException(
        'The GitHub authorization state is invalid or expired.',
      );
    }
    return record;
  }

  private hashState(state: string) {
    return createHash('sha256').update(state).digest('hex');
  }

  private async getGithubIdentity(code: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !clientSecret || !callbackUrl) {
      throw new ServiceUnavailableException(
        'GitHub sign-in is not configured yet.',
      );
    }

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: callbackUrl,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'GitHub could not be reached. Please try again.',
      );
    }

    let tokenBody: unknown;
    try {
      tokenBody = await tokenResponse.json();
    } catch {
      throw new UnauthorizedException(
        'The GitHub authorization code is invalid or expired.',
      );
    }
    if (!tokenBody || typeof tokenBody !== 'object') {
      throw new UnauthorizedException(
        'The GitHub authorization code is invalid or expired.',
      );
    }
    const token = tokenBody as GithubAccessTokenResponse;
    if (!tokenResponse.ok || typeof token.access_token !== 'string') {
      throw new UnauthorizedException(
        'The GitHub authorization code is invalid or expired.',
      );
    }
    const accessToken = token.access_token;

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'SWEPack',
    };

    let profileResponse: Response;
    try {
      profileResponse = await fetch('https://api.github.com/user', {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'GitHub could not be reached. Please try again.',
      );
    }
    if (!profileResponse.ok) {
      throw new ServiceUnavailableException(
        'GitHub could not verify this account. Please try again.',
      );
    }

    let profileBody: unknown;
    try {
      profileBody = await profileResponse.json();
    } catch {
      throw new UnauthorizedException(
        'GitHub returned an invalid account identity.',
      );
    }
    if (!profileBody || typeof profileBody !== 'object') {
      throw new UnauthorizedException(
        'GitHub returned an invalid account identity.',
      );
    }
    const profile = profileBody as GithubProfile;
    if (
      typeof profile.id !== 'number' ||
      !Number.isSafeInteger(profile.id) ||
      typeof profile.login !== 'string' ||
      profile.login.length === 0
    ) {
      throw new UnauthorizedException(
        'GitHub returned an invalid account identity.',
      );
    }

    let emailsResponse: Response;
    try {
      emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'GitHub could not be reached. Please try again.',
      );
    }
    if (!emailsResponse.ok) {
      throw new ServiceUnavailableException(
        'GitHub could not retrieve verified email details. Please try again.',
      );
    }

    let emailsBody: unknown;
    try {
      emailsBody = await emailsResponse.json();
    } catch {
      throw new ServiceUnavailableException(
        'GitHub returned invalid verified email details. Please try again.',
      );
    }
    const primaryEmail = Array.isArray(emailsBody)
      ? (
          emailsBody.find(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              (item as GithubEmail).primary === true &&
              (item as GithubEmail).verified === true &&
              typeof (item as GithubEmail).email === 'string',
          ) as GithubEmail | undefined
        )?.email
      : null;
    const email = primaryEmail?.trim().toLowerCase() || null;

    return {
      providerAccountId: String(profile.id),
      name: (profile.name?.trim() || profile.login).slice(0, 100),
      email,
    };
  }

  private async findGithubAccount(providerAccountId: string) {
    return this.prisma.githubAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GITHUB',
          providerAccountId,
        },
      },
      include: { user: true },
    });
  }

  private async findOrCreateUser(identity: {
    providerAccountId: string;
    name: string;
    email: string | null;
  }) {
    const linkedAccount = await this.findGithubAccount(
      identity.providerAccountId,
    );
    if (linkedAccount) return linkedAccount.user;

    let email = identity.email;
    if (
      email &&
      (await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }))
    ) {
      email = null;
    }

    try {
      return await this.createGithubUser(identity, email);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const concurrentAccount = await this.findGithubAccount(
        identity.providerAccountId,
      );
      if (concurrentAccount) return concurrentAccount.user;
      if (email) {
        try {
          return await this.createGithubUser(identity, null);
        } catch (retryError) {
          if (!this.isUniqueConstraintError(retryError)) throw retryError;
          const retryAccount = await this.findGithubAccount(
            identity.providerAccountId,
          );
          if (retryAccount) return retryAccount.user;
        }
      }
      throw new ConflictException(
        'This GitHub account could not be connected. Please try again.',
      );
    }
  }

  private createGithubUser(
    identity: { providerAccountId: string; name: string },
    email: string | null,
  ) {
    return this.prisma.user.create({
      data: {
        name: identity.name,
        email,
        password: null,
        role: 'USER',
        githubAccounts: {
          create: {
            provider: 'GITHUB',
            providerAccountId: identity.providerAccountId,
          },
        },
      },
    });
  }

  private async linkAccount(
    userId: string,
    identity: { providerAccountId: string; name: string; email: string | null },
  ) {
    const existing = await this.findGithubAccount(identity.providerAccountId);
    if (existing) {
      if (existing.userId === userId) return;
      throw new ConflictException(
        'This GitHub account is already connected to another SWEPack account.',
      );
    }

    try {
      await this.prisma.githubAccount.create({
        data: {
          provider: 'GITHUB',
          providerAccountId: identity.providerAccountId,
          userId,
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const concurrentAccount = await this.findGithubAccount(
        identity.providerAccountId,
      );
      if (concurrentAccount?.userId === userId) return;
      throw new ConflictException(
        'This GitHub account is already connected to another SWEPack account.',
      );
    }
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
