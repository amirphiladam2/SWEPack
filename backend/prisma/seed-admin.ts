import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../src/prisma/contract.js';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };

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
  const adminEmail = email!;
  const adminName = name!;
  const adminPassword = password!;
  const db = postgres({
    contract: contractFromJson<Contract>(contractJson),
    url: databaseUrl!,
  });
  const orm = db.orm.public;

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const existing = await orm.User.where({ email: adminEmail }).first();
    if (existing) {
      await orm.User.where({ id: existing.id }).update({
        name: adminName,
        password: passwordHash,
        role: 'ADMIN',
      });
    } else {
      await orm.User.create({
        name: adminName,
        email: adminEmail,
        password: passwordHash,
        role: 'ADMIN',
      });
    }
    console.log('Admin bootstrap completed.');
  } finally {
    await db.close();
  }
}

bootstrapAdmin().catch(() => {
  console.error('Admin bootstrap failed. Check the Railway connection and input.');
  process.exitCode = 1;
});
