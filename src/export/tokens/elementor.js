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
  // names the patterns do not know: darkest colour as primary/text, most chromatic as accent (all still token colours)
  const lab = (t) => { const h = hexOf(resolveToken(flat, t.value)); const c = h && converter('oklch')(h); return c ? { l: c.l, c: c.c || 0 } : { l: 1, c: 0 }; };
  const byDark = [...colors].sort((a, b) => lab(a).l - lab(b).l), byChroma = [...colors].sort((a, b) => lab(b).c - lab(a).c);
  systemMap.primary ||= byDark[0];
  systemMap.text ||= byDark.find((t) => t !== systemMap.primary && lab(t).l < 0.55) || systemMap.primary;
  systemMap.accent ||= byChroma.find((t) => t !== systemMap.primary && lab(t).c > 0.04);
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
  let system_typography = typo.slice(0, 4).map((t, i) => typoEntry(systemIds[i], t));
  let custom_typography = typo.slice(4).map((t, i) => typoEntry('t' + String(i).padStart(3, '0'), t));
  const reasons = ['colours stored as sRGB hex (gamut-mapped token hex), not OKLCH', `fluid clamp() sizes flattened to ${breakpoints.desktop}/${breakpoints.tablet}/${breakpoints.mobile} px`];
  if (!typo.length) {
    // no typography composites in tokens.json: global fonts from the font-family tokens (family only, no sizes),
    // also font stacks filed under another $type (e.g. "size.serif": "\"Newsreader\", Georgia, serif")
    const stack = (v) => typeof v === 'string' && /(^|,)\s*(serif|sans-serif|monospace|system-ui|ui-[a-z-]+|cursive)\s*$/i.test(v);
    const fams = flat.filter((t) => t.type === 'fontFamily' || stack(resolveToken(flat, t.value)));
    const uniq = [...new Map(fams.map((t) => [familyName(t.value), t])).values()];
    const isMono = (t) => /mono|tech|code/i.test(t.path) || /mono|code|courier/i.test(familyName(t.value)) || /monospace\s*$/i.test(String(resolveToken(flat, t.value)));
    const display = uniq.find((t) => /display|head|serif|title/i.test(t.path) && !/sans/i.test(t.path) && !isMono(t)) || uniq.find((t) => !isMono(t)) || uniq[0];
    const body = uniq.find((t) => t !== display && !isMono(t)) || display;
    const fam = (id, title, t) => ({ _id: id, title, typography_typography: 'custom', typography_font_family: familyName(t.value) });
    if (display) {
      system_typography = [fam('primary', 'display', display), fam('secondary', 'display-2', display), fam('text', 'body', body), fam('accent', 'accent', body)];
      custom_typography = uniq.filter((t) => t !== display && t !== body).map((t, i) => fam('t' + String(i).padStart(3, '0'), roleOf(t.path), t));
      reasons.push('tokens.json has no typography roles: global fonts carry the font family only (sizes stay in the theme CSS)');
    }
  }
  return {
    lossy: true,
    lossy_reasons: reasons,
    settings: { system_colors, custom_colors, system_typography, custom_typography },
  };
}
