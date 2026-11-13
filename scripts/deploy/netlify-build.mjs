import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { resolveDatabaseUrl } from '../../prisma/database-url.cjs';
import { checkDatabaseConnection } from './database-preflight.mjs';

const require = createRequire(import.meta.url);
const env = process.env;
function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) throw new Error('A deployment setup step failed.');
}

try {
  env.DATABASE_URL = resolveDatabaseUrl(env.DATABASE_URL, env.DATABASE_PASSWORD);
  env.DIRECT_URL = resolveDatabaseUrl(env.DIRECT_URL, env.DATABASE_PASSWORD);
  if (!/^postgres(?:ql)?:/.test(env.DATABASE_URL || '') || !/^postgres(?:ql)?:/.test(env.DIRECT_URL || '')) throw new Error('Configure the Supabase pooled DATABASE_URL and session DIRECT_URL privately in Netlify.');
  if (env.STORAGE_PROVIDER !== 'supabase' || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Configure Supabase media storage privately in Netlify.');
  const storageOrigin = new URL(env.SUPABASE_URL);
  if (storageOrigin.protocol !== 'https:' || !storageOrigin.hostname.endsWith('.supabase.co')) throw new Error('Invalid Supabase storage origin.');
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || /change-this|your-.*secret/i.test(env.JWT_SECRET)) throw new Error('Set a unique JWT_SECRET of at least 32 characters.');
  if (!env.ADMIN_EMAIL?.includes('@') || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) throw new Error('Set the owner email and a unique initial CMS password of at least 16 characters.');
  const origin = env.NEXT_PUBLIC_SITE_URL || env.URL;
  if (!origin || !origin.startsWith('https://')) throw new Error('Netlify must supply the public HTTPS URL.');
  // Previews must have their own database rather than migrating the live CMS.
  if (env.CONTEXT && env.CONTEXT !== 'production') throw new Error('Disable automatic deploy previews or configure a separate preview database before building previews.');
  await checkDatabaseConnection(env.DIRECT_URL);
  run(['scripts/generate-clients.mjs']);
  run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', 'prisma/postgres/schema.prisma']);
  run([require.resolve('ts-node/dist/bin.js'), '--project', 'prisma/tsconfig.json', 'prisma/seed.ts']);
  run([require.resolve('ts-node/dist/bin.js'), '--project', 'prisma/tsconfig.json', 'prisma/seed-portfolio.ts']);
  run(['scripts/deploy/seed-media.mjs']);

  const storage = createClient(storageOrigin.origin, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
  const bucket = env.SUPABASE_STORAGE_BUCKET || 'portfolio-media';
  const existing = await storage.getBucket(bucket);
  if (existing.error) {
    if (String(existing.error.statusCode) !== '404') throw new Error('Could not check the CMS media bucket.');
    const created = await storage.createBucket(bucket, { public: true, fileSizeLimit: 50_000_000, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/ogg', 'application/pdf'] });
    if (created.error) throw new Error('Could not create the public portfolio media bucket.');
  } else if (!existing.data.public) throw new Error('The portfolio media bucket must be public. Use a separate bucket for private documents.');
  run([require.resolve('next/dist/bin/next'), 'build', '--webpack']);
} catch (error) { console.error(error.message); process.exitCode = 1; }

