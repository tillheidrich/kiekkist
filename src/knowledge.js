// Knowledge packs: design knowledge as versioned data instead of prose baked into a skill.
// Packs live in knowledge/packs/*.json (shipped with the tool, updated with every release) and can be
// extended locally in DATA_DIR/knowledge/*.json (own packs, or newer versions of shipped packs).
// A pack: { id, version, kind, title, description, license, sources?, items: [{ id, name, tags?, industries?, evidence?, ... }] }
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = () => [join(ROOT, 'knowledge', 'packs'), process.env.KK_DATA_DIR || process.env.DATA_DIR ? join(process.env.KK_DATA_DIR || process.env.DATA_DIR, 'knowledge') : null].filter(Boolean);
const EVIDENCE = { S: 'standard or norm', M: 'measured effect in a study', D: 'measured model default', P: 'practitioner consensus', H: 'hypothesis', V: 'vendor claim or vendor-published case study', T: 'taste (a stated preference, not a rule)' };

let cache = null, cacheKey = '';
function load() {
  const files = [];
  for (const d of DIRS()) if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith('.json')) files.push(join(d, f));
  const key = files.map((f) => f + statSync(f).mtimeMs).join('|');
  if (cache && key === cacheKey) return cache;
  const packs = new Map();
  for (const f of files) {
    try {
      const p = JSON.parse(readFileSync(f, 'utf8'));
      if (!p.id || !Array.isArray(p.items)) continue;
      const prev = packs.get(p.id);
      if (!prev || String(p.version) >= String(prev.version)) packs.set(p.id, { ...p, file: f.startsWith(ROOT) ? 'shipped' : 'local' });
    } catch (e) { console.error('[kiekkist] bad knowledge pack', f, e.message); }
  }
  cache = packs; cacheKey = key;
  return packs;
}

/** One pack by id (highest version, local overrides shipped), or null. Used by the checker. */
export function getPack(id) {
  try { return load().get(id) || null; } catch { return null; }
}

export const EVIDENCE_CLASSES = EVIDENCE;

export function manifest() {
  return [...load().values()].map((p) => ({ id: p.id, version: p.version, kind: p.kind, title: p.title, description: p.description, items: p.items.length, license: p.license, origin: p.file }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const text = (o) => JSON.stringify(o).toLowerCase();
export function query({ pack, q, tag, industry, evidence, id, limit = 20 } = {}) {
  const packs = load();
  if (!pack) return { packs: manifest(), evidence_classes: EVIDENCE };
  const p = packs.get(pack);
  if (!p) { const e = new Error('unknown pack: ' + pack + ' (known: ' + [...packs.keys()].join(', ') + ')'); e.status = 404; throw e; }
  let items = p.items;
  if (id) { const it = items.find((x) => x.id === id); if (!it) { const e = new Error('unknown item'); e.status = 404; throw e; } return { pack: p.id, version: p.version, item: it }; }
  if (tag) items = items.filter((x) => (x.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()));
  if (industry) { const i = industry.toLowerCase(); items = items.filter((x) => !x.industries?.length || x.industries.some((y) => y.toLowerCase().includes(i))); }
  if (evidence) items = items.filter((x) => (x.evidence || '').includes(evidence));
  if (q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    items = items.map((x) => ({ x, s: words.reduce((n, w) => n + (text(x).includes(w) ? 1 : 0) + ((x.name || '').toLowerCase().includes(w) ? 2 : 0), 0) }))
      .filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.x);
  }
  const n = Math.min(Math.max(1, Number(limit) || 20), 200);
  return { pack: p.id, version: p.version, title: p.title, total: items.length, items: items.slice(0, n) };
}
