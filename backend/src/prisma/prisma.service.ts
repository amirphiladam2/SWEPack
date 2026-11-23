import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import service from '../../service.mjs';

type Db = ReturnType<typeof service.load>['db'];

let cachedDb: Db | undefined;

function loadDb(): Db {
  cachedDb ??= service.load().db;
  return cachedDb;
}

/**
 * Holds the Prisma ORM 8 client that the Composer service declaration
 * provides through its `db` dependency (`service.load().db.client`).
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** The Prisma ORM 8 client, built lazily on first use. */
  get client() {
    return loadDb().client;
  }

  async onModuleInit() {
    // The Prisma 8 client connects lazily; nothing to warm here.
  }

  async onModuleDestroy() {
    await loadDb().client.close();
  }
}
