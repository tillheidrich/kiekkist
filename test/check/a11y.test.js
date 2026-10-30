import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { checkTarget } from '../../src/check/index.js';
import { siteFindings, a11ySection, annotate } from '../../src/check/a11y.js';
import { getPack } from '../../src/knowledge.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const BAD = join(FIX, 'a11y-bad.html');

let browser, bad, badMs;
before(async () => {
  browser = await chromium.launch();
  const t = Date.now();
  bad = await checkTarget({ file: BAD, browser });
  badMs = Date.now() - t;
});
after(async () => { await browser.close(); });

const has = (r, rule, sev, vw) => r.hard.some((f) => f.rule === rule && (!sev || f.severity === sev) && (!vw || f.viewport === vw));
const one = (html, o = {}) => checkTarget({ html, viewports: [1280], browser, axe: false, noJs: false, ...o });
const page = (body, { lang = 'de', head = '' } = {}) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Testseite</title>${head}</head><body style="margin:0;font:1rem/1.6 system-ui;color:#1d2430;background:#fff">${body}</body></html>`;

test('bad a11y page fails every priority-1 check', () => {
  console.log(`a11y-bad ${bad.score} ${bad.grade} (${badMs} ms)`);
  const errors = ['reflow-320', 'text-spacing', 'target-size', 'focus-visible', 'focus-obscured', 'keyboard-trap', 'click-handler-not-focusable',
    'non-text-contrast', 'lang-mismatch', 'label-in-name', 'pause-control-missing', 'autoplay-audio', 'reduced-motion', 'auth-paste'];
  for (const rule of errors) assert.ok(has(bad, rule, 'error'), 'expected error ' + rule);
  const warns = ['icon-name', 'reduced-motion-ignored', 'statement-link', 'autocomplete-missing', 'captcha-detect', 'forced-colors', 'forced-color-adjust-scan'];
  for (const rule of warns) assert.ok(has(bad, rule, 'warn'), 'expected warning ' + rule);
  // 320 px is an extra viewport; keyboard walk runs at the narrowest and the widest width
  assert.ok(bad.hard.some((f) => f.rule === 'reflow-320' && f.viewport === 320));
  assert.ok(has(bad, 'focus-obscured', 'error', 390) && has(bad, 'focus-obscured', 'error', 1440));
  assert.ok(bad.hard.some((f) => f.rule === 'focus-obscured' && /div\.callbar/.test(f.detail)));
  assert.ok(bad.hard.some((f) => f.rule === 'keyboard-trap' && /#trap/.test(f.detail)));
  assert.ok(bad.hard.some((f) => f.rule === 'forced-colors' && /icon-btn/.test(f.selector)), 'mask icon disappears in forced colours');
  assert.ok(bad.hard.some((f) => f.rule === 'forced-colors' && /boxcheck/.test(f.selector)), 'box-shadow checkbox disappears in forced colours');
  assert.ok(bad.hard.some((f) => f.rule === 'text-spacing' && /span\.tag/.test(f.selector)));
});

test('axe runs at every viewport, keeps WCAG violations of any impact and opens the mobile menu', () => {
  const sel = bad.hard.filter((f) => f.rule.startsWith('axe-') && f.value === 'select-name');
  assert.ok(sel.some((f) => f.viewport === 390), 'mobile-only select found at 390');
  assert.ok(!sel.some((f) => f.viewport === 1440), 'hidden at 1440');
  assert.ok(bad.hard.some((f) => f.rule.startsWith('axe-') && /menu open/.test(f.detail)), 'axe on the opened mobile menu');
  assert.ok(bad.hard.some((f) => f.rule === 'axe-best-practice' && f.severity === 'warn'), 'best-practice as warning');
  for (const f of bad.hard.filter((x) => /^axe-(critical|serious|moderate|minor)$/.test(x.rule))) {
    assert.equal(f.severity, 'error');
    assert.match(f.wcag, /^\d\.\d\.\d+$/, 'axe finding carries its success criterion');
  }
  assert.deepEqual(bad.stats.axe.viewports.filter((v) => typeof v === 'number'), [390, 768, 1440]);
  assert.ok(bad.stats.axe.viewports.includes('390 menu open'));
});

test('report section a11y: SC and EN clause per finding, summary line, no conformance claim', () => {
  const a = bad.a11y;
  assert.ok(a && a.findings.length > 10);
  for (const f of a.findings) {
    assert.ok(f.wcag || f.pack_item, 'mapped: ' + f.rule);
    assert.ok(f.en301549, 'EN clause: ' + f.rule);
  }
  const ids = new Set(getPack('a11y-eu').items.map((i) => i.id));
  for (const f of a.findings) if (f.pack_item) assert.ok(ids.has(f.pack_item), 'pack item exists: ' + f.pack_item);
  assert.ok(a.findings.some((f) => f.rule === 'focus-obscured' && f.wcag === '2.4.11' && f.pack_item === 'wcag-2.4.11'));
  assert.match(a.summary, /^geprüft nach WCAG 2\.2 AA \/ EN 301 549 V4\.1\.1 \(automatisierbare Teile\), Stand \d{2}\.\d{2}\.\d{4}; manuelle Prüfpunkte: \d+$/);
  assert.ok(a.manual.length >= 20 && a.manual.length < 80);
  assert.ok(a.by_principle.operable > 0 && a.by_principle.perceivable > 0);
  assert.match(bad.summary, /manual protocol in references\/accessibility-eu\.md is still required/);
  for (const t of [bad.summary, bad.summary_de, a.summary, a.note]) assert.ok(!/(is|ist) (fully )?(conformant|konform|barrierefrei)\b/i.test(t), 'no conformance claim: ' + t);
  // every hard finding of an a11y rule carries wcag + pack_item
  for (const f of bad.hard.filter((x) => x.rule === 'contrast' || x.rule === 'reflow-320')) assert.ok(f.pack_item);
});

test('consent banner: not reachable by keyboard, no reject on the first layer', async () => {
  const r = await checkTarget({ file: join(FIX, 'a11y-banner.html'), viewports: [390, 1280], browser, noJs: false });
  assert.ok(has(r, 'consent-banner', 'error'), 'banner never reached by Tab');
  assert.ok(r.hard.some((f) => f.rule === 'consent-banner' && f.severity === 'warn' && /reject/.test(f.detail)));
  assert.ok(has(r, 'click-handler-not-focusable', 'error'));
});

test('accessibility information: scope hint, BFSG profile asks for MLBF, missing link is an error for shops', async () => {
  const shop = await checkTarget({ file: join(FIX, 'shop.html'), viewports: [1280], browser, noJs: false, profile: 'bfsg' });
  assert.equal(shop.a11y.scope_hint.kind, 'likely-b2c-commerce');
  assert.match(shop.a11y.scope_hint.note, /Possible BFSG scope/);
  assert.ok(shop.a11y.statement.found && shop.a11y.statement.checked);
  assert.deepEqual(shop.a11y.statement.missing.sort(), ['contact', 'date', 'mlbf']);
  const none = await checkTarget({ file: join(FIX, 'shop.html'), viewports: [1280], browser, noJs: false });
  assert.ok(!none.a11y.statement.missing.includes('mlbf'), 'MLBF only with profile bfsg');
  const noLink = await one(page('<main><h1>Honig</h1><p>Heidehonig, 500 g, 9,50 Euro.</p><button type="button">In den Warenkorb</button></main>'));
  assert.ok(has(noLink, 'statement-link', 'error'), 'shop without accessibility information: error');
  const plain = await one(page('<main><h1>Über uns</h1><p>Wir sind ein kleiner Betrieb.</p></main>'));
  assert.ok(has(plain, 'statement-link', 'warn'), 'presentation site: warning');
  const pub = await one(page('<main><h1>Gemeinde</h1><p>Rathaus geöffnet Montag bis Freitag.</p></main>'), { profile: 'public' });
  assert.ok(has(pub, 'public-sector-links', 'error') && has(pub, 'statement-link', 'error'));
  await assert.rejects(one(page('<p>x</p>'), { profile: 'eu' }), /profile/);
});

test('language of parts, hover content, orientation, text resize', async () => {
  const en = 'We build kitchens and stairs for houses in the region and we deliver them on time with our own team.';
  const parts = await one(page(`<main><h1>Treppenbau</h1><p>Wir bauen Treppen aus Eiche und Esche für Häuser im Landkreis, und das seit vielen Jahren mit einem festen Team.</p><p>${en}</p></main>`));
  assert.ok(has(parts, 'lang-parts', 'warn'));
  const marked = await one(page(`<main><h1>Treppenbau</h1><p>Wir bauen Treppen aus Eiche und Esche für Häuser im Landkreis, und das seit vielen Jahren mit einem festen Team.</p><p lang="en">${en}</p></main>`));
  assert.ok(!has(marked, 'lang-parts'));

  const css = 'nav ul{list-style:none;display:flex;gap:2rem;margin:0;padding:1rem} nav li{position:relative} nav li ul{display:none;position:absolute;top:110px;left:0;background:#fff;border:1px solid #333;padding:.5rem} nav li:hover>ul{display:block} a{display:inline-block;min-height:44px;padding:.6rem}';
  const hov = await one(page(`<header><nav aria-label="Haupt"><ul><li><a href="#l">Leistungen</a><ul><li><a href="#a">Dach</a></li><li><a href="#b">Fassade</a></li></ul></li><li><a href="#k">Kontakt</a></li></ul></nav></header><main><h1>Dachdecker</h1><p>Wir decken Dächer.</p></main>`, { head: `<style>${css}</style>` }));
  assert.ok(hov.hard.some((f) => f.rule === 'hover-content' && /hoverable/.test(f.detail)), 'gap between trigger and submenu');
  assert.ok(hov.hard.some((f) => f.rule === 'hover-content' && /Escape/.test(f.detail)), 'CSS-only hover menu ignores Escape');

  const rot = await checkTarget({ html: page('<main><h1>Termine</h1><p>Wir haben Montag bis Freitag geöffnet.</p></main><div class="rot">Bitte drehen Sie Ihr Gerät ins Hochformat.</div>', { head: '<style>.rot{display:none}@media (orientation: landscape) and (max-height: 500px){main{display:none}.rot{display:block;position:fixed;inset:0;background:#fff}}</style>' }), viewports: [390], browser, axe: false, noJs: false });
  assert.ok(has(rot, 'orientation', 'error'));

  const px = await one(page('<main style="font-size:16px"><h1 style="font-size:32px">Preise</h1>' + '<p style="font-size:16px">Ein Satz über unsere Preise und Leistungen.</p>'.repeat(6) + '</main>'));
  assert.ok(has(px, 'text-resize-200', 'warn'), 'px sizes ignore text-only zoom');
});

test('forms, dragging, overlays, redundant entry, required cues, PDFs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kk-a11y-'));
  try {
    copyFileSync(join(FIX, 'preisliste.pdf'), join(dir, 'preisliste.pdf'));
    writeFileSync(join(dir, 'index.html'), page(`<main><h1>Anmeldung</h1>
      <form novalidate><label>E-Mail <input type="email" name="email" autocomplete="email" required></label>
      <label>E-Mail wiederholen <input type="email" name="email2" autocomplete="email" required></label>
      <div class="otp"><input maxlength="1"><input maxlength="1"><input maxlength="1"><input maxlength="1"></div>
      <label>Passwort <input type="password" name="pw" autocomplete="off"></label><button>Weiter</button></form>
      <div class="swiper" style="width:300px;height:100px;overflow:hidden"><div style="width:900px;height:100px;background:#ddd"></div></div>
      <p><a href="preisliste.pdf">Preisliste (PDF)</a></p></main>
      <script src="https://cdn.userway.org/widget.js"></script>`));
    const r = await checkTarget({ file: join(dir, 'index.html'), viewports: [1280], browser, axe: false, noJs: false });
    assert.ok(has(r, 'redundant-entry', 'warn'));
    assert.ok(has(r, 'form-errors', 'warn'));
    assert.ok(r.hard.some((f) => f.rule === 'auth-paste' && f.severity === 'warn' && /one-time-code/.test(f.detail)));
    assert.ok(r.hard.some((f) => f.rule === 'auth-paste' && f.severity === 'warn' && /autocomplete="off"/.test(f.detail)));
    assert.ok(has(r, 'dragging', 'warn'));
    assert.ok(has(r, 'overlay-detect', 'warn'));
    const pdf = r.hard.find((f) => f.rule === 'pdf-link-scan');
    assert.ok(pdf && /not tagged/.test(pdf.detail) && /2026-09-01/.test(pdf.detail), pdf && pdf.detail);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('site mode: consistent navigation and help, identification, titles; single-page API unchanged', async () => {
  const S = (f) => join(FIX, 'site', f);
  const r = await checkTarget({ pages: [S('index.html'), S('leistungen.html'), S('kontakt.html')], viewports: [1280], browser, noJs: false });
  assert.equal(r.mode, 'site');
  assert.equal(r.pages.length, 3);
  const rules = (sev) => new Set(r.site.findings.filter((f) => f.severity === sev).map((f) => f.rule));
  assert.ok(rules('error').has('consistent-nav'));
  assert.ok(rules('error').has('consistent-help'));
  assert.ok(rules('warn').has('consistent-id'));
  assert.ok(rules('warn').has('title-unique'));
  assert.ok(rules('warn').has('multiple-ways'));
  assert.ok(r.score < Math.min(...r.pages.map((p) => p.score)));
  assert.match(r.a11y.summary, /manuelle Prüfpunkte/);
  assert.ok(r.a11y.findings.some((f) => f.rule === 'consistent-nav' && f.wcag === '3.2.3'));
  assert.ok(!('facts' in r.pages[0]), 'internal facts are not leaked');
  assert.equal(bad.mode, undefined, 'single page keeps its shape');
  await assert.rejects(checkTarget({ pages: ['https://a.example/', 'https://b.example/'], browser }), /one origin/);
});

test('site comparison and section builder work on plain data', () => {
  const f = (nav, help, title) => ({ nav: nav.map((h) => ({ href: h, text: h })), help, title, links: {}, search: true, sitemap: false, internalLinks: [], statement: { href: 'x' } });
  const same = siteFindings([{ target: 'a', facts: f(['/', '/b', '/c'], ['phone', 'email'], 'A') }, { target: 'b', facts: f(['/', '/b', '/c', '/d'], ['phone', 'email'], 'B') }]);
  assert.deepEqual(same, []);
  const diff = siteFindings([{ target: 'a', facts: f(['/', '/b'], ['phone', 'email'], 'A') }, { target: 'b', facts: f(['/b', '/'], ['email', 'phone'], 'A') }]);
  assert.deepEqual(diff.map((x) => x.rule).sort(), ['consistent-help', 'consistent-nav', 'title-unique']);
  const x = { rule: 'axe-moderate', severity: 'error', wcag: '1.3.1', detail: 'd' };
  assert.ok(annotate(x));
  assert.equal(x.pack_item, 'wcag-1.3.1');
  const s = a11ySection({ hard: [x], profile: 'none', at: new Date(Date.UTC(2026, 9, 30)) });
  assert.match(s.summary, /Stand 30\.10\.2026/);
  assert.equal(s.errors, 1);
  assert.ok(!s.manual.includes('law-bitv-statement'), 'public-sector items only with profile public');
});

test('a11y passes stay within the time budget', async () => {
  const CLEAN = join(FIX, 'clean.html');
  let t = Date.now();
  await checkTarget({ file: CLEAN, browser, a11y: false });
  const off = Date.now() - t;
  t = Date.now();
  const on = await checkTarget({ file: CLEAN, browser });
  const ms = Date.now() - t;
  console.log(`clean without a11y ${off} ms, with ${ms} ms (+${ms - off} ms)`);
  assert.ok(ms - off < 4500, 'extra time ' + (ms - off) + ' ms');
  assert.equal(on.a11y.errors, 0);
});
