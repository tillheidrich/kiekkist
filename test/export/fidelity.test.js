// Regression: exports must keep what the theme's <head> does (font preload, stylesheet order incl. fonts.css,
// inline and external scripts), inline style attributes, the dark/light media query, the theme's own legal
// and 404 pages, and small inline footer links (spacing). Found on the Specimen and Counsel gallery themes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { exportTheme } from '../../src/export/index.js';
import { atRuleProps } from '../../src/export/tokens/theme-json.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'theme-dark');
const tmp = () => mkdtempSync(join(tmpdir(), 'kk-fid-'));
const read = (...p) => readFileSync(join(...p), 'utf8');

test('html: head, inline styles, dark mode, legal links and 404 survive; checker and compare agree with the theme', async () => {
  const out = tmp();
  const r = await exportTheme({ themeDir: FIX, target: 'html', out, force: true });
  assert.equal(r.code, 0, JSON.stringify(r.check?.regressions));
  assert.deepEqual(r.check.regressions, []);
  assert.equal(r.check.compare.verdict, 'too similar');
  const html = read(out, 'index.html');
  assert.match(html, /<link rel="preload" href="assets\/fonts\/public-sans-latin-wght-normal\.woff2" as="font"/);
  const order = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['assets/fonts/fonts.css', 'tokens.css', 'assets/site.css']);
  assert.match(html, /<script>document\.documentElement\.classList\.add\('js'\)<\/script>/);
  assert.match(html, /<script src="assets\/site\.js" defer><\/script>/);
  assert.match(html, /style="margin-top: var\(--space-1\)"/);
  assert.match(html, /<body id="top">/);
  assert.match(html, /<a href="legal\.html#imprint">Imprint<\/a> <a href="legal\.html#privacy">Privacy<\/a> <a href="legal\.html#accessibility">Accessibility<\/a>/, 'legal links and the spaces between them unchanged');
  assert.ok(!existsSync(join(out, 'impressum.html')) && !existsSync(join(out, 'datenschutz.html')), 'no stubs when the theme has a legal page');
  assert.match(read(out, '404.html'), /Not found/, "the theme's own 404 page is kept");
  assert.match(read(out, '404.html'), /href="\/assets\/site\.css"/, '404 uses absolute asset URLs');
  assert.match(read(out, 'tokens.css'), /@media \(prefers-color-scheme: light\)/);
  assert.match(read(out, '_headers'), /script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/, 'inline script allowed by hash, not by unsafe-inline');
});

test('astro: head slot, no hash CSP with inline styles, whitespace kept, dark mode and legal links intact', async () => {
  const out = tmp();
  const r = await exportTheme({ themeDir: FIX, target: 'astro', out, force: true });
  assert.equal(r.code, 0, JSON.stringify(r.check?.regressions));
  assert.equal(r.check.compare.verdict, 'too similar');
  const cfg = read(out, 'astro.config.mjs');
  assert.match(cfg, /compressHTML: false/);
  assert.doesNotMatch(cfg, /csp: true/);
  assert.ok(existsSync(join(out, 'public/_headers')));
  const idx = read(out, 'src/pages/index.astro');
  assert.match(idx, /slot="head"/);
  for (const s of ['rel=\\"preload\\"', '/assets/fonts/fonts.css', '/tokens.css', '/assets/site.css', '/assets/site.js', "classList.add('js')"]) assert.ok(idx.includes(s), s);
  assert.match(idx, /bodyId="top"/);
  assert.match(read(out, 'public/tokens.css'), /prefers-color-scheme: light/);
  assert.ok(existsSync(join(out, 'public/assets/fonts/public-sans-latin-wght-normal.woff2')));
  assert.ok(!existsSync(join(out, 'src/pages/impressum.astro')));
  assert.match(read(out, 'src/pages/404.astro'), /Not found/);
  assert.match(read(out, 'src/content/legal.json'), /\/legal\/#imprint/);
});

test('react and wordpress keep the stylesheet order, scripts and the switched dark/light properties', async () => {
  const re = tmp();
  await exportTheme({ themeDir: FIX, target: 'react', out: re, force: true, check: false });
  assert.equal(read(re, 'styles/index.css').match(/@import "[^"]+"/g).join(' '), '@import "./fonts/fonts.css" @import "./tokens.css" @import "./site.css"');
  const prev = read(re, 'scripts/render-preview.mjs');
  assert.ok(prev.includes('/styles/fonts/public-sans-latin-wght-normal.woff2') && prev.includes('/assets/site.js') && prev.includes('<body id=\\"top\\">'));
  assert.ok(existsSync(join(re, 'public/assets/site.js')));
  const wp = tmp();
  const w = await exportTheme({ themeDir: FIX, target: 'wordpress', out: wp, force: true, check: false });
  const fn = read(wp, 'theme-dark', 'functions.php');
  assert.match(fn, /assets\/css\/tokens\.css/);
  assert.match(fn, /wp_enqueue_script\( 'theme-dark-js-0', get_theme_file_uri\( 'assets\/site\.js' \)/);
  assert.ok(fn.indexOf('assets/css/tokens.css') < fn.indexOf('tokens-bridge.css') && fn.indexOf('tokens-bridge.css') < fn.indexOf('assets/css/site.css'));
  assert.doesNotMatch(read(wp, 'theme-dark', 'assets/css/tokens-bridge.css'), /--c-ground:|--c-ink:/, 'properties switched by the media query are not pinned');
  assert.match(read(wp, 'theme-dark', 'assets/css/tokens.css'), /prefers-color-scheme: light/);
  assert.ok(!w.notes.some((n) => /impressum/.test(n)));
  assert.deepEqual([...atRuleProps(read(FIX, 'tokens.css'))].sort(), ['--c-ground', '--c-ink']);
});
