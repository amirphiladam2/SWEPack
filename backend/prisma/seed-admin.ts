import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const target = process.env.SEED_TARGET;
const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim();
const password = process.env.ADMIN_PASSWORD;

function validateInput() {
  if (target !== 'railway-production') {
    throw new Error('Set SEED_TARGET=railway-production to run the admin bootstrap.');
  }
  if (!databaseUrl || !email || !name || !password) {
    throw new Error(
      'DATABASE_URL, ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD are required.',
    );
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
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
    throw new Error('The admin bootstrap only accepts a Railway database URL.');
  }
}

async function bootstrapAdmin() {
  validateInput();
  const connectionString = databaseUrl!;
  const adminEmail = email!;
  const adminName = name!;
  const adminPassword = password!;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: adminName, password: passwordHash, role: 'ADMIN' },
      create: {
        name: adminName,
        email: adminEmail,
        password: passwordHash,
        role: 'ADMIN',
      },
    });
    console.log('Admin bootstrap completed.');
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin().catch(() => {
  console.error('Admin bootstrap failed. Check the Railway connection and input.');
  process.exitCode = 1;
});
