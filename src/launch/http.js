// HTTP/TLS checks with fetch and node:tls. Public targets only (SSRF guard re-checked on every redirect),
// unless the target is a local export folder served by kk itself.
import tls from 'node:tls';
import { isPublicUrl } from '../browser.js';
import { apexOf } from './dns.js';

export async function safeFetch(url, { allowLocal = false, method = 'GET', headers = {}, body, follow = true, timeout = 20000 } = {}) {
  let cur = url;
  for (let hop = 0; hop < 6; hop++) {
    if (!allowLocal && !(await isPublicUrl(cur))) throw Object.assign(new Error('blocked: non-public address ' + cur), { code: 'PRIVATE' });
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
    let res;
    try { res = await fetch(cur, { method, headers: { 'user-agent': 'kk-launch/1 (+launch check)', ...headers }, body, redirect: 'manual', signal: ctl.signal }); }
    finally { clearTimeout(t); }
    if (follow && res.status >= 300 && res.status < 400 && res.headers.get('location')) { cur = new URL(res.headers.get('location'), cur).href; method = method === 'POST' && res.status === 303 ? 'GET' : method; continue; }
    res.finalUrl = cur;
    return res;
  }
  throw new Error('too many redirects: ' + url);
}
const status = async (url, o) => { try { const r = await safeFetch(url, o); const ct = r.headers.get('content-type') || ''; const buf = Buffer.from(await r.arrayBuffer()); return { status: r.status, ct, body: buf, url: r.finalUrl, headers: r.headers }; } catch (e) { return { status: 0, error: e.message, ct: '', body: Buffer.alloc(0) }; } };

export function certInfo(host, port = 443) {
  return new Promise((res) => {
    const s = tls.connect({ host, port, servername: host, timeout: 10000, rejectUnauthorized: false }, () => {
      const c = s.getPeerCertificate(true);
      res({ authorized: s.authorized, error: s.authorizationError ? String(s.authorizationError) : null, validTo: c.valid_to ? new Date(c.valid_to) : null, issuer: c.issuer?.O || c.issuer?.CN || '', san: (c.subjectaltname || '').split(',').map((x) => x.trim().replace(/^DNS:/, '')) });
      s.end();
    });
    s.on('error', (e) => res({ error: e.code || e.message }));
    s.on('timeout', () => { s.destroy(); res({ error: 'timeout' }); });
  });
}
const sanCovers = (san, h) => san.some((n) => n === h || (n.startsWith('*.') && h.endsWith(n.slice(1)) && h.split('.').length === n.split('.').length));

export async function tlsChecks(url) {
  const F = [];
  const u = new URL(url), apex = apexOf(u.hostname);
  const c = await certInfo(u.hostname);
  if (c.error && !c.validTo) F.push({ id: 'tls.cert', severity: 'error', ok: false, detail: 'TLS connection failed: ' + c.error, evidence: u.hostname });
  else {
    const days = c.validTo ? Math.floor((c.validTo - Date.now()) / 86400000) : -1;
    const covers = sanCovers(c.san, apex) && sanCovers(c.san, 'www.' + apex);
    const ok = c.authorized && days > 14 && covers;
    F.push({ id: 'tls.cert', severity: ok ? 'pass' : 'error', ok, detail: `${c.authorized ? 'valid chain' : 'chain not trusted: ' + c.error}; issuer ${c.issuer}; ${days} days left; covers ${covers ? 'apex and www' : 'not both apex and www (' + c.san.join(', ') + ')'}`, evidence: u.hostname, issuer: c.issuer });
  }
  const http = await status(`http://${u.host}/`, { follow: false });
  const loc = http.headers?.get?.('location') || '';
  const redirOk = [301, 308].includes(http.status) && /^https:/.test(new URL(loc || '/', `http://${u.host}/`).href);
  F.push({ id: 'tls.redirect', severity: redirOk ? 'pass' : 'error', ok: redirOk, detail: http.status ? `http:// answers ${http.status}${loc ? ' → ' + loc : ''}` : 'http:// not reachable: ' + http.error, evidence: `http://${u.host}/` });
  // apex <-> www: one redirects to the other with 301/308
  const a = await status(`https://${apex}/`, { follow: false }), w = await status(`https://www.${apex}/`, { follow: false });
  const redirects = (r, to) => [301, 308].includes(r.status) && (r.headers?.get?.('location') || '').includes(to);
  const ok = (redirects(a, 'www.' + apex) && w.status === 200) || (redirects(w, '//' + apex) && a.status === 200) || (redirects(w, apex) && a.status === 200);
  F.push({ id: 'dns.web-redirect', severity: ok ? 'pass' : 'warn', ok, detail: `https://${apex}/ → ${a.status || a.error}${a.headers?.get?.('location') ? ' ' + a.headers.get('location') : ''}; https://www.${apex}/ → ${w.status || w.error}${w.headers?.get?.('location') ? ' ' + w.headers.get('location') : ''}`, evidence: apex });
  return F;
}

/** Security headers of the document response. */
export function headerChecks(headers, url) {
  const F = [], h = (n) => headers.get(n);
  const hsts = h('strict-transport-security'); const max = +(/max-age=(\d+)/i.exec(hsts || '')?.[1] || 0);
  F.push({ id: 'http.headers', key: 'hsts', severity: hsts && max >= 15552000 ? 'pass' : 'error', ok: !!hsts && max >= 15552000, detail: hsts ? `Strict-Transport-Security: ${hsts}${max < 15552000 ? ' (max-age below 15552000)' : ''}` : 'Strict-Transport-Security missing', evidence: url });
  const csp = h('content-security-policy');
  F.push({ id: 'http.headers', key: 'csp', severity: csp && !/unsafe-eval/.test(csp) ? 'pass' : 'warn', ok: !!csp && !/unsafe-eval/.test(csp), detail: csp ? `Content-Security-Policy present${/unsafe-eval/.test(csp) ? ' but allows unsafe-eval' : ''}` : 'Content-Security-Policy missing', evidence: url });
  for (const [n, test] of [['x-content-type-options', (v) => /nosniff/i.test(v)], ['referrer-policy', Boolean], ['permissions-policy', Boolean]]) {
    const v = h(n); F.push({ id: 'http.headers', key: n, severity: v && test(v) ? 'pass' : 'warn', ok: !!v && test(v), detail: v ? `${n}: ${v}` : `${n} missing`, evidence: url });
  }
  const fa = /frame-ancestors/i.test(csp || '') || !!h('x-frame-options');
  F.push({ id: 'http.headers', key: 'framing', severity: fa ? 'pass' : 'warn', ok: fa, detail: fa ? 'framing restricted (frame-ancestors or X-Frame-Options)' : 'no frame-ancestors in CSP and no X-Frame-Options', evidence: url });
  const server = h('server');
  if (server && /\d/.test(server)) F.push({ id: 'http.headers', key: 'server', severity: 'info', ok: false, detail: `Server header shows a version: ${server}`, evidence: url });
  return F;
}

export async function siteFileChecks(base, { allowLocal = false, sheet = {}, origin, icons = [] } = {}) {
  const F = [], o = { allowLocal };
  // robots
  const robots = await status(base + '/robots.txt', o);
  let sitemapUrls = [];
  if (robots.status !== 200) F.push({ id: 'seo.robots', severity: 'warn', ok: false, detail: `/robots.txt answers ${robots.status || robots.error}`, evidence: base + '/robots.txt' });
  else {
    const txt = robots.body.toString('utf8');
    const groups = txt.split(/\n(?=user-agent:)/i);
    const star = groups.find((g) => /user-agent:\s*\*/i.test(g)) || '';
    const blocksAll = /^\s*disallow:\s*\/\s*$/im.test(star);
    sitemapUrls = [...txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    F.push({ id: 'seo.robots', severity: blocksAll ? 'error' : sitemapUrls.length ? 'pass' : 'warn', ok: !blocksAll && sitemapUrls.length > 0, detail: blocksAll ? 'robots.txt blocks the whole site for all crawlers (Disallow: /)' : sitemapUrls.length ? `names sitemap ${sitemapUrls.join(', ')}` : 'robots.txt names no sitemap', evidence: base + '/robots.txt' });
    const ai = [...txt.matchAll(/user-agent:\s*(GPTBot|ClaudeBot|anthropic-ai|PerplexityBot|Google-Extended|CCBot|Applebot-Extended|Bytespider)/gi)].map((m) => m[1]);
    if (ai.length) F.push({ id: 'seo.robots', key: 'ai', severity: 'info', ok: true, detail: 'AI crawler rules for: ' + [...new Set(ai)].join(', '), evidence: base + '/robots.txt' });
  }
  // sitemap
  const smUrl = sitemapUrls.find((u) => { try { return new URL(u).origin === origin; } catch { return false; } }) || base + '/sitemap.xml';
  let sm = await status(smUrl, o);
  if (sm.status !== 200 && smUrl !== base + '/sitemap-index.xml') { const alt = await status(base + '/sitemap-index.xml', o); if (alt.status === 200) sm = alt; }
  const pageUrls = [];
  if (sm.status !== 200) F.push({ id: 'seo.sitemap', severity: 'warn', ok: false, detail: `sitemap not reachable (${smUrl}: ${sm.status || sm.error})`, evidence: smUrl });
  else {
    const xml = sm.body.toString('utf8');
    let locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    if (/<sitemapindex/i.test(xml)) { const subs = []; for (const s of locs.slice(0, 5)) { const r = await status(s.replace(/^https?:\/\/[^/]+/, base), o); subs.push(...[...r.body.toString('utf8').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])); } locs = subs; }
    const foreign = locs.filter((l) => { try { return new URL(l).hostname.replace(/^www\./, '') !== new URL(origin).hostname.replace(/^www\./, ''); } catch { return true; } });
    const sample = locs.slice(0, 20); const bad = [];
    for (const l of sample) { const r = await status(allowLocal ? l.replace(/^https?:\/\/[^/]+/, base) : l, o); if (r.status !== 200) bad.push(`${l} (${r.status || r.error})`); }
    pageUrls.push(...locs);
    const ok = /<(urlset|sitemapindex)/.test(xml) && !foreign.length && !bad.length;
    F.push({ id: 'seo.sitemap', severity: ok ? 'pass' : 'warn', ok, detail: `${locs.length} URLs${foreign.length ? `; ${foreign.length} not on this site (e.g. ${foreign[0]})` : ''}${bad.length ? `; not 200: ${bad.slice(0, 3).join(', ')}` : ''}`, evidence: sm.url || smUrl });
  }
  // 404
  const rnd = `/kk-404-${Math.random().toString(36).slice(2, 10)}`;
  const nf = await status(base + rnd, o);
  F.push({ id: 'seo.404', severity: nf.status === 404 && /html/.test(nf.ct) ? 'pass' : 'warn', ok: nf.status === 404, detail: nf.status === 404 ? `random path answers 404${/html/.test(nf.ct) ? ' with an HTML page' : ' (not HTML)'}` : `random path answers ${nf.status || nf.error} (soft 404)`, evidence: base + rnd });
  // favicon
  const fav = await status(base + '/favicon.ico', o);
  const hasIcon = icons.some((i) => /icon/.test(i.rel)), hasApple = icons.some((i) => /apple-touch-icon/.test(i.rel));
  F.push({ id: 'seo.favicon', severity: 'info', ok: (fav.status === 200 || hasIcon) && hasApple, detail: `favicon: ${fav.status === 200 ? '/favicon.ico' : hasIcon ? 'linked icon' : 'missing'}; apple-touch-icon: ${hasApple ? 'linked' : 'missing'}`, evidence: base });
  // llms.txt
  if (sheet.llms_txt) {
    const l = await status(base + '/llms.txt', o);
    const links = l.status === 200 ? [...l.body.toString('utf8').matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]) : [];
    const ok = l.status === 200 && /text\/(plain|markdown)/.test(l.ct) && links.length <= 50;
    F.push({ id: 'seo.llms', severity: 'info', ok, detail: l.status === 200 ? `${links.length} links, ${l.ct}` : `/llms.txt answers ${l.status || l.error} (the sheet says llms_txt: true)`, evidence: base + '/llms.txt' });
  }
  if (sheet.monitor_url) { const m = await status(sheet.monitor_url, {}); F.push({ id: 'ops.monitor', severity: 'info', ok: m.status === 200, detail: `status page ${m.status || m.error}`, evidence: sheet.monitor_url }); }
  return { findings: F, sitemapUrls: pageUrls };
}
export { status as fetchStatus };
