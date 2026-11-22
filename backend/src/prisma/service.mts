import { type } from 'arktype';
import { compute } from '@prisma/composer-prisma-cloud';
import { dataContract, postgres } from '@prisma/composer-prisma-cloud/orm';
import { secretString } from '@prisma/composer/arktype';
import node from '@prisma/composer/node';
import type { Contract } from './contract.js';
import contractJson from './contract.json' with { type: 'json' };

const contract = dataContract<Contract>(contractJson);

const input = type({
  jwtSecret: secretString(),
  frontendUrl: secretString(),
  'githubClientId?': secretString(),
  'githubClientSecret?': secretString(),
  'githubCallbackUrl?': secretString(),
});

const service = compute({
  name: 'api',
  deps: { db: postgres(contract) },
  input,
  build: node({
    module: import.meta.url,
    dir: '../../dist',
    entry: 'src/main.js',
    dependencies: 'external',
  }),
});

export default service;
export type ServiceInput = ReturnType<typeof service.input>;
export { contract };
