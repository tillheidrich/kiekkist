// Targets for kk spec / kk motion / kk fidelity, inside the tool's egress model.
//
// Public http(s) pages (references) open in a guarded context: the browser's egress proxy (src/egress.js) connects
// only to public addresses, every request is checked again (guardContext) and a context that touched a non-public
// address produces no data (assertClean). Own builds are local: a file or folder is served on 127.0.0.1 (serveDir)
// and may load only from that origin. Loopback URLs (localhost, 127.0.0.0/8, ::1) count as own builds and are
// allowed only where the caller says so (CLI, local MCP server). Other private ranges are always refused
// (KK_ALLOW_PRIVATE=1 lifts that, as everywhere in the tool).
//
// Legal line: the tool measures (boxes, computed styles, timings) and takes screenshots into a working folder.
// It never stores a third-party page's HTML, scripts or stylesheets.
import net from 'node:net';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, basename, join, relative, sep } from 'node:path';
import { getBrowser, newSafeContext, isPublicUrl, isPrivateIp, assertClean } from '../browser.js';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
export function isLoopbackHost(host) {
  const h = String(host || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (LOOPBACK_HOSTS.has(h) || h.endsWith('.localhost')) return true;
  return net.isIPv4(h) && h.startsWith('127.');
}

/**
 * Classify a target without opening it.
 * @returns {{kind:'public'|'loopback'|'file'|'dir', url?:string, path?:string, root?:string, rel?:string}}
 */
export async function classifyTarget(raw, { allowLoopback = false, allowFiles = false } = {}) {
  const s = String(raw || '').trim();
  if (!s) throw new Error('target missing: pass a URL, an HTML file or a folder with index.html');
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[a-z]:[\\/]/i.test(s)) { // a scheme (Windows drive letters excluded)
    let u; try { u = new URL(s); } catch { throw new Error('invalid URL: ' + s); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('only http(s) URLs, files or folders: ' + u.protocol);
    if (isLoopbackHost(u.hostname)) {
      if (!allowLoopback) throw new Error('loopback URLs (own local builds) are only allowed from the CLI or the local MCP server');
      return { kind: 'loopback', url: u.href };
    }
    const host = u.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(host) && isPrivateIp(host) && process.env.KK_ALLOW_PRIVATE !== '1') throw new Error('blocked: non-public address ' + host);
    if (!(await isPublicUrl(u.href))) throw new Error('blocked: ' + u.hostname + ' does not resolve to a public address');
    return { kind: 'public', url: u.href };
  }
  if (!allowFiles) throw new Error('local files and folders are only allowed from the CLI or the local MCP server');
  const p = resolve(s);
  if (!existsSync(p)) throw new Error('not found: ' + p);
  if (statSync(p).isDirectory()) {
    if (!existsSync(join(p, 'index.html'))) throw new Error('folder has no index.html: ' + p);
    return { kind: 'dir', root: p, rel: 'index.html', path: join(p, 'index.html') };
  }
  return { kind: 'file', root: dirname(p), rel: basename(p), path: p };
}

/**
 * Open a classified target: returns { url, label, isPublic, newContext(opts), close() }.
 * Local files are served from their folder on 127.0.0.1 so root-relative paths work.
 */
// Own local builds need a browser without the egress proxy (it refuses loopback by design). Their contexts are
// locked to the build's own 127.0.0.1 origin by a route policy, so this browser never reaches anything else.
let localBrowser = null;
export async function getLocalBrowser() {
  if (localBrowser) { const b = await localBrowser; if (b.isConnected()) return b; }
  const { chromium } = await import('playwright');
  localBrowser = chromium.launch({ env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: '/tmp', LANG: 'de_DE.UTF-8' }, ...(process.env.KK_CHROMIUM_PATH ? { executablePath: process.env.KK_CHROMIUM_PATH } : {}) }).catch((e) => { localBrowser = null; throw e; });
  return localBrowser;
}
export async function closeLocalBrowser() { if (localBrowser) { try { (await localBrowser).close(); } catch {} localBrowser = null; } }

export async function openTarget(t) {
  const browser = t.kind === 'public' ? await getBrowser() : await getLocalBrowser();
  let srv = null, url = t.url;
  if (t.kind === 'file' || t.kind === 'dir') {
    const { serveDir } = await import('../export/serve.js');
    srv = await serveDir(t.root);
    url = srv.url + '/' + relative(t.root, t.path).split(sep).join('/').replace(/(^|\/)index\.html$/, '$1');
  }
  const origin = new URL(url).origin;
  const isPublic = t.kind === 'public';
  const blocked = new Set();
  async function newContext(opts = {}) {
    if (isPublic) return newSafeContext(browser, opts);
    // own build: only its own origin (and data/blob) may load; anything else is recorded as blocked
    const ctx = await browser.newContext({ serviceWorkers: 'block', ...opts });
    await ctx.route('**/*', (route) => {
      const r = route.request().url();
      if (/^(data|blob|about):/.test(r)) return route.continue();
      try { if (new URL(r).origin === origin) return route.continue(); blocked.add(new URL(r).host); } catch {}
      return route.abort('blockedbyclient');
    });
    return ctx;
  }
  return {
    url, isPublic, blocked,
    label: isPublic || t.kind === 'loopback' ? t.url : (t.kind === 'dir' ? t.root : t.path),
    newContext,
    clean: (ctx) => (isPublic ? assertClean(ctx) : Promise.resolve()),
    close: async () => { if (srv) await srv.close(); },
  };
}

// Reject-first cookie handling: measuring should not opt the measuring browser into tracking.
export async function quietOverlays(page) {
  const reject = /^(reject all|reject|decline|decline all|deny|only necessary|necessary only|nur notwendige|nur essenzielle|alle ablehnen|ablehnen|optionale ablehnen)$/i;
  try {
    const bt = page.getByRole('button', { name: reject }).first();
    if (await bt.isVisible({ timeout: 700 })) { await bt.click({ timeout: 1500 }); await page.waitForTimeout(400); }
  } catch {}
  const { dismissOverlays } = await import('../browser.js');
  await dismissOverlays(page);
}

export function slugOf(label) {
  const s = String(label).replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return (s.split(/[\\/]/).filter(Boolean).slice(-2).join('-') || 'target').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'target';
}

export function defaultOut(kind, label) { return resolve('.kiekkist', 'fidelity', slugOf(label), kind); }

export const VIEWPORTS = { 1440: 900, 1280: 800, 1024: 768, 768: 1024, 390: 844, 360: 780 };
export const viewportOf = (w) => ({ width: +w, height: VIEWPORTS[w] || (w < 600 ? 844 : 900) });
export const contextOpts = (w, extra = {}) => ({ viewport: viewportOf(w), deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600, locale: 'en-US', reducedMotion: 'no-preference', ...extra });

// Navigate and fail loudly: a blank screenshot of an unreachable page must never pass as a measurement.
export async function gotoChecked(page, url, opts = {}) {
  let err = null;
  const resp = await page.goto(url, { timeout: 45_000, ...opts }).catch((e) => { err = e; return null; });
  if (!resp && err && !/Timeout/i.test(String(err.message))) throw new Error(`could not load ${url}: ${String(err.message).split('\n')[0]} (public pages load through the egress guard: is outbound HTTP(S) allowed for this process?)`);
  if (resp && resp.status() >= 400) throw new Error(`${url} answered HTTP ${resp.status()}`);
  return resp;
}
