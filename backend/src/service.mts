import { compute } from '@prisma/composer-prisma-cloud';
import { postgres, dataContract } from '@prisma/composer-prisma-cloud/orm';
import nodeBuild from '@prisma/composer/node';
import { rawHttpContract } from '@prisma/composer/http';
import { secretString } from '@prisma/composer/arktype';
import { type } from 'arktype';
import contractJson from './prisma/contract.json' with { type: 'json' };

const swepackData = dataContract(contractJson);

const apiInput = type({
  jwtSecret: secretString(),
  frontendUrl: secretString(),
  passwordResetEnabled: secretString().optional(),
  firebaseProjectId: secretString().optional(),
  firebaseClientEmail: secretString().optional(),
  firebasePrivateKey: secretString().optional(),
  resendApi: secretString().optional(),
  emailFrom: secretString().optional(),
  githubClientId: secretString().optional(),
  githubClientSecret: secretString().optional(),
  githubCallbackUrl: secretString().optional(),
});

const api = compute({
  name: 'api',
  deps: { db: postgres(swepackData) },
  input: apiInput,
  build: nodeBuild({
    module: import.meta.url,
    entry: '../dist/src/main.js',
    dependencies: 'external',
  }),
  expose: { http: rawHttpContract },
});

export default api;
export { swepackData };
