// DTCG -> WordPress theme.json (schema version 3) plus a bridge stylesheet that maps the theme's own
// custom properties (--c-*, --fs-*, …) onto the WordPress presets, so site.css keeps working and the
// palette in the Site Editor stays the single source. Mapping table: skill references/stacks.md.
import { flatten, isTypography, roleOf, valueCss, colorCss, familyCss, dimensionCss, isAlias, aliasPath, cssName, cssProps, cssEntries } from './flatten.js';

const kebab = (s) => String(s).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const title = (s) => String(s).replace(/[-_.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const slugOf = (path, drop) => kebab(path.split('.').slice(drop).join('-'));
const camelToKebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/** Parse @font-face rules: [{ family, weight, style, display, files: [url] }] */
export function fontFaces(fontsCss) {
  const out = [];
  for (const m of String(fontsCss || '').matchAll(/@font-face\s*{([^}]*)}/g)) {
    const body = m[1];
    const get = (p) => (new RegExp(p + '\\s*:\\s*([^;]+)', 'i').exec(body) || [])[1]?.trim();
    const files = [...(get('src') || '').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((x) => x[1].replace(/^\.\//, ''));
    out.push({ family: (get('font-family') || '').replace(/^["']|["']$/g, ''), weight: get('font-weight') || '400', style: get('font-style') || 'normal', display: get('font-display') || 'swap', unicodeRange: get('unicode-range'), files });
  }
  return out;
}

/** Map a token alias to a theme.json preset reference (var:preset|color|ink) where one exists. */
function presetRef(path) {
  const p = path.split('.');
  if (p[0] === 'color') return `var:preset|color|${slugOf(path, 1)}`;
  if (p[0] === 'font') return `var:preset|font-family|${slugOf(path, p[1] === 'family' ? 2 : 1)}`;
  if ((p[0] === 'dimension' && /^(space|spacing)$/.test(p[1])) || /^(space|spacing)$/.test(p[0])) return `var:preset|spacing|${slugOf(path, p[0] === 'dimension' ? 2 : 1)}`;
  return null;
}

/**
 * @param {object} dtcg tokens.json
 * @param {object} o { fontsCss, fontDir = 'assets/fonts', tokensCss, siteCss, name }
 * @returns {{ json: object, bridgeCss: string, notes: string[] }}
 */
export function toThemeJson(dtcg, { fontsCss = '', fontDir = 'assets/fonts', tokensCss = '', siteCss = '' } = {}) {
  const flat = flatten(dtcg);
  const notes = [];
  const palette = [], families = [], sizes = [], spacing = [];
  const custom = { radius: {}, fontWeight: {}, lineHeight: {}, letterSpacing: {}, fontFamily: {} };
  const bridge = [];
  const faces = fontFaces(fontsCss);
  for (const t of flat) {
    const p = t.path.split('.');
    if (t.type === 'color') {
      const slug = slugOf(t.path, 1);
      const hex = t.value?.hex ? ' ' + t.value.hex : '';
      const color = isAlias(t.value) ? `var(--wp--preset--color--${slugOf(aliasPath(t.value), 1)})` : colorCss(t.value);
      palette.push({ slug, name: title(slug) + hex, color });
      bridge.push(`  ${cssName(t.path)}: var(--wp--preset--color--${slug});`);
    } else if (t.type === 'fontFamily') {
      const slug = slugOf(t.path, p[1] === 'family' ? 2 : 1);
      const stack = Array.isArray(t.value) ? t.value : String(t.value).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      const names = new Set(stack.map((s) => s.toLowerCase()));
      const fontFace = faces.filter((f) => names.has(f.family.toLowerCase())).map((f) => ({ fontFamily: f.family, fontStyle: f.style, fontWeight: f.weight, fontDisplay: f.display, ...(f.unicodeRange ? { unicodeRange: f.unicodeRange } : {}), src: f.files.map((u) => `file:./${fontDir}/${u.split('/').pop()}`) }));
      if (!fontFace.length) notes.push(`font family "${stack[0]}" has no @font-face in fonts.css: it will fall back to ${stack.slice(1).join(', ')}`);
      families.push({ slug, name: stack[0], fontFamily: familyCss(stack), ...(fontFace.length ? { fontFace } : {}) });
      bridge.push(`  ${cssName(t.path)}: var(--wp--preset--font-family--${slug});`);
    } else if (isTypography(t)) {
      const role = roleOf(t.path), v = t.value;
      if (v.fontSize !== undefined) { sizes.push({ slug: kebab(role), name: title(role), size: isAlias(v.fontSize) ? valueCss(v.fontSize) : typeof v.fontSize === 'object' ? dimensionCss(v.fontSize) : String(v.fontSize), fluid: false }); bridge.push(`  --fs-${role}: var(--wp--preset--font-size--${kebab(role)});`); }
      for (const [k, pre, key] of [['fontWeight', 'fw', 'fontWeight'], ['lineHeight', 'lh', 'lineHeight'], ['letterSpacing', 'ls', 'letterSpacing']]) {
        if (v[k] === undefined) continue;
        custom[key][role] = isAlias(v[k]) ? valueCss(v[k]) : typeof v[k] === 'object' ? dimensionCss(v[k]) : String(v[k]);
        bridge.push(`  --${pre}-${role}: var(--wp--custom--${camelToKebab(key)}--${role});`);
      }
      if (v.fontFamily !== undefined) {
        const ref = isAlias(v.fontFamily) ? `var(--wp--preset--font-family--${slugOf(aliasPath(v.fontFamily), 2)})` : familyCss(v.fontFamily);
        custom.fontFamily[role] = ref;
        bridge.push(`  --ff-${role}: var(--wp--custom--font-family--${role});`);
      }
    } else if ((p[0] === 'dimension' && /^(space|spacing)$/.test(p[1])) || /^(space|spacing)$/.test(p[0])) {
      const slug = slugOf(t.path, p[0] === 'dimension' ? 2 : 1);
      spacing.push({ slug, name: title(slug), size: valueCss(t.value, t.type || 'dimension') });
      bridge.push(`  ${cssName(t.path)}: var(--wp--preset--spacing--${slug});`);
    } else {
      // everything without a preset: settings.custom.<group>.<name>
      const group = p[0] === 'dimension' ? p[1] : p[0];
      const name = p.slice(p[0] === 'dimension' ? 2 : 1).join('-') || 'value';
      const g = custom[group] || (custom[group] = {});
      g[name] = isAlias(t.value) ? valueCss(t.value) : valueCss(t.value, t.type);
      bridge.push(`  ${cssName(t.path)}: var(--wp--custom--${camelToKebab(group)}--${name});`);
    }
  }
  // properties in tokens.css that tokens.json does not define (layout measures): carried in custom.extra
  const known = new Set(cssEntries(dtcg).map((e) => e.name));
  const extra = {};
  for (const [k, v] of cssProps(tokensCss)) if (!known.has(k)) { extra[k.slice(2)] = v; bridge.push(`  ${k}: var(--wp--custom--extra--${k.slice(2)});`); }
  if (Object.keys(extra).length) { custom.extra = extra; notes.push(`tokens.css defines ${Object.keys(extra).length} propert${Object.keys(extra).length === 1 ? 'y' : 'ies'} not in tokens.json (${Object.keys(extra).join(', ')}): exported under settings.custom.extra; add them to tokens.json`); }
  for (const k of Object.keys(custom)) if (!Object.keys(custom[k]).length) delete custom[k];

  // page colours and type from the body rule of site.css
  const body = /(?:^|\n)\s*body\s*{([^}]*)}/.exec(siteCss || '')?.[1] || '';
  const bodyVar = (prop) => (new RegExp('(?:^|[;\\s])' + prop + '\\s*:\\s*var\\((--[\\w-]+)\\)').exec(body) || [])[1];
  const toPreset = (v) => { if (!v) return undefined; const t = flat.find((x) => cssName(x.path) === v); return t ? presetRef(t.path) : undefined; };
  const styles = { color: {}, typography: {} };
  const bg = toPreset(bodyVar('background(?:-color)?')), fg = toPreset(bodyVar('color'));
  if (bg) styles.color.background = bg; if (fg) styles.color.text = fg;
  const ff = toPreset(bodyVar('font-family')); if (ff) styles.typography.fontFamily = ff;
  const fsVar = bodyVar('font-size'); if (fsVar && /^--fs-/.test(fsVar)) styles.typography.fontSize = `var:preset|font-size|${fsVar.slice(5)}`;
  if (!Object.keys(styles.color).length) delete styles.color;
  if (!Object.keys(styles.typography).length) delete styles.typography;

  const props = cssProps(tokensCss);
  const json = {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
      useRootPaddingAwareAlignments: false,
      color: { palette, custom: false, customGradient: false, customDuotone: false, defaultPalette: false, defaultGradients: false, defaultDuotone: false, gradients: [], duotone: [] },
      typography: { fontFamilies: families, fontSizes: sizes, customFontSize: false, defaultFontSizes: false, fluid: false, dropCap: false },
      spacing: { spacingSizes: spacing, defaultSpacingSizes: false, units: ['px', 'rem', 'em', '%', 'vw'] },
      shadow: { defaultPresets: false },
      layout: { ...(props.get('--measure') ? { contentSize: props.get('--measure') } : {}), ...(props.get('--max') ? { wideSize: props.get('--max') } : {}) },
      ...(Object.keys(custom).length ? { custom } : {}),
    },
    styles,
  };
  if (!Object.keys(json.settings.layout).length) delete json.settings.layout;
  const scheme = /color-scheme\s*:\s*([^;]+);/.exec(tokensCss || '')?.[1];
  // properties the theme switches inside @media/@supports (e.g. light/dark) must not be pinned by the bridge
  const switched = atRuleProps(tokensCss);
  const kept = bridge.filter((l) => !switched.has(/^\s*(--[\w-]+)/.exec(l)?.[1]));
  if (kept.length < bridge.length) notes.push(`${bridge.length - kept.length} propert${bridge.length - kept.length === 1 ? 'y is' : 'ies are'} switched by a media query in tokens.css (e.g. dark/light): left to tokens.css, not pinned to a preset`);
  bridge.length = 0; bridge.push(...kept);
  const bridgeCss = `/* Generated by kk export: maps the theme's custom properties onto WordPress presets (theme.json is the source). */\n:root {\n${scheme ? `  color-scheme: ${scheme.trim()};\n` : ''}${bridge.join('\n')}\n}\n`;
  return { json, bridgeCss, notes };
}

/** Custom properties declared inside @media / @supports blocks of a CSS text. */
export function atRuleProps(css) {
  const out = new Set(); const src = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of src.matchAll(/@(media|supports|container)[^{]*{/g)) {
    let depth = 1, i = m.index + m[0].length; const start = i;
    while (i < src.length && depth) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
    for (const p of src.slice(start, i).matchAll(/(--[\w-]+)\s*:/g)) out.add(p[1]);
  }
  return out;
}
