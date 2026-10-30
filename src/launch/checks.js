// Turn crawl records into findings (catalogue: kk launch spec 2.2; IDs match knowledge/packs/privacy-eu.json check_id).
// Finding = { id, severity: 'error'|'warn'|'info'|'pass', ok, detail, evidence }

export const TRACKERS = ['google-analytics.com', 'googletagmanager.com', 'analytics.google.com', 'doubleclick.net', 'connect.facebook.net', 'facebook.com/tr', 'px.ads.linkedin.com', 'snap.licdn.com', 'clarity.ms', 'hotjar.com', 'hotjar.io', 'bat.bing.com', 'mouseflow.com', 'luckyorange.com', 'tiktok.com/i18n/pixel', 'analytics.tiktok.com', 'static.ads-twitter.com', 'cdn.segment.com', 'mixpanel.com', 'fullstory.com', 'matomo.cloud', 'plausible.io', 'cloudflareinsights.com'];
export const CAPTCHA = ['google.com/recaptcha', 'gstatic.com/recaptcha', 'recaptcha.net', 'hcaptcha.com', 'challenges.cloudflare.com'];
export const CLAIMS = [
  /DSGVO[-\s]?konform\s+garantiert/i, /garantiert\s+DSGVO[-\s]?konform/i, /100\s*%\s*(DSGVO|rechts)[-\s]?sicher/i, /100\s*(Prozent|%)\s*rechtssicher/i, /abmahnsicher/i, /DSGVO[-\s]?zertifiziert/i,
  /BFSG[-\s]?konform\s+garantiert/i, /barrierefrei\s+(garantiert|zertifiziert)/i, /garantiert\s+barrierefrei/i,
  /fully\s+GDPR[-\s]compliant/i, /guaranteed\s+(GDPR[-\s])?compliant/i, /100\s*%\s*GDPR/i, /GDPR[-\s]certified/i,
];
const PLACEHOLDER = /TODO\(owner\)|\[\s*(…|\.\.\.)\s*\]|\[\s*(eintragen|fill in)\s*:[^\]]*\]|\blorem\b|Musterstra(ß|ss)e|\bXXX\b|\bMax Mustermann\b/i;
const IMPRESSUM = /^(impressum|imprint|legal notice|anbieterkennzeichnung)$/i, PRIVACY = /^(datenschutz(erkl(ä|ae)rung|hinweise)?|privacy( policy| notice)?)$/i;

const MULTI = /\.(co|com|org|net|gov|ac)\.[a-z]{2}$/i;
export const siteOf = (host) => { const h = String(host).replace(/:\d+$/, '').toLowerCase(); if (/^[\d.]+$|^\[/.test(h)) return h; const p = h.split('.'); return p.slice(MULTI.test(h) ? -3 : -2).join('.'); };
const hostMatch = (u, pat) => { const s = u.replace(/^https?:\/\//, ''); const host = s.split(/[/?#]/)[0].toLowerCase(); if (pat.includes('/')) return s.startsWith(pat) || s.includes('.' + pat); return host === pat || host.endsWith('.' + pat); };
const pathOf = (u) => { try { const x = new URL(u); return x.pathname + x.search; } catch { return u; } };

export function pageChecks(crawl, sheet = {}, { aiImages = [] } = {}) {
  const F = [];
  const add = (id, severity, ok, detail, evidence) => F.push({ id, severity: ok ? 'pass' : severity, ok, detail, evidence });
  const origin = crawl.origin, site = siteOf(new URL(origin).hostname);
  const allowHosts = new Map((sheet.allow_third_party || []).filter((a) => a && a.host).map((a) => [a.host, a.reason]));
  const storageAllow = new Set((sheet.storage_allow || []).map((s) => s.key));
  for (const p of crawl.pages.filter((p) => p.dom && p.status >= 400)) add('links.broken', 'warn', false, `internal link target answers ${p.status}`, p.url);
  const pages = crawl.pages.filter((p) => p.dom && p.status < 400);
  for (const p of crawl.pages.filter((p) => !p.dom)) add('crawl.page', 'warn', false, `could not load: ${p.error || 'status ' + p.status}`, p.url);
  // ---- privacy
  const foreignAll = new Map();
  for (const p of pages) {
    const foreign = p.requests.filter((r) => r.host && siteOf(r.host) !== site);
    const byHost = new Map(); for (const r of foreign) byHost.set(r.host, [...(byHost.get(r.host) || []), r]);
    const notAllowed = [...byHost.keys()].filter((h) => !allowHosts.has(h) || !['consent', 'contract'].includes(allowHosts.get(h)));
    for (const h of byHost.keys()) foreignAll.set(h, (foreignAll.get(h) || 0) + 1);
    add('privacy.third-party-requests', 'error', notAllowed.length === 0, notAllowed.length ? `requests to ${notAllowed.length} foreign host(s) on load: ${notAllowed.map((h) => `${h} (${byHost.get(h).length}x ${[...new Set(byHost.get(h).map((r) => r.type))].join('/')})`).join(', ')}` : byHost.size ? `only hosts allowed in the sheet: ${[...byHost.keys()].join(', ')}` : 'no request to another site', p.url);
    const fonts = p.requests.filter((r) => r.type === 'font' && siteOf(r.host) !== site);
    add('privacy.fonts-self-hosted', 'error', fonts.length === 0, fonts.length ? `fonts from ${[...new Set(fonts.map((f) => f.host))].join(', ')}` : 'all fonts from the own origin', p.url);
    const mixed = /^https:/.test(p.url) ? p.requests.filter((r) => /^http:/.test(r.url)) : [];
    if (/^https:/.test(origin)) add('http.mixed', 'error', mixed.length === 0, mixed.length ? `http: subresources: ${mixed.slice(0, 3).map((r) => r.url).join(', ')}` : 'no mixed content', p.url);
    const cookies = (p.cookies || []).filter((c) => !storageAllow.has(c.name));
    const keys = [...(p.storage?.localStorage || []).map((k) => ['localStorage', k]), ...(p.storage?.sessionStorage || []).map((k) => ['sessionStorage', k]), ...(p.storage?.indexedDB || []).map((k) => ['indexedDB', k])].filter(([, k]) => !storageAllow.has(k));
    add('privacy.storage-before-interaction', 'error', !cookies.length && !keys.length, cookies.length || keys.length ? `set before any interaction: ${[...cookies.map((c) => `cookie ${c.name} (${c.domain})`), ...keys.map(([s, k]) => `${s} ${k}`)].slice(0, 8).join(', ')}` : 'no cookie or storage key before interaction', p.url);
    const frames = (p.dom.iframes || []).filter((s) => s && s !== 'srcdoc' && !/^about:/.test(s) && siteOf(new URL(s, p.url).hostname) !== site);
    add('privacy.iframe-before-click', 'error', frames.length === 0, frames.length ? `third-party iframe(s) in the page at load: ${frames.slice(0, 3).join(', ')}` : 'no third-party iframe at load', p.url);
    const trackers = p.requests.filter((r) => TRACKERS.some((t) => hostMatch(r.url, t)));
    add('privacy.analytics-first-party', 'error', trackers.length === 0, trackers.length ? `known tracker hosts: ${[...new Set(trackers.map((t) => t.host))].join(', ')}` : 'no known tracker host', p.url);
    const cap = p.requests.filter((r) => CAPTCHA.some((t) => hostMatch(r.url, t)));
    if (cap.length) add('privacy.captcha-host', 'warn', false, `captcha loaded from ${[...new Set(cap.map((c) => c.host))].join(', ')} on load`, p.url);
  }
  // ---- legal
  const legalTargets = { impressum: new Set(), datenschutz: new Set() };
  for (const p of pages) {
    const imp = p.dom.links.filter((l) => IMPRESSUM.test(l.text) || /impressum|imprint/i.test(l.raw || ''));
    const dsg = p.dom.links.filter((l) => PRIVACY.test(l.text) || /datenschutz|privacy/i.test(l.raw || ''));
    imp.forEach((l) => legalTargets.impressum.add(l.href.split('#')[0])); dsg.forEach((l) => legalTargets.datenschutz.add(l.href.split('#')[0]));
    const missing = [!imp.length && 'Impressum', !dsg.length && 'Datenschutz'].filter(Boolean);
    const fragmentOnly = [...imp, ...dsg].filter((l) => (l.raw || '').startsWith('#'));
    add('legal.links', 'error', !missing.length && !fragmentOnly.length, missing.length ? `no link to ${missing.join(' and ')}` : fragmentOnly.length ? `legal link points to an anchor on the same page (${fragmentOnly.map((l) => l.raw).join(', ')}), not to a legal page` : 'links to Impressum and Datenschutz', p.url);
    const odr = p.dom.links.filter((l) => /ec\.europa\.eu\/consumers\/odr/i.test(l.href));
    if (odr.length) add('legal.odr-link', 'warn', false, 'link to the EU ODR platform (shut down on 20 July 2025): remove it', p.url);
    const claims = CLAIMS.map((re) => (re.exec(p.dom.text) || [])[0]).filter(Boolean);
    add('copy.compliance-claims', 'error', claims.length === 0, claims.length ? `promises the site cannot keep: ${claims.map((c) => `„${c}“`).join(', ')}. Say what was checked and when instead.` : 'no guarantee wording', p.url);
    for (const c of p.dom.chat || []) add('ai.chatbot-notice', 'warn', /\b(KI|AI)\b|künstliche Intelligenz|assistant|Assistent|Chatbot/i.test(c.text), `chat widget (${c.tag}${c.src ? ' ' + c.src : ''}) ${/\b(KI|AI)\b|künstliche Intelligenz|assistant|Assistent|Chatbot/i.test(c.text) ? 'says it is automated' : 'shows no AI notice before typing'} (heuristic)`, p.url);
    for (const img of p.dom.imgs || []) if (aiImages.some((a) => img.src.endsWith(a))) add('ai.image-label', 'warn', /\b(KI|AI)[- ]?(generiert|generated|Bild|image|erstellt)|künstliche Intelligenz/i.test(img.context), `${img.src.split('/').pop()} is marked AI: ${/\b(KI|AI)[- ]?(generiert|generated|Bild|image|erstellt)|künstliche Intelligenz/i.test(img.context) ? 'labelled' : 'no visible label in its figure/section'}`, p.url);
  }
  const byUrl = new Map(crawl.pages.map((p) => [p.url.split('#')[0], p]));
  for (const [kind, set] of Object.entries(legalTargets)) {
    for (const u of set) {
      const p = byUrl.get(u) || byUrl.get(u.replace(/\/$/, '')) || byUrl.get(u + '/');
      if (!p) { F.push({ id: 'legal.links', severity: 'info', ok: true, detail: `${kind} page not crawled (raise --pages): ${u}`, evidence: u }); continue; }
      add('legal.links', 'error', p.status === 200, `${kind} page answers ${p.status || p.error}`, u);
      if (!p.dom) continue;
      const ph = PLACEHOLDER.exec(p.dom.text);
      add('legal.placeholders', 'error', !ph, ph ? `placeholder text on the ${kind} page: „${ph[0]}“` : `no placeholder on the ${kind} page`, u);
      if (kind === 'impressum') {
        const mail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(p.dom.text) || p.dom.links.some((l) => /^mailto:/i.test(l.raw || ''));
        const addr = /\b\d{5}\b/.test(p.dom.text);
        add('legal.impressum-shape', 'warn', mail && addr, `${mail ? 'email present' : 'no email address'}; ${addr ? 'postcode present' : 'no street/postcode pattern'}`, u);
      }
      if (kind === 'datenschutz') {
        const names = [...(sheet.processors || []).map((x) => (typeof x === 'string' ? x : x?.name)), ...(sheet.accounts || []).map((a) => a?.provider)].filter(Boolean);
        const missing = [...new Set(names)].filter((n) => !p.dom.text.toLowerCase().includes(String(n).toLowerCase()));
        if (names.length) add('legal.processors-in-policy', 'error', missing.length === 0, missing.length ? `not named in the privacy policy: ${missing.join(', ')}` : `all ${names.length} processors named`, u);
      }
    }
  }
  if (!legalTargets.datenschutz.size && !(sheet.processors || []).length) { /* reported by legal.links */ }
  if (sheet.bfsg === true) {
    const a11y = pages.some((p) => p.dom.links.some((l) => /barrierefrei|accessibility|barrierefreiheit/i.test(l.text + ' ' + (l.raw || ''))));
    add('legal.a11y-statement', 'warn', a11y, a11y ? 'accessibility statement linked' : 'the sheet says the BFSG applies, but no page links an accessibility statement', origin);
  }
  // ---- search
  const titles = new Map(), descs = new Map();
  for (const p of pages) {
    const d = p.dom, t = (d.title || '').trim(), ds = (d.description || '').trim();
    titles.set(t, [...(titles.get(t) || []), p.url]); descs.set(ds, [...(descs.get(ds) || []), p.url]);
    add('seo.title', 'warn', t.length >= 30 && t.length <= 65, t ? `${t.length} characters: „${t}“` : 'no <title>', p.url);
    add('seo.description', 'warn', ds.length >= 70 && ds.length <= 170, ds ? `${ds.length} characters` : 'no meta description', p.url);
    add('seo.h1', 'warn', d.h1 === 1, `${d.h1} h1 element(s)`, p.url);
    const can = d.canonical;
    add('seo.canonical', 'warn', !!can && /^https?:/.test(can) && new URL(can).origin === new URL(p.finalUrl || p.url).origin, can ? `canonical ${can}${pathOf(can) !== pathOf(p.finalUrl || p.url) ? ' (not this URL: intended?)' : ''}` : 'no canonical link', p.url);
    const og = d.og; const ogMissing = ['title', 'description', 'image'].filter((k) => !og[k]);
    add('seo.og', 'warn', !ogMissing.length, ogMissing.length ? `missing og:${ogMissing.join(', og:')}` : `og:image ${og.image}`, p.url);
    for (const j of d.jsonld) {
      let ok = false, det;
      try { const o = JSON.parse(j); const arr = Array.isArray(o) ? o : o['@graph'] || [o]; ok = arr.every((x) => x['@type']) && !!(o['@context'] || arr[0]?.['@context']); const lb = arr.find((x) => /LocalBusiness|Store|Restaurant|Dentist|Attorney|RealEstateAgent|HomeAndConstructionBusiness|ProfessionalService/.test(String(x['@type']))); if (lb && !lb.address) { ok = false; det = `${lb['@type']} without address`; } det = det || `types: ${arr.map((x) => x['@type']).join(', ')}`; } catch (e) { det = 'JSON-LD does not parse: ' + e.message; }
      add('seo.jsonld', 'warn', ok, det, p.url);
    }
    // forms
    for (const f of d.forms) {
      const visible = f.fields.filter((x) => !['hidden', 'submit', 'button'].includes(x.type) && !x.honeypot);
      const unlabelled = visible.filter((x) => !x.labelled);
      const needAc = visible.filter((x) => /name|mail|tel|phone|telefon/i.test(x.name + x.type) && !x.autocomplete);
      const hp = f.fields.some((x) => x.honeypot);
      const foreignAction = f.action && /^https?:/.test(f.action) && siteOf(new URL(f.action).hostname) !== site;
      add('forms.static', 'warn', !unlabelled.length && !needAc.length && hp && !foreignAction, [unlabelled.length && `${unlabelled.length} field(s) without label`, needAc.length && `no autocomplete on ${needAc.map((x) => x.name || x.type).join(', ')}`, !hp && 'no honeypot field', foreignAction && `posts to another site: ${new URL(f.action).host}`].filter(Boolean).join('; ') || 'labels, autocomplete, honeypot present', p.url);
    }
  }
  for (const [t, urls] of titles) if (t && urls.length > 1) add('seo.title', 'warn', false, `same title on ${urls.length} pages: „${t}“`, urls.join(', '));
  for (const [t, urls] of descs) if (t && urls.length > 1) add('seo.description', 'warn', false, `same description on ${urls.length} pages`, urls.join(', '));
  // ---- perf
  if (crawl.perf) {
    if (crawl.perf.error) F.push({ id: 'perf.lab', severity: 'info', ok: false, detail: 'lab measurement failed: ' + crawl.perf.error, evidence: origin });
    else {
      const b = { lcp_ms: 2500, cls: 0.1, js_kb: 50, total_kb: 800, ...(sheet.budget || {}) };
      const over = Object.keys(b).filter((k) => crawl.perf[k] !== undefined && crawl.perf[k] > b[k]);
      add('perf.lab', 'warn', !over.length, `lab, 390 px, throttled (150 ms RTT, 1.6 Mbit/s, CPU 4x): LCP ${crawl.perf.lcp_ms} ms, CLS ${crawl.perf.cls}, ${crawl.perf.total_kb} KB total, JS ${crawl.perf.js_kb} KB, ${crawl.perf.requests} requests${over.length ? ` (over budget: ${over.join(', ')})` : ''}`, origin);
    }
  }
  return { findings: F, foreignHosts: [...foreignAll.keys()] };
}
