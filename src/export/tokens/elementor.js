// DTCG -> Elementor kit site-settings fragment (global colours + global fonts). Lossy by design:
// Elementor stores hex only (the token's gamut-mapped hex is used, never a new colour) and has no
// fluid type, so each clamp() becomes desktop/tablet/mobile sizes. Marks itself lossy:true.
import { converter, toGamut, formatHex } from 'culori';
import { flatten, isTypography, roleOf, resolveToken, isAlias } from './flatten.js';

const toRgbGamut = toGamut('rgb', 'oklch');
export function hexOf(v) {
  if (v && v.hex) return v.hex.toLowerCase();
  if (v && v.colorSpace === 'oklch') { const [l, c, h] = v.components; return formatHex(toRgbGamut({ mode: 'oklch', l, c, h })); }
  if (typeof v === 'string') { const c = converter('rgb')(v); return c ? formatHex(toRgbGamut(c)) : null; }
  return null;
}

/** Evaluate a CSS length (rem, px, vw, clamp(), calc-like a + b vw) at a viewport width, in px (1rem = 16px). */
export function lengthAt(expr, vw) {
  const s = String(expr).trim();
  const clamp = /^clamp\((.*)\)$/i.exec(s);
  if (clamp) {
    const parts = []; let depth = 0, cur = '';
    for (const ch of clamp[1]) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    const [a, b, c] = parts.map((p) => lengthAt(p, vw));
    return Math.min(Math.max(b, a), c);
  }
  let total = 0;
  for (const m of s.replace(/^calc\(|\)$/g, '').matchAll(/([+-]?)\s*(-?\d*\.?\d+)(rem|em|px|vw|vh)?/g)) {
    const n = Number(m[2]) * (m[1] === '-' ? -1 : 1);
    total += m[3] === 'vw' ? (n * vw) / 100 : m[3] === 'px' ? n : n * 16;
  }
  return total;
}
const px = (n) => ({ unit: 'px', size: Math.round(n), sizes: [] });

export function toElementorSettings(dtcg, { breakpoints = { desktop: 1440, tablet: 1024, mobile: 390 } } = {}) {
  const flat = flatten(dtcg);
  const colors = flat.filter((t) => t.type === 'color');
  const systemIds = ['primary', 'secondary', 'text', 'accent'];
  const pick = (re) => colors.find((c) => re.test(c.path));
  const systemMap = { primary: pick(/\.(ink|text|primary)$/), text: pick(/\.(ink-2|ink-muted|mute|muted|text-2)/), accent: pick(/\.(accent|brass|signal|buoy|green)$/), secondary: pick(/\.(deep|night|steel|secondary|line)$/) };
  const used = new Set();
  const colorEntry = (id, t) => { used.add(t.path); return { _id: id, title: t.path.split('.').slice(1).join('-'), color: hexOf(resolveToken(flat, t.value)) }; };
  const system_colors = systemIds.filter((id) => systemMap[id]).map((id) => colorEntry(id, systemMap[id]));
  const custom_colors = colors.filter((t) => !used.has(t.path)).map((t, i) => colorEntry('c' + String(i).padStart(3, '0'), t));
  const typo = flat.filter(isTypography);
  const familyName = (v) => { const r = resolveToken(flat, v); return (Array.isArray(r) ? r : String(r).split(','))[0].trim().replace(/^["']|["']$/g, ''); };
  const typoEntry = (id, t) => {
    const v = t.value, size = v.fontSize !== undefined ? String(resolveToken(flat, v.fontSize)) : null;
    const e = { _id: id, title: roleOf(t.path), typography_typography: 'custom' };
    if (v.fontFamily !== undefined) e.typography_font_family = familyName(v.fontFamily);
    if (v.fontWeight !== undefined) e.typography_font_weight = String(resolveToken(flat, v.fontWeight));
    if (size) { e.typography_font_size = px(lengthAt(size, breakpoints.desktop)); e.typography_font_size_tablet = px(lengthAt(size, breakpoints.tablet)); e.typography_font_size_mobile = px(lengthAt(size, breakpoints.mobile)); }
    if (v.lineHeight !== undefined) e.typography_line_height = { unit: 'em', size: Number(resolveToken(flat, v.lineHeight)), sizes: [] };
    if (v.letterSpacing !== undefined) { const ls = String(resolveToken(flat, v.letterSpacing)); const n = parseFloat(ls) || 0; e.typography_letter_spacing = /em$/.test(ls) ? { unit: 'em', size: n, sizes: [] } : { unit: 'px', size: n, sizes: [] }; }
    return e;
  };
  const system_typography = typo.slice(0, 4).map((t, i) => typoEntry(systemIds[i], t));
  const custom_typography = typo.slice(4).map((t, i) => typoEntry('t' + String(i).padStart(3, '0'), t));
  return {
    lossy: true,
    lossy_reasons: ['colours stored as sRGB hex (gamut-mapped token hex), not OKLCH', `fluid clamp() sizes flattened to ${breakpoints.desktop}/${breakpoints.tablet}/${breakpoints.mobile} px`],
    settings: { system_colors, custom_colors, system_typography, custom_typography },
  };
}
