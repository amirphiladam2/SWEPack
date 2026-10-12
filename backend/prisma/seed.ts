import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

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

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.category.upsert({
      where: { slug: 'frontend' },
      update: {
        name: 'Frontend',
        description:
          'Frontend development tools, libraries, frameworks, and resources.',
      },
      create: {
        name: 'Frontend',
        slug: 'frontend',
        description:
          'Frontend development tools, libraries, frameworks, and resources.',
      },
    });

    for (const name of ['Animation', 'React', 'TypeScript', 'UI']) {
      const slug = name.toLowerCase();
      await prisma.tag.upsert({
        where: { slug },
        update: { name },
        create: { name, slug },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch(() => {
  console.error(
    'Production seed failed. Check the Railway connection and migration state.',
  );
  process.exitCode = 1;
});
