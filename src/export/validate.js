// Checks a theme before anything is written (spec: kk export, 1.1). errors -> exit 2.
import { findAll, attr, serialize, find, walk } from './html.js';
import { diffCss } from './tokens/css.js';
import { sha } from './ir.js';
import { displayable } from 'culori';
import { flatten } from './tokens/flatten.js';
import { parseColor, deltaE } from '../check/color.js';

const REMOTE = /^(https?:)?\/\//i;

/** Remote references in CSS: url(...) and @import. */
export function remoteInCss(css) {
  const out = [];
  for (const m of String(css || '').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) if (REMOTE.test(m[1])) out.push(m[1]);
  for (const m of String(css || '').matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/g)) if (REMOTE.test(m[1])) out.push(m[1]);
  return out;
}

export function validateTheme(theme, { irIssues } = {}) {
  const errors = [], warnings = [], info = [];
  if (!theme.tokens) errors.push('tokens.json missing: the export generates every token file from it');
  if (!theme.tokensCss) warnings.push('tokens.css missing: it will be generated from tokens.json');
  if (theme.tokens && theme.tokensCss) {
    const d = diffCss(theme.tokens, theme.tokensCss);
    for (const m of d.mismatched) errors.push(`tokens.css ${m.name} = ${m.css} but tokens.json says ${m.json}`);
    const realMissing = d.missing.filter((n) => !/^--ff-/.test(n));
    if (realMissing.length) warnings.push(`tokens.css lacks ${realMissing.length} propert${realMissing.length === 1 ? 'y' : 'ies'} defined in tokens.json: ${realMissing.slice(0, 8).join(', ')}`);
    if (d.renamed.length) info.push(`tokens.css names ${d.renamed.length} token(s) differently from the --c-/--font- convention but with the same values (e.g. ${d.renamed.slice(0, 3).map((r) => `${r.json} as ${r.css}`).join(', ')}); tokens.css is used unchanged`);
    if (d.extra.length) info.push(`tokens.css defines ${d.extra.length} propert${d.extra.length === 1 ? 'y' : 'ies'} not in tokens.json (${d.extra.join(', ')}); kept as-is`);
  }
  // the hex fallback (Elementor, editor labels) must be the sRGB value of the OKLCH colour
  if (theme.tokens) for (const t of flatten(theme.tokens).filter((x) => x.type === 'color' && x.value?.colorSpace === 'oklch' && x.value.hex)) {
    const [l, c, h] = t.value.components; const ok = { mode: 'oklch', l, c, h };
    const e = deltaE(parseColor(`oklch(${l} ${c} ${h})`), parseColor(t.value.hex));
    if (e > 2) warnings.push(`tokens.json ${t.path}: hex ${t.value.hex} is ΔE ${e.toFixed(1)} away from its OKLCH value${displayable(ok) ? '' : ' (the colour is outside sRGB; the hex is a gamut-mapped fallback)'}: targets that store hex (Elementor) will show a different colour`);
  }
  // remote URLs (same rule as privacy.third-party-requests): outbound <a> links are fine
  for (const p of theme.pages) {
    walk(p.tree, (n) => {
      if (n.type !== 'el') return;
      for (const a of n.attrs) {
        if (a.name === 'href' && n.tag === 'a') continue;
        if (['src', 'href', 'srcset', 'poster', 'data', 'action'].includes(a.name) && a.value.split(',').some((s) => REMOTE.test(s.trim()))) errors.push(`${p.file}: remote ${a.name} on <${n.tag}>: ${a.value.slice(0, 100)} (self-host it; no third-party requests)`);
        if (a.name === 'style') for (const r of remoteInCss(a.value)) errors.push(`${p.file}: remote url() in a style attribute: ${r}`);
      }
      if (n.tag === 'style') for (const r of remoteInCss(n.children.map((c) => c.raw).join(''))) errors.push(`${p.file}: remote url()/@import in <style>: ${r}`);
    });
  }
  for (const [f, css] of [['tokens.css', theme.tokensCss], ['assets/site.css', theme.siteCss], ['assets/fonts/fonts.css', theme.fontsCss]]) for (const r of remoteInCss(css)) errors.push(`${f}: remote reference ${r} (self-host it)`);
  // header and footer identical across pages
  for (const tag of ['header', 'footer']) {
    const hashes = theme.pages.map((p) => { const el = find(p.tree, (n) => n.tag === tag); return el ? sha(serialize(el)) : null; });
    const base = hashes[0];
    theme.pages.forEach((p, i) => { if (i && hashes[i] !== base) info.push(`<${tag}> on ${p.file} differs from pages/index.html (e.g. aria-current): exported as its own variant`); });
  }
  // AI images need a visible label nearby
  for (const [file, m] of Object.entries(theme.images || {})) {
    if (!m || m.ai !== true) continue;
    const name = file.split('/').pop();
    for (const p of theme.pages) for (const img of findAll(p.tree, (n) => n.tag === 'img' && (attr(n, 'src') || '').endsWith(name))) {
      let box = img.parent; while (box && box.tag && !['figure', 'section', 'article'].includes(box.tag)) box = box.parent;
      const text = box ? serialize(box) : '';
      if (!/\b(KI|AI)[- ]?(generiert|generated|Bild|image)|künstliche Intelligenz|AI-generated|KI-generiert/i.test(text.replace(/<[^>]+>/g, ' '))) warnings.push(`${p.file}: ${name} is marked ai:true but has no visible AI label in its figure/section (ai.image-label)`);
    }
  }
  if (!Object.keys(theme.images || {}).length && theme.assets.some((a) => /^assets\/img\//.test(a))) info.push('no image manifest (assets/img/manifest.json or theme.json "images"): credits, licences and ai flags are not exported');
  if (irIssues) { errors.push(...irIssues.errors); warnings.push(...irIssues.warnings); info.push(...irIssues.info); }
  return { ok: errors.length === 0, errors, warnings, info };
}
