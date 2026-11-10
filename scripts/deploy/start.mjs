import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
process.env.NODE_ENV = 'production';
let activeChild;
let stopping = false;

function stop(signal = 'SIGTERM') {
  stopping = true;
  if (activeChild) activeChild.kill(signal);
}
process.on('SIGTERM', () => stop());
process.on('SIGINT', () => stop('SIGINT'));
if (process.send) process.on('message', message => { if (message === 'shutdown') stop(); });

function run(args) {
  return new Promise((resolve, reject) => {
    if (stopping) return reject(new Error('Startup cancelled'));
    activeChild = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
    activeChild.once('error', reject);
    activeChild.once('exit', code => {
      activeChild = undefined;
      if (code === 0 || stopping) resolve();
      else reject(new Error(`Deployment step exited with code ${code}`));
    });
  });
}

async function main() {
  const dataRoot = path.resolve(process.env.PORTFOLIO_DATA_DIR || '/var/data');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith('file:')) throw new Error('Set DATABASE_URL to the SQLite file on the persistent disk.');
  const databaseFile = path.resolve(decodeURIComponent(databaseUrl.slice(5).split('?')[0]));
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(dataRoot, 'uploads'));
  for (const file of [databaseFile, uploadRoot]) {
    const relative = path.relative(dataRoot, file);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Database and uploads must be inside PORTFOLIO_DATA_DIR.');
  }
  if (!process.env.ADMIN_EMAIL?.includes('@')) throw new Error('Set the owner ADMIN_EMAIL.');
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16) throw new Error('Set a unique ADMIN_PASSWORD with at least 16 characters.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /your-.*secret|change-this/i.test(process.env.JWT_SECRET)) throw new Error('Set a random JWT_SECRET of at least 32 characters.');
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!publicUrl || !/^https?:\/\//.test(publicUrl)) throw new Error('Set the public website origin. Render supplies RENDER_EXTERNAL_URL automatically.');
  const port = Number(process.env.PORT || '10000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
  process.env.UPLOAD_DIR = uploadRoot;
  await fs.mkdir(path.dirname(databaseFile), { recursive: true });
  await fs.mkdir(uploadRoot, { recursive: true });
  await (await fs.open(databaseFile, 'a')).close();

  // The disk exists at runtime, not during Render's build or pre-deploy steps.
  await run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
  await run([require.resolve('ts-node/dist/bin.js'), '--project', 'prisma/tsconfig.json', 'prisma/seed.ts']);
  await run([require.resolve('ts-node/dist/bin.js'), '--project', 'prisma/tsconfig.json', 'prisma/seed-portfolio.ts']);
  await run(['scripts/deploy/seed-media.mjs']);
  console.log('CMS storage is ready. Starting the website.');
  await run([require.resolve('next/dist/bin/next'), 'start', '--hostname', process.env.HOST || '0.0.0.0', '--port', String(port)]);
}

main().catch(error => {
  if (!stopping) { console.error(error.message); process.exitCode = 1; }
}).finally(() => { if (process.connected) process.disconnect(); });
