import { module } from '@prisma/composer';
import { postgres } from '@prisma/composer-prisma-cloud/orm';
import { envSecret } from '@prisma/composer-prisma-cloud';
import service, { contract } from './backend/src/prisma/service.mts';

export default module('swe-computet-staging', ({ provision }) => {
  const db = provision(
    postgres({ name: 'db', contract, config: 'backend/prisma.config.ts' }),
  );
  provision(service, {
    deps: { db },
    input: {
      jwtSecret: envSecret('JWT_SECRET'), // Signs the API's JWT session tokens.
      frontendUrl: envSecret('FRONTEND_URL'), // Allowed web origin for CORS and mutation checks.
      githubClientId: envSecret('GITHUB_CLIENT_ID'), // GitHub OAuth client ID for sign-in.
      githubClientSecret: envSecret('GITHUB_CLIENT_SECRET'), // GitHub OAuth client secret.
      githubCallbackUrl: envSecret('GITHUB_CALLBACK_URL'), // GitHub OAuth callback URL.
    },
  });
});
