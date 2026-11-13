/* eslint-disable @typescript-eslint/no-require-imports -- Shared with CommonJS database seed scripts. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const supabaseCa = require('./supabase-ca.cjs');
let caPath;
function certificatePath() {
  if (!caPath) {
    const target = path.join(os.tmpdir(), 'adnan-supabase-root-807025ad50d4ed21.crt');
    fs.writeFileSync(target, supabaseCa, { mode: 0o600 });
    caPath = target;
  }
  return caPath;
}
/** Resolve private database credentials and verify Supabase's dedicated CA.
 * @param {string | undefined} value
 * @param {string | undefined} password
 * @returns {string | undefined}
 */
function resolveDatabaseUrl(value, password) {
  if (!value || !/^postgres(?:ql)?:/.test(value)) return value;
  const template = value.includes('[YOUR-PASSWORD]');
  if (template && !password) throw new Error('Set DATABASE_PASSWORD privately before connecting the CMS database.');
  const resolved = template ? value.replaceAll('[YOUR-PASSWORD]', encodeURIComponent(password)) : value;
  const url = new URL(resolved);
  const supabase = url.hostname.endsWith('.pooler.supabase.com') || (url.hostname.startsWith('db.') && url.hostname.endsWith('.supabase.co'));
  if (!template && !supabase) return value;
  // The dedicated password field is authoritative for Supabase, including URLs saved before a password reset.
  if (supabase && password) url.password = encodeURIComponent(password);
  if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '30');
  if (supabase) {
    url.searchParams.set('sslmode', 'require');
    url.searchParams.set('sslaccept', 'strict');
    url.searchParams.set('sslcert', certificatePath());
  }
  return url.toString();
}
module.exports = { resolveDatabaseUrl };

