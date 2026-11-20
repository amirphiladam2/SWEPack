import { module } from '@prisma/composer';
import { envSecret } from '@prisma/composer-prisma-cloud';
import { postgres, dataContract } from '@prisma/composer-prisma-cloud/orm';
import api, { swepackData } from './backend/src/service.mts';

export default module('swe-computet-staging', ({ provision }) => {
  const db = provision(
    postgres({
      name: 'db',
      contract: swepackData,
      config: './prisma.config.ts',
    }),
  );

  provision(api, {
    deps: { db },
    input: {
      jwtSecret: envSecret('JWT_SECRET'), // Signs the API's auth JWTs.
      frontendUrl: envSecret('FRONTEND_URL'), // Allowed web origin for CORS.
      passwordResetEnabled: envSecret('PASSWORD_RESET_ENABLED'), // Enables the password-reset flow when "true".
      firebaseProjectId: envSecret('FIREBASE_PROJECT_ID'), // Firebase project for the Admin SDK.
      firebaseClientEmail: envSecret('FIREBASE_CLIENT_EMAIL'), // Firebase service-account email.
      firebasePrivateKey: envSecret('FIREBASE_PRIVATE_KEY'), // Firebase service-account private key.
      resendApi: envSecret('RESEND_API'), // Resend API key for password-reset email.
      emailFrom: envSecret('EMAIL_FROM'), // Verified Resend sender address.
      githubClientId: envSecret('GITHUB_CLIENT_ID'), // GitHub OAuth App client ID.
      githubClientSecret: envSecret('GITHUB_CLIENT_SECRET'), // GitHub OAuth App client secret.
      githubCallbackUrl: envSecret('GITHUB_CALLBACK_URL'), // GitHub OAuth callback URL.
    },
  });
});
