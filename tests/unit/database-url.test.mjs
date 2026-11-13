import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseUrl } from '../../prisma/database-url.cjs';

test('database password symbols remain inside the password part of a connection URL', () => {
  const password = 'a@b:/?#%$ +quoted';
  const result = resolveDatabaseUrl('postgresql://postgres:[YOUR-PASSWORD]@db.example:5432/postgres?sslmode=require', password);
  const parsed = new URL(result);
  assert.equal(parsed.hostname, 'db.example');
  assert.equal(decodeURIComponent(parsed.password), password);
  assert.equal(parsed.search, '?sslmode=require');
});
test('existing configured URLs and local SQLite keep their values', () => {
  for (const value of [undefined, 'file:./local.db', 'postgresql://user:already%40encoded@db.example/postgres']) {
    assert.equal(resolveDatabaseUrl(value, 'different'), value);
  }
});
test('missing private password fails without disclosing the connection string', () => {
  assert.throws(() => resolveDatabaseUrl('postgresql://private-user:[YOUR-PASSWORD]@private-host/postgres', ''), /^Error: Set DATABASE_PASSWORD privately before connecting the CMS database\.$/);
});
