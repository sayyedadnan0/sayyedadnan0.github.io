import pg from 'pg';
import supabaseCa from '../../prisma/supabase-ca.cjs';

/** Read-only deployment preflight. Never include a credential or raw driver message in logs. */
export async function checkDatabaseConnection(connectionString) {
  const url = new URL(connectionString);
  const client = new pg.Client({
    host: url.hostname, port: Number(url.port || 5432),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: true, ...(url.hostname.endsWith('.pooler.supabase.com') || url.hostname.endsWith('.supabase.co') ? { ca: supabaseCa } : {}) }, connectionTimeoutMillis: 30000, query_timeout: 30000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('CMS database preflight: secure connection and authentication passed.');
  } catch (error) {
    const knownCodes = new Set(['28P01', '28000', 'XX000', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED']);
    const code = knownCodes.has(error.code) ? error.code : 'CONNECTION_FAILED';
    const reason = /tenant or user not found/i.test(error.message || '') ? 'POOLER_TENANT_NOT_FOUND' : code;
    throw new Error('CMS database preflight failed (' + reason + '). Verify the saved pooler connection settings and database password.');
  } finally {
    await client.end().catch(() => {});
  }
}
