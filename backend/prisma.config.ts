import { defineConfig } from '@prisma/composer/config';
import { nodeBuild } from '@prisma/composer/node/control';
import {
  prismaCloud,
  prismaState,
} from '@prisma/composer-prisma-cloud/control';

export default defineConfig({
  entry: './module.ts',
  extensions: [
    prismaCloud({
      region: 'eu-central-1',
      ...(process.env.PRISMA_WORKSPACE_ID
        ? { workspaceId: process.env.PRISMA_WORKSPACE_ID }
        : {}),
    }),
    nodeBuild(),
  ],
  state: prismaState(),
});
