import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomBytes, createHash } from 'node:crypto';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'adnan-deploy-check-'));
const originalRoot = await fs.realpath(dataRoot);
const listener = net.createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('base64url');
const email = 'deployment-check@example.invalid';
const environment = {
  ...process.env, NODE_ENV: 'production', PORT: String(port), HOST: '127.0.0.1',
  PORTFOLIO_DATA_DIR: dataRoot, DATABASE_URL: `file:${path.join(dataRoot, 'portfolio.db').replaceAll('\\', '/')}`,
  UPLOAD_DIR: path.join(dataRoot, 'uploads'), ADMIN_EMAIL: email, ADMIN_PASSWORD: password,
  JWT_SECRET: randomBytes(32).toString('hex'), NEXT_PUBLIC_SITE_URL: origin, SITE_INDEXABLE: 'false',
};
let server;
let output = '';

async function start() {
  server = fork('scripts/deploy/start.mjs', [], { env: environment, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', bytes => { output = (output + bytes.toString()).slice(-64000); });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('Deployment startup exited before becoming healthy.');
    try { if ((await fetch(origin + '/api/health')).ok) return; } catch { /* Startup is still initializing storage. */ }
    await delay(500);
  }
  throw new Error('Deployment startup did not become healthy.');
}

async function stop() {
  if (!server || server.exitCode !== null) return;
  const exit = once(server, 'exit');
  server.send('shutdown');
  await Promise.race([exit, delay(10000, undefined, { ref: false }).then(() => { throw new Error('Test server did not stop cleanly.'); })]);
}

async function login() {
  const response = await fetch(origin + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') || '', /HttpOnly/i);
  assert.match(response.headers.get('set-cookie') || '', /Secure/i);
  return response.headers.get('set-cookie').split(';')[0];
}

try {
  await start();
  let cookie = await login();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.set('file', new Blob([png], { type: 'image/png' }), 'deployment-storage-check.png');
  form.set('folder', 'deployment-check');
  const upload = await fetch(origin + '/api/admin/media', { method: 'POST', headers: { Cookie: cookie }, body: form });
  assert.equal(upload.status, 201);
  const asset = await upload.json();
  assert.ok(asset.url.startsWith('/uploads/deployment-check/'));
  const publicFile = await fetch(origin + asset.url);
  assert.equal(publicFile.status, 200);
  assert.equal(publicFile.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await publicFile.arrayBuffer()), png);
  const head = await fetch(origin + asset.url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'image/png');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  // Next.js may omit Content-Length when forwarding a streamed route response.
  const headLength = head.headers.get('content-length');
  if (headLength !== null) assert.equal(Number(headLength), png.length);
  const partial = await fetch(origin + asset.url, { headers: { Range: 'bytes=0-7' } });
  assert.equal(partial.status, 206);
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()), png.subarray(0, 8));
  assert.equal((await fetch(origin + asset.url, { headers: { Range: 'bytes=999999-' } })).status, 416);
  assert.equal((await fetch(origin + asset.url, { headers: { 'If-None-Match': publicFile.headers.get('etag') } })).status, 304);
  assert.equal((await fetch(origin + '/uploads/%252e%252e/.env')).status, 404);
  assert.equal((await fetch(origin + '/api/admin/media', { method: 'POST', body: new FormData() })).status, 401);

  const draftResponse = await fetch(origin + '/api/admin/projects', {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Deployment verification draft', slug: 'deployment-verification-draft', published: false,
      heroImageUrl: asset.url, fullDescription: `<p><img src="${asset.url}" alt="Storage check"></p>`,
      gallery: [{ url: asset.url, type: 'image', alt: 'Storage check' }] }),
  });
  assert.equal(draftResponse.status, 201);
  const draft = await draftResponse.json();
  assert.equal((await fetch(origin + '/api/admin/media/' + asset.id, { method: 'DELETE', headers: { Cookie: cookie } })).status, 409);
  const replacement = new FormData();
  replacement.set('file', new Blob([png], { type: 'image/png' }), 'replacement-storage-check.png');
  replacement.set('folder', 'deployment-check');
  const replaced = await fetch(origin + '/api/admin/media/' + asset.id, { method: 'PUT', headers: { Cookie: cookie }, body: replacement });
  assert.equal(replaced.status, 200);
  const oldUrl = asset.url;
  Object.assign(asset, await replaced.json());
  assert.notEqual(asset.url, oldUrl);
  const updatedDraft = await (await fetch(origin + '/api/admin/projects/' + draft.id, { headers: { Cookie: cookie } })).json();
  assert.equal(updatedDraft.heroImageUrl, asset.url);
  assert.equal(updatedDraft.gallery[0].url, asset.url);
  assert.ok(updatedDraft.fullDescription.includes(asset.url));
  assert.equal((await fetch(origin + oldUrl)).status, 404);

  await stop();
  // A redeploy may change bootstrap inputs; existing CMS accounts must not be reset.
  environment.ADMIN_PASSWORD = randomBytes(24).toString('base64url');
  await start();
  cookie = await login();
  const restored = await fetch(origin + asset.url);
  assert.equal(restored.status, 200);
  assert.deepEqual(Buffer.from(await restored.arrayBuffer()), png);
  const projects = await (await fetch(origin + '/api/admin/projects', { headers: { Cookie: cookie } })).json();
  assert.equal(projects.filter(project => project.published).length, 19);
  const media = await (await fetch(origin + '/api/admin/media?limit=100', { headers: { Cookie: cookie } })).json();
  assert.ok(media.assets.some(item => item.id === asset.id && item.url === asset.url));
  const catalog = JSON.parse(await fs.readFile('prisma/data/media.json', 'utf8'));
  assert.equal(media.total, catalog.length + 1, 'Bootstrap must not duplicate existing media');
  console.log(JSON.stringify({ result: 'Passed', publishedProjects: 19, indexedPublicAssets: catalog.length, uploadedFileSurvivedRestart: true, existingPasswordPreserved: true, rangeRequests: 'Passed', pathTraversal: 'Rejected', secureCookie: 'Passed', linkedMediaReplacement: 'Passed', inUseDeletion: 'Rejected', uploadedFileHash: createHash('sha256').update(png).digest('hex') }, null, 2));
} catch (error) {
  console.error(output.replaceAll(password, '<redacted>'));
  throw error;
} finally {
  await stop();
  const resolved = await fs.realpath(dataRoot);
  const tempRoot = await fs.realpath(os.tmpdir());
  if (resolved !== originalRoot || !resolved.startsWith(tempRoot + path.sep) || !path.basename(resolved).startsWith('adnan-deploy-check-')) throw new Error('Refusing an unsafe test cleanup path.');
  await fs.rm(resolved, { recursive: true });
}
