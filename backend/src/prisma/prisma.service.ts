import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is required for PrismaService runtime connection.',
      );
    }

    let max = 5;
    if (process.env.DB_POOL_MAX !== undefined) {
      const parsedMax = Number(process.env.DB_POOL_MAX);
      if (!Number.isInteger(parsedMax) || parsedMax <= 0) {
        throw new Error('DB_POOL_MAX must be a positive integer.');
      }
      max = parsedMax;
    }

    const adapter = new PrismaPg({
      connectionString,
      max,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    console.log('[PrismaService] Disconnecting database connection pool...');
    await this.$disconnect();
    console.log('[PrismaService] Database connection pool disconnected.');
  }
}
