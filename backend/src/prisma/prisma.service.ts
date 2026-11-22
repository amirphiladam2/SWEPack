import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import service, { type ServiceInput } from './service.mjs';

type Db = ReturnType<typeof service.load>['db'];

/**
 * The service's declared input, as the platform provisioned it. Values bound
 * with `envSecret` are redacting boxes; `expose()` reads one. Built on first
 * use for the same reason as the database binding.
 */
let input: ServiceInput | undefined;

export function serviceInput(): ServiceInput {
  input ??= service.input() as ServiceInput;
  return input;
}

// Built once on first use, always from the service declaration's `db`
// dependency: on Compute and under `prisma dev` the platform provides the
// database through the service, never through DATABASE_URL. The build is
// deferred to the first query because importing modules (unit tests, tools)
// run outside the platform, without the service environment.
let db: Db | undefined;

function dbBinding(): Db {
  db ??= service.load().db;
  return db;
}

/**
 * Shape of one Prisma ORM 8 transaction context, typed with the emitted
 * contract. Services open transactions through {@link PrismaService.transaction}.
 */
export type PrismaTransaction = PostgresTransactionContext<Contract>;

/**
 * True when the error is PostgreSQL's unique-violation error (Prisma ORM 8
 * surfaces driver errors), the successor of the old P2002 check.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return constraintErrorCode(error) === '23505';
}

/**
 * The unique constraint's name, if the error carries one. Callers match it the
 * way they previously matched the P2002 `meta.target` fields.
 */
export function uniqueConstraintName(error: unknown): string[] {
  const code = constraintErrorCode(error);
  if (code !== '23505') return [];
  if (typeof error !== 'object' || error === null) return [];
  const constraint = (error as { constraint?: unknown }).constraint;
  if (typeof constraint !== 'string') return [];
  return [constraint];
}

function constraintErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * NestJS provider around the Prisma ORM 8 client from the Composer service
 * declaration. The client itself connects lazily; `onModuleInit` pings the
 * database so a broken connection fails the boot, as before.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Collections for the public schema: `this.prisma.orm.User.where(...)...`. */
  get orm() {
    return dbBinding().client.orm.public;
  }

  /** SQL builder tables for the public schema, for statements the ORM cannot express. */
  get sql() {
    return dbBinding().client.sql.public;
  }

  transaction<R>(fn: (tx: PrismaTransaction) => Promise<R>): Promise<R> {
    return dbBinding().client.transaction(fn);
  }

  /** Runs a plan built with `this.sql`; resolves to the affected-row count. */
  execute(plan: Parameters<Db['client']['execute']>[0]) {
    return dbBinding().client.execute(plan);
  }

  /** Cheap liveness probe. */
  async ping(): Promise<void> {
    const client = dbBinding().client;
    await client.execute(client.raw.sql`SELECT 1`.affectedCount().build());
  }

  /** Atomically bumps a user's `tokenVersion`, revoking their issued tokens. */
  async incrementTokenVersion(userId: string): Promise<void> {
    await this.execute(
      this.sql.User.update((_f, fns) => ({
        tokenVersion: fns.raw`"tokenVersion" + 1`.returns({
          codecId: 'pg/int4@1',
        }),
      })).where((f, fns) => fns.eq(f.id, userId)).build(),
    );
  }

  async onModuleInit() {
    await this.ping();
  }

  async onModuleDestroy() {
    try {
      await dbBinding().client.close();
    } catch (error) {
      this.logger.warn(
        `Closing the database client failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
