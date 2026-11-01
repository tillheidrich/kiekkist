import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { capOk } from './cap.js';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { DATA_DIR, db, row } from './db.js';
import * as S from './services.js';
import * as V from './views.js';
import { buildMcpServer } from './mcp.js';
import { queueLength, enqueueCapture } from './capture.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASSWORD = process.env.KK_PASSWORD || '';
const TOKEN = process.env.KK_TOKEN || '';
const MCP_KEY = process.env.KK_MCP_KEY || ''; // separate key for ?key= on /mcp (claude.ai connector); never the API token
const PUBLIC_URL = (process.env.KK_PUBLIC_URL || '').replace(/\/$/, '');
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const LOCAL_ONLY = (process.env.HOST || '0.0.0.0') === '127.0.0.1';
// fail closed: without strong credentials the server only starts bound to localhost with KK_INSECURE_LOCAL=1
if (PASSWORD.length < 12 || TOKEN.length < 24) {
  if (!(process.env.KK_INSECURE_LOCAL === '1' && LOCAL_ONLY)) {
    console.error('[kiekkist] KK_PASSWORD (min. 12) and KK_TOKEN (min. 24 characters) are required. For local tests: HOST=127.0.0.1 KK_INSECURE_LOCAL=1.');
    process.exit(1);
  }
  console.warn('[kiekkist] insecure local mode: no login required (127.0.0.1 only).');
}
const OPEN = PASSWORD.length < 12 || TOKEN.length < 24;

const app = new Hono();
const origin = (c) => PUBLIC_URL || new URL(c.req.url).origin;
const secure = (c) => c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';

// ---------- sessions (random ids, stored hashed, 14 days, server-side logout; all dropped when the password changes)
const sha = (v) => createHash('sha256').update(v).digest('hex');
const pwMark = sha('kk-pw:' + PASSWORD);
if (db.prepare("SELECT v FROM meta WHERE k='pw'").get()?.v !== pwMark) { db.prepare('DELETE FROM sessions').run(); db.prepare("INSERT OR REPLACE INTO meta (k,v) VALUES ('pw',?)").run(pwMark); }
const SESSION_MS = 14 * 864e5;
function newSession() { const id = randomBytes(32).toString('base64url'); db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(sha(id), Date.now(), Date.now() + SESSION_MS); return id; }
const validSession = (id) => !!id && !!db.prepare('SELECT 1 FROM sessions WHERE id=? AND expires_at>?').get(sha(id), Date.now());
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now()), 3600_000).unref();

// ---------- auth
function authed(c) {
  if (OPEN) return true;
  const h = c.req.header('authorization') || '';
  if (h.startsWith('Bearer ') && eq(h.slice(7), TOKEN)) return true;
  if (MCP_KEY && c.req.path === '/mcp' && c.req.query('key') && eq(c.req.query('key'), MCP_KEY)) return true;
  return validSession(getCookie(c, 'kk'));
}
const PUBLIC = [/^\/static\//, /^\/login$/, /^\/produkt$/, /^\/product$/, /^\/robots\.txt$/, /^\/s\/[^/]+(\/decide)?$/, /^\/health$/, /^\/v\//];

// security headers on every response; app pages get a strict CSP (stored HTML under /v gets its own sandbox CSP)
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'same-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (secure(c)) c.header('Strict-Transport-Security', 'max-age=31536000');
  if (!c.res.headers.has('content-security-policy'))
    c.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'");
  const p = c.req.path;
  if (!(p === '/' || p === '/produkt' || p === '/product' || p.startsWith('/static/'))) c.header('X-Robots-Tag', 'noindex, nofollow');
});
// CSRF: cookie-authenticated writes must come from our own origin
app.use('*', async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && !c.req.header('authorization') && c.req.path !== '/mcp') {
    const o = c.req.header('origin'), sfs = c.req.header('sec-fetch-site');
    if ((o && o !== origin(c) && o !== new URL(c.req.url).origin) || (sfs && !['same-origin', 'none'].includes(sfs))) return c.text('forbidden', 403);
  }
  await next();
});
// request body limit (base64 files in JSON)
app.use('/api/*', bodyLimit({ maxSize: 40 * 1024 * 1024, onError: (c) => c.json({ error: 'request too large (max 40 MB)' }, 413) }));
app.use('/mcp', bodyLimit({ maxSize: 40 * 1024 * 1024, onError: (c) => c.json({ error: 'request too large (max 40 MB)' }, 413) }));

app.use('*', async (c, next) => {
  const p = c.req.path;
  if (PUBLIC.some((r) => r.test(p))) return next();
  if (authed(c)) return next();
  if (p === '/') { c.header('Vary', 'Accept-Language'); return c.html(prefersEnglish(c) ? LANDING_EN() : LANDING()); }
  if (p.startsWith('/api') || p.startsWith('/mcp')) return c.json({ error: 'unauthorized' }, 401);
  if (p === '/ui/refs/new' && c.req.method === 'GET') {
    // The bookmarklet opens this from another site, so the SameSite=Strict session cookie is not sent on that first
    // request. Re-request once from our own origin (same-site, cookie included); only then fall back to the login.
    const u = new URL(c.req.url);
    if (!u.searchParams.has('b')) {
      u.searchParams.set('b', '1');
      const next = esc(u.pathname + u.search);
      return c.html(`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${next}"><title>Kiekkist</title></head><body><p><a href="${next}">Continue</a></p></body></html>`);
    }
    return c.redirect('/login?next=' + encodeURIComponent(u.pathname + u.search));
  }
  return c.redirect('/login');
});

// public product page: shown at / to visitors who are not signed in, always at /produkt (German) and /product (English)
let landingHtml = null;
const LANDING = () => (landingHtml ??= readFileSync(join(ROOT, 'public', 'landing', 'index.html'), 'utf8'));
app.get('/produkt', (c) => c.html(LANDING()));
// English product page for an international audience; / serves it to logged-out visitors whose first Accept-Language tag is English
let landingEnHtml = null;
const LANDING_EN = () => (landingEnHtml ??= readFileSync(join(ROOT, 'public', 'landing', 'index.en.html'), 'utf8'));
const prefersEnglish = (c) => /^en(-|$)/i.test((c.req.header('accept-language') || '').split(',')[0].split(';')[0].trim());
app.get('/product', (c) => c.html(LANDING_EN()));
app.get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'));

// login with throttling per client IP (Traefik appends the real IP last in X-Forwarded-For)
const fails = new Map();
const ipOf = (c) => (c.req.header('x-forwarded-for') || '').split(',').pop().trim() || 'local';
let failsHour = { n: 0, at: Date.now() };
const safeNext = (n) => (typeof n === 'string' && /^\/(?![/\\])/.test(n) && !/[\r\n]/.test(n) ? n : '/');
const esc = V.esc;
app.get('/login', (c) => c.html(V.loginPage(undefined, safeNext(c.req.query('next')))));
app.post('/login', async (c) => {
  const ip = ipOf(c), f = fails.get(ip) || { n: 0, until: 0 };
  if (Date.now() - failsHour.at > 3600_000) failsHour = { n: 0, at: Date.now() };
  if (f.until > Date.now() || failsHour.n > 100) return c.html(V.loginPage('Zu viele Versuche. Bitte später erneut.'), 429);
  const { password, next } = await c.req.parseBody();
  if (PASSWORD && eq(password || '', PASSWORD)) {
    fails.delete(ip);
    setCookie(c, 'kk', newSession(), { httpOnly: true, sameSite: 'Strict', secure: secure(c), path: '/', maxAge: SESSION_MS / 1000 });
    return c.redirect(safeNext(next));
  }
  f.n++; failsHour.n++;
  if (f.n >= 5) f.until = Date.now() + 60_000 * 2 ** Math.min(f.n - 5, 8);
  fails.set(ip, f);
  console.warn('[kiekkist] login failed from', ip);
  await new Promise((r) => setTimeout(r, 400));
  return c.html(V.loginPage('Nope.', safeNext(next)), 401);
});
app.post('/logout', (c) => { const id = getCookie(c, 'kk'); if (id) db.prepare('DELETE FROM sessions WHERE id=?').run(sha(id)); deleteCookie(c, 'kk', { path: '/' }); return c.redirect('/login'); });
app.get('/health', (c) => c.json({ ok: true, queue: queueLength() }));

// ---------- static
app.use('/static/*', serveStatic({ root: relative(process.cwd(), join(ROOT, 'public')) || '.', rewriteRequestPath: (p) => p.replace(/^\/static/, '') }));
app.use('/skill/*', serveStatic({ root: relative(process.cwd(), join(ROOT, 'skill', 'web-design-studio')) || '.', rewriteRequestPath: (p) => p.replace(/^\/skill/, '') }));
// stored files via capability URLs (/v/<kind>/<id>/<mac>/<path>); stored HTML runs sandboxed in an opaque origin
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm' };
app.get('/v/:kind/:id/:mac/*', (c) => {
  const { kind, id, mac } = c.req.param();
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id) || !capOk(kind, id, mac)) return c.notFound();
  const rel = c.req.path.split('/').slice(5).map(decodeURIComponent).join('/');
  let file;
  try { file = S.safeJoin(join(DATA_DIR, kind, id), rel); } catch { return c.notFound(); }
  if (!existsSync(file) || !statSync(file).isFile()) return c.notFound();
  const type = MIME[extname(file).toLowerCase()];
  if (!type) return c.notFound();
  const headers = { 'content-type': type, 'cache-control': 'private, max-age=300', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' };
  if (/html|svg/.test(type)) headers['content-security-policy'] = "sandbox allow-scripts allow-popups; frame-ancestors 'self'";
  return new Response(createReadStream(file), { headers });
});
// ---------- errors
app.onError((e, c) => {
  const status = e.status || 500;
  if (status >= 500) console.error(e);
  const msg = status >= 500 ? 'internal error' : e.message;
  if (c.req.path.startsWith('/api')) return c.json({ error: msg }, status);
  return c.html(V.layout({ title: 'Error', body: `<section class="head"><h1>${status}</h1><p>${V.esc(msg)}</p><p><a href="javascript:history.back()">←</a></p></section>` }), status);
});

// ---------- REST API
const body = async (c) => { try { return await c.req.json(); } catch { return {}; } };
const api = new Hono();
api.get('/refs', (c) => c.json(S.listRefs(c.req.query())));
api.post('/refs', async (c) => c.json(S.addRef(await body(c)), 201));
api.get('/refs/:id', (c) => c.json(S.getRef(c.req.param('id'))));
api.patch('/refs/:id', async (c) => c.json(S.updateRef(c.req.param('id'), await body(c))));
api.delete('/refs/:id', (c) => c.json(S.deleteRef(c.req.param('id'))));
api.post('/refs/:id/recapture', (c) => c.json(S.recapture(c.req.param('id'))));
api.get('/boards', (c) => c.json(S.listBoards()));
api.post('/boards', async (c) => c.json(S.createBoard(await body(c)), 201));
api.get('/boards/:id', (c) => c.json(S.getBoard(c.req.param('id'))));
api.patch('/boards/:id', async (c) => c.json(S.updateBoard(c.req.param('id'), await body(c))));
api.delete('/boards/:id', (c) => c.json(S.deleteBoard(c.req.param('id'))));
api.post('/boards/:id/refs', async (c) => c.json(S.addToBoard(c.req.param('id'), await body(c))));
api.delete('/boards/:id/refs/:ref', (c) => c.json(S.removeFromBoard(c.req.param('id'), c.req.param('ref'))));
api.patch('/boards/:id/refs/:ref', async (c) => c.json(S.updateBoardRef(c.req.param('id'), c.req.param('ref'), await body(c))));
api.post('/boards/:id/directions', async (c) => c.json(S.addDirection(c.req.param('id'), await body(c)), 201));
api.patch('/directions/:id', async (c) => c.json(S.updateDirection(c.req.param('id'), await body(c))));
api.post('/boards/:id/decide', async (c) => c.json(S.decide(c.req.param('id'), await body(c))));
api.get('/themes', (c) => c.json(S.listThemes(c.req.query())));
api.post('/themes', async (c) => c.json(S.saveTheme(await body(c)), 201));
api.get('/themes/:slug', (c) => c.json(S.getTheme(c.req.param('slug'), { withContent: c.req.query('files') === '1' })));
api.patch('/themes/:slug', async (c) => c.json(S.updateTheme(c.req.param('slug'), await body(c))));
api.delete('/themes/:slug', (c) => c.json(S.deleteTheme(c.req.param('slug'))));
api.get('/themes/:slug/zip', async (c) => {
  const th = S.getTheme(c.req.param('slug'));
  const zip = new JSZip(); const dir = S.themeDir(th.slug);
  for (const f of th.files) zip.file(`${th.slug}/${f}`, readFileSync(join(dir, f)));
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return new Response(buf, { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${th.slug}.zip"` } });
});
api.post('/themes/:slug/check', async (c) => c.json(await S.runCheck({ ...(await body(c)), theme: c.req.param('slug') })));
api.post('/check', async (c) => c.json(await S.runCheck(await body(c))));
api.get('/knowledge', async (c) => c.json((await import('./knowledge.js')).query({})));
api.get('/knowledge/:pack', async (c) => { const q = c.req.query(); return c.json((await import('./knowledge.js')).query({ pack: c.req.param('pack'), q: q.q, tag: q.tag, industry: q.industry, evidence: q.evidence, limit: q.limit })); });
api.get('/knowledge/:pack/:id', async (c) => c.json((await import('./knowledge.js')).query({ pack: c.req.param('pack'), id: c.req.param('id') })));
api.post('/compare', async (c) => c.json(await S.runCompare(await body(c))));
api.post('/boards/:id/compare', async (c) => c.json(await S.runCompare({ ...(await body(c).catch(() => ({})) || {}), board_id: c.req.param('id') })));
api.get('/boards/:id/compare', (c) => c.json(S.lastCompare(c.req.param('id')) || { none: true }));
api.post('/judge', async (c) => { const b = await body(c); return c.json(S.judge({ ...b, by: b.by === 'till' ? 'till' : 'agent' })); });
api.get('/profile', (c) => (c.req.query('format') === 'json' ? c.json(S.profile()) : c.text(S.profileMarkdown(), 200, { 'content-type': 'text/markdown; charset=utf-8' })));
api.get('/sources', (c) => c.json(S.listSources(c.req.query())));
api.get('/gallery-proxy', async (c) => { const q = c.req.query(); return c.json(await (await import('./gallery.js')).searchGallery({ q: q.q, industry: q.industry, medium: q.medium, free: q.free, limit: q.limit })); });
api.get('/stats', (c) => c.json({ ...S.stats(), queue: queueLength() }));
app.route('/api', api);

// ---------- MCP (stateless Streamable HTTP)
app.all('/mcp', async (c) => {
  const server = buildMcpServer({ baseUrl: origin(c) });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

// ---------- llms.txt
app.get('/llms.txt', (c) => {
  const st = S.stats();
  const themes = S.listThemes();
  const txt = [`# Kiekkist`, '', `> Design studio memory: ${st.refs} references, ${st.boards} boards, ${st.themes} themes, ${st.judged} owner verdicts.`, '',
    'Agents: read the taste profile first, then use the MCP server at /mcp (bearer token) or the REST API at /api.', '',
    '## Start', `- [Taste profile](${origin(c)}/api/profile?format=md)`, `- [Sources](${origin(c)}/api/sources)`, '', '## Themes',
    ...themes.map((t) => `- [${t.name}](${origin(c)}/api/themes/${t.slug}): ${t.summary || ''} (${(t.industry || []).join(', ')}; ${(t.media || []).join(', ')}; check ${t.check_grade || '-'})`)].join('\n');
  return c.text(txt);
});

// ---------- UI
const page = (c, title, body, active) => c.html(V.layout({ title, body, active, stats: S.stats() }));
const form = async (c) => Object.fromEntries(Object.entries(await c.req.parseBody()).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
const industries = () => [...new Set(db.prepare('SELECT industry FROM refs').all().flatMap((r) => JSON.parse(r.industry || '[]')))].sort();

app.get('/', (c) => {
  const q = c.req.query();
  const res = S.listRefs({ q: q.q, industry: q.industry, judgment: q.judgment, limit: 300 });
  return page(c, 'Library', V.libraryPage({ ...res, q: q.q, industry: q.industry, judgment: q.judgment, boards: S.listBoards(), industries: industries() }), 'library');
});
app.post('/ui/refs', async (c) => {
  const f = await form(c);
  const r = S.addRef({ url: f.url, industry: f.industry, tags: f.tags, mechanism: f.mechanism });
  const board = c.req.query('board') || f.board_id;
  if (board) S.addToBoard(board, { ref_id: r.id, note: f.mechanism || null });
  if (f.popup) return c.html(V.layout({ title: 'Saved', body: V.newRefPopup({ saved: { url: r.url, board } }), client: true }));
  return c.redirect(board ? '/boards/' + board : '/refs/' + r.id);
});
// small window opened by the board's bookmarklet ("Save to Kiekkist"): the add-reference form, prefilled
app.get('/ui/refs/new', (c) => {
  const q = c.req.query();
  const url = /^https?:\/\//i.test(q.url || '') ? String(q.url).slice(0, 2000) : '';
  const boards = S.listBoards();
  const board = boards.some((b) => b.id === q.board) ? q.board : '';
  return c.html(V.layout({ title: 'Collect', body: V.newRefPopup({ url, title: (q.title || '').slice(0, 200), board, boards }), client: true }));
});
app.get('/refs/:id', (c) => page(c, 'Reference', V.refPage(S.getRef(c.req.param('id')), S.listBoards()), 'library'));
app.post('/ui/refs/:id', async (c) => { const f = await form(c); S.updateRef(c.req.param('id'), f); return c.redirect('/refs/' + c.req.param('id')); });
app.post('/ui/refs/:id/recapture', (c) => { S.recapture(c.req.param('id')); return c.redirect('/refs/' + c.req.param('id')); });
app.post('/ui/refs/:id/delete', (c) => { S.deleteRef(c.req.param('id')); return c.redirect('/'); });
app.post('/ui/judge', async (c) => {
  if (!(c.req.header('content-type') || '').startsWith('application/json')) return c.json({ ok: false }, 415);
  const b = await body(c); return c.json(S.judge({ ...b, by: 'till' }) ? { ok: true } : { ok: false });
});

app.get('/boards', (c) => page(c, 'Boards', V.boardsPage(S.listBoards()), 'boards'));
app.post('/ui/boards', async (c) => { const b = S.createBoard(await form(c)); return c.redirect('/boards/' + b.id); });
app.post('/ui/boards/add', async (c) => { const f = await form(c); S.addToBoard(f.board_id, { ref_id: f.ref_id }); return c.redirect('/boards/' + f.board_id); });
app.get('/boards/:id', (c) => { const b = S.getBoard(c.req.param('id')); b.compare = S.lastCompare(b.id); return page(c, 'Board', V.boardPage(b, { origin: origin(c), tag: c.req.query('tag') || '', view: c.req.query('view') === 'mobile' ? 'mobile' : 'desktop' }), 'boards'); });
const boardBack = (id, f, anchor) => { const p = new URLSearchParams(); if (f.tag) p.set('tag', f.tag); if (f.view === 'mobile') p.set('view', 'mobile'); const s = p.toString(); return `/boards/${encodeURIComponent(id)}${s ? '?' + s : ''}${anchor ? '#' + anchor : ''}`; };
app.post('/ui/boards/:id/refs/:ref/move', async (c) => {
  const f = await form(c); const ref = c.req.param('ref');
  const position = f.position !== '' && f.position !== undefined ? f.position : undefined;
  S.moveBoardRef(c.req.param('id'), ref, { dir: position === undefined ? f.dir : undefined, position, tag: f.tag || undefined });
  return c.redirect(boardBack(c.req.param('id'), f, position === undefined && (f.dir === 'up' || f.dir === 'down') ? `mv-${ref}-${f.dir}` : `ref-${ref}`));
});
app.post('/ui/boards/:id/refs/:ref/remove', async (c) => { const f = await form(c); S.removeFromBoard(c.req.param('id'), c.req.param('ref')); return c.redirect(boardBack(c.req.param('id'), f)); });
app.post('/ui/boards/:id/compare', async (c) => { const f = await form(c); await S.runCompare({ board_id: c.req.param('id'), ignore: [f.ignore_h1 && 'h1', f.ignore_bg && 'background'].filter(Boolean) }).catch(() => {}); return c.redirect('/boards/' + c.req.param('id')); });
app.post('/ui/boards/:id/decide', async (c) => { const f = await form(c); S.decide(c.req.param('id'), { ...f, decided_by: 'owner' }); return c.redirect('/boards/' + c.req.param('id')); });
app.post('/ui/boards/:id/delete', (c) => { S.deleteBoard(c.req.param('id')); return c.redirect('/boards'); });

// client share view: read-only board + choose a direction
app.get('/s/:token', (c) => {
  const b = S.getBoard(c.req.param('token'));
  if (b.share_token !== c.req.param('token')) return c.notFound();
  return c.html(V.layout({ title: b.name, body: V.boardPage(b, { client: true }), client: true }));
});
app.post('/s/:token/decide', async (c) => {
  const b = S.getBoard(c.req.param('token'));
  if (b.share_token !== c.req.param('token')) return c.notFound();
  const f = await form(c); S.decide(b.id, { ...f, decided_by: 'client' });
  return c.redirect('/s/' + b.share_token);
});

app.get('/themes', (c) => page(c, 'Themes', V.themesPage(S.listThemes(c.req.query())), 'themes'));
app.get('/themes/:slug', (c) => page(c, 'Theme', V.themePage(S.getTheme(c.req.param('slug'))), 'themes'));
app.post('/ui/themes/:slug', async (c) => { const f = await form(c); S.updateTheme(c.req.param('slug'), { note: f.note }); return c.redirect('/themes/' + c.req.param('slug')); });
app.post('/ui/themes/:slug/check', async (c) => { await S.runCheck({ theme: c.req.param('slug') }).catch(() => {}); return c.redirect('/themes/' + c.req.param('slug')); });
app.post('/ui/themes/:slug/delete', (c) => { S.deleteTheme(c.req.param('slug')); return c.redirect('/themes'); });
app.get('/sources', async (c) => { const q = c.req.query(); const gallery = q.gq !== undefined ? await (await import('./gallery.js')).searchGallery({ q: q.gq, free: q.gfree || undefined }) : null; return page(c, 'Sources', V.sourcesPage(S.listSources({ industry: q.industry, kind: q.kind }), { gallery, gq: q.gq || '' }), 'sources'); });
app.get('/profile', (c) => page(c, 'Taste', V.profilePage(S.profileMarkdown()), 'profile'));

// resume unfinished captures after restart
for (const r of db.prepare("SELECT id FROM refs WHERE status IN ('queued','capturing')").all()) enqueueCapture(r.id);
// Refs queued by other processes (seed, CLI against the same data dir) are picked up regularly.
setInterval(() => { for (const r of db.prepare("SELECT id FROM refs WHERE status='queued'").all()) enqueueCapture(r.id); }, 20000).unref();

const port = +(process.env.PORT || 4410);
// keep the curated source list current on every start (upsert only; own additions stay)
try {
  const { readFileSync: rf, existsSync: ex } = await import('node:fs');
  const f = new URL('../seed/sources.json', import.meta.url);
  if (ex(f) && process.env.KK_SOURCES_SYNC !== 'off') { const list = JSON.parse(rf(f, 'utf8')); for (const s of list.sources || list) S.upsertSource(s); }
} catch (e) { console.error('[kiekkist] source sync failed:', e.message); }
serve({ fetch: app.fetch, port, hostname: process.env.HOST || '0.0.0.0' }, (i) => console.log(`[kiekkist] http://localhost:${i.port}  data=${DATA_DIR}`));
export default app;
