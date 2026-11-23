import 'dotenv/config';

type AnyRecord = Record<string, any>;

let cachedInput: AnyRecord | null | undefined;
let cachedClient: Promise<any> | undefined;

function unwrapSecrets(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && typeof value.expose === 'function') {
    return value.expose();
  }
  if (Array.isArray(value)) return value.map((item) => unwrapSecrets(item));
  if (typeof value === 'object' && !(value instanceof Date)) {
    const out: AnyRecord = {};
    for (const [key, item] of Object.entries(value)) out[key] = unwrapSecrets(item);
    return out;
  }
  return value;
}

export async function initRuntime(): Promise<void> {
  if (cachedInput !== undefined) return;
  try {
    const mod: any = await import('../service.mjs');
    const service = mod.default;
    cachedInput = unwrapSecrets(service.input());
    cachedClient = (async () => {
      const { db } = service.load();
      return db.client;
    })();
  } catch {
    cachedInput = null;
  }
}

export function runtimeInput(): AnyRecord | null {
  return cachedInput ?? null;
}

export function jwtSecretValue(): string | undefined {
  return process.env.JWT_SECRET ?? runtimeInput()?.jwtSecret ?? undefined;
}

export function frontendUrlValue(): string | undefined {
  return process.env.FRONTEND_URL ?? runtimeInput()?.frontendUrl ?? undefined;
}

export async function ensureDbClient(): Promise<any> {
  if (!cachedClient) await initRuntime();
  return cachedClient;
}
