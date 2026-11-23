import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

type Row = Record<string, any>;

let cachedClient: Promise<any> | undefined;

async function ensureDbClient(): Promise<any> {
  if (!cachedClient) {
    cachedClient = (async () => {
      const mod: any = await import('../service.mjs');
      const { db } = mod.default.load();
      return db.client;
    })();
  }
  return cachedClient;
}

const COMPOUND_UNIQUE_KEYS: Record<string, string[]> = {
  userId_resourceId: ['userId', 'resourceId'],
  provider_providerAccountId: ['provider', 'providerAccountId'],
  userId_slug: ['userId', 'slug'],
  collectionId_resourceId: ['collectionId', 'resourceId'],
};

const RELATIONS: Record<string, string[]> = {
  Resource: ['category', 'tags', 'submittedBy', 'savedBy', 'collections'],
  User: [
    'resources', 'savedResources', 'collections', 'passwordResetTokens',
    'githubAccounts', 'githubOAuthStates', 'deletionRequest',
  ],
  Category: ['parent', 'children', 'resources'],
  Tag: ['resources'],
  ResourceTag: ['resource', 'tag'],
  SavedResource: ['user', 'resource'],
  Collection: ['user', 'resources'],
  CollectionResource: ['collection', 'resource'],
  GithubAccount: ['user'],
  GithubOAuthState: ['user'],
  PasswordResetToken: ['user'],
  AccountDeletionRequest: ['user'],
};

function isDate(v: unknown) {
  return v instanceof Date;
}

function likeEscape(s: string) {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

function fieldPredicate(row: any, fns: any, key: string, cond: any): any {
  if (cond !== null && typeof cond === 'object' && !isDate(cond)) {
    if ('lte' in cond) return row[key].lte(cond.lte);
    if ('lt' in cond) return row[key].lt(cond.lt);
    if ('gte' in cond) return row[key].gte(cond.gte);
    if ('gt' in cond) return row[key].gt(cond.gt);
    if ('in' in cond) return row[key].in(cond.in);
    if ('not' in cond) return fns.not(fieldPredicate(row, fns, key, cond.not));
    if ('contains' in cond) {
      const pattern = `%${likeEscape(String(cond.contains))}%`;
      return cond.mode === 'insensitive' ? row[key].ilike(pattern) : row[key].like(pattern);
    }
  }
  if (cond === null) return row[key].isNull();
  return fns.eq(row[key], cond);
}

function wherePredicate(row: any, fns: any, where: Row | undefined): any {
  const preds: any[] = [];
  for (const [key, cond] of Object.entries(where ?? {})) {
    if (key === 'OR') {
      preds.push(fns.or(...cond.map((w: Row) => wherePredicate(row, fns, w))));
    } else if (key === 'AND') {
      preds.push(fns.and(...cond.map((w: Row) => wherePredicate(row, fns, w))));
    } else if (key === 'NOT') {
      preds.push(fns.not(wherePredicate(row, fns, cond)));
    } else if (COMPOUND_UNIQUE_KEYS[key]) {
      preds.push(wherePredicate(row, fns, Object.fromEntries(COMPOUND_UNIQUE_KEYS[key].map((k) => [k, cond[k]]))));
    } else if (cond !== null && typeof cond === 'object' && !isDate(cond) && 'some' in cond) {
      preds.push(row[key].some((related: any) => wherePredicate(related, fns, cond.some)));
    } else {
      preds.push(fieldPredicate(row, fns, key, cond));
    }
  }
  if (preds.length === 0) return undefined;
  return preds.length === 1 ? preds[0] : fns.and(...preds);
}

function orderByLambdas(orderBy: any) {
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return orders.map((o: Row) => (row: any) => {
    const [key, dir] = Object.entries(o)[0] as [string, string];
    return dir === 'asc' ? row[key].asc() : row[key].desc();
  });
}

function uniqueWhere(where: Row | undefined): Row {
  for (const [key, cond] of Object.entries(where ?? {})) {
    if (COMPOUND_UNIQUE_KEYS[key]) {
      return Object.fromEntries(COMPOUND_UNIQUE_KEYS[key].map((k) => [k, cond[k]]));
    }
    return { [key]: cond };
  }
  return {};
}

function applyShape(col: any, model: string, args: any): any {
  const relations = RELATIONS[model] ?? [];
  const select = args?.select;
  const include = args?.include;
  const countRels: string[] = [];
  const scalarSelect: string[] = [];
  const relShapes: Array<[string, any]> = [];

  const split = (shape: Row, isInclude: boolean) => {
    for (const [key, value] of Object.entries(shape ?? {})) {
      if (!value) continue;
      if (key === '_count') {
        countRels.push(...Object.keys((value as Row).select ?? {}));
        continue;
      }
      if (relations.includes(key)) {
        if (isInclude || typeof value === 'object') relShapes.push([key, value === true ? true : value]);
        else scalarSelect.push(key);
      } else {
        scalarSelect.push(key);
      }
    }
  };
  if (include) split(include, true);
  if (select) split(select, false);

  let shaped = col;
  if (scalarSelect.length > 0) shaped = shaped.select(...scalarSelect);
  for (const [rel, shape] of relShapes) {
    shaped = shaped.include(rel, (branch: any) => {
      if (shape === true) return branch;
      const subSelect = (shape as Row).select;
      const subInclude = (shape as Row).include;
      return applyShape(branch, branchModel(model, rel), { select: subSelect, include: subInclude });
    });
  }
  return { shaped, countRels };
}

const JOIN_MODEL: Record<string, string> = { tags: 'ResourceTag', resources: 'CollectionResource' };

function branchModel(model: string, rel: string): string {
  const targets: Record<string, string> = {
    category: 'Category', tags: 'ResourceTag', submittedBy: 'User', savedBy: 'SavedResource',
    collections: 'CollectionResource', user: 'User', resource: 'Resource', tag: 'Tag',
    parent: 'Category', children: 'Category', savedResources: 'SavedResource',
    passwordResetTokens: 'PasswordResetToken', githubAccounts: 'GithubAccount',
    githubOAuthStates: 'GithubOAuthState', deletionRequest: 'AccountDeletionRequest',
  };
  return targets[rel] ?? model;
}

function isRelation(model: string, key: string) {
  return (RELATIONS[model] ?? []).includes(key);
}

function dataTranslate(model: string, data: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !isDate(value) && 'increment' in value) {
      out[key] = { __increment: (value as Row).increment };
      continue;
    }
    if (isRelation(model, key) && value !== null && typeof value === 'object' && !isDate(value)) {
      if ('connect' in value) {
        const criterion = (value as Row).connect;
        out[key] = (m: any) => m.connect(criterion);
      } else if ('disconnect' in value) {
        out[key] = (m: any) => m.disconnect();
      } else if ('create' in value) {
        const created = (value as Row).create;
        const rows = Array.isArray(created) ? created : [created];
        const joinModel = JOIN_MODEL[key] ?? branchModel(model, key);
        out[key] = (m: any) =>
          m.create(rows.map((row: Row) => dataTranslate(joinModel, row)));
      } else if ('deleteMany' in value) {
        out[key] = (m: any) => m.disconnect();
        continue;
      } else {
        const nested = dataTranslate(branchModel(model, key), value as Row);
        out[key] = nested;
        continue;
      }
      if (key === 'tags' && 'deleteMany' in value) {
        out[key] = (m: any) => {
          m.disconnect();
          return m.create((value as Row).create.map((row: Row) => dataTranslate('ResourceTag', row)));
        };
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

function hasIncrement(data: Row) {
  return Object.values(data ?? {}).some(
    (v) => v !== null && typeof v === 'object' && !isDate(v) && '__increment' in v,
  );
}

type PendingOp = { model: string; op: string; args: any };

function thenable(model: string, op: string, args: any) {
  const pending: PendingOp = { model, op, args };
  const promise = execOp(pending) as Promise<any> & { __pending?: PendingOp };
  promise.__pending = pending;
  return promise;
}

async function collection(db: any, model: string, args: any, filtered: boolean) {
  let col = db.orm.public[model];
  if (filtered && args?.where && Object.keys(args.where).length > 0) {
    col = col.where((row: any, fns: any) => wherePredicate(row, fns, args.where));
  }
  if (args?.orderBy) col = col.orderBy(orderByLambdas(args.orderBy));
  if (args?.skip) col = col.offset(args.skip);
  if (args?.take) col = col.limit(args.take);
  return col;
}

async function execOp(pending: PendingOp, tx?: any): Promise<any> {
  const db = tx ?? (await ensureDbClient());
  const { model, op, args } = pending;
  const relations = RELATIONS[model] ?? [];

  if (op === 'findMany' || op === 'findUnique' || op === 'findFirst') {
    const filtered = op !== 'findMany' || Boolean(args?.where);
    const col = await collection(db, model, args, true);
    const { shaped, countRels } = applyShape(col, model, args);
    let rows = await shaped.all();
    if (countRels.length > 0) {
      let withCounts = await collection(db, model, args, true);
      for (const rel of countRels) {
        withCounts = withCounts.include(rel, (branch: any) => branch.count());
      }
      const counted = await withCounts.all();
      const byId = new Map(counted.map((row: Row) => [row.id ?? row, row]));
      rows = (rows as Row[]).map((row) => ({
        ...row,
        _count: Object.fromEntries(countRels.map((rel) => [rel, byId.get(row.id)?.[rel] ?? 0])),
      }));
    }
    if (op === 'findMany') return rows;
    return rows.length > 0 ? rows[0] : null;
  }

  if (op === 'count') {
    const col = await collection(db, model, args, true);
    const result = await col.aggregate((a: any) => ({ n: a.count() }));
    return result.n;
  }

  if (op === 'create') {
    const col = db.orm.public[model];
    const data = dataTranslate(model, args?.data ?? {});
    const { shaped } = applyShape(col.create(data), model, args);
    const rows = await shaped.all();
    return rows[0];
  }

  if (op === 'update' || op === 'upsert' || op === 'delete') {
    const whereEq = uniqueWhere(args?.where);
    const runUpdate = async (scope: any): Promise<any> => {
      let col = scope.orm.public[model].where((row: any, fns: any) => wherePredicate(row, fns, whereEq));
      const { shaped } = applyShape(col, model, args);
      const data = dataTranslate(model, op === 'upsert' ? args?.update ?? {} : args?.data ?? {});
      if (hasIncrement(data)) {
        return scope.transaction(async (tx2: any) => {
          const current = await tx2.orm.public[model]
            .where((row: any, fns: any) => wherePredicate(row, fns, whereEq))
            .forUpdate()
            .first();
          const resolved: Row = {};
          for (const [key, value] of Object.entries(data)) {
            resolved[key] = '__increment' in value ? (current?.[key] ?? 0) + value.__increment : value;
          }
          const updated = await tx2.orm.public[model]
            .where((row: any, fns: any) => wherePredicate(row, fns, whereEq))
            .update(resolved);
          return updated;
        });
      }
      if (op === 'delete') return shaped.delete();
      return shaped.update(data);
    };

    if (op === 'upsert') {
      return db.transaction(async (tx: any) => {
        const existing = await tx.orm.public[model]
          .where((row: any, fns: any) => wherePredicate(row, fns, whereEq))
          .first();
        if (existing) {
          const updateData = dataTranslate(model, args?.update ?? {});
          const resolved: Row = {};
          for (const [key, value] of Object.entries(updateData)) {
            resolved[key] = '__increment' in value ? (existing[key] ?? 0) + value.__increment : value;
          }
          const col = tx.orm.public[model].where((row: any, fns: any) => wherePredicate(row, fns, whereEq));
          const { shaped } = applyShape(col, model, args);
          return shaped.update(resolved);
        }
        const created = await tx.orm.public[model].create(dataTranslate(model, args?.create ?? {}));
        const { shaped } = applyShape(Promise.resolve(created), model, args);
        return created;
      });
    }

    const result = await runUpdate(db);
    if (result === null || result === undefined) {
      throw new Prisma.PrismaClientKnownRequestError(
        op === 'delete' ? 'Record to delete does not exist.' : 'Record to update does not exist.',
        { code: 'P2025' },
      );
    }
    return result;
  }

  if (op === 'deleteMany') {
    const col = await collection(db, model, args, true);
    const result = await col.deleteAll();
    return { count: result?.affectedRows ?? result?.count ?? 0 };
  }

  throw new Error(`Unsupported Prisma operation: ${model}.${op}`);
}

class PrismaClientKnownRequestErrorUnused extends Error {
  code: string;
  meta?: { target?: unknown };
  constructor(message: string, options?: { code?: string; meta?: { target?: unknown } }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = options?.code ?? 'UNKNOWN';
    this.meta = options?.meta;
  }
}

function delegate(model: string) {
  const findArgs = (op: string) => (args: any) => thenable(model, op, args);
  return {
    findUnique: findArgs('findUnique'),
    findFirst: findArgs('findFirst'),
    findMany: findArgs('findMany'),
    create: (args: any) => thenable(model, 'create', args),
    update: (args: any) => thenable(model, 'update', args),
    upsert: (args: any) => thenable(model, 'upsert', args),
    delete: (args: any) => thenable(model, 'delete', args),
    deleteMany: (args: any) => thenable(model, 'deleteMany', args),
    count: (args?: any) => thenable(model, 'count', args ?? {}),
  };
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  user = delegate('User');
  resource = delegate('Resource');
  savedResource = delegate('SavedResource');
  category = delegate('Category');
  tag = delegate('Tag');
  resourceTag = delegate('ResourceTag');
  collection = delegate('Collection');
  collectionResource = delegate('CollectionResource');
  passwordResetToken = delegate('PasswordResetToken');
  githubAccount = delegate('GithubAccount');
  githubOAuthState = delegate('GithubOAuthState');
  accountDeletionRequest = delegate('AccountDeletionRequest');

  $transaction(ops: any[]) {
    return (async () => {
      const db = await ensureDbClient();
      return db.transaction(async (tx: any) => {
        const results: any[] = [];
        for (const operation of ops) {
          const pending = operation?.__pending;
          if (!pending) {
            results.push(await operation);
            continue;
          }
          const { model, op, args } = pending;
          if (op === 'deleteMany') {
            const col = tx.orm.public[model].where((row: any, fns: any) =>
              wherePredicate(row, fns, args?.where),
            );
            const result = await col.deleteAll();
            results.push({ count: result?.affectedRows ?? 0 });
            continue;
          }
          if (op === 'update') {
            const whereEq = uniqueWhere(args?.where);
            const data = dataTranslate(model, args?.data ?? {});
            const resolved: Row = {};
            for (const [key, value] of Object.entries(data)) {
              resolved[key] = value;
            }
            const col = tx.orm.public[model].where((row: any, fns: any) => wherePredicate(row, fns, whereEq));
            const { shaped } = applyShape(col, model, args);
            const updated = await shaped.update(resolved);
            if (updated === null || updated === undefined) {
              throw new Prisma.PrismaClientKnownRequestError('Record to update does not exist.', { code: 'P2025' });
            }
            results.push(updated);
            continue;
          }
          if (op === 'delete') {
            const whereEq = uniqueWhere(args?.where);
            const deleted = await tx.orm.public[model]
              .where((row: any, fns: any) => wherePredicate(row, fns, whereEq))
              .delete();
            if (deleted === null || deleted === undefined) {
              throw new Prisma.PrismaClientKnownRequestError('Record to delete does not exist.', { code: 'P2025' });
            }
            results.push(deleted);
            continue;
          }
          results.push(await execOp(pending, tx));
        }
        return results;
      });
    })();
  }

  async $connect() {
    await ensureDbClient();
  }

  async $queryRaw(strings: TemplateStringsArray, ...values: any[]) {
    const db = await ensureDbClient();
    return db.query(db.raw.sql(strings, ...values));
  }

  async $disconnect() {
    /* The pool is owned by the service binding; nothing to close here. */
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}


