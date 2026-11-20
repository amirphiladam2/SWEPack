import { defineConfig as composer } from '@prisma/composer/config';
import { nodeBuild } from '@prisma/composer/node/control';
import { nextjsBuild } from '@prisma/composer/nextjs/control';
import { prismaCloud, prismaState } from '@prisma/composer-prisma-cloud/control';
import { definePrismaConfig } from 'prisma/config';
import { defineConfig as orm, prisma7Schema } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: orm({
    contract: prisma7Schema('backend/prisma/schema.prisma'),
    output: 'backend/src/prisma',
    migrations: { dir: 'backend/migrations' },
    db: { connection: process.env['DATABASE_URL']! },
  }),
  composer: composer({
    entry: './module.mjs',
    extensions: [prismaCloud(), nodeBuild(), nextjsBuild()],
    state: prismaState(),
  }),
});
