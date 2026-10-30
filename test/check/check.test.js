import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright';
import { checkTarget, similarity } from '../../src/check/index.js';
import { compareFingerprints } from '../../src/check/similarity.js';
import { paletteFromCss, paletteFromJson, loadPalette } from '../../src/check/tokens.js';
import { contrastRatio } from '../../src/check/color.js';
import { getPack } from '../../src/knowledge.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const SLOP = join(FIX, 'slop.html');
const CLEAN = join(FIX, 'clean.html');
const CLEAN_TOKENS = join(FIX, 'clean.tokens.json');

let browser, slop, clean, slopMs, cleanMs;
before(async () => {
  browser = await chromium.launch();
  let t = Date.now();
  slop = await checkTarget({ file: SLOP, browser, tokens: CLEAN_TOKENS });
  slopMs = Date.now() - t;
  t = Date.now();
  clean = await checkTarget({ file: CLEAN, browser, tokens: CLEAN_TOKENS });
  cleanMs = Date.now() - t;
});
after(async () => { await browser.close(); });

const rules = (r, sev) => new Set(r.hard.filter((f) => !sev || f.severity === sev).map((f) => f.rule));
const over = (r) => new Set(r.counts.filter((c) => c.over).map((c) => c.rule));

test('report follows the contract shape', () => {
  for (const r of [slop, clean]) {
    for (const k of ['score', 'grade', 'at', 'target', 'viewports', 'hard', 'counts', 'findings', 'summary', 'summary_de', 'rules_version', 'knowledge']) assert.ok(k in r, 'missing ' + k);
    assert.equal(r.knowledge.tells, getPack('tells').version);
    assert.equal(r.knowledge['reflex-fonts'], getPack('reflex-fonts').version);
    assert.ok(r.score >= 0 && r.score <= 100);
    assert.match(r.grade, /^[A-E]$/);
    assert.deepEqual(r.viewports, [390, 768, 1440]);
    for (const c of r.counts) for (const k of ['rule', 'label', 'count', 'threshold', 'over']) assert.ok(k in c);
    for (const f of r.hard) assert.ok(['error', 'warn', 'info'].includes(f.severity));
  }
});

test('slop scores clearly worse than clean, each page under 20 s', () => {
  console.log(`slop ${slop.score} ${slop.grade} (${slopMs} ms) | clean ${clean.score} ${clean.grade} (${cleanMs} ms)`);
  assert.ok(clean.score >= 90, 'clean should score >= 90, got ' + clean.score);
  assert.ok(slop.score <= 40, 'slop should score <= 40, got ' + slop.score);
  assert.ok(clean.score - slop.score >= 50);
  assert.ok(slopMs < 20000 && cleanMs < 20000);
});

test('slop: hard errors are found', () => {
  const r = rules(slop, 'error');
  for (const rule of ['page-overflow', 'text-overflow', 'contrast', 'img-alt', 'accessible-name', 'input-font-size']) assert.ok(r.has(rule), 'expected ' + rule);
  // checks added with the tells pack
  for (const rule of ['font-cdn', 'focus-visible', 'reduced-motion', 'placeholder', 'line-length', 'no-js-content', 'zoom-disabled']) assert.ok(r.has(rule), 'expected ' + rule);
  const w = rules(slop, 'warn');
  for (const rule of ['multiple-primary', 'cta-colours', 'third-party']) assert.ok(w.has(rule), 'expected warning ' + rule);
  assert.ok(slop.hard.some((f) => f.rule === 'font-cdn' && /fonts\.googleapis\.com/.test(f.detail)));
  assert.ok(slop.hard.some((f) => f.rule === 'placeholder' && /picsum\.photos/.test(f.detail)), 'placeholder image host');
  assert.ok(slop.hard.some((f) => f.rule === 'placeholder' && /Jane Doe|Acme/.test(f.detail)), 'generic placeholder names');
  assert.ok(slop.stats.noJs.ratio < 0.6, 'no-JS ratio ' + slop.stats.noJs.ratio);
  const compound = slop.hard.find((f) => f.rule === 'text-overflow' && /Donaudampfschifffahrtsgesellschaftskapitän/.test(f.detail));
  assert.ok(compound, 'German compound overflow reported');
  assert.ok(slop.hard.some((f) => f.rule === 'page-overflow' && f.viewport === 390));
  assert.ok(slop.hard.some((f) => f.rule === 'contrast-gradient'), 'text on the gradient hero is flagged as not reliably measurable');
});

test('slop: slop signals over threshold', () => {
  const o = over(slop);
  for (const rule of ['reflex-font', 'purple-gradient', 'gradient-text', 'big-shadow', 'eyebrow', 'numbered-sections', 'three-cards',
    'centred-hero', 'emoji-heading', 'dashes', 'highlight-word', 'scroll-reveal', 'mono-labels', 'arrow-buttons', 'logo-wall',
    'testimonial-carousel', 'stat-counters',
    // signals added with the tells pack
    'nested-cards', 'side-stripe', 'radial-glow', 'pulsing-dot', 'bounce-easing', 'transition-all', 'orphan-heading', 'heading-skip',
    'justified-text', 'js-errors', 'autoplay-no-controls', 'hero-video-no-poster', 'counter-zero-nojs', 'tracked-caps', 'sparkle-icon',
    'filler-en', 'filler-de', 'img-dimensions']) assert.ok(o.has(rule), 'expected over: ' + rule);
});

test('clean: no hard errors and no slop signal over threshold', () => {
  assert.equal(slop.hard.length > 0, true);
  assert.deepEqual([...rules(clean, 'error')], []);
  assert.deepEqual([...rules(clean, 'warn')], []);
  assert.deepEqual([...over(clean)], []);
  assert.equal(clean.grade, 'A');
  assert.ok(clean.stats.focus.tested >= 5 && clean.stats.focus.missing === 0, 'focus test ran on clean');
  assert.equal(clean.stats.noJs.ratio, 1);
});

test('clean: accessibility section passes, statement page found and complete', () => {
  assert.equal(clean.a11y.errors, 0);
  assert.equal(clean.a11y.warnings, 0);
  assert.deepEqual(clean.a11y.statement, { found: true, href: 'barrierefreiheit.html', checked: true, missing: [] });
  assert.equal(clean.a11y.scope_hint.kind, 'presentation');
  assert.ok(clean.stats.axe.ran && clean.stats.axe.viewports.length >= 3, 'axe at every viewport');
  assert.match(clean.summary_de, /geprüft nach WCAG 2\.2 AA \/ EN 301 549 V4\.1\.1 \(automatisierbare Teile\)/);
});

test('every rule the checker reports is in the tells pack', () => {
  const ids = new Set(getPack('tells').items.map((i) => i.id));
  for (const r of [slop, clean]) {
    for (const f of r.hard) assert.ok(ids.has(f.rule.startsWith('axe-') ? 'axe' : f.rule), 'not in pack: ' + f.rule);
    for (const c of r.counts) assert.ok(ids.has(c.rule), 'not in pack: ' + c.rule);
  }
});

test('token drift: own palette fits, foreign page drifts', () => {
  assert.ok(clean.drift.colorShare < 0.05, 'clean drift ' + clean.drift.colorShare);
  assert.deepEqual(clean.drift.fontsOutside, []);
  assert.ok(slop.drift.colorShare > 0.3, 'slop drift ' + slop.drift.colorShare);
  assert.ok(slop.drift.fontsOutside.includes('inter'));
});

test('summary in English and German', () => {
  assert.match(slop.summary, /grade E|grade D/);
  assert.match(slop.summary_de, /Note [DE]/);
  assert.match(clean.summary, /No hard errors/);
  assert.match(clean.summary_de, /Keine harten Fehler/);
});

test('similarity: slop vs itself is high, slop vs clean is low', async () => {
  const same = compareFingerprints(slop.fingerprint, slop.fingerprint);
  assert.equal(same.score, 1);
  const s = await similarity(slop, clean);
  assert.ok(s.score < 0.6, 'expected distinct, got ' + s.score);
  assert.equal(s.verySimilar, false);
  assert.ok(['sections', 'fonts', 'accent', 'radius', 'density'].every((k) => k in s.parts));
  // swapped colours, same build = still very similar
  const recoloured = { ...slop.fingerprint, accent: { ...slop.fingerprint.accent, h: 150 }, surface: [250, 250, 250] };
  const r = compareFingerprints(slop.fingerprint, recoloured);
  assert.ok(r.score > 0.6, 'same structure in other colours should stay "very similar": ' + r.score);
});

test('effective contrast includes the opacity chain; photo background is not measured', async () => {
  const html = `<!doctype html><html lang="de"><head><title>t</title></head><body style="background:#fff;margin:0">
    <div style="opacity:.4"><p style="color:#000;font-size:16px">Halbdurchsichtiger Text auf Weiß</p></div>
    <p style="color:#000;font-size:16px">Voller Kontrast</p>
    <div style="background:url('data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==') center/cover;padding:40px">
      <p style="color:#fff">Text auf einem Foto</p></div></body></html>`;
  const r = await checkTarget({ html, viewports: [1024], browser, axe: false });
  const c = r.hard.filter((f) => f.rule === 'contrast');
  assert.equal(c.length, 1);
  assert.match(c[0].detail, /effective opacity 0\.40/);
  assert.ok(r.hard.some((f) => f.rule === 'contrast-unmeasurable' && f.severity === 'warn'));
});

test('compound in a narrow column next to an image is caught (rendern.py blind spot)', async () => {
  const html = `<!doctype html><html lang="de"><head><title>t</title></head><body style="margin:0">
    <div style="display:grid;grid-template-columns:150px 1fr;gap:20px"><h2 style="margin:0">Grundstücksverkehrsgenehmigungszuständigkeit</h2><img alt="" width="200" height="100" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="></div></body></html>`;
  const r = await checkTarget({ html, viewports: [1024], browser, axe: false });
  const f = r.hard.find((x) => x.rule === 'text-overflow');
  assert.ok(f, 'text-overflow expected');
  assert.match(f.detail, /Grundstücksverkehrsgenehmigungszuständigkeit/);
});

test('no network beyond the target; only http(s) URLs', async () => {
  const html = '<!doctype html><html lang="de"><head><title>t</title><link rel="stylesheet" href="https://fonts.example.org/x.css"></head><body><img alt="" src="http://cdn.example.com/a.png"><p>Hallo</p></body></html>';
  const r = await checkTarget({ html, viewports: [800], browser, axe: false });
  assert.ok(r.stats.blocked.includes('cdn.example.com'));
  assert.ok(r.stats.blocked.includes('fonts.example.org'));
  await assert.rejects(checkTarget({ url: 'ftp://example.com/', browser }), /http\/https/);
  await assert.rejects(checkTarget({ url: 'file:///etc/passwd', browser }), /http\/https/);
});

test('token parsing: DTCG json (aliases, colour objects) and CSS custom properties', async () => {
  const pj = await loadPalette(CLEAN_TOKENS);
  assert.equal(pj.colors.length, 8);
  assert.deepEqual(pj.fonts.sort(), ['atkinson hyperlegible', 'georgia', 'literata', 'noto sans']);
  const pc = paletteFromCss(':root{--brand: oklch(0.5 0.1 30); --bg:#fafafa; --x: var(--brand); --gap: 12px; --font-body: "Source Serif 4", serif; --font-size-l: 2rem}');
  assert.equal(pc.colors.length, 3);
  assert.deepEqual(pc.fonts, ['source serif 4']);
  const pd = paletteFromJson({ brand: { primary: { $type: 'color', $value: '#ff0000' } } });
  assert.equal(pd.colors.length, 1);
});

test('WCAG contrast maths', () => {
  assert.equal(+contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(1), 21);
  assert.equal(+contrastRatio([119, 119, 119], [255, 255, 255]).toFixed(2), 4.48);
});

const one = async (html, o = {}) => checkTarget({ html, viewports: [1280], browser, axe: false, ...o });
const count = (r, rule) => r.counts.find((c) => c.rule === rule);

test('German spaced en dash is not counted, em dash is', async () => {
  const words = 'Wir bauen Treppen aus Eiche und Esche für Häuser im Landkreis Harburg ';
  const r = await one(`<!doctype html><html lang="de"><head><title>t</title></head><body><p>${words}– und das seit 1987 – mit fünf Leuten. ${words}– mehr nicht.</p><p>${words}— wirklich — so.</p></body></html>`);
  assert.equal(count(r, 'dashes').count, 2);
});

test('numbers and mono count only on non-sequences and non-data', async () => {
  const steps = [1, 2, 3].map((n) => `<div class="step"><span class="n" style="font:12px monospace">0${n}</span><b>Schritt ${n}</b><span style="font:12px monospace">${n * 120} €</span></div>`).join('');
  const r = await one(`<!doctype html><html lang="de"><head><title>t</title></head><body><main><section><h2>Ablauf</h2><div class="steps">${steps}</div></section></main></body></html>`);
  assert.equal(count(r, 'numbered-sections').count, 0, 'a compact list of steps is a sequence');
  assert.equal(count(r, 'mono-labels').count, 0, 'mono step numbers and prices are data');
});

test('brand fonts are exempt from the reflex signal', async () => {
  const html = '<!doctype html><html lang="de"><head><title>t</title></head><body style="font-family:Inter,sans-serif"><h1>Möbel nach Maß</h1><p>Wir planen und bauen Einbauschränke, Küchen und Treppen aus heimischem Holz.</p></body></html>';
  assert.equal(count(await one(html), 'reflex-font').count, 1);
  assert.equal(count(await one(html, { brandFonts: ['Inter'] }), 'reflex-font').count, 0);
});

test('reduced-motion and focus pass when handled', async () => {
  const css = `.m{animation:spin 2s linear infinite;width:40px;height:40px;background:#345} @keyframes spin{to{transform:rotate(1turn)}}
    @media (prefers-reduced-motion: reduce){.m{animation:none}} a:focus{outline:none} a:focus-visible{box-shadow:0 0 0 3px #134}`;
  const ok = await one(`<!doctype html><html lang="de"><head><title>t</title><style>${css}</style></head><body><div class="m"></div><p><a href="#a">Kontakt aufnehmen</a></p></body></html>`);
  assert.ok(!ok.hard.some((f) => f.rule === 'reduced-motion' || f.rule === 'focus-visible'), JSON.stringify(ok.hard));
  const bad = await one(`<!doctype html><html lang="de"><head><title>t</title><style>.m{animation:spin 2s linear infinite;width:40px;height:40px;background:#345} @keyframes spin{to{transform:rotate(1turn)}} a:focus{outline:none}</style></head><body><div class="m"></div><p><a href="#a">Kontakt aufnehmen</a></p></body></html>`);
  assert.ok(bad.hard.some((f) => f.rule === 'reduced-motion'));
  assert.ok(bad.hard.some((f) => f.rule === 'focus-visible'));
});

test('line length: 76 to 80 characters pass only with line height 1.45', async () => {
  const txt = 'Wir planen und bauen Einbauschränke, Küchen und Treppen aus heimischem Holz, seit 1987 und mit fünf Leuten in einer Werkstatt am Ortsrand von Tostedt. '.repeat(3);
  const page = (ch, lh) => `<!doctype html><html lang="de"><head><title>t</title></head><body style="font:16px/1 monospace"><p style="width:${ch}ch;line-height:${lh};margin:0">${txt}</p></body></html>`;
  assert.ok((await one(page(70, 1.3))).hard.every((f) => f.rule !== 'line-length'));
  assert.ok((await one(page(78, 1.3))).hard.some((f) => f.rule === 'line-length'));
  assert.ok((await one(page(78, 1.5))).hard.every((f) => f.rule !== 'line-length'));
  assert.ok((await one(page(95, 1.6))).hard.some((f) => f.rule === 'line-length'));
});
