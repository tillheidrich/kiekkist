// DTCG (2025.10) tokens -> a flat list with CSS names and values. Pure functions.
// Naming follows the themes' tokens.css: color.x -> --c-x, font.family.x -> --font-x,
// typography.<role> -> --fs/--fw/--lh/--ls-<role> (+ --ff-<role> as alias), dimension.space.n -> --space-n,
// dimension.radius.n -> --radius-n, shadow.* -> --shadow-*, motion.duration/easing -> --dur-/--ease-*.

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', '-apple-system', 'blinkmacsystemfont']);
const UNQUOTED = new Set(['georgia', 'arial', 'helvetica', 'verdana', 'tahoma', 'times', 'palatino', 'garamond', 'menlo', 'consolas', 'monaco', 'courier']);

export const TYPO_PARTS = { fontSize: 'fs', fontWeight: 'fw', lineHeight: 'lh', letterSpacing: 'ls' };
export const isAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v.trim());
export const aliasPath = (v) => v.trim().slice(1, -1);

/** Walk DTCG; returns [{ path, type, value, description, extensions }] for every token (leaf with $value). */
export function flatten(dtcg) {
  const out = [];
  (function walk(node, path, inherited) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const type = node.$type || inherited;
    if ('$value' in node) { out.push({ path: path.join('.'), type, value: node.$value, description: node.$description, extensions: node.$extensions }); return; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k], type);
  })(dtcg || {}, [], undefined);
  return out;
}

export function cssName(path) {
  const p = path.split('.');
  const rest = (n) => p.slice(n).join('-');
  if (p[0] === 'color' || p[0] === 'colors') return '--c-' + rest(1);
  if (p[0] === 'font' && (p[1] === 'family' || p[1] === 'families')) return '--font-' + rest(2);
  if (p[0] === 'font' || p[0] === 'fonts') return '--font-' + rest(1);
  if (p[0] === 'dimension' && /^(space|spacing)$/.test(p[1])) return '--space-' + rest(2);
  if (p[0] === 'dimension' && /^(radius|rounded)$/.test(p[1])) return '--radius-' + rest(2);
  if (p[0] === 'dimension') return '--' + rest(1);
  if (/^(space|spacing)$/.test(p[0])) return '--space-' + rest(1);
  if (/^(radius|rounded)$/.test(p[0])) return '--radius-' + rest(1);
  if (p[0] === 'shadow') return '--shadow-' + rest(1);
  if (p[0] === 'motion' && p[1] === 'duration') return '--dur-' + rest(2);
  if (p[0] === 'motion' && p[1] === 'easing') return '--ease-' + rest(2);
  return '--' + p.join('-');
}
export const isTypography = (t) => t.type === 'typography' || /^(typography|type)\./.test(t.path) && t.value && typeof t.value === 'object' && !Array.isArray(t.value) && ('fontSize' in t.value || 'fontFamily' in t.value);
export const roleOf = (path) => path.split('.').slice(1).join('-');

const num = (n) => String(Number(Number(n).toFixed(6)));
export function colorCss(v) {
  if (typeof v === 'string') return v;
  if (v && v.colorSpace && Array.isArray(v.components)) {
    const [a, b, c] = v.components.map((x) => (x === 'none' ? 'none' : x));
    const alpha = v.alpha !== undefined && v.alpha < 1 ? ` / ${num(v.alpha)}` : '';
    if (v.colorSpace === 'oklch') return `oklch(${a === 'none' ? 'none' : num(a * 100) + '%'} ${num(b)} ${c === 'none' ? 'none' : num(c)}${alpha})`;
    if (v.colorSpace === 'oklab') return `oklab(${num(a * 100)}% ${num(b)} ${num(c)}${alpha})`;
    if (v.colorSpace === 'hsl') return `hsl(${num(a)} ${num(b)}% ${num(c)}%${alpha})`;
    if (v.colorSpace === 'lab' || v.colorSpace === 'lch') return `${v.colorSpace}(${num(a)}% ${num(b)} ${num(c)}${alpha})`;
    return `color(${v.colorSpace} ${num(a)} ${num(b)} ${num(c)}${alpha})`;
  }
  if (v && v.hex) return v.hex;
  return String(v);
}
export function familyCss(v) {
  const list = Array.isArray(v) ? v : String(v).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  return list.map((f) => (GENERIC.has(f.toLowerCase()) || UNQUOTED.has(f.toLowerCase()) ? f : `'${f}'`)).join(', ');
}
export function dimensionCss(v) {
  if (v && typeof v === 'object' && 'value' in v) return Number(v.value) === 0 ? '0' : `${num(v.value)}${v.unit || ''}`;
  return String(v);
}
function durationCss(v) { return v && typeof v === 'object' && 'value' in v ? `${num(v.value)}${v.unit || 'ms'}` : String(v); }
function shadowCss(v) {
  const one = (s) => [dimensionCss(s.offsetX ?? 0), dimensionCss(s.offsetY ?? 0), dimensionCss(s.blur ?? 0), dimensionCss(s.spread ?? 0), valueCss(s.color, 'color')].join(' ') + (s.inset ? ' inset' : '');
  return Array.isArray(v) ? v.map(one).join(', ') : typeof v === 'object' ? one(v) : String(v);
}
/** CSS value of a single token value (aliases become var()). */
export function valueCss(v, type) {
  if (isAlias(v)) return `var(${cssName(aliasPath(v))})`;
  switch (type) {
    case 'color': return colorCss(v);
    case 'fontFamily': return familyCss(v);
    case 'dimension': return dimensionCss(v);
    case 'duration': return durationCss(v);
    case 'cubicBezier': return Array.isArray(v) ? `cubic-bezier(${v.map(num).join(', ')})` : String(v);
    case 'shadow': return shadowCss(v);
    case 'number': case 'fontWeight': return String(v);
    default:
      if (v && typeof v === 'object' && 'colorSpace' in v) return colorCss(v);
      if (v && typeof v === 'object' && 'value' in v) return dimensionCss(v);
      if (Array.isArray(v)) return familyCss(v);
      return String(v);
  }
}

/** Every CSS custom property the tokens define: [{ name, value, path, part? }]. Typography roles give one entry per part. */
export function cssEntries(dtcg) {
  const out = [];
  for (const t of flatten(dtcg)) {
    if (isTypography(t)) {
      const role = roleOf(t.path);
      if (t.value.fontFamily !== undefined) out.push({ name: `--ff-${role}`, value: valueCss(t.value.fontFamily, 'fontFamily'), path: t.path, part: 'fontFamily' });
      for (const [k, pre] of Object.entries(TYPO_PARTS)) {
        if (t.value[k] === undefined) continue;
        const v = t.value[k];
        out.push({ name: `--${pre}-${role}`, value: isAlias(v) ? valueCss(v) : k === 'letterSpacing' && (v === 0 || v === '0') ? '0' : typeof v === 'object' ? dimensionCss(v) : String(v), path: t.path, part: k });
      }
      continue;
    }
    out.push({ name: cssName(t.path), value: valueCss(t.value, t.type), path: t.path, type: t.type, description: t.description });
  }
  return out;
}

/** Resolve an alias chain to the final token. */
export function resolveToken(flat, v, depth = 0) {
  if (!isAlias(v) || depth > 10) return v;
  const t = flat.find((x) => x.path === aliasPath(v));
  return t ? resolveToken(flat, t.value, depth + 1) : v;
}

/** Custom properties declared in a CSS text (first :root wins), comments stripped. */
export function cssProps(css) {
  const props = new Map();
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) if (!props.has(m[1])) props.set(m[1], m[2].trim());
  return props;
}

/** Normalise a CSS value for comparison (quotes, spaces, trailing zeros, 0.5 vs .5, 0px vs 0). */
export function normCss(v) {
  return String(v).replace(/["']/g, '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/(\d)\.(\d*?)0+(?=\D|$)/g, (m, a, b) => `${a}${b ? '.' + b : ''}`).replace(/(^|[^\d.])0+(\.\d)/g, '$1$2').replace(/(^|[\s(,])0(px|rem|em|%)(?=$|[\s),])/g, '$10').trim().toLowerCase();
}
