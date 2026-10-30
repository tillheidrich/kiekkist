// DTCG -> tokens.css, and a diff against an existing tokens.css. Pure functions.
import { cssEntries, cssProps, normCss, flatten } from './flatten.js';
import { parseColor, deltaE } from '../../check/color.js';

export function toCss(dtcg, { header = 'Generated from tokens.json by kk export. Do not edit by hand; change tokens.json and re-export.' } = {}) {
  const lines = [`/* ${header} */`, ':root {'];
  for (const e of cssEntries(dtcg)) lines.push(`  ${e.name}: ${e.value};${e.description ? ` /* ${String(e.description).replace(/\*\//g, '')} */` : ''}`);
  lines.push('}', '');
  return lines.join('\n');
}

const COLORISH = /^(#|oklch\(|oklab\(|rgba?\(|hsla?\(|lab\(|lch\(|color\()/i;
/** Compare tokens.json with an existing tokens.css. Colours by CIEDE2000 (must be < 0.5), the rest as normalised strings. */
export function diffCss(dtcg, css) {
  const have = cssProps(css);
  const mismatched = [], missing = [], same = [], renamed = [];
  const entries = cssEntries(dtcg);
  const known = new Set(entries.map((e) => e.name));
  const same2 = (a, b) => { if (COLORISH.test(a) && COLORISH.test(b)) { const ca = parseColor(a), cb = parseColor(b); return !!(ca && cb) && deltaE(ca, cb) < 0.5 && (ca.alpha ?? 1) === (cb.alpha ?? 1); } return normCss(a) === normCss(b); };
  for (const e of entries) {
    if (!have.has(e.name)) {
      // the theme may name it differently (e.g. color.dark.ground -> --d-ground): match by value
      const alt = !/^var\(/.test(e.value) && [...have].find(([n, v]) => !known.has(n) && same2(e.value, v));
      if (alt) renamed.push({ json: e.name, css: alt[0] }); else missing.push(e.name);
      continue;
    }
    const a = e.value, b = have.get(e.name);
    const ok = same2(a, b);
    (ok ? same : mismatched).push(ok ? e.name : { name: e.name, json: a, css: b });
  }
  const used = new Set(renamed.map((r) => r.css));
  const extra = [...have.keys()].filter((k) => !known.has(k) && !used.has(k));
  return { same: same.length, mismatched, missing, renamed, extra, total: entries.length, tokens: flatten(dtcg).length };
}
