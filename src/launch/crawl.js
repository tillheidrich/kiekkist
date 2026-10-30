// Crawl a site in a real browser and record what a visitor's browser does before any interaction:
// every request, cookies, storage keys, iframes, console errors, plus the DOM facts the checks need.
// Observe mode: nothing is clicked. URL mode uses the SSRF guard (public addresses only, redirects included).
import { chromium } from 'playwright';
import { guardContext, UA } from '../browser.js';

const PERF_INIT = `(() => { window.__kk = { lcp: 0, cls: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__kk.lcp = Math.max(window.__kk.lcp, e.renderTime || e.loadTime || e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__kk.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
})();`;

function domFacts() {
  const q = (s) => [...document.querySelectorAll(s)];
  const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute('content') || null;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const links = q('a[href]').map((a) => ({ href: a.href, raw: a.getAttribute('href'), text: (a.innerText || a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80), area: a.closest('footer') ? 'footer' : a.closest('header') ? 'header' : a.closest('nav') ? 'nav' : 'main' }));
  const forms = q('form').map((f) => ({ action: f.action, method: (f.method || 'get').toLowerCase(), fields: [...f.querySelectorAll('input, textarea, select')].map((i) => {
    const id = i.id; const label = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || i.closest('label');
    const hiddenish = i.type === 'hidden' || !vis(i) || i.getAttribute('aria-hidden') === 'true' || i.tabIndex < 0 || /honey|hp_|website|url_|_gotcha|leave.*blank/i.test(i.name || '');
    return { type: i.type || i.tagName.toLowerCase(), name: i.name || '', autocomplete: i.getAttribute('autocomplete') || '', labelled: !!label || !!i.getAttribute('aria-label') || !!i.getAttribute('aria-labelledby'), honeypot: hiddenish && i.type !== 'hidden' && i.type !== 'submit' };
  }) }));
  const imgs = q('img').map((i) => ({ src: i.currentSrc || i.src, alt: i.getAttribute('alt'), context: (i.closest('figure, section, article')?.innerText || '').slice(0, 400) }));
  const chat = q('iframe, [role=dialog], [class*=chat i], [id*=chat i]').filter((el) => vis(el) && (el.tagName === 'IFRAME' ? /chat|bot|intercom|tawk|crisp|drift|zendesk|livechat|userlike|tidio/i.test(el.src) : el.querySelector('input, textarea'))).map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || '').slice(0, 300), src: el.src || null }));
  return {
    url: location.href, title: document.title, description: meta('description'), robots: meta('robots'), lang: document.documentElement.lang,
    canonical: document.querySelector('link[rel=canonical]')?.href || null,
    og: { title: meta('og:title'), description: meta('og:description'), image: meta('og:image'), url: meta('og:url') },
    jsonld: q('script[type="application/ld+json"]').map((s) => s.textContent),
    h1: q('h1').length, links, forms, imgs, chat,
    icons: q('link[rel~=icon], link[rel=apple-touch-icon], link[rel=apple-touch-icon-precomposed]').map((l) => ({ rel: l.getAttribute('rel'), href: l.href })),
    iframes: q('iframe').map((f) => f.src || f.getAttribute('srcdoc') ? f.src || 'srcdoc' : ''),
    text: (document.body?.innerText || '').slice(0, 200000),
  };
}

async function storageKeys(page) {
  return page.evaluate(async () => {
    const out = { localStorage: [], sessionStorage: [], indexedDB: [] };
    try { for (let i = 0; i < localStorage.length; i++) out.localStorage.push(localStorage.key(i)); } catch {}
    try { for (let i = 0; i < sessionStorage.length; i++) out.sessionStorage.push(sessionStorage.key(i)); } catch {}
    try { out.indexedDB = (await indexedDB.databases()).map((d) => d.name); } catch {}
    return out;
  }).catch(() => ({ localStorage: [], sessionStorage: [], indexedDB: [] }));
}

/**
 * @param {object} o { start, pages=20, local=false, extraPaths=[], timeout=20000, total=300000, perf=true, sitemapUrls=[] }
 */
export async function crawl({ start, pages: max = 20, local = false, extraPaths = [], timeout = 20000, total = 300000, perf = true, sitemapUrls = [] }) {
  const t0 = Date.now();
  let origin = new URL(start).origin;
  const sameSite = (u) => { try { const a = new URL(u); return a.origin === origin; } catch { return false; } };
  const norm = (u) => { const x = new URL(u); x.hash = ''; return x.href; };
  const queue = [norm(start), ...extraPaths.map((p) => norm(new URL(p, start).href)), ...sitemapUrls.filter(sameSite).map(norm)];
  const seen = new Set(); const out = [];
  const browser = await chromium.launch();
  let perfResult = null;
  try {
    while (queue.length && out.length < max && Date.now() - t0 < total) {
      const url = queue.shift(); if (seen.has(url)) continue; seen.add(url);
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, serviceWorkers: 'block', locale: 'de-DE' });
      if (!local) await guardContext(ctx);
      const requests = [], consoleErrors = [];
      ctx.on('request', (r) => { const u = r.url(); if (/^(data|blob|about):/.test(u)) return; requests.push({ url: u, type: r.resourceType(), host: (() => { try { return new URL(u).host; } catch { return ''; } })() }); });
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error' && consoleErrors.length < 10) consoleErrors.push(m.text().slice(0, 200)); });
      page.on('pageerror', (e) => { if (consoleErrors.length < 10) consoleErrors.push(String(e.message).slice(0, 200)); });
      const rec = { url, status: 0, requests, consoleErrors };
      try {
        const res = await page.goto(url, { waitUntil: 'load', timeout });
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
        rec.status = res?.status() || 0;
        rec.headers = res ? await res.allHeaders() : {};
        rec.finalUrl = page.url();
        if (!out.length) { try { origin = new URL(rec.finalUrl).origin; seen.add(norm(rec.finalUrl)); } catch {} } // follow apex <-> www redirect of the start page
        rec.cookies = (await ctx.cookies()).map((c) => ({ name: c.name, domain: c.domain }));
        rec.storage = await storageKeys(page);
        rec.dom = await page.evaluate(domFacts);
        if (ctx.kkTainted) { rec.error = 'blocked: the page requested a non-public address'; rec.dom = null; }
        if (rec.dom) for (const l of rec.dom.links) if (sameSite(l.href) && !/\.(pdf|jpe?g|png|webp|zip|docx?|xlsx?)$/i.test(l.href) && ['header', 'footer', 'nav', 'main'].includes(l.area)) { const n = norm(l.href); if (!seen.has(n) && !queue.includes(n)) (l.area === 'main' ? queue.push(n) : queue.splice(Math.min(queue.length, 1), 0, n)); }
      } catch (e) { rec.error = String(e.message || e).split('\n')[0]; }
      finally { await ctx.close().catch(() => {}); }
      out.push(rec);
    }
    // lab performance: home page at 390 px, throttled network and CPU (Lighthouse-like mobile)
    if (perf) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, userAgent: UA, serviceWorkers: 'block' });
      if (!local) await guardContext(ctx);
      await ctx.addInitScript(PERF_INIT);
      const page = await ctx.newPage();
      const bytes = { total: 0, js: 0, requests: 0 };
      try {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const types = new Map();
        cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
        cdp.on('Network.loadingFinished', (e) => { bytes.total += e.encodedDataLength; bytes.requests++; if (types.get(e.requestId) === 'Script') bytes.js += e.encodedDataLength; });
        await page.goto(norm(start), { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(1500);
        const m = await page.evaluate(() => window.__kk);
        perfResult = { lcp_ms: Math.round(m?.lcp || 0), cls: Math.round((m?.cls || 0) * 1000) / 1000, total_kb: Math.round(bytes.total / 1024), js_kb: Math.round(bytes.js / 1024), requests: bytes.requests };
      } catch (e) { perfResult = { error: String(e.message || e).split('\n')[0] }; }
      finally { await ctx.close().catch(() => {}); }
    }
  } finally { await browser.close().catch(() => {}); }
  return { pages: out, perf: perfResult, origin, ms: Date.now() - t0, truncated: queue.length > 0 };
}
