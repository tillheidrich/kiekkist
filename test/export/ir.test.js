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
