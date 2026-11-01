import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, existsSync, readFileSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { exportTheme, listTargets } from '../../src/export/index.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'themes');
const tmp = () => mkdtempSync(join(tmpdir(), 'kk-exp-'));

test('html export of Nordlicht: checker finds no new hard failures, no third-party request, compare says near-identical', async () => {
  const out = tmp();
  const r = await exportTheme({ themeDir: join(EX, 'nordlicht-immobilien'), target: 'html', out, force: true });
  assert.equal(r.code, 0, JSON.stringify(r.check?.regressions));
  assert.equal(r.check.ok, true);
  assert.equal(r.check.compare.verdict, 'too similar');
  assert.ok(r.check.compare.blink.desktop <= 2);
  assert.deepEqual(r.check.blocked, []);
  for (const f of ['index.html', 'verkaufen.html', 'impressum.html', 'datenschutz.html', '404.html', 'sitemap.xml', 'robots.txt', '.htaccess', '_headers', 'favicon.svg', 'EXPORT.md']) assert.ok(existsSync(join(out, f)), f);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /https?:\/\/(?!www\.w3\.org)[^"]*\.(css|js|woff2?)/, 'no remote assets');
  assert.match(html, /href="impressum\.html">Impressum</, 'footer links point to the legal pages');
  assert.match(readFileSync(join(out, 'EXPORT.md'), 'utf8'), /too similar/);
});

test('astro export: components, typed props, content collections, CMS config, preview check', async () => {
  const out = tmp();
  const r = await exportTheme({ themeDir: join(EX, 'nordlicht-immobilien'), target: 'astro', out, force: true, cms: 'sveltia', siteUrl: 'https://nordlicht.example' });
  assert.equal(r.code, 0);
  assert.equal(r.check.compare.verdict, 'too similar');
  const cfg = readFileSync(join(out, 'src/content.config.ts'), 'utf8');
  for (const c of ['objects', 'places', 'process']) assert.match(cfg, new RegExp(`"${c}": defineCollection`));
  const places = readFileSync(join(out, 'src/components/Lagen.astro'), 'utf8');
  assert.match(places, /placesItems\.map\(\(item\) =>/);
  assert.match(places, /interface Props/);
  assert.equal(JSON.parse(readFileSync(join(out, 'src/content/places.json'), 'utf8')).length, 8);
  assert.doesNotMatch(readFileSync(join(out, 'astro.config.mjs'), 'utf8'), /csp: true/, 'Nordlicht uses inline style attributes: a hash CSP would block them');
  assert.match(readFileSync(join(out, 'public/_headers'), 'utf8'), /style-src 'self' 'unsafe-inline'/);
  assert.match(readFileSync(join(out, 'public/robots.txt'), 'utf8'), /Sitemap: https:\/\/nordlicht\.example\/sitemap-index\.xml/);
  assert.ok(existsSync(join(out, 'public/admin/config.yml')));
  assert.match(readFileSync(join(out, 'src/pages/impressum.astro'), 'utf8'), /ImpressumLegal/, 'the theme\'s own legal page is exported');
  const legalText = readdirSync(out, { recursive: true }).filter((f) => /^src[\\/](components|content)[\\/].*(Impressum|impressum)/.test(f)).map((f) => readFileSync(join(out, f), 'utf8')).join('\n');
  assert.match(legalText, /\[eintragen: /, 'with its fill-in fields');
  assert.equal(JSON.parse(readFileSync(join(out, 'package.json'), 'utf8')).engines.node, '>=22.12');
});

test('html export of a theme without legal pages writes legal stubs with TODO(owner) markers', async () => {
  const src = tmp();
  cpSync(join(EX, 'kanzlei-brandt-weller'), src, { recursive: true });
  for (const f of ['impressum', 'datenschutz', 'barrierefreiheit']) rmSync(join(src, 'pages', f + '.html'));
  const out = tmp();
  const r = await exportTheme({ themeDir: src, target: 'html', out, force: true, check: false });
  assert.equal(r.code, 0);
  assert.match(readFileSync(join(out, 'impressum.html'), 'utf8'), /TODO\(owner\)/);
  assert.match(readFileSync(join(out, 'datenschutz.html'), 'utf8'), /TODO\(owner\)/);
});

test('react, wordpress and elementor exports write their packages', async () => {
  const theme = join(EX, 'kanzlei-brandt-weller');
  const re = tmp();
  assert.equal((await exportTheme({ themeDir: theme, target: 'react', out: re, force: true, check: false })).code, 0);
  const reg = JSON.parse(readFileSync(join(re, 'registry.json'), 'utf8'));
  assert.equal(reg.items[0].type, 'registry:theme');
  assert.ok(reg.items[0].cssVars.light.background.startsWith('oklch('));
  const theme_css = readFileSync(join(re, 'styles/theme.css'), 'utf8');
  assert.match(theme_css, /--background: var\(--c-/);
  assert.match(theme_css, /@theme inline/);
  assert.match(theme_css, /--destructive: var\(--c-/, 'shadcn v4 components need --destructive');
  assert.match(theme_css, /--color-destructive: var\(--destructive\)/);
  assert.match(theme_css, /--radius-xl: var\(--radius\)/);
  const tsx = readdirSync(join(re, 'components')).filter((f) => f.endsWith('.tsx'));
  assert.ok(tsx.length >= 8);
  assert.match(readFileSync(join(re, 'components/Dauer.tsx'), 'utf8'), /function kkStyle/, 'style props become objects at runtime');
  const wp = tmp();
  const w = await exportTheme({ themeDir: join(EX, 'nordlicht-immobilien'), target: 'wordpress', out: wp, force: true, check: false });
  assert.equal(w.code, 0);
  const slug = 'nordlicht-immobilien';
  const tj = JSON.parse(readFileSync(join(wp, slug, 'theme.json'), 'utf8'));
  assert.equal(tj.version, 3);
  assert.ok(existsSync(join(wp, `${slug}.zip`)) && existsSync(join(wp, 'blueprint.json')));
  const share = +/\((\d+) %\)/.exec(w.notes.find((n) => n.startsWith('block conversion')))[1];
  assert.ok(share <= 15, `core/html share ${share} %`);
  const pat = readFileSync(join(wp, slug, 'patterns/lagen.php'), 'utf8');
  assert.match(pat, /Slug: nordlicht-immobilien\/lagen/);
  assert.match(pat, /"templateLock":"contentOnly"/);
  assert.match(readFileSync(join(wp, slug, 'functions.php'), 'utf8'), /print_emoji_detection_script/);
  // Theme Check REQUIRED items: style.css License + License URI, screenshot.png 1200x900; copyright notice in readme.txt
  const css = readFileSync(join(wp, slug, 'style.css'), 'utf8');
  assert.match(css, /^License: .+$/m);
  assert.match(css, /^License URI: \S+$/m);
  assert.match(readFileSync(join(wp, slug, 'readme.txt'), 'utf8'), /== Copyright ==\n\n.+Copyright \d{4}/);
  const png = readFileSync(join(wp, slug, 'screenshot.png'));
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 900]);
  const el = tmp();
  const e = await exportTheme({ themeDir: theme, target: 'elementor', out: el, force: true, check: false });
  assert.equal(e.code, 0);
  assert.match(readFileSync(join(el, 'kanzlei-brandt-weller-child/style.css'), 'utf8'), /Template: hello-elementor/);
  assert.match(readFileSync(join(el, 'kanzlei-brandt-weller-child/style.css'), 'utf8'), /^License URI: https:\/\/www\.gnu\.org\/licenses\/gpl-2\.0\.html$/m);
  assert.match(readFileSync(join(el, 'kanzlei-brandt-weller-child/functions.php'), 'utf8'), /print_google_fonts', '__return_false'/);
  const kit = JSON.parse(readFileSync(join(el, 'elementor-kit/site-settings.json'), 'utf8'));
  assert.ok(kit.settings.system_colors.every((c) => /^#[0-9a-f]{6}$/.test(c.color)));
  assert.doesNotMatch(readFileSync(join(el, 'kanzlei-brandt-weller-child/functions.php'), 'utf8'), /kiekkist|kk export/i, 'no tool branding for end clients');
});

test('wordpress licence helpers: License URI and GPL compatibility', async () => {
  const { licenseUri, gplCompatible } = await import('../../src/export/targets/wordpress.js');
  assert.equal(licenseUri('GPL-2.0-or-later'), 'https://www.gnu.org/licenses/gpl-2.0.html');
  assert.equal(licenseUri('MIT (code), CC BY 4.0 (copy)'), 'https://opensource.org/license/mit');
  assert.equal(licenseUri('MIT (code), CC BY 4.0 (copy)', {}, true), 'LICENSE.md', 'compound licence points to the bundled file');
  assert.equal(licenseUri('Kiekkist design licence (paid)', {}, true), 'LICENSE.md');
  assert.equal(licenseUri('Kiekkist design licence (paid)', { licenseUri: 'https://example.com/l' }, true), 'https://example.com/l');
  assert.equal(gplCompatible('GPL-2.0-or-later'), true);
  assert.equal(gplCompatible('MIT (code)'), true);
  assert.equal(gplCompatible('Kiekkist design licence (paid); fonts OFL-1.1'), false);
  assert.equal(gplCompatible('CC-BY-4.0 (code, copy, drawings)'), false);
});

test('css moved to assets/css keeps its relative font and image URLs working', async () => {
  const { relocateCssUrls } = await import('../../src/export/targets/common.js');
  assert.equal(relocateCssUrls('src:url(fonts/a.woff2) format("woff2")'), 'src:url(../fonts/a.woff2) format("woff2")');
  assert.equal(relocateCssUrls('src: url("./fonts/b.woff2")'), 'src: url("../fonts/b.woff2")');
  assert.equal(relocateCssUrls("background:url('img/x.webp')"), "background:url('../img/x.webp')");
  for (const keep of ['url(data:image/svg+xml;utf8,<svg/>)', 'url(/assets/a.png)', 'url(https://x.example/a.png)', 'url(#grad)']) assert.equal(relocateCssUrls(keep), keep);
});

test('planned targets answer with their TODO plan; unknown targets are bad input', async () => {
  const ids = listTargets().map((t) => t.id);
  for (const t of ['html', 'astro', 'react', 'wordpress', 'elementor', 'shopify', 'figma', 'webflow', 'framer', 'typo3', 'shopware', 'next']) assert.ok(ids.includes(t), t);
  await assert.rejects(exportTheme({ themeDir: join(EX, 'nordlicht-immobilien'), target: 'shopify', out: tmp() }), /TODO\(shopify\)/);
  await assert.rejects(exportTheme({ themeDir: join(EX, 'nordlicht-immobilien'), target: 'nope', out: tmp() }), (e) => e.code === 'BAD_INPUT');
});
