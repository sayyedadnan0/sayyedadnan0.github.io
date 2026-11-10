import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseByteRange } from '../../src/lib/byte-range.ts';
import { resolveUploadPath, isWithinDirectory } from '../../src/server/upload-files.ts';

test('public upload paths cannot escape their storage directory', () => {
  const root = path.resolve('test-upload-root');
  assert.equal(resolveUploadPath(['projects', 'test-file.png'], root), path.join(root, 'projects', 'test-file.png'));
  for (const parts of [[], ['..', '.env'], ['.', 'file.png'], ['folder/../../secret'], ['folder\\..\\secret'], ['%2e%2e'], ['C:secret'], ['file\0.png'], ['']]) assert.equal(resolveUploadPath(parts, root), null);
  assert.equal(isWithinDirectory(root, root + '-other/file.png'), false);
  assert.equal(isWithinDirectory(root, root), false);
});

test('video ranges support seeking, suffixes, and bounded end positions', () => {
  assert.equal(parseByteRange(null, 100), null);
  assert.deepEqual(parseByteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseByteRange('bytes=50-', 100), { start: 50, end: 99 });
  assert.deepEqual(parseByteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange('bytes=-200', 100), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange('bytes=95-200', 100), { start: 95, end: 99 });
  for (const range of ['bytes=100-', 'bytes=20-10', 'bytes=-0', 'bytes=-', 'items=0-1', 'bytes=0-1,5-8', 'bytes=99999999999999999999-']) assert.equal(parseByteRange(range, 100), 'unsatisfiable');
  assert.equal(parseByteRange('bytes=0-', 0), 'unsatisfiable');
});
