// Pure parts: target policy, breakpoints, workflow sync with the skill, catalogue generator, library search.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

process.env.KK_DATA_DIR ||= mkdtempSync(join(tmpdir(), 'kk-fid-data-'));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { classifyTarget, isLoopbackHost } = await import('../../src/fidelity/targets.js');
const { detectBreakpoints } = await import('../../src/fidelity/measure.js');
const { getWorkflow, CHECKLIST, BANS } = await import('../../src/fidelity/workflow.js');

test('targets: private ranges always refused, loopback and files only when allowed', async () => {
  for (const u of ['http://10.1.2.3/', 'http://169.254.169.254/latest/meta-data', 'http://192.168.0.10/', 'http://[fc00::1]/']) await assert.rejects(() => classifyTarget(u, { allowLoopback: true, allowFiles: true }), /blocked|non-public/, u);
  await assert.rejects(() => classifyTarget('http://localhost:8765/', {}), /loopback/);
  assert.equal((await classifyTarget('http://127.0.0.1:8765/x.html', { allowLoopback: true })).kind, 'loopback');
  await assert.rejects(() => classifyTarget('file:///etc/passwd', { allowFiles: true }), /only http/);
  await assert.rejects(() => classifyTarget('javascript:alert(1)', { allowFiles: true }), /only http/);
  await assert.rejects(() => classifyTarget(join(ROOT, 'test/fixtures/fidelity-ref.html'), {}), /only allowed from the CLI/);
  assert.equal((await classifyTarget(join(ROOT, 'test/fixtures/fidelity-ref.html'), { allowFiles: true })).kind, 'file');
  assert.ok(isLoopbackHost('127.0.0.5') && isLoopbackHost('app.localhost') && !isLoopbackHost('example.com'));
});

test('breakpoints: discrete changes between neighbouring widths', () => {
  const row = (w, nav, cols, h1) => ({ w, nav_links: nav, grid_cols: cols, h1_fs: h1, body_fs: 16, overflow_x: false });
  const b = detectBreakpoints([row(390, 1, [1], 36), row(600, 1, [1], 36), row(768, 4, [3], 64), row(1024, 4, [3], 64)]);
  assert.equal(b.length, 1); assert.deepEqual(b[0].between, [600, 768]);
  assert.ok(b[0].changes.some((c) => /nav links 1 -> 4/.test(c)) && b[0].changes.some((c) => /h1 36 -> 64/.test(c)));
});

test('workflow: three modes; checklist and bans are written in the skill reference', () => {
  for (const m of ['new', 'polish', 'redesign']) assert.ok(getWorkflow(m).steps.length >= 5, m);
  assert.throws(() => getWorkflow('fast'));
  const md = readFileSync(join(ROOT, 'skill/kiekkist-agency/references/fidelity.md'), 'utf8');
  for (const c of CHECKLIST) assert.ok(md.includes(c.q.split(':')[0]), 'checklist item missing in fidelity.md: ' + c.id);
  for (const b of BANS) assert.ok(md.toLowerCase().includes(b.split(/[ (.]/).slice(0, 2).join(' ').toLowerCase()), 'ban missing in fidelity.md: ' + b);
  const skill = readFileSync(join(ROOT, 'skill/kiekkist-agency/SKILL.md'), 'utf8');
  assert.match(skill, /Reference to spec/); assert.match(skill, /Bestehende Seite verbessern/);
});

function libraryFixture() {
  const d = mkdtempSync(join(tmpdir(), 'kk-lib-'));
  const shots = join(d, 'in-shots'); mkdirSync(shots);
  writeFileSync(join(shots, 'r-bakery-1440.jpg'), 'x'); writeFileSync(join(shots, 'r-bakery-390.jpg'), 'x'); writeFileSync(join(shots, 'r-bakery.mhtml'), '<html>third party</html>');
  writeFileSync(join(d, 'access.json'), JSON.stringify([{ id: 'r-bakery', url: 'https://gallery.example/bakery', access: 'captured', live: 'https://bakery.example/', title: 'Crumb & Co' }, { id: 'r-law', url: 'https://gallery.example/law', access: 'live-site-og', live: null, title: 'Kanzlei Nord' }]));
  writeFileSync(join(d, 'clusters.json'), JSON.stringify({ clusters: { C05: { name: 'Bakeries, cafés & food', members: ['r-bakery'] }, C09: { name: 'Law firms', members: ['r-law'] } } }));
  writeFileSync(join(d, 'facts.jsonl'), JSON.stringify({ id: 'r-bakery', url: 'https://bakery.example/', h1: 'Their own headline text', h1Size: 88, h1Font: 'Fraunces', bodySize: 18, fonts: ['Fraunces 400'], bg: ['#fff8ee'], text: ['#221'] }) + '\n');
  writeFileSync(join(d, 'meta.jsonl'), JSON.stringify({ id: 'r-bakery', meta: { tags: ['Typographic 1193', 'Warm'] } }) + '\n');
  mkdirSync(join(d, 'specs', 'r-bakery'), { recursive: true }); writeFileSync(join(d, 'specs', 'r-bakery', 'SPEC.md'), '# Spec\nhero 88 px');
  return d;
}

test('catalogue generator: entries, clusters, tags, thumbnails copied, no archives, no h1 text, specs', async () => {
  const d = libraryFixture();
  const { buildCatalogue, writeCatalogue } = await import('../../scripts/refs-catalogue.mjs');
  const o = { access: join(d, 'access.json'), clusters: join(d, 'clusters.json'), facts: join(d, 'facts.jsonl'), meta: join(d, 'meta.jsonl'), shots: [join(d, 'in-shots')], specs: join(d, 'specs'), out: join(d, 'lib', 'refs.json') };
  const stat = writeCatalogue(buildCatalogue(o), o);
  assert.equal(stat.count, 2); assert.equal(stat.with_desktop, 1); assert.equal(stat.specs, 1);
  const cat = JSON.parse(readFileSync(o.out, 'utf8'));
  const b = cat.refs.find((r) => r.id === 'r-bakery');
  assert.equal(b.cluster.id, 'C05'); assert.ok(b.industry.includes('bakeries')); assert.deepEqual(b.tags, ['typographic', 'warm']);
  assert.equal(b.facts.h1Size, 88); assert.equal(b.facts.h1, undefined, 'no third-party headline text');
  assert.ok(existsSync(join(d, 'lib', b.thumbnails.desktop)));
  assert.ok(!existsSync(join(d, 'lib', 'shots', 'r-bakery.mhtml')));
  assert.equal(b.spec, 'specs/r-bakery'); assert.equal(cat.private, true);
  return o.out;
});

test('library search and spec: gated by KK_REFS_FILE, industry/cluster filters, path guard', async () => {
  const L = await import('../../src/refs.js');
  delete process.env.KK_REFS_FILE;
  assert.equal(L.refsConfigured(), false);
  assert.throws(() => L.searchRefs({}), /not configured/);
  const d = libraryFixture();
  const { buildCatalogue, writeCatalogue } = await import('../../scripts/refs-catalogue.mjs');
  const o = { access: join(d, 'access.json'), clusters: join(d, 'clusters.json'), facts: join(d, 'facts.jsonl'), meta: join(d, 'meta.jsonl'), shots: [join(d, 'in-shots')], specs: join(d, 'specs'), out: join(d, 'lib', 'refs.json') };
  writeCatalogue(buildCatalogue(o), o);
  process.env.KK_REFS_FILE = o.out;
  assert.equal(L.searchRefs({ industry: 'bakeries' }).items[0].id, 'r-bakery');
  assert.equal(L.searchRefs({ query: 'law' }).items[0].id, 'r-law');
  assert.equal(L.searchRefs({ cluster: 'C09' }).total, 1);
  assert.equal(L.searchRefs({ has_spec: true }).total, 1);
  const s = L.getRefSpec('r-bakery');
  assert.match(s.spec.md, /hero 88 px/); assert.equal(s.facts.h1_size, 88);
  assert.equal(L.getRefSpec('r-law').spec, null);
  assert.throws(() => L.getRefSpec('../../etc'), /invalid/);
  assert.ok(L.thumbPath(L.getRefEntry('r-bakery')));
  assert.equal(L.thumbPath({ thumbnails: { desktop: '../../../etc/passwd' } }), null);
  delete process.env.KK_REFS_FILE;
});
