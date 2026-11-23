import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../src/prisma/contract';
import contractJson from '../src/prisma/contract.json';

const target = process.env.SEED_TARGET;
const databaseUrl = process.env.DATABASE_URL;

function validateProductionTarget() {
  if (target !== 'railway-production') {
    throw new Error(
      'Set SEED_TARGET=railway-production to run the production seed.',
    );
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    (!hostname.includes('railway') && !hostname.includes('rlwy'))
  ) {
    throw new Error('The production seed only accepts a Railway database URL.');
  }
}

async function seed() {
  validateProductionTarget();

  const db = postgres({
    contract: contractFromJson<Contract>(contractJson),
    url: databaseUrl!,
  });

  try {
    await db.orm.public.Category.upsert({
      create: {
        name: 'Frontend',
        slug: 'frontend',
        description:
          'Frontend development tools, libraries, frameworks, and resources.',
      },
      update: {
        name: 'Frontend',
        description:
          'Frontend development tools, libraries, frameworks, and resources.',
      },
      conflictOn: { slug: 'frontend' },
    });

    for (const name of ['Animation', 'React', 'TypeScript', 'UI']) {
      const slug = name.toLowerCase();
      await db.orm.public.Tag.upsert({
        create: { name, slug },
        update: { name },
        conflictOn: { slug },
      });
    }
  } finally {
    await db.close();
  }
}

seed().catch(() => {
  console.error(
    'Production seed failed. Check the Railway connection and migration state.',
  );
  process.exitCode = 1;
});
