const { bootstrap } = require('../dist/src/main.js');

async function verify() {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/swepack_stage0_test';
  process.env.JWT_SECRET = 'a-very-secure-random-secret-at-least-32-characters-long';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.NODE_ENV = 'development';

  const testPort = 3099;
  console.log('[Test] Bootstrapping compiled NestJS server on port', testPort);
  const app = await bootstrap(testPort);

  try {
    console.log('[Test] Probing GET /health...');
    const response = await fetch(`http://127.0.0.1:${testPort}/health`);
    const status = response.status;
    const body = await response.json();
    console.log('[Test] /health status:', status, 'body:', body);

    if (status !== 200 || body.status !== 'ok' || body.database !== 'ok') {
      throw new Error(`Health check failed: status=${status}, body=${JSON.stringify(body)}`);
    }

    console.log('[Test] Probing GET /categories...');
    const catRes = await fetch(`http://127.0.0.1:${testPort}/categories`);
    console.log('[Test] /categories status:', catRes.status);
    if (catRes.status !== 200) {
      throw new Error(`/categories returned status ${catRes.status}`);
    }

    console.log('[Test] Probing GET /tags...');
    const tagRes = await fetch(`http://127.0.0.1:${testPort}/tags`);
    console.log('[Test] /tags status:', tagRes.status);
    if (tagRes.status !== 200) {
      throw new Error(`/tags returned status ${tagRes.status}`);
    }

    console.log('[Test] Runtime verification SUCCESSFUL!');
  } finally {
    console.log('[Test] Closing application...');
    await app.close();
    console.log('[Test] Application closed cleanly.');
  }
}

verify().catch((err) => {
  console.error('[Test] Verification FAILED:', err);
  process.exit(1);
});
