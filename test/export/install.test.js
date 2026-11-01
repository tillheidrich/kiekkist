// What a buyer needs next to each export: INSTALL.md, honest Astro defaults, a correct React CSS order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { exportTheme } from '../../src/export/index.js';
import { tailwindImports } from '../../src/export/targets/react.js';
import { mapUrlsInHtml } from '../../src/export/template.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'themes');
const theme = join(EX, 'nordlicht-immobilien');
const tmp = () => mkdtempSync(join(tmpdir(), 'kk-inst-'));

test('every shipped target writes INSTALL.md (DE + EN) with both guide links', async () => {
  for (const target of ['wordpress', 'astro', 'html', 'react', 'elementor']) {
    const out = tmp();
    const r = await exportTheme({ themeDir: theme, target, out, force: true, check: false, screenshot: false });
    assert.equal(r.code, 0, target);
    const md = readFileSync(join(out, 'INSTALL.md'), 'utf8');
    assert.match(md, /## Deutsch/); assert.match(md, /## English/);
    assert.ok(md.includes(`https://kiekkist.de/de/anleitung/${target}/`), target);
    assert.ok(md.includes(`https://kiekkist.de/install/${target}/`), target);
  }
});

test('astro without --site-url: no example.invalid, TODO comment, README, AGENTS.md names public/tokens.css', async () => {
  const out = tmp();
  await exportTheme({ themeDir: theme, target: 'astro', out, force: true, check: false });
  const cfg = readFileSync(join(out, 'astro.config.mjs'), 'utf8');
  assert.doesNotMatch(cfg, /example\.invalid/);
  assert.match(cfg, /TODO\(owner\): set the real domain/);
  assert.doesNotMatch(cfg, /^\s*site:/m, 'site stays unset (commented) until the owner sets it');
  assert.ok(existsSync(join(out, 'README.md')));
  assert.match(readFileSync(join(out, 'AGENTS.md'), 'utf8'), /public\/tokens\.css/);
  assert.match(readFileSync(join(out, 'src/layouts/Base.astro'), 'utf8'), /\{Astro\.site && <link rel="sitemap"/);
  const out2 = tmp();
  await exportTheme({ themeDir: theme, target: 'astro', out: out2, force: true, check: false, siteUrl: 'https://www.nordlicht.example' });
  assert.match(readFileSync(join(out2, 'astro.config.mjs'), 'utf8'), /^\s*site: "https:\/\/www\.nordlicht\.example",$/m);
});

test('image preloads (imagesrcset) get the same URL mapping as srcset', () => {
  const map = (u) => u.replace(/^\.\.\//, '/');
  assert.equal(mapUrlsInHtml('<link rel="preload" as="image" imagesrcset="../assets/a-960.avif 960w, ../assets/a-1440.avif 1440w">', (v, n) => (n === 'srcset' ? v.split(', ').map((x) => map(x)).join(', ') : map(v))), '<link rel="preload" as="image" imagesrcset="/assets/a-960.avif 960w, /assets/a-1440.avif 1440w">');
});

test('react: Tailwind import order follows the theme sheets (fonts included), theme.css after tokens.css, no preflight', () => {
  const l = tailwindImports(['styles/tokens.css', 'styles/fonts/fonts.css', 'styles/site.css']);
  assert.deepEqual(l.slice(3), ['@import "./styles/tokens.css";', '@import "./styles/theme.css";', '@import "./styles/fonts/fonts.css";', '@import "./styles/site.css";']);
  assert.ok(!l.some((x) => /@import "tailwindcss";/.test(x)), 'preflight is not imported');
  assert.match(l[1], /tailwindcss\/theme\.css" layer\(theme\)/);
});
