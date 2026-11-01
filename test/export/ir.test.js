import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadTheme } from '../../src/export/load.js';
import { buildIR, sectionData } from '../../src/export/ir.js';
import { validateTheme } from '../../src/export/validate.js';
import { renderHtml } from '../../src/export/template.js';
import { parse, serialize } from '../../src/export/html.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'themes');
const THEMES = ['nordlicht-immobilien', 'harms-praezisionstechnik', 'kanzlei-brandt-weller', 'beratung-studio-elbe'];
// attribute order may change when an item template gains an attribute other items have: compare sorted
const norm = (html) => serialize(parse(html)).replace(/<([a-z][\w-]*)((?:\s+[^\s>"'=]+(?:="[^"]*")?)*)\s*(\/?)>/gi, (m, t, a, sl) => `<${t}${(a.match(/\s+[^\s>"'=]+(?:="[^"]*")?/g) || []).map((x) => x.trim()).sort().map((x) => ' ' + x).join('')}${sl}>`);

test('parser round-trips every example page byte for byte', () => {
  for (const t of THEMES) for (const p of loadTheme(join(EX, t)).pages) assert.equal(serialize(p.tree), p.source, `${t}/${p.file}`);
});

test('all four example themes produce an IR without errors; sections are named', () => {
  for (const t of THEMES) {
    const theme = loadTheme(join(EX, t));
    const { ir, issues } = buildIR(theme);
    const v = validateTheme(theme, { irIssues: issues });
    assert.deepEqual(v.errors, [], t);
    assert.ok(ir.pages.length >= 2, t);
    for (const p of ir.pages) assert.ok(p.sections.length >= 3, `${t} ${p.slug}: ${p.sections}`);
    assert.ok(Object.values(ir.sections).some((s) => s.kind === 'header') && Object.values(ir.sections).some((s) => s.kind === 'footer'), t);
  }
});

test('Nordlicht yields collections for its listings', () => {
  const { ir } = buildIR(loadTheme(join(EX, 'nordlicht-immobilien')));
  assert.equal(ir.collections.objects.items.length, 3);
  assert.equal(ir.collections.places.items.length, 8);
  assert.equal(ir.collections.process.items.length, 5);
  assert.ok(ir.collections.objects.fields.some((f) => f.key === 'priceClass' && f.attr === 'class'), 'differing class becomes a field');
  assert.equal(ir.collections.objects.items[2].price, 'reserviert');
  assert.match(ir.pages[0].title, /Elbvororten/);
});

test('templates render back to the original section markup (no wording rewritten)', () => {
  for (const t of THEMES) {
    const { ir } = buildIR(loadTheme(join(EX, t)));
    for (const s of Object.values(ir.sections)) assert.equal(norm(renderHtml(s.node, sectionData(s), { collections: ir.collections })), norm(s.html), `${t}: ${s.name}`);
  }
});

test('validation refuses remote URLs and unnamed sections (exit 2 path)', () => {
  const d = mkdtempSync(join(tmpdir(), 'kk-val-'));
  cpSync(join(EX, 'kanzlei-brandt-weller'), d, { recursive: true });
  const p = join(d, 'pages', 'index.html');
  writeFileSync(p, readFileSync(p, 'utf8').replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">\n</head>').replace('<main id="inhalt">', '<main id="inhalt">\n<section class="x"><h2>Ohne Namen</h2></section>'));
  const theme = loadTheme(d);
  const { issues } = buildIR(theme);
  const v = validateTheme(theme, { irIssues: issues });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /fonts\.googleapis\.com/.test(e)));
  assert.ok(v.errors.some((e) => /without a name/.test(e)));
});

test('token drift between tokens.css and tokens.json is an error', () => {
  const d = mkdtempSync(join(tmpdir(), 'kk-val-'));
  cpSync(join(EX, 'nordlicht-immobilien'), d, { recursive: true });
  const p = join(d, 'tokens.css');
  writeFileSync(p, readFileSync(p, 'utf8').replace('--c-ink: oklch(23% 0.025 255)', '--c-ink: oklch(40% 0.2 30)'));
  const v = validateTheme(loadTheme(d));
  assert.ok(v.errors.some((e) => /--c-ink/.test(e)));
});

test('astro template: bound attributes with literal-union DOM types are cast, so astro check passes on string|null fields', async () => {
  const { renderAstro } = await import('../../src/export/template.js');
  const { parse, elements } = await import('../../src/export/html.js');
  const input = elements(parse('<input id="e" type="email" autocomplete="email">'))[0];
  input.kkAttrs = { type: 'inputType', id: 'inputId', autocomplete: 'inputAutocomplete' };
  const out = renderAstro(input, { scope: 'item' });
  assert.match(out, /type=\{item\.inputType as any\}/);
  assert.match(out, /autocomplete=\{item\.inputAutocomplete as any\}/);
  assert.match(out, /id=\{item\.inputId\}/, 'plain string attributes stay uncast');
  const a = elements(parse('<a href="/" aria-current="page">x</a>'))[0];
  a.kkAttrs = { 'aria-current': 'current' };
  assert.match(renderAstro(a, { scope: 'p' }), /aria-current=\{p\.current as any\}/, 'aria-* are literal unions too');
});

test('jsx renderer: output passes tsc --noEmit (SVG tag case, numeric attributes, React names, duplicate attributes, custom properties)', async () => {
  const { renderJsx } = await import('../../src/export/template.js');
  const { parse, elements } = await import('../../src/export/html.js');
  const r = (h) => renderJsx(elements(parse(h))[0]);
  const svg = r('<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0"/></linearGradient><clipPath id="c"><rect width="1" height="1"/></clipPath></defs></svg>');
  assert.match(svg, /<linearGradient id="g">/); assert.match(svg, /<\/linearGradient>/); assert.match(svg, /<clipPath id="c">/);
  assert.match(svg, /viewBox="0 0 10 10"/);
  assert.match(r('<main id="m" tabindex="-1"><p>x</p></main>'), /tabIndex=\{-1\}/);
  assert.match(r('<textarea rows="5"></textarea>'), /rows=\{5\}/);
  assert.match(r('<video muted playsinline autoplay></video>'), /playsInline/);
  assert.match(r('<video muted playsinline autoplay></video>'), /autoPlay/);
  const dup = r('<ol class="a" aria-label="x" class="b"><li>1</li></ol>');
  assert.equal((dup.match(/className=/g) || []).length, 1); assert.match(dup, /className="a"/);
  assert.match(r('<p style="color: red; --melt: 2">x</p>'), /\} as React\.CSSProperties\}/);
  assert.doesNotMatch(r('<p style="color: red">x</p>'), /CSSProperties/);
});
