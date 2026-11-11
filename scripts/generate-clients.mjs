import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const schema = await fs.readFile('prisma/schema.prisma', 'utf8');
const cloud = schema.replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../../src/generated/cloud"')
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('url      = env("DATABASE_URL")', 'url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")');
if (cloud === schema || !cloud.includes('provider = "postgresql"')) throw new Error('Could not generate the cloud schema.');
await fs.mkdir('prisma/postgres', { recursive: true });
await fs.writeFile('prisma/postgres/schema.prisma', cloud);
for (const file of ['prisma/schema.prisma', 'prisma/postgres/schema.prisma']) {
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'generate', '--schema', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
