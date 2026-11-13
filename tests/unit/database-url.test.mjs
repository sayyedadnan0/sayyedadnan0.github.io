import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseUrl } from '../../prisma/database-url.cjs';

test('database password symbols remain inside the password part of a connection URL', () => {
  const password = 'a@b:/?#%$ +quoted';
  const result = resolveDatabaseUrl('postgresql://postgres:[YOUR-PASSWORD]@db.example:5432/postgres?sslmode=require', password);
  const parsed = new URL(result);
  assert.equal(parsed.hostname, 'db.example');
  assert.equal(decodeURIComponent(parsed.password), password);
  assert.equal(parsed.searchParams.get('sslmode'), 'require');
  assert.equal(parsed.searchParams.get('connect_timeout'), '30');
});
test('existing configured URLs and local SQLite keep their values', () => {
  for (const value of [undefined, 'file:./local.db', 'postgresql://user:already%40encoded@db.example/postgres']) {
    assert.equal(resolveDatabaseUrl(value, 'different'), value);
  }
});
test('missing private password fails without disclosing the connection string', () => {
  assert.throws(() => resolveDatabaseUrl('postgresql://private-user:[YOUR-PASSWORD]@private-host/postgres', ''), /^Error: Set DATABASE_PASSWORD privately before connecting the CMS database\.$/);
});

test('Supabase connections verify their CA without disabling certificate checks', async () => {
  const fs = await import('node:fs');
  const { X509Certificate } = await import('node:crypto');
  const url = new URL(resolveDatabaseUrl('postgresql://user:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres', 'private'));
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.searchParams.get('sslaccept'), 'strict');
  const certificate = new X509Certificate(fs.readFileSync(url.searchParams.get('sslcert')));
  assert.equal(certificate.ca, true);
  assert.equal(certificate.fingerprint256, '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
});
