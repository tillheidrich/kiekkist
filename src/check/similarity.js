// Structural similarity of two designs, after the author's earlier abstand.py idea:
// compare what a page carries BEFORE colour does its work (section order,
// type pair, type scale, radius, density) plus accent hue and surface.
// > 0.6 = "very similar", whatever the colours say.
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { oklchOf, hueDistance } from './color.js';

export const SIMILAR_THRESHOLD = 0.6;

const WEIGHTS = { sections: 0.3, fonts: 0.2, accent: 0.15, typeScale: 0.1, radius: 0.1, density: 0.1, surface: 0.05 };

function seqSimilarity(a, b) {
  if (!a.length && !b.length) return 1;
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : (a[i - 1].split('-')[0] === b[j - 1].split('-')[0] ? 0.5 : 1);
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
  }
  return 1 - d[n][m] / Math.max(n, m);
}
const ratioSim = (x, y, floor = 1) => { if (x == null || y == null) return 0.5; const m = Math.max(Math.abs(x), Math.abs(y), floor); return Math.max(0, 1 - Math.abs(x - y) / m); };

/** Compare two fingerprints (from report.fingerprint). */
export function compareFingerprints(A, B) {
  const parts = {};
  parts.sections = { a: A.sections, b: B.sections, sim: seqSimilarity(A.sections || [], B.sections || []) };
  const fa = [A.headingFont, A.bodyFont], fb = [B.headingFont, B.bodyFont];
  parts.fonts = { a: fa, b: fb, sim: (fa[0] && fa[0] === fb[0] ? 0.5 : 0) + (fa[1] && fa[1] === fb[1] ? 0.5 : 0) };
  const ha = A.accent && A.accent.h, hb = B.accent && B.accent.h;
  parts.accent = { a: ha, b: hb, sim: ha == null && hb == null ? 1 : ha == null || hb == null ? 0 : Math.max(0, 1 - hueDistance(ha, hb) / 60) };
  parts.typeScale = { a: A.typeScale, b: B.typeScale, sim: ratioSim(A.typeScale, B.typeScale) };
  parts.radius = { a: A.radius, b: B.radius, sim: ratioSim(A.radius, B.radius, 8) };
  parts.density = { a: A.density, b: B.density, sim: ratioSim(A.density, B.density, 10) };
  let ls = 0.5;
  if (A.surface && B.surface) {
    const oa = oklchOf(A.surface), ob = oklchOf(B.surface);
    ls = Math.max(0, 1 - Math.abs(oa.l - ob.l) / 0.3);
  }
  parts.surface = { a: A.surface, b: B.surface, sim: ls };
  let s = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) s += w * parts[k].sim;
  for (const p of Object.values(parts)) p.sim = +p.sim.toFixed(2);
  const scoreV = +s.toFixed(2);
  return {
    score: scoreV,
    verySimilar: scoreV > SIMILAR_THRESHOLD,
    verdict: scoreV > SIMILAR_THRESHOLD ? 'very similar' : scoreV > 0.4 ? 'related' : 'distinct',
    verdict_de: scoreV > SIMILAR_THRESHOLD ? 'sehr ähnlich' : scoreV > 0.4 ? 'verwandt' : 'eigenständig',
    parts,
  };
}

async function exists(p) { return !!(await stat(p).catch(() => null)); }

async function fingerprintOf(x, opts) {
  if (x && typeof x === 'object') {
    if (x.fingerprint) return x.fingerprint;
    if (x.sections) return x;
    throw new Error('similarity: object is neither a report nor a fingerprint');
  }
  const p = String(x);
  const st = await stat(p).catch(() => null);
  if (!st) throw new Error('similarity: not found: ' + p);
  const { checkTarget } = await import('./index.js');
  if (st.isFile()) return (await checkTarget({ file: p, viewports: [1440], axe: false, a11y: false, browser: opts.browser })).fingerprint;
  const cj = join(p, 'check.json');
  if (await exists(cj)) {
    try { const r = JSON.parse(await readFile(cj, 'utf8')); if (r.fingerprint) return r.fingerprint; } catch { /* re-measure */ }
  }
  for (const cand of ['pages/index.html', 'index.html']) {
    const f = join(p, cand);
    if (await exists(f)) return (await checkTarget({ file: f, viewports: [1440], axe: false, a11y: false, browser: opts.browser })).fingerprint;
  }
  throw new Error('similarity: no pages/index.html in ' + p);
}

/**
 * similarity(a, b) where a/b are theme dirs, HTML files, check reports or fingerprints.
 * Returns { score 0..1, verySimilar, verdict, verdict_de, parts }.
 */
export async function similarity(a, b, opts = {}) {
  const [A, B] = [await fingerprintOf(a, opts), await fingerprintOf(b, opts)];
  return compareFingerprints(A, B);
}
