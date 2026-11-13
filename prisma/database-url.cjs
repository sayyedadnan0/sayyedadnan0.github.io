/** Insert a private password only into an explicit connection-string placeholder.
 * @param {string | undefined} value
 * @param {string | undefined} password
 * @returns {string | undefined}
 */
function resolveDatabaseUrl(value, password) {
  if (!value?.includes('[YOUR-PASSWORD]')) return value;
  if (!password) throw new Error('Set DATABASE_PASSWORD privately before connecting the CMS database.');
  return value.replaceAll('[YOUR-PASSWORD]', encodeURIComponent(password));
}
module.exports = { resolveDatabaseUrl };
