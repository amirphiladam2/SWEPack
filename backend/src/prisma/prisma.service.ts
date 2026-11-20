import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';

// On Compute the database arrives through the service declaration; locally the
// environment keeps working as before.
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const service = require('../service.mjs').default;
    const { db } = service.load();
    process.env.DATABASE_URL ||= db.url;
    return db.url;
  } catch {
    return undefined;
  }
}

const adapter = new PrismaPg({
  connectionString: resolveDatabaseUrl(),
});

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
