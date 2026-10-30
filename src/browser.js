import { chromium } from 'playwright';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

let browserPromise = null;
export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const opts = {
        args: ['--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp', '--webrtc-ip-handling-policy=disable_non_proxied_udp'],
        env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: '/tmp', LANG: 'de_DE.UTF-8' }, // no KK_* secrets in the browser
      };
      if (process.env.KK_CHROMIUM_PATH) opts.executablePath = process.env.KK_CHROMIUM_PATH;
      if (process.env.KK_ALLOW_PRIVATE !== '1') {
        const { startEgress } = await import('./egress.js');
        opts.proxy = { server: `http://127.0.0.1:${await startEgress()}`, bypass: '<-loopback>' };
      }
      return chromium.launch(opts);
    })().catch((e) => { browserPromise = null; throw e; });
  }
  const b = await browserPromise;
  if (!b.isConnected()) { browserPromise = null; return getBrowser(); }
  return b;
}
// At most KK_MAX_CONTEXTS browser contexts at once for all callers (capture, shots, checks); close Chromium after idling.
const MAX = Math.max(1, +(process.env.KK_MAX_CONTEXTS || 2));
let active = 0; const waiting = []; let idleTimer = null;
export async function withContextSlot(fn) {
  if (active >= MAX) await new Promise((r) => waiting.push(r));
  active++; clearTimeout(idleTimer);
  try { return await fn(); }
  finally {
    active--; const next = waiting.shift(); if (next) next();
    if (!active && !waiting.length) idleTimer = setTimeout(() => { if (!active) closeBrowser(); }, 5 * 60_000).unref?.() ?? idleTimer;
  }
}
export async function closeBrowser() { if (browserPromise) { try { (await browserPromise).close(); } catch {} browserPromise = null; } }

// --- SSRF guard: only public http(s) targets, checked for every request the page makes (redirects included)
const blocked = new net.BlockList();
for (const [a, n] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) blocked.addSubnet(a, n, 'ipv4');
for (const [a, n] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['2001:db8::', 32], ['100::', 64], ['2002::', 16]]) blocked.addSubnet(a, n, 'ipv6');
function mappedV4(ip) { // ::ffff:a.b.c.d or ::ffff:7f00:1 -> a.b.c.d
  const m = ip.toLowerCase().match(/^::ffff:(?:0:)?(.+)$/);
  if (!m) return null;
  if (net.isIPv4(m[1])) return m[1];
  const h = m[1].match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!h) return null;
  const x = parseInt(h[1], 16), y = parseInt(h[2], 16);
  return [x >> 8, x & 255, y >> 8, y & 255].join('.');
}
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return blocked.check(ip, 'ipv4');
  if (net.isIPv6(ip)) { const v4 = mappedV4(ip); return v4 ? blocked.check(v4, 'ipv4') : blocked.check(ip, 'ipv6'); }
  return true;
}
const dnsCache = new Map();
export async function isPublicUrl(raw) {
  let u; try { u = new URL(raw); } catch { return false; }
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  if (process.env.KK_ALLOW_PRIVATE === '1') return true;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (net.isIP(host)) return !isPrivateIp(host);
  if (dnsCache.has(host)) return dnsCache.get(host);
  try {
    const addrs = await lookup(host, { all: true });
    const ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
    dnsCache.set(host, ok); setTimeout(() => dnsCache.delete(host), 60_000).unref?.();
    return ok;
  } catch { return false; }
}
// Route handler blocks direct requests. Redirect hops and WebSockets bypass page.route, so every request is
// also checked from the request event; a context that touched a private address is "tainted" and must not
// produce screenshots or data (assertClean). Network-level egress filtering is still recommended in production.
export async function guardContext(ctx) {
  ctx.kkTainted = null;
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    if (await isPublicUrl(url)) return route.continue();
    return route.abort('blockedbyclient');
  });
  const check = async (url) => { if (!/^(data|blob|about):/.test(url) && !(await isPublicUrl(url))) ctx.kkTainted = url; };
  ctx.on('request', (r) => { check(r.url()); });
  ctx.on('page', (p) => p.on('websocket', (ws) => check(ws.url().replace(/^ws/, 'http'))));
}
export async function assertClean(ctx) {
  await new Promise((r) => setTimeout(r, 50));
  if (ctx.kkTainted) throw new Error('blocked: the page requested a non-public address (' + String(ctx.kkTainted).slice(0, 80) + ')');
}
// A browser context for untrusted pages: guarded, no service workers.
export async function newSafeContext(browser, opts = {}) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', ...opts });
  await guardContext(ctx);
  return ctx;
}
// Run fn with a hard deadline; on timeout the context is closed so hung evaluate() calls are released.
export async function withDeadline(ms, ctxRef, fn) {
  let timer;
  try {
    return await Promise.race([fn(), new Promise((_, rej) => { timer = setTimeout(() => { ctxRef?.ctx?.close().catch(() => {}); rej(new Error('timeout after ' + ms / 1000 + ' s')); }, ms); })]);
  } finally { clearTimeout(timer); }
}

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export async function dismissOverlays(page) {
  const names = /^(accept all|accept|allow all|alle akzeptieren|akzeptieren|zustimmen|alle zulassen|agree|ok|got it|i agree|accept cookies|allow cookies|alle cookies akzeptieren|einverstanden|verstanden)$/i;
  try {
    const bt = page.getByRole('button', { name: names }).first();
    if (await bt.isVisible({ timeout: 800 })) { await bt.click({ timeout: 1500 }); await page.waitForTimeout(500); }
  } catch {}
  await page.evaluate(() => {
    for (const sel of ['#onetrust-consent-sdk', '#CybotCookiebotDialog', '#usercentrics-root', '.cky-consent-container', '#cookiebanner', '.cc-window', '#cmpbox', '#cmpbox2', '#BorlabsCookieBox', '.borlabs-cookie', '#cookie-law-info-bar', '.cookie-notice-container'])
      document.querySelectorAll(sel).forEach((e) => e.remove());
    for (const el of [...document.querySelectorAll('body *')]) {
      const cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && /cookie|datenschutz|privacy|consent/i.test(el.innerText || '') && (el.innerText || '').length < 2500) el.remove();
    }
    document.documentElement.style.overflow = 'auto'; document.body.style.overflow = 'auto';
  }).catch(() => {});
}

export async function settle(page, maxScroll = 5000) {
  for (let y = 0; y < maxScroll; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}
