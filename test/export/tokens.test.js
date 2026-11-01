import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { flatten, cssEntries, cssName, cssProps } from '../../src/export/tokens/flatten.js';
import { toCss, diffCss } from '../../src/export/tokens/css.js';
import { toThemeJson } from '../../src/export/tokens/theme-json.js';
import { toTailwindTheme } from '../../src/export/tokens/tailwind.js';
import { toElementorSettings, lengthAt } from '../../src/export/tokens/elementor.js';
import { shadcnRoles } from '../../src/export/tokens/shadcn.js';
import { parseColor, deltaE } from '../../src/check/color.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'themes');
const THEMES = ['nordlicht-immobilien', 'harms-praezisionstechnik', 'kanzlei-brandt-weller', 'beratung-studio-elbe'];
const load = (t) => ({ dtcg: JSON.parse(readFileSync(join(EX, t, 'tokens.json'), 'utf8')), css: readFileSync(join(EX, t, 'tokens.css'), 'utf8'), fonts: readFileSync(join(EX, t, 'assets/fonts/fonts.css'), 'utf8'), site: readFileSync(join(EX, t, 'assets/site.css'), 'utf8') });

test('toCss reproduces every value of the themes\' tokens.css (colours dE < 0.5)', () => {
  for (const t of THEMES) {
    const { dtcg, css } = load(t);
    const d = diffCss(dtcg, css);
    assert.deepEqual(d.mismatched, [], t);
    assert.deepEqual(d.missing.filter((n) => !n.startsWith('--ff-')), [], t);
    const gen = cssProps(toCss(dtcg));
    assert.equal(gen.size, cssEntries(dtcg).length, `${t}: every generated property once`);
  }
});

test('every token path appears in each output exactly once; aliases stay references', () => {
  for (const t of THEMES) {
    const { dtcg, css, fonts, site } = load(t);
    const flat = flatten(dtcg);
    const colors = flat.filter((x) => x.type === 'color');
    const tj = toThemeJson(dtcg, { fontsCss: fonts, tokensCss: css, siteCss: site }).json;
    assert.equal(tj.version, 3);
    assert.equal(tj.settings.color.palette.length, colors.length, t);
    assert.equal(new Set(tj.settings.color.palette.map((p) => p.slug)).size, colors.length, `${t}: palette slugs unique`);
    for (const k of ['custom', 'customGradient', 'defaultPalette', 'defaultGradients']) assert.equal(tj.settings.color[k], false, `${t}: lock ${k}`);
    assert.equal(tj.settings.typography.customFontSize, false);
    assert.ok(tj.settings.typography.fontFamilies.every((f) => (f.fontFace || []).every((ff) => ff.src.every((s) => s.startsWith('file:./assets/fonts/')))), `${t}: fonts from the theme only`);
    assert.ok(tj.settings.typography.fontFamilies.some((f) => f.fontFace?.length), `${t}: fontFace from fonts.css`);
    assert.match(JSON.stringify(tj.styles), /var:preset\|color\|/, `${t}: body colours reference presets`);
    const tw = toTailwindTheme(dtcg);
    assert.match(tw, /--color-\*: initial;\s*\n\s*--font-\*: initial;/);
    for (const c of colors) assert.equal(tw.split('\n').filter((l) => l.trim().startsWith(`--color-${c.path.split('.').slice(1).join('-')}:`)).length, 1, `${t} tailwind ${c.path}`);
    const typo = flat.filter((x) => x.type === 'typography');
    for (const ty of typo) assert.match(tj.settings.custom.fontFamily[ty.path.split('.').slice(1).join('-')], /^var\(--wp--preset--font-family--/, `${t}: alias kept as reference`);
  }
});

test('no colour outside tokens.json: theme.json, Elementor and shadcn use the token values', () => {
  for (const t of THEMES) {
    const { dtcg, css, fonts, site } = load(t);
    const colors = flatten(dtcg).filter((x) => x.type === 'color');
    const tj = toThemeJson(dtcg, { fontsCss: fonts, tokensCss: css, siteCss: site }).json;
    for (const p of tj.settings.color.palette) { const src = colors.find((c) => c.path.endsWith('.' + p.slug)); const [l, c, h] = src.value.components; assert.ok(deltaE(parseColor(p.color), parseColor(`oklch(${l} ${c} ${h})`)) < 0.01, `${t} ${p.slug}`); }
    const el = toElementorSettings(dtcg);
    assert.equal(el.lossy, true);
    const all = [...el.settings.system_colors, ...el.settings.custom_colors];
    assert.equal(all.length, colors.length);
    for (const c of all) assert.ok(colors.some((x) => x.value.hex.toLowerCase() === c.color), `${t} elementor ${c.color} is a token hex (dE 0)`);
    const sh = shadcnRoles(dtcg, site);
    const names = new Set(colors.map((c) => cssName(c.path)));
    for (const v of Object.values(sh.light)) assert.ok(names.has(/var\((--[\w-]+)\)/.exec(v)[1]), `${t} shadcn ${v}`);
  }
});

test('clamp() is flattened to breakpoint sizes for Elementor', () => {
  assert.equal(lengthAt('clamp(3.25rem, 2rem + 6vw, 8.5rem)', 390), 55.4);
  assert.equal(lengthAt('clamp(3.25rem, 2rem + 6vw, 8.5rem)', 3000), 136);
  assert.equal(lengthAt('1.5rem', 1440), 24);
});

test('elementor kit: global fonts from font-family tokens when tokens.json has no typography roles', async () => {
  const { toElementorSettings } = await import('../../src/export/tokens/elementor.js');
  const dtcg = { color: { ink: { $type: 'color', $value: '#111111' } }, font: { 'family-0': { $type: 'fontFamily', $value: ['Inter Variable', 'system-ui', 'sans-serif'] }, display: { $type: 'fontFamily', $value: ['Fraunces', 'Georgia', 'serif'] } }, size: { mono: { $type: 'dimension', $value: '"IBM Plex Mono", ui-monospace, monospace' } } };
  const s = toElementorSettings(dtcg).settings;
  assert.deepEqual(s.system_typography.map((t) => t._id), ['primary', 'secondary', 'text', 'accent']);
  assert.equal(s.system_typography[0].typography_font_family, 'Fraunces');
  assert.equal(s.system_typography[2].typography_font_family, 'Inter Variable');
  assert.ok(s.custom_typography.some((t) => t.typography_font_family === 'IBM Plex Mono'), 'mis-typed font stack is still found');
  const two = toElementorSettings({ font: { 'family-0': { $type: 'fontFamily', $value: ['Sora', 'sans-serif'] }, 'family-1': { $type: 'fontFamily', $value: ['JetBrains Mono', 'monospace'] } } }).settings;
  assert.equal(two.system_typography[2].typography_font_family, 'Sora', 'a mono family is never the body font');
});

test('elementor kit: system colours filled from unknown token names (darkest = primary, most chromatic = accent)', async () => {
  const { toElementorSettings } = await import('../../src/export/tokens/elementor.js');
  const s = toElementorSettings({ color: { linen: { $type: 'color', $value: '#f4efe6' }, walnut: { $type: 'color', $value: '#2a1d14' }, madder: { $type: 'color', $value: '#b0362a' } } }).settings;
  const by = Object.fromEntries(s.system_colors.map((c) => [c._id, c.color]));
  assert.equal(by.primary, '#2a1d14');
  assert.equal(by.accent, '#b0362a');
});
