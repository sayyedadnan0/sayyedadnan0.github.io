import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
const require = createRequire(import.meta.url);
const databaseUrl = process.env.DATABASE_URL;

// Some Windows SQLite engines require the file to exist before schema creation.
// Append/create mode preserves existing database bytes; never truncate or reset it.
if (databaseUrl?.startsWith('file:')) {
  const databasePath = decodeURIComponent(databaseUrl.slice(5).split('?')[0]);
  const target = path.isAbsolute(databasePath) ? databasePath : path.resolve('prisma', databasePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await (await fs.open(target, 'a')).close();
}

const child = spawn(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
