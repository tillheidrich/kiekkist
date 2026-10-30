// Mobile evidence ("Handy-Nachweis"), Node side: the lab performance run with Lighthouse's Moto G Power
// profile, transfer budgets, LCP image rules, image sizes, font-swap shift, and the report section `mobile`.
// Browser-side functions: mobile-probe.js. Thresholds, evidence class and sources: knowledge/packs/tells.json,
// group "mobile"; numbers and studies behind them: knowledge/packs/evidence.json (item ids in each pack item).
// Severity policy: only items with evidence class S may be errors; P, H, M and D items stay warnings or info.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve as resolvePath, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { perfInit, perfIdle, perfRead, perfScroll } from './mobile-probe.js';

/** Lighthouse mobile emulation (moto g power 2022) and its simulated slow-4G / 4x CPU values, applied via CDP. */
export const PROFILE = {
  name: 'Moto G Power',
  width: 412, height: 823, dpr: 1.75,
  latency: 562.5, // 150 ms RTT x 3.75 (DevTools request-level adjustment)
  download: 188743, // 1,638.4 kbps x 0.9 x 1024 / 8 bytes/s
  upload: 86400, // 750 kbps x 0.9 x 1024 / 8 bytes/s
  cpu: 4,
};
export const PROFILE_TEXT = 'Moto G Power 412x823 @1.75x, slow 4G (562.5 ms latency, 1.47 Mbit/s down, 0.68 Mbit/s up), CPU 4x';
export const LAB_NOTE = 'lab, first-party only, Moto G Power profile, slow 4G, CPU 4x; approximates a p75 phone, not Core Web Vitals field data';

/** Rules in group "mobile" plus earlier checks the mobile section reuses instead of duplicating. */
export const MOBILE_RULES = [
  'lab-lcp', 'lab-cls', 'lab-tbt', 'transfer-total', 'transfer-js', 'transfer-critical', 'font-files', 'font-format',
  'lcp-image-lazy', 'lcp-image-priority', 'lcp-image-discoverable', 'lcp-image-bytes', 'img-oversized', 'font-swap-shift',
  'hscroll-container', 'hover-only', 'sticky-share', 'cta-first-screen', 'cta-reach', 'first-screen-words-mobile', 'h1-first-screen',
  'body-size-mobile', 'line-length-mobile', 'target-spacing', 'overflow-360', 'vh-hero', 'phone-not-tappable', 'input-type',
];
const REUSED = ['zoom-disabled', 'page-overflow', 'reflow-320', 'input-font-size', 'target-size-mobile', 'focus-obscured', 'pause-control-missing', 'autoplay-audio', 'autocomplete-missing', 'hover-content'];

// Web Almanac 2025 median mobile home page, KB by type (D) [weight-median]
const WA_MEDIAN = { total: 2559, img: 911, js: 632, font: 122, css: 77, html: 22 };
const TYPE = { Document: 'html', Stylesheet: 'css', Script: 'js', Font: 'font', Image: 'img', Media: 'media' };
const KB = 1000;
const kb = (b) => Math.round(b / KB);

const TEXT_TYPES = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const BIN_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf' };

/**
 * Local loopback server for file and HTML targets, so the lab run goes through the network stack (throttling and
 * byte counts apply). Text files are gzipped, as a real host would. Only files under `root` are served.
 */
export async function serveLocal({ root, html }) {
  const base = root ? resolvePath(root) : null;
  const server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let body, type;
      if (html !== undefined && (p === '/' || p === '/index.html')) { body = Buffer.from(html); type = TEXT_TYPES['.html']; }
      else if (base) {
        const f = resolvePath(base, '.' + p);
        if (f !== base && !f.startsWith(base + sep)) throw new Error('outside');
        const s = await stat(f);
        if (!s.isFile()) throw new Error('not a file');
        body = await readFile(f);
        type = TEXT_TYPES[extname(f).toLowerCase()] || BIN_TYPES[extname(f).toLowerCase()] || 'application/octet-stream';
      } else throw new Error('no root');
      const headers = { 'content-type': type, 'cache-control': 'no-store' };
      if (Object.values(TEXT_TYPES).includes(type) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); headers['content-encoding'] = 'gzip'; }
      headers['content-length'] = body.length;
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  return {
    origin,
    urlFor: (file) => origin + '/' + relative(base, file).split(sep).map(encodeURIComponent).join('/'),
    close: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(() => ok()); }),
  };
}

const median = (a) => { const s = a.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** CLS as in the Web Vitals definition: largest session window (gaps < 1 s, window <= 5 s). */
export function clsOf(shifts) {
  let best = 0, cur = 0, start = -Infinity, last = -Infinity;
  for (const s of shifts.slice().sort((a, b) => a.t - b.t)) {
    if (s.t - last >= 1000 || s.t - start > 5000) { cur = 0; start = s.t; }
    cur += s.v; last = s.t;
    best = Math.max(best, cur);
  }
  return best;
}
/** TBT: blocking part (> 50 ms) of long tasks after FCP up to the quiet point. */
export function tbtOf(tasks, fcp, until = Infinity) {
  let sum = 0;
  for (const t of tasks) {
    const s = Math.max(t.t, fcp || 0), e = Math.min(t.t + t.d, until);
    if (e > s) sum += Math.max(0, e - s - 50);
  }
  return sum;
}

async function oneRun({ br, url, policy, cdpThrottle, quietMs = 1000, maxQuietMs = 15000, timeout = 45000, onRoute, scroll = false, waitFonts = false }) {
  const ctx = await br.newContext({
    viewport: { width: PROFILE.width, height: PROFILE.height }, deviceScaleFactor: PROFILE.dpr, isMobile: true, hasTouch: true,
    serviceWorkers: 'block', reducedMotion: 'no-preference',
    userAgent: `Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${br.version().split('.')[0]}.0.0.0 Mobile Safari/537.36`,
  });
  try {
    const isTainted = await policy(ctx);
    if (onRoute) await onRoute(ctx);
    await ctx.addInitScript(perfInit);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const reqs = new Map();
    let inflight = 0, lastNet = Date.now();
    cdp.on('Network.requestWillBeSent', (e) => { if (!reqs.has(e.requestId)) { inflight++; reqs.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0, done: false }); } lastNet = Date.now(); });
    cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.type = e.type || r.type; r.mime = e.response.mimeType; r.status = e.response.status; r.url = e.response.url || r.url; } });
    cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r && !r.done) { r.done = true; r.bytes = e.encodedDataLength; inflight--; } lastNet = Date.now(); });
    cdp.on('Network.loadingFailed', (e) => { const r = reqs.get(e.requestId); if (r && !r.done) { r.done = true; r.failed = true; inflight--; } lastNet = Date.now(); });
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (cdpThrottle) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: PROFILE.latency, downloadThroughput: PROFILE.download, uploadThroughput: PROFILE.upload });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpu });
    }
    const t0 = Date.now();
    const resp = await page.goto(url, { waitUntil: 'load', timeout });
    // quiet: no request in flight for quietMs and no long task for quietMs (Lighthouse networkQuiet / cpuQuiet), at most maxQuietMs
    const tl = Date.now();
    // font swap run: requests held back by a route do not count as in flight, so wait for the fonts themselves
    if (waitFonts) await page.evaluate((ms) => Promise.race([document.fonts ? document.fonts.ready : null, new Promise((r) => setTimeout(r, ms))]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))), maxQuietMs).catch(() => {});
    for (;;) {
      const idle = await page.evaluate(perfIdle).catch(() => 1e9);
      if ((inflight <= 0 && Date.now() - lastNet >= quietMs && idle >= quietMs) || Date.now() - tl > maxQuietMs) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const read = await page.evaluate(perfRead);
    const quietAt = await page.evaluate(() => performance.now());
    const transfer = [...reqs.values()].filter((r) => r.done && !r.failed && !/^data:/.test(r.url)).map((r) => ({ url: r.url, kind: TYPE[r.type] || 'other', bytes: r.bytes, mime: r.mime }));
    let rawHtml = null;
    try { rawHtml = resp ? await resp.text() : null; } catch { /* body gone */ }
    let after = null;
    if (scroll) { await page.evaluate(perfScroll).catch(() => {}); after = await page.evaluate(perfRead).catch(() => null); }
    return { read, quietAt, transfer, rawHtml, after, ms: Date.now() - t0, tainted: isTainted() };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * Lab run(s) on the phone profile. policy(ctx) installs the network policy and returns isTainted().
 * runs: number of throttled loads (median reported); fontSwap: extra run with font responses delayed (C6).
 */
export async function perfPass({ br, url, policy, runs = 1, fontSwap = false, cfg }) {
  const out = { profile: PROFILE.name, profile_text: PROFILE_TEXT, runs: [], errors: [] };
  let first = null;
  for (let i = 0; i < Math.max(1, runs); i++) {
    try {
      const r = await oneRun({ br, url, policy, cdpThrottle: true, scroll: i === 0 && runs > 1 });
      if (r.tainted) { out.errors.push('blocked: request to a non-public address'); return out; }
      const rd = r.read;
      out.runs.push({ lcp: rd.lcp, cls: +clsOf(rd.shifts).toFixed(4), tbt: Math.round(tbtOf(rd.longtasks, rd.fcp, r.quietAt)), fcp: rd.fcp, ttfb: rd.ttfb, ms: r.ms });
      if (i === 0) first = r;
    } catch (e) { out.errors.push(String(e.message || e).split('\n')[0].slice(0, 200)); }
  }
  if (!first) return out;
  out.lcp = median(out.runs.map((r) => r.lcp));
  out.cls = median(out.runs.map((r) => r.cls));
  out.tbt = median(out.runs.map((r) => r.tbt));
  out.fcp = median(out.runs.map((r) => r.fcp));
  out.shifts = first.read.shifts.filter((s) => s.v >= 0.001).slice(0, 5);
  if (first.after) out.clsScroll = +clsOf(first.after.shifts).toFixed(4);
  // transfer of the first run's initial load
  const by = { html: 0, css: 0, js: 0, font: 0, img: 0, media: 0, other: 0 };
  for (const t of first.transfer) by[t.kind] += t.bytes;
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  out.transfer = { total, by, requests: first.transfer.length, critical: by.html + by.css + by.font, median_kb: WA_MEDIAN };
  out.files = first.transfer;
  const fonts = first.transfer.filter((t) => t.kind === 'font');
  out.fonts = { files: fonts.length, bytes: by.font, nonWoff2: fonts.filter((f) => !/woff2/i.test(f.mime || '') && !/\.woff2(\?|#|$)/i.test(f.url)).map((f) => f.url.split('/').pop().slice(0, 60)), noDisplay: first.read.fontFaces.noDisplay, blockedSheets: first.read.fontFaces.blockedSheets };
  out.lcpEl = first.read.lcpEl;
  out.sub = first.read.sub;
  out.rawHtml = first.rawHtml;
  if (out.lcpEl && out.lcpEl.url && out.lcpEl.url !== 'data:') {
    const f = first.transfer.find((t) => t.url === out.lcpEl.url);
    out.lcpEl.bytes = f ? f.bytes : null;
  }
  // C6: font swap shift, fonts delayed, no throttling
  if (fontSwap && fonts.length) {
    const t = cfg.rules['font-swap-shift']?.threshold || {};
    const delay = t.delay_ms ?? 1500, win = t.window_ms ?? 200;
    try {
      const r = await oneRun({
        br, url, policy, cdpThrottle: false, quietMs: 600, maxQuietMs: delay + 4000, waitFonts: true,
        onRoute: (ctx) => ctx.route(/\.(woff2?|ttf|otf)(\?|#|$)/i, async (route) => { await new Promise((s) => setTimeout(s, delay)); await route.fallback(); }),
      });
      const ev = r.read.fonts.map((f) => f.t);
      // the relayout lands before the loadingdone event is dispatched (seen 5 to 40 ms earlier), so look back 100 ms
      const hit = r.read.shifts.filter((s) => ev.some((t0) => s.t >= t0 - 100 && s.t <= t0 + win));
      out.fontSwap = { shift: +hit.reduce((a, s) => a + s.v, 0).toFixed(4), delay_ms: delay, events: ev.length, nodes: [...new Set(hit.flatMap((s) => s.n))].slice(0, 3) };
    } catch (e) { out.errors.push('font swap run: ' + String(e.message || e).split('\n')[0].slice(0, 160)); }
  }
  return out;
}

/** Key for matching an image URL from the 390 page (file:) with the lab run (loopback http:). */
export function urlKey(u, { root, localOrigin } = {}) {
  try {
    const x = new URL(u);
    if (x.protocol === 'file:' && root) return relative(resolvePath(root), fileURLToPath(x)).split(sep).join('/');
    if (localOrigin && x.origin === localOrigin) return decodeURIComponent(x.pathname).replace(/^\//, '');
    return x.origin + x.pathname + x.search;
  } catch { return u; }
}

/** Byte sizes for the oversized-image check: lab run transfer first, then Resource Timing, then the file on disk. */
export async function imageBytes(images, { perf, root, localOrigin }) {
  const map = new Map();
  for (const f of (perf && perf.files) || []) map.set(urlKey(f.url, { root, localOrigin }), f.bytes);
  for (const im of images) {
    const k = urlKey(im.url, { root, localOrigin });
    if (map.has(k)) im.bytes = map.get(k);
    if (!im.bytes && root && im.url.startsWith('file:')) { try { im.bytes = (await stat(fileURLToPath(im.url))).size; } catch { /* missing */ } }
  }
  return images;
}

const s1 = (ms) => (ms / 1000).toFixed(1);
const de = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');

/** Turn lab and DOM measurements into findings (rule ids from the tells pack, group mobile). */
export function mobileFindings({ perf, images = [], cfg, vw = 390 }) {
  const out = [];
  const R = (id) => cfg.rules[id]?.threshold || {};
  const add = (rule, severity, detail, value, extra = {}) => out.push({ rule, severity, viewport: extra.viewport ?? vw, detail, value, ...extra });
  if (perf && perf.runs && perf.runs.length && perf.lcp !== undefined) {
    const n = perf.runs.length;
    const lab = `(lab, median of ${n} run${n > 1 ? 's' : ''}, ${PROFILE.name}, first-party only)`;
    const L = R('lab-lcp');
    if (perf.lcp !== null && perf.lcp > (L.warn_ms ?? 2500)) add('lab-lcp', perf.lcp > (L.error_ms ?? 4000) ? 'error' : 'warn', `Lab LCP ${s1(perf.lcp)} s ${lab}; good is ≤ ${s1(L.warn_ms ?? 2500)} s, poor > ${s1(L.error_ms ?? 4000)} s (Core Web Vitals thresholds, S)` + (perf.lcpEl ? `. LCP element: ${perf.lcpEl.kind} ${perf.lcpEl.selector || ''}` : '') + (perf.sub ? `; TTFB ${perf.sub.ttfb} ms` + (perf.sub.loadDelay !== undefined ? `, load delay ${perf.sub.loadDelay} ms, download ${perf.sub.download} ms` : '') + `, render delay ${perf.sub.renderDelay} ms` : '') + '.', Math.round(perf.lcp), { viewport: PROFILE.width });
    const C = R('lab-cls');
    if (perf.cls > (C.warn ?? 0.1)) add('lab-cls', perf.cls > (C.error ?? 0.25) ? 'error' : 'warn', `Lab CLS ${perf.cls.toFixed(3)} ${lab}; good is ≤ ${C.warn ?? 0.1}, poor > ${C.error ?? 0.25} (S)` + (perf.shifts && perf.shifts.length ? '. Shifted: ' + [...new Set(perf.shifts.flatMap((s) => s.n))].slice(0, 3).join(', ') : '') + '.', perf.cls, { viewport: PROFILE.width });
    const B = R('lab-tbt');
    if (perf.tbt > (B.warn_ms ?? 200)) add('lab-tbt', perf.tbt > (B.error_ms ?? 600) ? 'error' : 'warn', `Lab Total Blocking Time ${perf.tbt} ms ${lab}; good is ≤ ${B.warn_ms ?? 200} ms, poor > ${B.error_ms ?? 600} ms (Lighthouse mobile scoring, S). Less JavaScript on the critical path.`, perf.tbt, { viewport: PROFILE.width });
  }
  if (perf && perf.transfer) {
    const T = perf.transfer;
    const budget = (rule, bytes, what, median) => {
      const t = R(rule);
      if (bytes > (t.warn_kb ?? Infinity) * KB) add(rule, 'warn', `${what} ${kb(bytes)} KB` + (bytes > (t.strong_kb ?? Infinity) * KB ? `, above the ${t.strong_kb} KB line` : `, above the ${t.warn_kb} KB house budget`) + (median ? ` (Web Almanac 2025 median ${median} KB, D)` : '') + ' (first-party only; third-party hosts are blocked by the check).', kb(bytes), { viewport: PROFILE.width });
    };
    budget('transfer-total', T.total, 'Transfer on first load', WA_MEDIAN.total);
    budget('transfer-js', T.by.js, 'JavaScript transfer', WA_MEDIAN.js);
    budget('transfer-critical', T.critical, 'HTML + CSS + fonts transfer', null);
    const F = R('font-files');
    const ff = perf.fonts;
    if (ff && (ff.files > (F.warn_files ?? 4) || ff.bytes > (F.warn_kb ?? 150) * KB)) {
      const strong = ff.files > (F.strong_files ?? 6) || ff.bytes > (F.strong_kb ?? 250) * KB;
      add('font-files', 'warn', `${ff.files} font files, ${kb(ff.bytes)} KB` + (strong ? ` (above ${F.strong_files ?? 6} files or ${F.strong_kb ?? 250} KB)` : ` (budget ${F.warn_files ?? 4} files / ${F.warn_kb ?? 150} KB, H)`) + '; Web Almanac 2025 median fonts 122 KB (D). Subset, use one variable file per family.', ff.files, { viewport: PROFILE.width });
    }
    if (ff && ff.nonWoff2.length) add('font-format', 'warn', `Font file(s) not in WOFF2: ${ff.nonWoff2.slice(0, 3).join(', ')} (65 % of font requests are WOFF2, Web Almanac 2025, D).`, ff.nonWoff2.length, { viewport: PROFILE.width });
    if (ff && ff.noDisplay.length) add('font-format', 'warn', `@font-face without font-display: ${ff.noDisplay.slice(0, 3).join(', ')}; text stays invisible up to 3 s while the font loads. Set font-display: swap (with a metric-matched fallback) or optional.`, ff.noDisplay.length, { viewport: PROFILE.width });
  }
  const el = perf && perf.lcpEl;
  if (el && (el.kind === 'img' || el.kind === 'background')) {
    const ref = el.selector || el.url;
    if (el.kind === 'img' && el.loading === 'lazy') add('lcp-image-lazy', 'error', `The LCP image ${ref} has loading="lazy": the browser waits for layout before fetching it (web.dev 2024; 16 % of mobile pages do this, Web Almanac 2025). Remove it and add fetchpriority="high".`, el.url, { viewport: PROFILE.width, selector: el.selector });
    if (el.kind === 'img' && el.fetchpriority !== 'high' && !el.preloaded) add('lcp-image-priority', 'warn', `The LCP image ${ref} has no fetchpriority="high" and no <link rel="preload" as="image"> (web.dev 2024, S).`, el.url, { viewport: PROFILE.width, selector: el.selector });
    let discoverable = el.kind === 'img';
    if (discoverable && perf.rawHtml) {
      const html = perf.rawHtml;
      const file = (el.url || '').split(/[?#]/)[0].split('/').pop();
      const cands = [el.src, ...(el.srcset || '').split(',').map((s) => s.trim().split(/\s+/)[0])].filter(Boolean);
      discoverable = cands.some((c) => html.includes(c)) || (!!file && html.includes(file));
    }
    if (!discoverable) add('lcp-image-discoverable', 'warn', el.kind === 'background' ? `The LCP image is a CSS background (${ref}); the preload scanner cannot find it. Median load delay on poor-LCP sites is 1,290 ms (web.dev 2024, D). Use an <img> in the HTML.` : `The LCP image ${ref} is not in the initial HTML (inserted by script); the preload scanner cannot find it (web.dev 2024, D).`, el.url, { viewport: PROFILE.width, selector: el.selector });
    const Bt = R('lcp-image-bytes');
    if (el.bytes && el.bytes > (Bt.warn_kb ?? 200) * KB) add('lcp-image-bytes', 'warn', `The LCP image weighs ${kb(el.bytes)} KB` + (el.bytes > (Bt.strong_kb ?? 400) * KB ? ` (above ${Bt.strong_kb ?? 400} KB)` : ` (budget ${Bt.warn_kb ?? 200} KB, H)`) + '; on most poor-LCP sites download is under 10 % of LCP, so fix discovery and TTFB first (D).', kb(el.bytes), { viewport: PROFILE.width, selector: el.selector });
  }
  // C5 oversized images
  {
    const t = R('img-oversized');
    const min = (t.min_waste_kib ?? 4) * 1024;
    let total = 0;
    const flagged = [];
    for (const im of images) {
      if (!im.bytes) continue;
      const waste = Math.round(im.bytes * (1 - Math.min(1, (im.needW * im.needH) / (im.nw * im.nh))));
      if (waste >= min) { total += waste; flagged.push({ ...im, waste }); }
    }
    flagged.sort((a, b) => b.waste - a.waste);
    for (const f of flagged.slice(0, 4)) add('img-oversized', 'warn', `Image ${f.nw}x${f.nh} shown at ${f.w}x${f.h}px; even at ${t.dpr_mobile ?? 3}x pixel density ${f.needW}x${f.needH} suffice: about ${Math.round(f.waste / 1024)} KiB wasted (Lighthouse "Properly size images" flags ≥ ${t.min_waste_kib ?? 4} KiB, S). Use srcset and sizes.`, Math.round(f.waste / 1024), { selector: f.selector });
    if (total > (t.total_kb ?? 300) * KB) add('img-oversized', 'warn', `Oversized images waste about ${kb(total)} KB on this page at ${vw}px (house line ${t.total_kb ?? 300} KB, H).`, kb(total));
  }
  if (perf && perf.fontSwap) {
    const t = R('font-swap-shift');
    const v = perf.fontSwap.shift;
    if (v > (t.warn ?? 0.02)) add('font-swap-shift', 'warn', `Layout shift ${v.toFixed(3)} when the web fonts arrive (fonts delayed ${perf.fontSwap.delay_ms} ms): ` + (v > (t.strong ?? 0.05) ? `more than ${t.strong ?? 0.05}` : `more than ${t.warn ?? 0.02}`) + ` of the 0.1 CLS budget (CLS S; font share H)` + (perf.fontSwap.nodes.length ? `; moved: ${perf.fontSwap.nodes.join(', ')}` : '') + '. Use a metric-matched fallback (size-adjust, ascent-override, descent-override) or font-display: optional, and preload the one or two critical files.', v, { viewport: PROFILE.width });
  }
  return out;
}

/** Report section `mobile`: lab numbers, transfer table, findings with evidence class, the German summary line. */
export function mobileSection({ hard, perf, scan, blocked = [], cfg, perfMode = false }) {
  const cls = (rule) => cfg.rules[rule]?.evidence || null;
  const findings = hard.filter((f) => MOBILE_RULES.includes(f.rule) || (REUSED.includes(f.rule) && (!f.viewport || f.viewport < 600)))
    .map((f) => ({ rule: f.rule, severity: f.severity, class: cls(f.rule), viewport: f.viewport, selector: f.selector, detail: f.detail, reused: !MOBILE_RULES.includes(f.rule) || undefined }));
  const third = blocked.filter((h) => h && h !== 'file:' && !/^[a-z-]+:$/.test(h));
  const ok = perf && perf.runs && perf.runs.length && perf.transfer;
  const n = ok ? perf.runs.length : 0;
  const thirdDe = third.length ? `; ${third.length} Drittanbieter-Host(s) blockiert: ${third.slice(0, 6).join(', ')}${third.length > 6 ? ' …' : ''}` : '';
  const thirdEn = third.length ? `; measured without ${third.length} blocked third-party host(s): ${third.slice(0, 6).join(', ')}${third.length > 6 ? ' …' : ''}` : '';
  let summary_de, summary_en;
  if (ok) {
    const lcp = perf.lcp === null ? 'n/a' : de(perf.lcp / 1000) + ' s';
    summary_de = `Handy-Nachweis: LCP ${lcp}, CLS ${de(perf.cls, 2)}, TBT ${perf.tbt} ms, Transfer ${kb(perf.transfer.total)} KB, Profil ${PROFILE.name}, gedrosselt (Labor, Median aus ${n} ${n > 1 ? 'Läufen' : 'Lauf'}, nur Erstanbieter${thirdDe})`;
    summary_en = `Mobile evidence: LCP ${perf.lcp === null ? 'n/a' : s1(perf.lcp) + ' s'}, CLS ${perf.cls.toFixed(2)}, TBT ${perf.tbt} ms, transfer ${kb(perf.transfer.total)} KB, profile ${PROFILE.name}, throttled (lab, median of ${n} run${n > 1 ? 's' : ''}, first-party only${thirdEn})`;
  } else {
    const why = perf && perf.errors && perf.errors.length ? perf.errors[0] : 'not run';
    summary_de = `Handy-Nachweis: Laborlauf nicht gemessen (${why})${thirdDe}`;
    summary_en = `Mobile evidence: lab run not measured (${why})${thirdEn}`;
  }
  return {
    profile: PROFILE_TEXT,
    note: LAB_NOTE + '. Third-party requests are blocked, so bytes and times describe the first-party page only and are optimistic for sites with embeds, tag managers or font CDNs. CPU throttling is not calibrated to the host (no benchmarkIndex).',
    mode: perfMode ? 'perf' : 'quick',
    lab: ok ? { lcp_ms: perf.lcp === null ? null : Math.round(perf.lcp), cls: perf.cls, tbt_ms: perf.tbt, fcp_ms: perf.fcp === null ? null : Math.round(perf.fcp), runs: perf.runs, ...(perf.clsScroll !== undefined ? { cls_after_scroll: perf.clsScroll } : {}), lcp_element: perf.lcpEl || null, lcp_parts: perf.sub || null } : null,
    transfer: ok ? { total_kb: kb(perf.transfer.total), requests: perf.transfer.requests, by_type_kb: Object.fromEntries(Object.entries(perf.transfer.by).map(([k, v]) => [k, kb(v)])), critical_kb: kb(perf.transfer.critical), web_almanac_2025_median_kb: WA_MEDIAN } : null,
    fonts: ok ? { files: perf.fonts.files, kb: kb(perf.fonts.bytes), non_woff2: perf.fonts.nonWoff2, no_font_display: perf.fonts.noDisplay, ...(perf.fontSwap ? { swap_shift: perf.fontSwap.shift } : { swap_shift: perfMode ? null : 'only with --perf' }) } : null,
    first_screen: scan ? { 390: scan[390] || null, 360: scan[360] || null } : null,
    blocked_hosts: third,
    errors: perf ? perf.errors : [],
    errors_count: findings.filter((f) => f.severity === 'error').length,
    warnings_count: findings.filter((f) => f.severity === 'warn').length,
    findings,
    summary: summary_de,
    summary_en,
  };
}
