// Kiekkist Gallery as a source inside the tool: search the public gallery (GET <url>/api/gallery) and link to it.
// The local tool only searches and links. Getting a design happens through the remote MCP server <url>/mcp-gallery
// (get_free_design for free designs; get_design with a licence key for bought ones) or on the website.
// Cached in memory for 10 minutes; offline or broken responses fail soft with a clear message.

export const DEFAULT_GALLERY_URL = 'https://kiekkist.heidrich-digital.de';
const TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 8_000;
const cache = new Map(); // url -> { at, designs }

export function galleryUrl() {
  const raw = String(process.env.KIEKKIST_GALLERY_URL || DEFAULT_GALLERY_URL).trim().replace(/\/+$/, '');
  try { const u = new URL(raw); if (u.protocol === 'https:' || u.protocol === 'http:') return u.origin + u.pathname.replace(/\/+$/, ''); } catch {}
  return DEFAULT_GALLERY_URL;
}

export function gallerySource() {
  const base = galleryUrl();
  return {
    id: 'kiekkist-gallery', name: 'Kiekkist Gallery', url: base, kind: 'gallery',
    good_for: 'Fertige, geprüfte Designs als Paket für KI-Agenten (Tokens, Seiten, Prüfbericht); suchen mit kk_gallery_search, holen über den Remote-MCP /mcp-gallery.',
    good_for_en: 'Finished, checked designs packaged for AI agents (tokens, pages, check report); search with kk_gallery_search, get them through the remote MCP /mcp-gallery.',
    industries: [], industries_en: [], search_url_template: `${base}/gallery/?q={q}`,
    note: 'Eigene Galerie. Dieses Werkzeug sucht und verlinkt nur; Kauf auf der Website, Abruf mit Lizenzschlüssel über den Remote-MCP.',
    note_en: 'Own gallery. This tool only searches and links; buy on the website, retrieve with a licence key through the remote MCP.',
    builtin: true,
  };
}

export function clearGalleryCache() { cache.clear(); }

async function fetchDesigns(base) {
  const hit = cache.get(base);
  if (hit && Date.now() - hit.at < TTL_MS) return { designs: hit.designs, cached: true, fetched_at: new Date(hit.at).toISOString() };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${base}/api/gallery`, { headers: { accept: 'application/json' }, signal: ctl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (text.length > 5_000_000) throw new Error('response too large');
    const j = JSON.parse(text);
    if (!j || !Array.isArray(j.designs)) throw new Error('unexpected response (no designs list)');
    const at = Date.now();
    cache.set(base, { at, designs: j.designs });
    return { designs: j.designs, cached: false, fetched_at: new Date(at).toISOString() };
  } finally { clearTimeout(timer); }
}

const str = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.en || v.de || '' : '');
const abs = (base, p) => (typeof p === 'string' && p ? (/^https?:\/\//i.test(p) ? p : base + (p.startsWith('/') ? p : '/' + p)) : null);

/**
 * Search the gallery. free: true = only free designs, false = only paid ones, undefined = all.
 * Never throws for network problems: returns { ok: false, error, items: [] }.
 */
export async function searchGallery({ q, industry, medium, free, limit = 20 } = {}) {
  const base = galleryUrl();
  let res;
  try { res = await fetchDesigns(base); }
  catch (e) {
    const why = e?.name === 'AbortError' ? `no answer within ${TIMEOUT_MS / 1000} s` : String(e?.message || e).split('\n')[0].slice(0, 160);
    return { ok: false, source: base, error: `Kiekkist Gallery not reachable at ${base} (${why}). The local tool works without it; try again later or set KIEKKIST_GALLERY_URL.`, items: [] };
  }
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const ind = String(industry || '').toLowerCase().trim();
  const med = String(medium || '').toLowerCase().trim();
  const freeWanted = free === true || free === 'true' || free === '1' ? true : free === false || free === 'false' || free === '0' ? false : undefined;
  const scored = [];
  for (const d of res.designs) {
    if (!d || typeof d.slug !== 'string') continue;
    const industries = Array.isArray(d.industry) ? d.industry.map(String) : [];
    const media = Array.isArray(d.media) ? d.media.map(String) : [];
    if (ind && !industries.some((i) => i.toLowerCase().includes(ind))) continue;
    if (med && !media.includes(med)) continue;
    if (freeWanted !== undefined && Boolean(d.free) !== freeWanted) continue;
    const hay = [d.name, d.slug, ...industries, ...media, str(d.summary)].join(' ').toLowerCase();
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    if (terms.length && !score) continue;
    scored.push({ score, d, industries, media });
  }
  scored.sort((a, b) => b.score - a.score || String(a.d.name).localeCompare(String(b.d.name)));
  const items = scored.slice(0, Math.max(1, Math.min(+limit || 20, 100))).map(({ d, industries, media }) => ({
    slug: d.slug, name: d.name, summary: str(d.summary) || null, industry: industries, media, free: Boolean(d.free),
    version: d.version || null, released: d.released || d.updated || null, scores: d.scores || null, third_party_requests: d.thirdPartyRequests ?? null,
    page_url: `${base}/gallery/${encodeURIComponent(d.slug)}/`, preview_url: abs(base, d.previewUrl), mobile_preview_url: abs(base, d.mobilePreviewUrl),
    get: d.free
      ? `Free: remote MCP ${base}/mcp-gallery tool get_free_design {slug: "${d.slug}"}, or download on the page. No key needed.`
      : `Paid: buy on the page (one-time), then remote MCP ${base}/mcp-gallery tool get_design {slug: "${d.slug}", licence_key, project_name}.`,
  }));
  return { ok: true, source: base, cached: res.cached, fetched_at: res.fetched_at, total: scored.length, items };
}
