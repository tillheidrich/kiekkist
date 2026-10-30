import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { compareTargets } from '../../src/check/compare.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

test('a page and its copy are too similar', async () => {
  const d = mkdtempSync(join(tmpdir(), 'kkcmp-'));
  copyFileSync(join(FIX, 'clean.html'), join(d, 'a.html'));
  const r = await compareTargets({ browser, targets: [{ name: 'orig', file: join(FIX, 'clean.html') }, { name: 'copy', file: join(d, 'a.html') }] });
  assert.equal(r.ok, false);
  assert.equal(r.pairs[0].verdict, 'too similar');
  assert.equal(r.pairs[0].blink.desktop, 0);
});

test('slop and clean fixtures are not too similar; ignore removes signals', async () => {
  const r = await compareTargets({ browser, ignore: ['background', 'h1'], targets: [{ name: 'slop', file: join(FIX, 'slop.html') }, { name: 'clean', file: join(FIX, 'clean.html') }] });
  assert.notEqual(r.pairs[0].verdict, 'too similar');
  assert.ok(!r.pairs[0].signals.some((s) => /background|H1 text/.test(s)));
  assert.deepEqual(r.ignored.sort(), ['background', 'h1']);
});

test('rejects fewer than two targets', async () => {
  await assert.rejects(() => compareTargets({ browser, targets: [{ file: join(FIX, 'clean.html') }] }));
});
