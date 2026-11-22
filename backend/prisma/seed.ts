import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../src/prisma/contract.js';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };

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
  const orm = db.orm.public;

  try {
    const frontend = await orm.Category.where({ slug: 'frontend' }).first();
    const frontendDescription =
      'Frontend development tools, libraries, frameworks, and resources.';
    if (frontend) {
      await orm.Category.where({ id: frontend.id }).update({
        name: 'Frontend',
        description: frontendDescription,
      });
    } else {
      await orm.Category.create({
        name: 'Frontend',
        slug: 'frontend',
        description: frontendDescription,
      });
    }

    for (const name of ['Animation', 'React', 'TypeScript', 'UI']) {
      const slug = name.toLowerCase();
      const tag = await orm.Tag.where({ slug }).first();
      if (tag) {
        await orm.Tag.where({ id: tag.id }).update({ name });
      } else {
        await orm.Tag.create({ name, slug });
      }
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
