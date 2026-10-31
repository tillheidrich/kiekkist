// Reference library catalogue (the owner's curated inspiration collection): read-only search over refs.json.
// The catalogue is private material (third-party sites, screenshots). It is only read when KK_REFS_FILE points at
// it; nothing about it ships in the repository. Build it with scripts/refs-catalogue.mjs.
//
// refs.json: { generated, count, refs: [{ id, url, live_url, title, cluster:{id,name}, industry[], tags[], access,
//   facts:{…}, thumbnails:{desktop,mobile,og} (paths relative to the catalogue folder), spec (folder, optional),
//   used_by[] }] }
// Specs: <catalogue dir>/specs/<id>/ (SPEC.md, spec.json, MOTION.md, motion.json) or the entry's spec folder.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join, sep } from 'node:path';

export const ID_RE = /^[a-z0-9][a-z0-9._-]{0,90}$/i;
let cache = null;

export function refsFile() { const f = process.env.KK_REFS_FILE; return f ? resolve(f) : null; }
export function refsConfigured() { const f = refsFile(); return !!(f && existsSync(f)); }

export function loadRefs() {
  const f = refsFile();
  if (!f || !existsSync(f)) throw new Error('reference library not configured: set KK_REFS_FILE to a refs.json built with scripts/refs-catalogue.mjs');
  const mt = statSync(f).mtimeMs;
  if (cache && cache.f === f && cache.mt === mt) return cache.data;
  const data = JSON.parse(readFileSync(f, 'utf8'));
  if (!Array.isArray(data.refs)) throw new Error('refs.json has no refs array');
  cache = { f, mt, data, dir: dirname(f) };
  return data;
}
const baseDir = () => dirname(refsFile());
function inside(rel) {
  if (!rel) return null;
  const base = baseDir(); const p = resolve(base, rel);
  return p === base || p.startsWith(base + sep) ? p : null;
}
export function thumbPath(ref, variant = 'desktop') { const p = inside(ref.thumbnails?.[variant]); return p && existsSync(p) ? p : null; }

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const words = (s) => norm(s).split(/[^a-z0-9äöüß]+/).filter((w) => w.length > 1);

export function slimRefEntry(r) {
  return { id: r.id, title: r.title || null, url: r.url, live_url: r.live_url || null, cluster: r.cluster || null, industry: r.industry || [], tags: (r.tags || []).slice(0, 12), access: r.access || null,
    facts: r.facts ? { h1_font: r.facts.h1Font, h1_size: r.facts.h1Size, h1_size_mobile: r.facts.mobile?.h1Size ?? null, body_size: r.facts.bodySize, fonts: r.facts.fonts, bg: r.facts.bg?.slice(0, 3), text: r.facts.text?.slice(0, 2), page_height: r.facts.pageHeight, sections: r.facts.sections, images: r.facts.images, hero_image_full_bleed: r.facts.heroImageFullBleed } : null,
    has_spec: !!specDir(r), has_shots: !!(r.thumbnails && (r.thumbnails.desktop || r.thumbnails.mobile)), used_by: r.used_by || [] };
}

export function searchRefs({ query, industry, cluster, tag, has_spec, limit = 10, offset = 0 } = {}) {
  const data = loadRefs();
  const q = words(query); const ind = norm(industry); const cl = norm(cluster); const tg = norm(tag);
  const scored = [];
  for (const r of data.refs) {
    if (cl && !(norm(r.cluster?.id) === cl || norm(r.cluster?.name).includes(cl))) continue;
    if (tg && !(r.tags || []).some((t) => norm(t).includes(tg))) continue;
    if (has_spec && !specDir(r)) continue;
    const hayInd = norm([...(r.industry || []), r.cluster?.name].join(' '));
    if (ind && !hayInd.includes(ind)) continue;
    let score = ind ? 3 : 0;
    if (q.length) {
      const hay = { title: norm(r.title), ind: hayInd, tags: norm((r.tags || []).join(' ')), fonts: norm((r.facts?.fonts || []).join(' ')), id: norm(r.id + ' ' + r.url + ' ' + (r.live_url || '')) };
      let hit = 0;
      for (const w of q) { const s = (hay.ind.includes(w) ? 3 : 0) + (hay.tags.includes(w) ? 2 : 0) + (hay.title.includes(w) ? 2 : 0) + (hay.fonts.includes(w) ? 1 : 0) + (hay.id.includes(w) ? 1 : 0); if (s) hit++; score += s; }
      if (!hit) continue;
    }
    if (r.thumbnails?.desktop) score += 0.5; if (r.live_url || r.access === 'captured') score += 0.3; if (specDir(r)) score += 1;
    scored.push({ r, score });
  }
  scored.sort((a, b) => b.score - a.score || String(a.r.id).localeCompare(String(b.r.id)));
  const lim = Math.max(1, Math.min(50, limit));
  return { total: scored.length, library: data.count ?? data.refs.length, generated: data.generated || null, items: scored.slice(offset, offset + lim).map((x) => ({ ...slimRefEntry(x.r), score: Math.round(x.score * 10) / 10 })) };
}

export function getRefEntry(id) {
  if (!ID_RE.test(String(id))) throw new Error('invalid reference id');
  const r = loadRefs().refs.find((x) => x.id === id);
  if (!r) throw new Error('no reference with this id');
  return r;
}

function specDir(r) {
  const cands = [r.spec ? inside(r.spec) : null, inside(join('specs', r.id))].filter(Boolean);
  return cands.find((d) => existsSync(d) && ['SPEC.md', 'spec.json'].some((f) => existsSync(join(d, f)))) || null;
}

/** Facts plus the spec (SPEC.md text, spec.json summary, MOTION.md) if one exists. */
export function getRefSpec(id, { full = false } = {}) {
  const r = getRefEntry(id);
  const d = specDir(r);
  const read = (f) => (d && existsSync(join(d, f)) ? readFileSync(join(d, f), 'utf8') : null);
  let specJson = null;
  const sj = read('spec.json');
  if (sj) { try { const s = JSON.parse(sj); specJson = full ? s : { measured_at: s.measured_at, widths: Object.keys(s.viewports || {}), breakpoints: s.breakpoints, per: Object.fromEntries(Object.entries(s.viewports || {}).map(([w, v]) => [w, { doc_h: v.doc_h, container: v.container, roles: Object.fromEntries(Object.entries(v.roles || {}).filter(([, x]) => x).map(([k, x]) => [k, { ff: x.ff, fs: x.fs, lh: x.lh, fw: x.fw, lines: x.lines }])), sections: (v.sections || []).map((s2) => ({ y: s2.y, h: s2.h, vh: s2.h_vh, bg: s2.bg_hex })) }])) }; } catch {} }
  return { ...slimRefEntry(r), facts_full: r.facts || null, spec: d ? { md: read('SPEC.md') || read('SPEC.draft.md'), json: specJson, motion_md: read('MOTION.md') || read('MOTION.draft.md'), legal_md: read('LEGAL.md') } : null,
    note: d ? 'Measured layout numbers of a third-party page: take principles and proportions, never brand, copy, images or signature elements (get_workflow distance rules).' : 'No spec yet: run kk spec on live_url (or url) and save SPEC.md under specs/' + r.id + '/ next to the catalogue.' };
}
