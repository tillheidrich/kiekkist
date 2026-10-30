// Read a design-token palette from DTCG tokens.json or a CSS file with custom properties.
import { readFile } from 'node:fs/promises';
import { parseColor, toRgb } from './color.js';

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
  'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial']);

export const firstFamily = (stack) => String(stack || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
export const isGenericFamily = (f) => GENERIC.has(String(f).toLowerCase());

function familiesOf(v) {
  const list = Array.isArray(v) ? v : String(v).split(',');
  return list.map((f) => String(f).trim().replace(/^["']|["']$/g, '').toLowerCase()).filter((f) => f && !GENERIC.has(f));
}

function dtcgColor(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (v.hex) return parseColor(v.hex);
    if (v.colorSpace && Array.isArray(v.components)) {
      const [a, b, c] = v.components.map((x) => (x === 'none' ? 0 : Number(x)));
      const alpha = v.alpha ?? 1;
      const map = {
        srgb: { mode: 'rgb', r: a, g: b, b: c }, 'srgb-linear': { mode: 'lrgb', r: a, g: b, b: c },
        oklch: { mode: 'oklch', l: a, c: b, h: c }, oklab: { mode: 'oklab', l: a, a: b, b: c },
        hsl: { mode: 'hsl', h: a, s: b / 100, l: c / 100 }, 'display-p3': { mode: 'p3', r: a, g: b, b: c },
        lab: { mode: 'lab', l: a, a: b, b: c }, lch: { mode: 'lch', l: a, c: b, h: c },
      };
      const col = map[v.colorSpace];
      return col ? { ...col, alpha } : null;
    }
    return null;
  }
  return typeof v === 'string' ? parseColor(v) : null;
}

/** DTCG / plain JSON -> { colors: [{name, color}], fonts: [name] } */
export function paletteFromJson(json) {
  const colors = [], fonts = new Set();
  const flat = new Map();
  (function index(node, path) {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node || 'value' in node) { flat.set(path.join('.'), node); return; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) index(v, [...path, k]);
  })(json, []);
  const resolve = (v, depth = 0) => {
    if (typeof v === 'string' && /^\{[^}]+\}$/.test(v) && depth < 10) {
      const t = flat.get(v.slice(1, -1));
      return t ? resolve(t.$value ?? t.value, depth + 1) : v;
    }
    return v;
  };
  (function walk(node, path, inherited) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const type = node.$type || node.type || inherited;
    if ('$value' in node || 'value' in node) {
      const name = path.join('.');
      const raw = resolve(node.$value ?? node.value);
      const lname = name.toLowerCase();
      if (type === 'color' || (!type && /colou?r|farbe|palette/.test(lname))) {
        const c = dtcgColor(raw); if (c) colors.push({ name, color: c });
      } else if (type === 'fontFamily' || (!type && /font|family|schrift/.test(lname) && !/size|weight|height|spacing/.test(lname))) {
        familiesOf(raw).forEach((f) => fonts.add(f));
      } else if (type === 'typography' && raw && typeof raw === 'object' && raw.fontFamily) {
        familiesOf(resolve(raw.fontFamily)).forEach((f) => fonts.add(f));
      } else if (!type && typeof raw === 'string' && /^(#|oklch\(|rgb|hsl|lab\(|lch\(|color\()/i.test(raw.trim())) {
        const c = parseColor(raw); if (c) colors.push({ name, color: c });
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k], type);
  })(json, [], undefined);
  return { colors, fonts: [...fonts] };
}

/** CSS custom properties -> palette */
export function paletteFromCss(css) {
  const props = new Map();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) if (!props.has(m[1])) props.set(m[1], m[2].trim());
  const resolve = (v, depth = 0) => (depth > 10 ? v : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) => (props.has(n) ? resolve(props.get(n), depth + 1) : (fb || ''))));
  const colors = [], fonts = new Set();
  for (const [name, raw] of props) {
    const v = resolve(raw);
    const lname = name.toLowerCase();
    if (/font|family|typeface|schrift|ff-/.test(lname) && !/size|weight|height|spacing|leading|tracking|feature|variation|optical/.test(lname)) {
      if (/[a-z]/i.test(v) && !/^\d/.test(v)) familiesOf(v).forEach((f) => fonts.add(f));
      continue;
    }
    if (/^(#|oklch\(|oklab\(|rgba?\(|hsla?\(|lab\(|lch\(|color\(|[a-z]+$)/i.test(v)) {
      const c = parseColor(v);
      if (c && !/^(inherit|initial|unset|none|auto|normal|currentcolor)$/i.test(v)) colors.push({ name, color: c });
    }
  }
  return { colors, fonts: [...fonts] };
}

/** tokens: path (.json/.css), CSS string, DTCG object, or {colors, fonts} */
export async function loadPalette(tokens) {
  if (!tokens) return null;
  let pal;
  if (typeof tokens === 'string') {
    if (/[{:;]/.test(tokens) && tokens.includes('--')) pal = paletteFromCss(tokens);
    else {
      const text = await readFile(tokens, 'utf8');
      if (/\.json$/i.test(tokens) || /^\s*\{/.test(text) && !text.includes(':root')) pal = paletteFromJson(JSON.parse(text));
      else pal = paletteFromCss(text);
    }
  } else if (Array.isArray(tokens.colors) && !('$value' in tokens)) {
    pal = { colors: tokens.colors.map((c, i) => (typeof c === 'string' ? { name: 'c' + i, color: parseColor(c) } : c)).filter((c) => c.color), fonts: (tokens.fonts || []).map((f) => String(f).toLowerCase()) };
  } else pal = paletteFromJson(tokens);
  pal.colors = pal.colors.map((c) => ({ ...c, rgb: toRgb(c.color) }));
  return pal;
}
