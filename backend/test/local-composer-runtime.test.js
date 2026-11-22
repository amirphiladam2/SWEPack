const { spawn } = require('child_process');
const path = require('path');

async function testPlaceholderExit() {
  console.log('[PlaceholderTest] Verifying server exits immediately when DATABASE_URL is "-"');
  const serverPath = path.resolve(__dirname, '../dist/src/server.js');
  const env = {
    ...process.env,
    DATABASE_URL: '-',
    JWT_SECRET: 'test-secret',
  };

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [serverPath], { env, stdio: ['inherit', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('exit', (code) => {
      if (code === 1 && stderr.includes('DATABASE_URL is missing or set to placeholder "-"')) {
        console.log('[PlaceholderTest] PASSED: Server rejected placeholder "-" with code 1.');
        resolve();
      } else {
        reject(new Error(`Expected exit code 1 with placeholder message, got code=${code}, stderr=${stderr}`));
      }
    });
  });
}

async function testMissingDbUrlExit() {
  console.log('[MissingDbTest] Verifying server exits immediately when DATABASE_URL is missing');
  const serverPath = path.resolve(__dirname, '../dist/src/server.js');
  const env = {
    ...process.env,
    JWT_SECRET: 'test-secret',
  };
  delete env.DATABASE_URL;

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [serverPath], { env, stdio: ['inherit', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('exit', (code) => {
      if (code === 1 && stderr.includes('DATABASE_URL is missing')) {
        console.log('[MissingDbTest] PASSED: Server rejected missing DATABASE_URL with code 1.');
        resolve();
      } else {
        reject(new Error(`Expected exit code 1 with missing DB message, got code=${code}, stderr=${stderr}`));
      }
    });
  });
}

async function testComposerComputeRuntime() {
  const testDbUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/swepack_stage0_test';
  const port = 3096;

  const env = {
    ...process.env,
    DATABASE_URL: testDbUrl,
    PORT: String(port),
    JWT_SECRET: 'a-very-secure-random-secret-at-least-32-characters-long',
    FRONTEND_URL: 'http://localhost:3000',
    NODE_ENV: 'development',
  };

  const serverPath = path.resolve(__dirname, '../dist/src/server.js');
  console.log('[ComposerComputeTest] Spawning node', serverPath);

  const proc = spawn('node', [serverPath], {
    env,
    stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[Server stdout] ${d.toString()}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[Server stderr] ${d.toString()}`));

  let healthy = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.status === 200) {
        const body = await res.json();
        if (body.status === 'ok' && body.database === 'ok') {
          console.log('[ComposerComputeTest] Health check PASSED (database ok):', body);
          healthy = true;
          break;
        }
      }
    } catch {
      // waiting for server
    }
  }

  if (!healthy) {
    proc.kill();
    throw new Error('Server failed to become healthy on DATABASE_URL');
  }

  // Verify route
  const catRes = await fetch(`http://127.0.0.1:${port}/categories`);
  console.log('[ComposerComputeTest] GET /categories status:', catRes.status);
  if (catRes.status !== 200) {
    proc.kill();
    throw new Error(`GET /categories returned ${catRes.status}`);
  }

  // Graceful shutdown
  await new Promise((resolve) => {
    proc.on('exit', () => {
      console.log('[ComposerComputeTest] Process exited cleanly.');
      resolve();
    });
    if (process.platform === 'win32') {
      proc.send('SIGTERM');
    } else {
      proc.kill('SIGTERM');
    }
  });

  console.log('[ComposerComputeTest] All tests PASSED!');
}

async function runAll() {
  await testPlaceholderExit();
  await testMissingDbUrlExit();
  await testComposerComputeRuntime();
}

runAll().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});
