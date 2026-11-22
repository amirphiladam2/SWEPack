const { spawn } = require('child_process');
const path = require('path');

async function testStandaloneFallback() {
  const testDbUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/swepack_stage0_test';

  const env = {
    ...process.env,
    // COMPOSER_DB_URL is omitted to test direct start fallback
    DATABASE_URL: testDbUrl,
    JWT_SECRET: 'a-very-secure-random-secret-at-least-32-characters-long',
    FRONTEND_URL: 'http://localhost:3000',
    NODE_ENV: 'development',
    PORT: '3095',
  };
  delete env.COMPOSER_DB_URL;
  delete env.COMPOSER_PORT;

  const serverPath = path.resolve(__dirname, '../dist/src/server.js');
  console.log('[StandaloneTest] Spawning node', serverPath);
  console.log('[StandaloneTest] Testing standalone direct start (no COMPOSER_* env vars).');

  let stdoutLogs = '';
  let stderrLogs = '';

  const proc = spawn('node', [serverPath], {
    env,
    stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
  });

  proc.stdout.on('data', (d) => {
    const text = d.toString();
    stdoutLogs += text;
    process.stdout.write(`[Server stdout] ${text}`);
  });
  proc.stderr.on('data', (d) => {
    const text = d.toString();
    stderrLogs += text;
    process.stderr.write(`[Server stderr] ${text}`);
  });

  const port = 3095;
  let healthy = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.status === 200) {
        const body = await res.json();
        if (body.status === 'ok' && body.database === 'ok') {
          console.log('[StandaloneTest] Health check PASSED (database ok):', body);
          healthy = true;
          break;
        }
      }
    } catch {
      // waiting for server
    }
  }

  if (!healthy) {
    proc.kill('SIGKILL');
    throw new Error('Standalone server failed to become healthy on fallback DATABASE_URL.');
  }

  // Probe categories
  const catRes = await fetch(`http://127.0.0.1:${port}/categories`);
  console.log('[StandaloneTest] GET /categories status:', catRes.status);
  if (catRes.status !== 200) {
    proc.kill('SIGKILL');
    throw new Error(`/categories returned status ${catRes.status}`);
  }

  // Test Graceful Shutdown
  console.log('[StandaloneTest] Signaling SIGTERM to verify NestJS shutdown hooks & Prisma disconnection...');
  if (proc.send) {
    proc.send('SIGTERM');
  } else {
    proc.kill('SIGTERM');
  }

  await new Promise((r) => setTimeout(r, 1500));

  const allLogs = stdoutLogs + stderrLogs;
  const prismaDisconnectLogged = allLogs.includes('[PrismaService] Database connection pool disconnected.');
  console.log('[StandaloneTest] Prisma disconnect hook executed:', prismaDisconnectLogged);

  if (!prismaDisconnectLogged) {
    throw new Error('PrismaService onModuleDestroy was not triggered upon SIGTERM!');
  }

  console.log('[StandaloneTest] Standalone direct-start verification PASSED!');
}

testStandaloneFallback().catch((err) => {
  console.error('[StandaloneTest] FAILED:', err);
  process.exit(1);
});
