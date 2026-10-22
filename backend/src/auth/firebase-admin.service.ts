import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import {
  getAuth,
  type Auth,
  type DecodedIdToken,
  type UserRecord,
} from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService {
  private authClient: Auth | null = null;

  get auth() {
    if (this.authClient) return this.authClient;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new ServiceUnavailableException(
        'Firebase authentication is not configured.',
      );
    }

    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        } satisfies ServiceAccount),
        projectId,
      });
    this.authClient = getAuth(app);
    return this.authClient;
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    try {
      return await this.auth.verifyIdToken(idToken, true);
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error ? error.code : undefined;
      if (
        code === 'auth/argument-error' ||
        code === 'auth/id-token-expired' ||
        code === 'auth/id-token-revoked' ||
        code === 'auth/invalid-id-token' ||
        code === 'auth/user-disabled' ||
        code === 'auth/user-not-found'
      ) {
        throw new UnauthorizedException(
          'The Firebase sign-in is invalid or expired.',
        );
      }
      throw new ServiceUnavailableException(
        'Firebase could not verify your sign-in. Please try again.',
      );
    }
  }

  async createLegacyMigrationToken(input: {
    uid: string;
    email: string;
    password: string;
    displayName: string;
  }) {
    const auth = this.auth;
    let firebaseUser: UserRecord;

    try {
      firebaseUser = await auth.getUserByEmail(input.email);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'auth/user-not-found'
      ) {
        throw new ServiceUnavailableException(
          'Firebase could not be reached. Please try again.',
        );
      }

      try {
        firebaseUser = await auth.createUser({
          uid: input.uid,
          email: input.email,
          password: input.password,
          displayName: input.displayName,
          emailVerified: false,
        });
      } catch (createError) {
        if (
          createError instanceof Error &&
          'code' in createError &&
          createError.code === 'auth/uid-already-exists'
        ) {
          throw new ConflictException(
            'This account could not be linked automatically. Please contact support.',
          );
        }
        throw new ServiceUnavailableException(
          'Firebase could not create your account. Please try again.',
        );
      }
    }

    if (firebaseUser.email !== input.email) {
      throw new ConflictException('The Firebase account email does not match.');
    }

    if (firebaseUser.disabled) {
      throw new ConflictException(
        'This Firebase account is disabled. Contact support to restore access.',
      );
    }
    try {
      firebaseUser = await auth.updateUser(firebaseUser.uid, {
        password: input.password,
        displayName: input.displayName,
      });
      await auth.revokeRefreshTokens(firebaseUser.uid);
    } catch {
      throw new ServiceUnavailableException(
        'Firebase could not update your account. Please try again.',
      );
    }

    return {
      uid: firebaseUser.uid,
      customToken: await auth.createCustomToken(firebaseUser.uid),
    };
  }
}
