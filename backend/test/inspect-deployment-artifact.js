const path = require('path');
const fs = require('fs');
const { assemble } = require('../node_modules/@prisma/composer/dist/node-control.mjs');
const service = require('../dist/service.js').default;

const { pathToFileURL } = require('url');

async function inspectArtifact() {
  const cwd = path.resolve(__dirname, '..');
  console.log('[Artifact] Assembling deployment artifact for service:', service.name);
  console.log('[Artifact] Raw build descriptor:', service.build);

  const build = {
    ...service.build,
    module: service.build.module.startsWith('file:')
      ? service.build.module
      : pathToFileURL(path.resolve(cwd, service.build.module)).href,
  };
  console.log('[Artifact] Resolved build descriptor module:', build.module);

  const bundle = await assemble({
    build,
    cwd,
    address: 'backend',
  });

  console.log('[Artifact] Assembled bundle result:', bundle);
  const artifactDir = bundle.dir;
  console.log('[Artifact] Artifact directory:', artifactDir);

  const rootFiles = fs.readdirSync(artifactDir);
  console.log('[Artifact] Root contents of artifact directory:', rootFiles);

  const bundleSubdir = path.join(artifactDir, 'bundle');
  const bundleFiles = fs.readdirSync(bundleSubdir);
  console.log('[Artifact] Bundle contents (compiled NestJS tree):', bundleFiles);

  const bundleSrcFiles = fs.readdirSync(path.join(bundleSubdir, 'src'));
  console.log('[Artifact] Bundle/src contents:', bundleSrcFiles);

  // Check staged runtime dependencies
  const nodeModulesDir = path.join(bundleSubdir, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    const stagedModules = fs.readdirSync(nodeModulesDir);
    console.log('[Artifact] Staged runtime node_modules count:', stagedModules.length);
    console.log('[Artifact] Sample staged modules:', stagedModules.slice(0, 15));
  }

  // Verify key NestJS compiled files exist in bundle
  const requiredFiles = [
    'src/main.js',
    'src/server.js',
    'src/app.module.js',
    'src/prisma/prisma.service.js',
  ];
  for (const rel of requiredFiles) {
    const full = path.join(bundleSubdir, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Required compiled file missing from bundle: ${rel}`);
    }
  }
  console.log('[Artifact] All required compiled NestJS files verified in bundle.');

  // Verify main.mjs exists at root of artifact
  if (!fs.existsSync(path.join(artifactDir, 'main.mjs'))) {
    throw new Error('main.mjs missing from artifact root');
  }
  console.log('[Artifact] main.mjs wrapper exists at artifact root.');

  console.log('[Artifact] Deployment artifact inspection PASSED!');
}

inspectArtifact().catch((err) => {
  console.error('[Artifact] FAILED:', err);
  process.exit(1);
});
