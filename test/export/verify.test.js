import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { verifyExports, GATE_TARGETS } from '../../src/export/verify.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'themes');
// astro/react/wordpress gates need the tool installs (npm or KK_VERIFY_NODE_MODULES) and, for WordPress, the Playground CLI
const TOOLS = !!process.env.KK_VERIFY_NODE_MODULES;

test('verify-exports: unknown gate target is bad input', async () => {
  assert.deepEqual(GATE_TARGETS, ['astro', 'react', 'wordpress', 'elementor', 'html']);
  await assert.rejects(verifyExports({ themeDir: join(EX, 'nordlicht-immobilien'), targets: ['shopify'] }), (e) => e.code === 'BAD_INPUT');
});

test('verify-exports: elementor gate (php -l, kit shape) passes on an example theme', async () => {
  const r = await verifyExports({ themeDir: join(EX, 'kanzlei-brandt-weller'), targets: ['elementor'] });
  assert.equal(r.ok, true, JSON.stringify(r.results));
  assert.deepEqual(r.results[0].gates.map((g) => g.gate), ['export', 'php -l (child theme)', 'kit shape']);
});

test('verify-exports: react gate fails on a tsc error and passes on the clean theme', { skip: !TOOLS && 'set KK_VERIFY_NODE_MODULES (folder with react/node_modules) to run' }, async () => {
  const ok = await verifyExports({ themeDir: join(EX, 'kanzlei-brandt-weller'), targets: ['react'] });
  assert.equal(ok.ok, true, JSON.stringify(ok.results));
  const bad = mkdtempSync(join(tmpdir(), 'kk-verify-bad-'));
  cpSync(join(EX, 'kanzlei-brandt-weller'), bad, { recursive: true });
  const f = join(bad, 'pages', 'index.html');
  writeFileSync(f, readFileSync(f, 'utf8').replace('</main>', '<input aria-label="x" maxlength="abc"></main>'));
  const r = await verifyExports({ themeDir: bad, targets: ['react'] });
  assert.equal(r.ok, false);
  assert.match(r.results[0].gates.find((g) => g.gate === 'tsc --noEmit').detail, /TS2322/);
});
