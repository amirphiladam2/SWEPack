import { Injectable, OnModuleDestroy } from '@nestjs/common';
import service from '../service.mjs';

const { db } = service.load();

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly orm = db.client.orm;

  async onModuleDestroy() {
    await db.client.$disconnect?.();
  }
}
