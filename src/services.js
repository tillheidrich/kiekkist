// Domain logic shared by REST, MCP and CLI.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, rmSync, cpSync } from 'node:fs';
import { join, dirname, normalize, relative, extname, resolve, isAbsolute, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { db, DATA_DIR, now, newId, row, rows, js, logEvent, JUDGMENTS } from './db.js';
import { enqueueCapture } from './capture.js';
import { capUrl } from './cap.js';
import { getBrowser, UA, withContextSlot, withDeadline } from './browser.js';
import { gallerySource } from './gallery.js';

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const must = (v, msg = 'not found') => { if (!v) throw new HttpError(404, msg); return v; };
const arr = (v) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'theme';

// A path strictly inside base (never base itself, never outside, no absolute paths).
export function safeJoin(base, rel) {
  if (typeof rel !== 'string' || !rel || rel.includes('\0') || isAbsolute(rel)) throw new HttpError(400, 'bad path');
  const p = resolve(base, rel), r = relative(base, p);
  if (!r || r === '..' || r.startsWith('..' + sep) || isAbsolute(r)) throw new HttpError(400, 'bad path: ' + rel);
  return p;
}
const ID_RE = /^[a-z][a-z0-9]{3,24}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
const checkId = (id) => { if (typeof id !== 'string' || !ID_RE.test(id)) throw new HttpError(400, 'bad id'); return id; };
const checkSlug = (s) => { if (typeof s !== 'string' || !SLUG_RE.test(s)) throw new HttpError(400, 'bad slug'); return s; };
const BOARD_STATUS = ['collecting', 'directions', 'decided', 'done', 'archived'];

// ---------------- refs
export function listRefs({ q, industry, tag, judgment, status, limit = 60, offset = 0 } = {}) {
  const where = [], p = {};
  if (q) { where.push('(url LIKE @q OR title LIKE @q OR note LIKE @q OR mechanism LIKE @q OR tags LIKE @q OR industry LIKE @q)'); p.q = `%${q}%`; }
  if (industry) { where.push('industry LIKE @ind'); p.ind = `%"${industry}"%`; }
  if (tag) { where.push('tags LIKE @tag'); p.tag = `%"${tag}"%`; }
  if (judgment) { where.push('judgment = @j'); p.j = judgment; }
  if (status) { where.push('status = @s'); p.s = status; }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM refs ${w}`).get(p).n;
  const items = rows(db.prepare(`SELECT * FROM refs ${w} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all({ ...p, limit: Math.max(1, Math.min(+limit || 60, 500)), offset: Math.max(0, +offset || 0) })).map(decorateRef);
  return { items, total };
}
export function decorateRef(r) {
  if (!r) return r;
  const dir = join(DATA_DIR, 'refs', r.id);
  const shots = {};
  for (const [k, f] of [['desktop', 'shot-desktop.jpg'], ['desktop2', 'shot-desktop-2.jpg'], ['desktop3', 'shot-desktop-3.jpg'], ['mobile', 'shot-mobile.jpg'], ['full', 'full.jpg']])
    if (existsSync(join(dir, f))) shots[k] = capUrl('refs', r.id, f);
  return { ...r, shots };
}
export function getRef(id) { return decorateRef(must(row(db.prepare('SELECT * FROM refs WHERE id=?').get(id)), 'reference not found')); }
export function addRef({ url, title, industry, tags, note, mechanism, judgment, judged_by, media, source, origin, capture = true, enqueue = true }) {
  if (!url || !/^https?:\/\//i.test(url)) throw new HttpError(400, 'url must start with http(s)://');
  const existing = db.prepare('SELECT id FROM refs WHERE url=?').get(url);
  if (existing) return updateRef(existing.id, { industry, tags, note, mechanism, judgment, judged_by });
  const id = newId('r');
  db.prepare(`INSERT INTO refs (id,url,title,domain,created_at,status,industry,tags,media,mechanism,note,judgment,judged_by,judged_at,source,origin)
    VALUES (@id,@url,@title,@domain,@at,@status,@industry,@tags,@media,@mechanism,@note,@judgment,@judged_by,@judged_at,@source,@origin)`).run({
    id, url, title: title || null, domain: safeDomain(url), at: now(), status: capture ? 'queued' : 'ok',
    industry: js(arr(industry)), tags: js(arr(tags)), media: media || 'web', mechanism: mechanism || null, note: note || null,
    judgment: JUDGMENTS.includes(judgment) ? judgment : null, judged_by: judgment ? (judged_by || 'till') : null, judged_at: judgment ? now() : null,
    source: source || null, origin: origin || 'manual',
  });
  logEvent('ref.added', id, { url });
  if (capture && enqueue) enqueueCapture(id);
  return getRef(id);
}
const safeDomain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };
export function updateRef(id, f) {
  getRef(id);
  const up = {};
  if (f.industry !== undefined) up.industry = js(arr(f.industry));
  if (f.tags !== undefined) up.tags = js(arr(f.tags));
  for (const k of ['note', 'mechanism', 'title', 'media']) if (f[k] !== undefined) up[k] = f[k];
  if (f.judgment !== undefined) {
    if (f.judgment && !JUDGMENTS.includes(f.judgment)) throw new HttpError(400, 'judgment must be one of ' + JUDGMENTS.join(', '));
    up.judgment = f.judgment || null; up.judged_by = f.judgment ? (f.judged_by || 'till') : null; up.judged_at = f.judgment ? now() : null;
    logEvent('judge', 'ref:' + id, { judgment: f.judgment, note: f.note });
  }
  if (Object.keys(up).length) db.prepare(`UPDATE refs SET ${Object.keys(up).map((k) => `${k}=@${k}`).join(',')} WHERE id=@id`).run({ ...up, id });
  return getRef(id);
}
export function deleteRef(id) { const r = getRef(checkId(id)); db.prepare('DELETE FROM refs WHERE id=?').run(r.id); rmSync(safeJoin(join(DATA_DIR, 'refs'), r.id), { recursive: true, force: true }); return { ok: true }; }
export function recapture(id) { getRef(id); db.prepare("UPDATE refs SET status='queued' WHERE id=?").run(id); enqueueCapture(id); return getRef(id); }

// ---------------- boards
export function listBoards() {
  return rows(db.prepare(`SELECT b.*, (SELECT COUNT(*) FROM board_refs WHERE board_id=b.id) ref_count,
    (SELECT COUNT(*) FROM directions WHERE board_id=b.id) direction_count FROM boards b ORDER BY updated_at DESC`).all());
}
export function getBoard(id) {
  const b = must(row(db.prepare('SELECT * FROM boards WHERE id=? OR share_token=?').get(id, id)), 'board not found');
  b.refs = rows(db.prepare('SELECT r.*, br.note AS board_note, br.position AS board_position FROM board_refs br JOIN refs r ON r.id=br.ref_id WHERE br.board_id=? ORDER BY br.position, r.created_at').all(b.id)).map(decorateRef);
  b.directions = rows(db.prepare('SELECT * FROM directions WHERE board_id=? ORDER BY created_at').all(b.id)).map(decorateDirection);
  b.decision = row(db.prepare('SELECT * FROM decisions WHERE board_id=? ORDER BY decided_at DESC LIMIT 1').get(b.id)) || null;
  return b;
}
export function createBoard({ name, client, brief }) {
  if (!name) throw new HttpError(400, 'name required');
  const id = newId('b');
  db.prepare('INSERT INTO boards (id,name,client,brief,status,created_at,updated_at,share_token) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, name, client || null, brief || null, 'collecting', now(), now(), randomBytes(12).toString('base64url'));
  logEvent('board.created', id, { name });
  return getBoard(id);
}
export function updateBoard(id, f) {
  getBoard(id);
  const up = {};
  for (const k of ['name', 'client', 'brief', 'status']) if (f[k] !== undefined) up[k] = f[k];
  if (up.status !== undefined && !BOARD_STATUS.includes(up.status)) throw new HttpError(400, 'status must be one of ' + BOARD_STATUS.join(', '));
  up.updated_at = now();
  db.prepare(`UPDATE boards SET ${Object.keys(up).map((k) => `${k}=@${k}`).join(',')} WHERE id=@id`).run({ ...up, id });
  return getBoard(id);
}
export function deleteBoard(id) { const b = getBoard(id); checkId(b.id); db.prepare('DELETE FROM boards WHERE id=?').run(b.id); rmSync(safeJoin(join(DATA_DIR, 'boards'), b.id), { recursive: true, force: true }); return { ok: true }; }
export function addToBoard(boardId, { ref_id, url, note, industry, tags }) {
  const b = getBoard(boardId);
  let rid = ref_id;
  if (!rid && url) rid = addRef({ url, note, industry, tags }).id;
  getRef(rid);
  const pos = db.prepare('SELECT COALESCE(MAX(position),0)+1 p FROM board_refs WHERE board_id=?').get(b.id).p;
  db.prepare('INSERT INTO board_refs (board_id,ref_id,note,position) VALUES (?,?,?,?) ON CONFLICT(board_id,ref_id) DO UPDATE SET note=COALESCE(excluded.note, board_refs.note)').run(b.id, rid, note || null, pos);
  db.prepare('UPDATE boards SET updated_at=? WHERE id=?').run(now(), b.id);
  return getBoard(b.id);
}
// Order of references on a board (drag-free): move one step up/down among the visible refs (optionally only those
// with a tag, so moving inside a filtered view swaps with the visible neighbour) or to a 1-based position.
export function moveBoardRef(boardId, refId, { dir, position, tag } = {}) {
  const b = getBoard(boardId);
  const ids = b.refs.map((r) => r.id);
  const from = ids.indexOf(refId);
  if (from < 0) throw new HttpError(404, 'reference is not on this board');
  let to = from;
  if (position !== undefined && position !== null && position !== '') {
    const n = Math.round(Number(position));
    if (!Number.isFinite(n)) throw new HttpError(400, 'position must be a number');
    to = Math.max(0, Math.min(ids.length - 1, n - 1));
  } else if (dir === 'up' || dir === 'down') {
    const visible = (tag ? b.refs.filter((r) => (r.tags || []).includes(tag)) : b.refs).map((r) => r.id);
    const k = visible.indexOf(refId) + (dir === 'up' ? -1 : 1);
    if (k >= 0 && k < visible.length) to = ids.indexOf(visible[k]);
  } else throw new HttpError(400, "pass dir ('up' or 'down') or position");
  if (to !== from) {
    ids.splice(from, 1); ids.splice(to, 0, refId);
    const up = db.prepare('UPDATE board_refs SET position=? WHERE board_id=? AND ref_id=?');
    db.transaction(() => { ids.forEach((id, i) => up.run(i + 1, b.id, id)); db.prepare('UPDATE boards SET updated_at=? WHERE id=?').run(now(), b.id); })();
  }
  return getBoard(b.id);
}
export function updateBoardRef(boardId, refId, { note, position, dir, tag } = {}) {
  const b = getBoard(boardId);
  if (!b.refs.some((r) => r.id === refId)) throw new HttpError(404, 'reference is not on this board');
  if (note !== undefined) db.prepare('UPDATE board_refs SET note=? WHERE board_id=? AND ref_id=?').run(note || null, b.id, refId);
  if (position !== undefined || dir !== undefined) return moveBoardRef(b.id, refId, { position, dir, tag });
  return getBoard(b.id);
}
export function removeFromBoard(boardId, refId) { db.prepare('DELETE FROM board_refs WHERE board_id=? AND ref_id=?').run(boardId, refId); return getBoard(boardId); }

function decorateDirection(d) {
  const shots = {};
  const dir = join(DATA_DIR, 'boards', d.board_id, 'directions', d.id);
  for (const k of ['desktop', 'mobile']) if (existsSync(join(dir, `shot-${k}.jpg`))) shots[k] = capUrl('boards', d.board_id, `directions/${d.id}/shot-${k}.jpg`);
  const files = existsSync(dir) ? walk(dir).filter((f) => f.endsWith('.html')) : [];
  return { ...d, shots, preview_url: capUrl('boards', d.board_id, `directions/${d.id}/index.html`), file_urls: Object.fromEntries(files.map((f) => [f, capUrl('boards', d.board_id, `directions/${d.id}/${f}`)])), html_files: files };
}
export function addDirection(boardId, { name, label, thesis, tokens, ref_ids, html, files }) {
  const b = getBoard(boardId);
  if (!name) throw new HttpError(400, 'name required');
  if (!html && !(files && files['index.html'])) throw new HttpError(400, 'a direction needs a real page: html or files["index.html"]');
  const id = newId('d');
  const dir = join(DATA_DIR, 'boards', b.id, 'directions', id); mkdirSync(dir, { recursive: true });
  const all = { ...(files || {}) }; if (html) all['index.html'] = html;
  writeFiles(dir, all);
  db.prepare('INSERT INTO directions (id,board_id,name,label,thesis,tokens,ref_ids,preview_path,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, b.id, name, label || null, thesis || null, js(tokens ?? null), js(arr(ref_ids)), 'index.html', now());
  db.prepare("UPDATE boards SET status=CASE WHEN status='collecting' THEN 'directions' ELSE status END, updated_at=? WHERE id=?").run(now(), b.id);
  logEvent('direction.added', id, { board: b.id, name });
  const shooting = shootPage(join(dir, 'index.html'), dir, 'web').catch(() => {});
  const out = decorateDirection(row(db.prepare('SELECT * FROM directions WHERE id=?').get(id)));
  Object.defineProperty(out, 'shooting', { value: shooting, enumerable: false });
  return out;
}
export function updateDirection(id, f) {
  const d = must(row(db.prepare('SELECT * FROM directions WHERE id=?').get(id)), 'direction not found');
  const up = {};
  for (const k of ['name', 'label', 'thesis', 'note']) if (f[k] !== undefined) up[k] = f[k];
  if (f.judgment !== undefined) { if (f.judgment && !JUDGMENTS.includes(f.judgment)) throw new HttpError(400, 'bad judgment'); up.judgment = f.judgment || null; logEvent('judge', 'direction:' + id, { judgment: f.judgment, note: f.note }); }
  if (Object.keys(up).length) db.prepare(`UPDATE directions SET ${Object.keys(up).map((k) => `${k}=@${k}`).join(',')} WHERE id=@id`).run({ ...up, id });
  return decorateDirection(row(db.prepare('SELECT * FROM directions WHERE id=?').get(d.id)));
}
export function decide(boardId, { direction_id, reason, combine_note, decided_by }) {
  const b = getBoard(boardId);
  if (!b.directions.some((d) => d.id === direction_id)) throw new HttpError(400, 'direction_id is not on this board');
  const id = newId('c');
  db.prepare('INSERT INTO decisions (id,board_id,direction_id,combine_note,reason,decided_by,decided_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, b.id, direction_id, combine_note || null, reason || null, decided_by || 'till', now());
  db.prepare("UPDATE boards SET status='decided', updated_at=? WHERE id=?").run(now(), b.id);
  logEvent('decision', b.id, { direction_id, reason, combine_note });
  return getBoard(b.id);
}

// ---------------- themes
const THEMES = join(DATA_DIR, 'themes');
const themeTokens = (dir) => (existsSync(join(dir, 'tokens.json')) ? join(dir, 'tokens.json') : existsSync(join(dir, 'tokens.css')) ? join(dir, 'tokens.css') : undefined);
function walk(dir, base = dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    if (n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p, base)); else out.push(relative(base, p));
  }
  return out;
}
function writeFiles(dir, files) {
  for (const [rel, content] of Object.entries(files || {})) {
    const p = safeJoin(dir, rel); mkdirSync(dirname(p), { recursive: true });
    if (content && typeof content === 'object' && content.base64) writeFileSync(p, Buffer.from(content.base64, 'base64'));
    else writeFileSync(p, String(content ?? ''));
  }
}
export function themeDir(slug) { return safeJoin(THEMES, checkSlug(slug)); }
export function listThemes({ q, industry, medium, judgment } = {}) {
  let list = rows(db.prepare('SELECT * FROM themes ORDER BY updated_at DESC').all());
  if (industry) list = list.filter((t) => t.industry.includes(industry));
  if (medium) list = list.filter((t) => t.media.includes(medium));
  if (judgment) list = list.filter((t) => t.judgment === judgment);
  if (q) { const s = q.toLowerCase(); list = list.filter((t) => JSON.stringify(t).toLowerCase().includes(s)); }
  return list.map(decorateTheme);
}
function decorateTheme(t) {
  const dir = themeDir(t.slug);
  const files = existsSync(dir) ? walk(dir) : [];
  const shots = files.filter((f) => f.startsWith('shots/')).sort();
  const pages = files.filter((f) => /^(pages|slides|social|app)\/.+\.html$/.test(f)).sort();
  const cover = shots.find((s) => /index-desktop/.test(s)) || shots.find((s) => /desktop/.test(s)) || shots[0];
  const base = capUrl('themes', t.slug, 'x').slice(0, -1);
  return { ...t, files, pages, shots: shots.map((s) => base + s), cover: cover ? base + cover : null, base_url: base };
}
export function getTheme(slug, { withContent = false } = {}) {
  const t = decorateTheme(must(row(db.prepare('SELECT * FROM themes WHERE slug=?').get(slug)), 'theme not found'));
  const dir = themeDir(slug);
  for (const f of ['DESIGN.md', 'theme.json', 'check.json']) if (existsSync(join(dir, f))) t[f.replace('.', '_')] = readFileSync(join(dir, f), 'utf8');
  if (withContent) {
    t.content = {};
    for (const f of t.files) if (/\.(html|css|md|json|svg|txt)$/.test(f) && !f.startsWith('shots/')) t.content[f] = readFileSync(join(dir, f), 'utf8');
  }
  return t;
}
// Public entry (REST/MCP): only these fields are accepted from outside.
export function saveTheme({ slug, name, summary, industry, media, mood, fonts, files, from_direction, overwrite }) {
  return saveThemeInternal({ slug, name, summary, industry, media, mood, fonts, files, from_direction, overwrite: !!overwrite });
}
// Internal (seed): may copy from a local folder.
export function saveThemeInternal({ slug, name, summary, industry, media, mood, fonts, files, from_direction, origin = 'own', fromDir, process: doProcess = true, overwrite = true }) {
  if (!name) throw new HttpError(400, 'name required');
  slug = slugify(slug || name);
  if (!overwrite && db.prepare('SELECT slug FROM themes WHERE slug=?').get(slug)) throw new HttpError(409, `theme "${slug}" exists; pass overwrite: true to replace it or choose another slug`);
  const dir = themeDir(slug); mkdirSync(dir, { recursive: true });
  if (fromDir) cpSync(fromDir, dir, { recursive: true });
  if (from_direction) {
    const d = must(row(db.prepare('SELECT * FROM directions WHERE id=?').get(from_direction)), 'direction not found');
    const src = join(DATA_DIR, 'boards', d.board_id, 'directions', d.id);
    if (existsSync(src) && !files?.['pages/index.html']) { mkdirSync(join(dir, 'pages'), { recursive: true }); cpSync(src, join(dir, 'pages'), { recursive: true, filter: (s) => !/shot-/.test(s) }); }
  }
  writeFiles(dir, files);
  let meta = {};
  if (existsSync(join(dir, 'theme.json'))) { try { meta = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8')); } catch {} }
  const merged = {
    slug, name: name || meta.name, summary: summary ?? meta.summary ?? null,
    industry: arr(industry ?? meta.industry), media: arr(media ?? meta.media ?? ['web']), mood: arr(mood ?? meta.mood), fonts: arr(fonts ?? meta.fonts),
  };
  if (!merged.media.length) merged.media = ['web'];
  writeFileSync(join(dir, 'theme.json'), JSON.stringify({ ...meta, ...merged, license: meta.license || 'own work', updated: now(), source_direction: from_direction || meta.source_direction || null }, null, 2));
  const exists = db.prepare('SELECT slug FROM themes WHERE slug=?').get(slug);
  if (exists) db.prepare('UPDATE themes SET name=@name, summary=@summary, industry=@industry, media=@media, mood=@mood, fonts=@fonts, updated_at=@at WHERE slug=@slug')
    .run({ ...merged, industry: js(merged.industry), media: js(merged.media), mood: js(merged.mood), fonts: js(merged.fonts), at: now() });
  else db.prepare('INSERT INTO themes (slug,name,summary,industry,media,mood,fonts,created_at,updated_at,origin,source_direction) VALUES (@slug,@name,@summary,@industry,@media,@mood,@fonts,@at,@at,@origin,@sd)')
    .run({ ...merged, industry: js(merged.industry), media: js(merged.media), mood: js(merged.mood), fonts: js(merged.fonts), at: now(), origin, sd: from_direction || null });
  logEvent('theme.saved', slug, { name });
  if (doProcess) processTheme(slug).catch((e) => console.error('processTheme', slug, e.message));
  return getTheme(slug);
}
export function updateTheme(slug, f) {
  getTheme(slug);
  const up = {};
  for (const k of ['name', 'summary', 'note']) if (f[k] !== undefined) up[k] = f[k];
  for (const k of ['industry', 'media', 'mood']) if (f[k] !== undefined) up[k] = js(arr(f[k]));
  if (f.judgment !== undefined) {
    if (f.judgment && !JUDGMENTS.includes(f.judgment)) throw new HttpError(400, 'bad judgment');
    up.judgment = f.judgment || null; logEvent('judge', 'theme:' + slug, { judgment: f.judgment, note: f.note });
  }
  up.updated_at = now();
  db.prepare(`UPDATE themes SET ${Object.keys(up).map((k) => `${k}=@${k}`).join(',')} WHERE slug=@slug`).run({ ...up, slug });
  return getTheme(slug);
}
export function deleteTheme(slug) { const t = getTheme(slug); db.prepare('DELETE FROM themes WHERE slug=?').run(t.slug); rmSync(themeDir(t.slug), { recursive: true, force: true }); return { ok: true }; }

const SIZES = { pages: [[1440, 900, 'desktop'], [390, 844, 'mobile']], slides: [[1920, 1080, 'slide']], social: [[1080, 1350, 'card']], app: [[390, 844, 'app']] };
export async function shootPage(file, outDir, kind = 'web', outName, root = dirname(file)) {
  const browser = await getBrowser();
  const rootUrl = pathToFileURL(resolve(root) + sep).href;
  const html = readFileSync(file, 'utf8');
  const m = html.match(/<meta[^>]+name=["']kk:size["'][^>]+content=["'](\d+)x(\d+)["']/i);
  const sizes = kind === 'web' || kind === 'pages' ? SIZES.pages : m ? [[+m[1], +m[2], kind]] : SIZES[kind] || SIZES.pages;
  const made = [];
  for (const [w, h, label] of sizes) {
    await withContextSlot(async () => {
      const ref = {};
      ref.ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, userAgent: UA, serviceWorkers: 'block' });
      try {
        // only files below the theme/direction folder (and data: URLs); no network, no other server files
        await ref.ctx.route('**/*', (r) => { const u = r.request().url(); return (u.startsWith(rootUrl) || u.startsWith('data:')) ? r.continue() : r.abort(); });
        await withDeadline(45_000, ref, async () => {
          const page = await ref.ctx.newPage();
          await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 20_000 });
          await page.evaluate(() => document.fonts.ready).catch(() => {});
          await page.waitForTimeout(250);
          const name = outName ? `${outName}-${label}.jpg` : `shot-${label}.jpg`;
          await page.screenshot({ path: join(outDir, name), type: 'jpeg', quality: 80 });
          made.push(name);
        });
      } finally { await ref.ctx.close().catch(() => {}); }
    });
  }
  return made;
}
let checkMod = null;
async function loadCheck() {
  if (checkMod !== null) return checkMod;
  try { checkMod = await import('./check/index.js'); } catch (e) { console.warn('check module unavailable:', e.message); checkMod = false; }
  return checkMod;
}
export async function processTheme(slug) {
  const dir = themeDir(slug);
  const shotsDir = join(dir, 'shots'); mkdirSync(shotsDir, { recursive: true });
  const files = walk(dir).filter((f) => /^(pages|slides|social|app)\/.+\.html$/.test(f));
  for (const f of files) {
    const kind = f.split('/')[0];
    const base = f.replace(/\//g, '-').replace(/\.html$/, '');
    await shootPage(join(dir, f), shotsDir, kind, base, dir).catch((e) => console.error('shot', f, e.message));
  }
  const c = await loadCheck();
  if (c && existsSync(join(dir, 'pages', 'index.html'))) {
    const browser = await getBrowser();
    try {
      const report = await withContextSlot(() => withDeadline(90_000, null, () => c.checkTarget({ file: join(dir, 'pages', 'index.html'), fileRoot: dir, tokens: themeTokens(dir), browser })));
      writeFileSync(join(dir, 'check.json'), JSON.stringify(report, null, 2));
      db.prepare('UPDATE themes SET check_score=?, check_grade=?, check_at=? WHERE slug=?').run(report.score, report.grade, now(), slug);
    } catch (e) { console.error('check', slug, e.message); }
  }
  return true;
}
export const CHECK_PROFILES = ['none', 'bfsg', 'public'];
export const CHECK_MAX_PAGES = 8;
/** Deadline for one check call: 90 s, 180 s with perf (3 throttled loads + font-swap run per page); never more. */
export const checkDeadline = ({ perf = false } = {}) => (perf ? 180_000 : 90_000);

// Checker options accepted from outside (REST, MCP, CLI): profile, site mode, lab depth, brand-locked work.
function checkOptions({ profile, perf, mobile, brand_fonts, banned }) {
  if (profile != null && !CHECK_PROFILES.includes(profile)) throw new HttpError(400, 'profile must be one of ' + CHECK_PROFILES.join(', '));
  const o = { profile: profile || 'none' };
  if (perf != null) o.perf = perf === true || perf === 'true' || perf === '1';
  if (mobile != null) o.mobile = !(mobile === false || mobile === 'false' || mobile === '0');
  const bf = arr(brand_fonts), bn = arr(banned);
  if (bf.length > 12 || bn.length > 40) throw new HttpError(400, 'too many brand_fonts (max 12) or banned signals (max 40)');
  if (bf.length) o.brandFonts = bf.map((f) => f.slice(0, 80));
  if (bn.length) o.banned = bn;
  return o;
}
// pages: true = every pages/*.html of the theme (index first), or a list of page names inside the theme's pages/ folder
function themePages(dir, pages) {
  const pdir = join(dir, 'pages');
  if (pages === true || pages === 'all' || pages === 'true') {
    const all = existsSync(pdir) ? readdirSync(pdir).filter((f) => f.endsWith('.html')).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b))) : [];
    return all.slice(0, CHECK_MAX_PAGES).map((f) => join(pdir, f));
  }
  const list = arr(pages).map((p) => p.replace(/^pages\//, ''));
  return list.map((p) => { const f = safeJoin(pdir, /\.html$/.test(p) ? p : p + '.html'); if (!existsSync(f)) throw new HttpError(404, 'page not found in theme: ' + p); return f; });
}
export async function runCheck({ theme, url, html, tokens, profile, pages, perf, mobile, brand_fonts, banned } = {}) {
  const c = await loadCheck();
  if (!c) throw new HttpError(503, 'check module not installed');
  // tokens from outside: a DTCG/{colors,fonts} object or CSS text with custom properties, never a file path
  if (tokens != null && !(typeof tokens === 'object' || (typeof tokens === 'string' && tokens.includes('--')))) throw new HttpError(400, 'tokens must be an object or CSS text with custom properties');
  const opts = checkOptions({ profile, perf, mobile, brand_fonts, banned });
  if (opts.banned) { try { c.bannedSignals(opts.banned); } catch (e) { throw new HttpError(400, e.message); } }
  const wantPages = pages != null && pages !== false && !(Array.isArray(pages) && !pages.length) && pages !== '';
  if (wantPages && Array.isArray(pages) && pages.length > CHECK_MAX_PAGES) throw new HttpError(400, `pages takes at most ${CHECK_MAX_PAGES} entries`);
  const tok = tokens ?? undefined;
  const ms = checkDeadline(opts);
  const browser = await getBrowser();
  const go = (o) => withContextSlot(() => withDeadline(ms, null, () => c.checkTarget({ ...opts, ...o, browser })));
  if (theme) {
    const dir = themeDir(theme);
    if (!wantPages) {
      const report = await go({ file: join(dir, 'pages', 'index.html'), fileRoot: dir, tokens: themeTokens(dir) });
      // only the default run (index page, no options) replaces the stored report the theme page shows
      if (!profile && perf == null && mobile == null && !opts.brandFonts && !opts.banned) {
        writeFileSync(join(dir, 'check.json'), JSON.stringify(report, null, 2));
        db.prepare('UPDATE themes SET check_score=?, check_grade=?, check_at=? WHERE slug=?').run(report.score, report.grade, now(), theme);
      }
      return report;
    }
    const files = themePages(dir, pages);
    if (!files.length) throw new HttpError(400, 'theme has no pages/*.html');
    return go({ pages: files, fileRoot: dir, tokens: themeTokens(dir) });
  }
  if (url) {
    const { isPublicUrl } = await import('./browser.js');
    if (!(await isPublicUrl(url))) throw new HttpError(400, 'url must be public http(s)');
    if (wantPages) {
      if (pages === true || !Array.isArray(pages) && typeof pages !== 'string') throw new HttpError(400, 'for a url, pages is a list of same-origin URLs');
      const list = [url, ...arr(pages).filter((p) => p !== url)].slice(0, CHECK_MAX_PAGES);
      const origin = new URL(url).origin;
      for (const p of list) {
        let u; try { u = new URL(p); } catch { throw new HttpError(400, 'pages: not a URL: ' + p); }
        if (u.origin !== origin) throw new HttpError(400, 'pages must share the origin of url: ' + p);
        if (!(await isPublicUrl(p))) throw new HttpError(400, 'pages must be public http(s): ' + p);
      }
      return go({ pages: list, tokens: tok });
    }
    return go({ url, tokens: tok });
  }
  if (html) {
    if (wantPages) throw new HttpError(400, 'pages needs theme or url, not html');
    return go({ html, tokens: tok });
  }
  throw new HttpError(400, 'theme, url or html required');
}

// ---------------- compare: are the directions really different ideas?
const COMPARE_IGNORE = ['h1', 'image', 'fonts', 'background'];
export async function runCompare({ board_id, direction_ids, themes, ignore } = {}) {
  const { compareTargets } = await import('./check/compare.js');
  const ig = arr(ignore).filter((x) => COMPARE_IGNORE.includes(x));
  const targets = [];
  if (board_id) {
    const b = getBoard(checkId(board_id));
    const ids = arr(direction_ids);
    for (const d of b.directions || []) {
      if (ids.length && !ids.includes(d.id)) continue;
      const dir = safeJoin(join(DATA_DIR, 'boards', b.id, 'directions'), checkId(d.id));
      targets.push({ name: `${d.label || '-'} · ${d.name}`, id: d.id, file: join(dir, 'index.html'), root: dir });
    }
  }
  for (const slug of arr(themes)) { const dir = themeDir(slug); targets.push({ name: slug, file: join(dir, 'pages', 'index.html'), root: dir }); }
  if (targets.length < 2) throw new HttpError(400, 'compare needs at least two directions or themes');
  if (targets.length > 6) throw new HttpError(400, 'compare takes at most six targets');
  const browser = await getBrowser();
  const r = await withContextSlot(() => withDeadline(120_000, null, () => compareTargets({ targets, browser, ignore: ig })));
  if (board_id) {
    writeFileSync(join(DATA_DIR, 'boards', checkId(board_id), 'compare.json'), JSON.stringify({ ...r, at: now() }, null, 2));
    logEvent('board.compared', board_id, { ok: r.ok, pairs: r.pairs.map((p) => p.verdict) });
  }
  return r;
}
export function lastCompare(boardId) {
  const p = join(DATA_DIR, 'boards', checkId(boardId), 'compare.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

// ---------------- sources
export function listSources({ industry, kind } = {}) {
  // the Kiekkist Gallery is built in (KIEKKIST_GALLERY_URL), never stored, always first
  let list = [gallerySource(), ...rows(db.prepare('SELECT * FROM sources ORDER BY name').all()).filter((s) => s.id !== 'kiekkist-gallery')];
  if (kind) list = list.filter((s) => s.kind === kind);
  if (industry) { const q = industry.toLowerCase(); list = list.filter((s) => !s.industries.length || [...s.industries, ...(s.industries_en || [])].some((i) => i.toLowerCase().includes(q))); }
  return list;
}
export function upsertSource(s) {
  const id = s.id || slugify(s.name);
  db.prepare(`INSERT INTO sources (id,name,url,kind,good_for,industries,search_url_template,note,good_for_en,note_en,industries_en) VALUES (@id,@name,@url,@kind,@good_for,@industries,@t,@note,@good_for_en,@note_en,@industries_en)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,kind=excluded.kind,good_for=excluded.good_for,industries=excluded.industries,search_url_template=excluded.search_url_template,note=excluded.note,good_for_en=excluded.good_for_en,note_en=excluded.note_en,industries_en=excluded.industries_en`)
    .run({ id, name: s.name, url: s.url, kind: s.kind || 'gallery', good_for: s.good_for || null, industries: js(arr(s.industries)), t: s.search_url_template || null, note: s.note || null, good_for_en: s.good_for_en || null, note_en: s.note_en || null, industries_en: js(arr(s.industries_en)) });
  return id;
}

// ---------------- judgments (generic)
export function judge({ kind, id, judgment, note, by }) {
  if (kind === 'ref') return updateRef(id, { judgment, note: note ?? undefined, judged_by: by });
  if (kind === 'theme') return updateTheme(id, { judgment, note: note ?? undefined });
  if (kind === 'direction') return updateDirection(id, { judgment, note: note ?? undefined });
  throw new HttpError(400, "kind must be 'ref', 'theme' or 'direction'");
}

// ---------------- taste profile
export function profile() {
  const refs = rows(db.prepare("SELECT * FROM refs WHERE judgment IS NOT NULL").all());
  const mine = refs.filter((r) => !r.judged_by || String(r.judged_by).startsWith('till'));
  const themes = rows(db.prepare('SELECT * FROM themes WHERE judgment IS NOT NULL').all());
  const dirs = rows(db.prepare('SELECT d.*, b.name board FROM directions d JOIN boards b ON b.id=d.board_id WHERE d.judgment IS NOT NULL').all());
  const decisions = rows(db.prepare('SELECT c.*, d.name direction, d.thesis, b.name board FROM decisions c JOIN boards b ON b.id=c.board_id LEFT JOIN directions d ON d.id=c.direction_id ORDER BY c.decided_at DESC LIMIT 12').all());
  const pos = (j) => j === 'love' || j === 'like';
  const tally = (list, key) => {
    const m = new Map();
    for (const r of list) for (const v of [].concat(r[key] || [])) m.set(v, (m.get(v) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const fontsOf = (list) => { const m = new Map(); for (const r of list) for (const fam of new Set((r.tokens?.fonts || []).slice(0, 3).map((f) => f.family))) m.set(fam, (m.get(fam) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const liked = mine.filter((r) => pos(r.judgment)), rejected = mine.filter((r) => r.judgment === 'no');
  const json = {
    updated: now(),
    counts: { refs_judged_by_till: mine.length, refs_judged_by_agents: refs.length - mine.length, themes_judged: themes.length, directions_judged: dirs.length, decisions: decisions.length },
    keeps_choosing: { tags: tally(liked, 'tags').slice(0, 12), industries: tally(liked, 'industry').slice(0, 8), fonts: fontsOf(liked).slice(0, 8), mechanisms: liked.filter((r) => r.mechanism).map((r) => ({ ref: r.domain || r.url, mechanism: r.mechanism, judgment: r.judgment })) },
    rejects: { tags: tally(rejected, 'tags').slice(0, 12), fonts: fontsOf(rejected).slice(0, 8), items: rejected.map((r) => ({ ref: r.domain || r.url, note: r.note })) },
    notes: [...mine, ...themes.map((t) => ({ ...t, domain: 'theme ' + t.slug })), ...dirs.map((d) => ({ ...d, domain: 'direction ' + d.name }))].filter((x) => x.note).map((x) => ({ subject: x.domain || x.url, judgment: x.judgment, note: x.note })),
    themes: themes.map((t) => ({ slug: t.slug, judgment: t.judgment, note: t.note })),
    decisions: decisions.map((d) => ({ board: d.board, direction: d.direction, thesis: d.thesis, reason: d.reason, combine: d.combine_note, at: d.decided_at })),
    agent_assessments: refs.filter((r) => r.judged_by && !String(r.judged_by).startsWith('till')).length,
  };
  return json;
}
export function profileMarkdown() {
  const p = profile();
  const L = [];
  L.push('# Taste profile', '', `Updated ${p.updated}. Built only from recorded judgments, notes and decisions. Nothing here is inferred beyond counting.`, '');
  L.push(`Judged by the owner: ${p.counts.refs_judged_by_till} references, ${p.counts.themes_judged} themes, ${p.counts.directions_judged} directions, ${p.counts.decisions} decisions. Agent pre-assessments (not the owner's taste): ${p.counts.refs_judged_by_agents}.`, '');
  if (!p.counts.refs_judged_by_till && !p.counts.themes_judged && !p.counts.decisions) L.push('> No owner judgments yet. Ask for judgments (love / like / meh / no + why) before relying on this profile.', '');
  const list = (title, arr, fmt) => { if (arr.length) { L.push(`## ${title}`, ''); for (const a of arr) L.push('- ' + fmt(a)); L.push(''); } };
  list('Decided directions (binding until changed)', p.decisions, (d) => `${d.board}: **${d.direction}**: ${d.thesis || ''}${d.combine ? ` (combine: ${d.combine})` : ''}${d.reason ? `. Reason: ${d.reason}` : ''} (${d.at.slice(0, 10)})`);
  list('Keeps choosing: mechanisms', p.keeps_choosing.mechanisms, (m) => `${m.ref} (${m.judgment}): ${m.mechanism}`);
  list('Keeps choosing: tags', p.keeps_choosing.tags, ([t, n]) => `${t} ×${n}`);
  list('Keeps choosing: fonts seen on liked references', p.keeps_choosing.fonts, ([f, n]) => `${f} ×${n}`);
  list('Rejects', p.rejects.items, (r) => `${r.ref}${r.note ? ': ' + r.note : ''}`);
  list('Notes in the owner\'s words', p.notes, (n) => `${n.subject} (${n.judgment}): “${n.note}”`);
  list('Theme verdicts', p.themes, (t) => `${t.slug}: ${t.judgment}${t.note ? ': ' + t.note : ''}`);
  return L.join('\n');
}

export function stats() {
  const n = (sql) => db.prepare(sql).get().n;
  return { refs: n('SELECT COUNT(*) n FROM refs'), boards: n('SELECT COUNT(*) n FROM boards'), themes: n('SELECT COUNT(*) n FROM themes'), sources: n('SELECT COUNT(*) n FROM sources'), judged: n("SELECT COUNT(*) n FROM refs WHERE judgment IS NOT NULL AND judged_by!='claude'") };
}
