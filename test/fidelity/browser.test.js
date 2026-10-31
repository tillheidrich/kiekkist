// kk spec, kk motion, kk fidelity against two local fixtures (one browser, sequential, small).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

process.env.KK_DATA_DIR ||= mkdtempSync(join(tmpdir(), 'kk-fid-data-'));
const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const REF = join(FIX, 'fidelity-ref.html'), BUILD = join(FIX, 'fidelity-build.html');
const { runSpec } = await import('../../src/fidelity/spec.js');
const { runMotion } = await import('../../src/fidelity/motion.js');
const { runFidelity } = await import('../../src/fidelity/fidelity.js');
const { analyseSite, targetSpec, renderImproveMd } = await import('../../src/fidelity/improve.js');
const { closeLocalBrowser } = await import('../../src/fidelity/targets.js');
const { closeBrowser } = await import('../../src/browser.js');
after(async () => { await closeLocalBrowser(); await closeBrowser(); });

const tmp = mkdtempSync(join(tmpdir(), 'kk-fid-'));
let spec;

test('kk spec: container, grid ratio, type scale, line breaks, sections, media, breakpoint', async () => {
  const r = await runSpec({ target: REF, out: join(tmp, 'spec'), viewports: [1440, 390] });
  spec = r.spec;
  for (const f of ['spec.json', 'SPEC.draft.md', 'shots/first-1440.jpg', 'shots/full-390.jpg']) assert.ok(existsSync(join(r.dir, f)), f);
  const D = spec.viewports[1440], M = spec.viewports[390];
  assert.equal(D.container.width, 1200);
  assert.equal(D.roles.h1.fs, 72); assert.equal(M.roles.h1.fs, 40);
  assert.equal(D.roles.h1.lines, 3);
  assert.equal(D.roles.h1.fs / D.roles.body.fs, 4);
  assert.ok(D.grids.some((g) => g.ratio === '1 : 2'), 'the 1/3 + 2/3 row');
  assert.ok(D.grids.some((g) => g.columns === 3));
  assert.equal(D.media[0].named, '16:9');
  const hero = D.sections.find((s) => s.el === 'section.hero');
  assert.equal(hero.pad_top, 128); assert.equal(hero.h, 534);
  assert.ok(D.sections.find((s) => s.tag === 'header').sticky);
  assert.ok(spec.breakpoints.some((b) => b.between[0] < 769 && b.between[1] > 768 && b.changes.some((c) => /grid columns/.test(c))));
  assert.ok(D.media_queries.some((q) => q.query === 'max 768'));
  const md = readFileSync(join(r.dir, 'SPEC.draft.md'), 'utf8');
  assert.match(md, /h1 \/ body = 4\.00/);
  assert.doesNotMatch(md, /quiet studio/, 'no page text in the spec');
  assert.doesNotMatch(JSON.stringify(spec), /quiet studio|<section/, 'no text or markup in spec.json');
});

test('kk motion: keyframes, running animation with easing, hover diff, reduced-motion rule', async () => {
  const { motion: m, dir } = await runMotion({ target: REF, out: join(tmp, 'motion'), hovers: 4 });
  assert.ok(m.probe.keyframes.some((k) => k.name === 'rise'));
  const a = m.probe.running.find((x) => x.name === 'rise');
  assert.ok(a); assert.equal(a.duration, 400); assert.match(a.easing, /cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
  assert.equal(m.probe.reduced_motion_blocks, 1);
  assert.equal(m.probe.scroll_timelines.length + m.probe.view_timelines.length, 0, 'shorthand defaults are not timelines');
  const h = m.hovers.find((x) => x.target === 'article.card');
  assert.ok(h && h.changes.some((c) => c.property === 'backgroundColor' && /27, 58, 42/.test(c.to)));
  assert.equal(h.count, 3);
  const md = readFileSync(join(dir, 'MOTION.draft.md'), 'utf8');
  assert.match(md, /OBSERVED \(getAnimations\)/); assert.match(md, /OBSERVED \(page\.hover\)/);
  assert.ok(existsSync(join(dir, 'strip-load.jpg')));
});

test('kk fidelity: spec folder as reference, deltas, montages, log, checklist', async () => {
  const out = join(tmp, 'fid');
  const { result } = await runFidelity({ ref: join(tmp, 'spec'), build: BUILD, out });
  const r = result.diff.per[1440];
  const hero = r.sections.find((x) => x.ref === 'section.hero');
  assert.equal(hero.dh, -102); assert.ok(hero.flag);
  const h1 = r.roles.find((x) => x.role === 'h1');
  assert.equal(h1.dfs, -12); assert.ok(h1.flag);
  assert.ok(r.positions.find((p) => p.what === 'first-screen media').flag);
  assert.ok(result.diff.flags > 0);
  for (const k of ['first-1440', 'full-1440', 'first-390', 'full-390']) assert.ok(existsSync(result.montages[k]), k);
  const md = readFileSync(join(out, 'FIDELITY.md'), 'utf8');
  assert.match(md, /Proportions:/); assert.match(md, /No standard component/);
  const { result: r2 } = await runFidelity({ ref: join(tmp, 'spec'), build: REF, out, widths: [1440] });
  assert.equal(r2.round, 2);
  assert.equal(r2.diff.per[1440].sections.filter((x) => x.flag).length, 0, 'the reference against its own spec has no section flags');
  assert.equal(readFileSync(join(out, 'FIDELITY-log.md'), 'utf8').split('\n').filter((l) => /^\| \d/.test(l)).length, 2);
});

test('kk improve analysis: keep / fix / redesign, target spec keeps brand fonts and colours', () => {
  const fakeCheck = { score: 70, grade: 'C', hard: [{ rule: 'contrast', severity: 'error', detail: '2.9:1 on .lead' }], counts: [{ rule: 'three-cards', label: 'Three equal cards', count: 2, threshold: 0, over: true }, { rule: 'orphan-heading', label: 'Orphan word in a heading', count: 1, threshold: 0, over: true }], mobile: { lab: { lcp_ms: 3400, cls: 0.02 } } };
  const a = analyseSite({ spec, check: fakeCheck });
  assert.ok(a.keep.some((x) => x.area === 'brand' && /Georgia/.test(x.text)));
  assert.ok(a.fix.some((x) => x.area === 'contrast'));
  assert.ok(a.fix.some((x) => x.area === 'performance' && /3\.4 s/.test(x.text)));
  assert.ok(a.redesign.some((x) => /Three equal cards/.test(x.text)));
  assert.ok(a.fix.some((x) => /Orphan/.test(x.text)), 'typographic tells are fixes, not redesign reasons');
  const t = targetSpec(spec);
  assert.deepEqual(t.fonts, ['Georgia']); assert.equal(t.type.body.desktop, 18);
  assert.ok(t.colors.bg.includes('#f6f2ea'));
  const md = renderImproveMd({ measured_at: new Date().toISOString(), target: 'x', depth: a.depth, ...a, target_spec: t, references: null, check: { score: 70, grade: 'C', errors: 1 }, motion: null });
  assert.match(md, /## Keep/); assert.match(md, /## Fix/); assert.match(md, /## Redesign candidates/); assert.match(md, /Never break SEO-relevant content or URLs/);
});
