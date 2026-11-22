import 'dotenv/config';
import service from '../service.js';

process.env.COMPOSER_ENTRY = 'true';

let port: number | undefined;

if (process.env.PORT) {
  const parsedPort = Number(process.env.PORT);
  if (!Number.isNaN(parsedPort) && parsedPort > 0) {
    port = parsedPort;
  }
}

try {
  const loaded = service.load?.();
  if (loaded && typeof loaded === 'object' && 'db' in loaded) {
    const db = (loaded as { db?: { url?: string } }).db;
    if (db?.url) {
      process.env.DATABASE_URL = db.url;
    }
  }
  if (!port && typeof service.port === 'function') {
    port = service.port();
  }
} catch (error) {
  if (process.env.COMPOSER_CONFIG || process.env.COMPOSER_ORIGIN) {
    console.error('Failed to load Composer service configuration:', error);
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl || databaseUrl === '-') {
  console.error(
    'FATAL: DATABASE_URL is missing or set to placeholder "-". A valid PostgreSQL connection string is required.',
  );
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET?.trim()) {
  console.error('FATAL: JWT_SECRET is required in production environment.');
  process.exit(1);
}

async function start() {
  const { bootstrap } = await import('./main.js');
  await bootstrap(port);
}

if (process.platform === 'win32') {
  process.on('message', (msg) => {
    if (msg === 'SIGTERM') {
      process.emit('SIGTERM');
    }
  });
}

void start();
