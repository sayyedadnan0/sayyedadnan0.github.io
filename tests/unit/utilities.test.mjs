import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStringList, serializeJsonLd } from '../../src/lib/json.ts';
import { resolveSiteUrl, isPublicSite } from '../../src/lib/url.ts';
import { embeddedVideoUrl } from '../../src/lib/media.ts';
import { validateContact } from '../../src/features/contact/validation.ts';

test('CMS list fields reject malformed data and retain only strings', () => {
  for (const value of [undefined, null, '', 'broken', '{}', 'true']) assert.deepEqual(parseStringList(value), []);
  assert.deepEqual(parseStringList('["Maya",null,7,"After Effects"]'), ['Maya', 'After Effects']);
});

test('JSON-LD cannot close its script element and still round trips', () => {
  const value = { name: '</script><script>alert(1)</script>', unicode: 'Adnan — portfolio' };
  const encoded = serializeJsonLd(value);
  assert.equal(encoded.includes('<'), false);
  assert.deepEqual(JSON.parse(encoded), value);
});

test('canonical origin defaults locally and normalizes configured origins', () => {
  assert.equal(resolveSiteUrl().href, 'http://localhost:3000/');
  assert.equal(resolveSiteUrl('https://portfolio.example/path?test=1#part').href, 'https://portfolio.example/');
  for (const value of ['not a URL', 'file:///tmp/site', 'javascript:alert(1)', 'https://user:password@example.com']) assert.throws(() => resolveSiteUrl(value));
});

test('indexing requires explicit opt-in and never allows loopback', () => {
  for (const host of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://preview.localhost']) assert.equal(isPublicSite(new URL(host), 'true'), false);
  assert.equal(isPublicSite(new URL('https://portfolio.example')), false);
  assert.equal(isPublicSite(new URL('https://portfolio.example'), 'false'), false);
  assert.equal(isPublicSite(new URL('https://portfolio.example'), 'true'), true);
});

test('only original supported HTTPS film providers can be embedded', () => {
  assert.equal(embeddedVideoUrl('https://drive.google.com/file/d/test-film_12/view?usp=sharing'), 'https://drive.google.com/file/d/test-film_12/preview');
  const adobe = 'https://www-ccv.adobe.io/v1/player/ccv/film-12/embed?api_key=behance1';
  assert.equal(embeddedVideoUrl(adobe), adobe);
  for (const value of [null, '', '/movie.mp4', 'http://drive.google.com/file/d/id/view', 'https://drive.google.com.evil.example/file/d/id/view', 'javascript:alert(1)', 'https://example.com/video']) assert.equal(embeddedVideoUrl(value), null);
});

const enquiry = { name: ' Adnan ', email: ' me@example.com ', subject: ' Website ', message: ' A meaningful project enquiry. ' };

test('contact validation trims expected text fields', () => {
  const result = validateContact(enquiry);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { name: 'Adnan', email: 'me@example.com', subject: 'Website', message: 'A meaningful project enquiry.' });
});

test('contact validation rejects wrong types, malformed emails, and size limits', () => {
  for (const input of [null, [], {}, true, 42, { ...enquiry, name: 4 }, { ...enquiry, email: 'broken' }, { ...enquiry, message: 'short' }, { ...enquiry, message: 'x'.repeat(5001) }, { ...enquiry, subject: 'x'.repeat(201) }]) assert.equal(validateContact(input).ok, false);
  assert.equal(validateContact({ ...enquiry, message: 'x'.repeat(5000) }).ok, true);
});
