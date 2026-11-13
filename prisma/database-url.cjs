/** Insert a private password only into an explicit connection-string placeholder.
 * @param {string | undefined} value
 * @param {string | undefined} password
 * @returns {string | undefined}
 */
function resolveDatabaseUrl(value, password) {
  if (!value?.includes('[YOUR-PASSWORD]')) return value;
  if (!password) throw new Error('Set DATABASE_PASSWORD privately before connecting the CMS database.');
  const url = new URL(value.replaceAll('[YOUR-PASSWORD]', encodeURIComponent(password)));
  if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '30');
  return url.toString();
}
module.exports = { resolveDatabaseUrl };
