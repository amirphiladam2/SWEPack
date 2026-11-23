// Compatibility shim over Prisma ORM 8: the error type the API surface expects.
export namespace Prisma {
  export class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: { target?: unknown };
    clientVersion?: string;
    constructor(
      message: string,
      options?: { code?: string; clientVersion?: string; meta?: { target?: unknown } },
    ) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = options?.code ?? 'UNKNOWN';
      this.clientVersion = options?.clientVersion;
      this.meta = options?.meta;
    }
  }

  export type ResourceInclude = Record<string, any>;
  export type ResourceUpdateInput = Record<string, any>;
  export type CategoryUpdateInput = Record<string, any>;
  export type ResourceOrderByWithRelationInput = Record<string, string>;
}
