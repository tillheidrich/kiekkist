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
