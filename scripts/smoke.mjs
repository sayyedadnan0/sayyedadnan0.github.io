import assert from 'node:assert/strict';

const origin = process.env.PORTFOLIO_TEST_URL || 'http://127.0.0.1:3000';
const checked = [];
for (const path of ['/', '/about', '/work', '/contact', '/admin/login']) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /<h1\b/, `${path} has an accessible page heading`);
  checked.push(path);
}
const sitemap = await fetch(new URL('/sitemap.xml', origin));
assert.equal(sitemap.status, 200);
const xml = await sitemap.text();
assert.doesNotMatch(xml, /<loc>[^<]*\/admin/);
const projectUrls = [...xml.matchAll(/<loc>([^<]+\/work\/[^<]+)<\/loc>/g)].map(match => match[1]);
for (const url of projectUrls) {
  // The sitemap may name a public origin while this check targets a local server.
  const path = new URL(url).pathname;
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.match(html, /rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  checked.push(path);
}
assert.equal((await fetch(new URL('/api/admin/messages', origin))).status, 401);
assert.equal((await fetch(new URL('/work/nonexistent-smoke-check-project', origin))).status, 404);
assert.equal((await fetch(new URL('/robots.txt', origin))).status, 200);
assert.equal((await fetch(new URL('/opengraph-image', origin))).status, 200);
console.log(JSON.stringify({ publicPagesChecked: checked.length, publishedProjectsInSitemap: projectUrls.length, result: 'Passed' }, null, 2));
