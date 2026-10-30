// Browser-side mobile measurements (lab performance run, first screen, sticky chrome, reading size,
// side scrollers, hover-only content). Like probe.js, every exported function is serialised by
// Playwright and runs inside the page: no imports, no closures over module scope.
// Thresholds come from knowledge/packs/tells.json (group "mobile"), passed in as { t: { ruleId: threshold } }.

/** Init script for the lab run: LCP, layout shifts, long tasks, FCP and font load events (spec: Web Vitals, Lighthouse). */
export function perfInit() {
  if (window.__kk) return;
  const kk = (window.__kk = { lcp: null, lcpEl: null, lcpUrl: null, shifts: [], longtasks: [], fcp: null, fonts: [] });
  const po = (type, cb) => {
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) cb(e); }).observe({ type, buffered: true }); } catch { /* unsupported */ }
  };
  po('largest-contentful-paint', (e) => { kk.lcp = e.startTime; kk.lcpEl = e.element || null; kk.lcpUrl = e.url || null; });
  po('layout-shift', (e) => { if (!e.hadRecentInput) kk.shifts.push({ t: e.startTime, v: e.value, n: (e.sources || []).map((s) => s.node).filter(Boolean) }); });
  po('longtask', (e) => kk.longtasks.push({ t: e.startTime, d: e.duration }));
  po('paint', (e) => { if (e.name === 'first-contentful-paint') kk.fcp = e.startTime; });
  try {
    if (document.fonts) document.fonts.addEventListener('loadingdone', (ev) => kk.fonts.push({ t: performance.now(), n: (ev.fontfaces || []).map((f) => f.family) }));
  } catch { /* no FontFaceSet */ }
}

/** Milliseconds since the last long task ended (for the CPU-quiet wait). */
export function perfIdle() {
  const k = window.__kk;
  if (!k) return 1e9;
  let end = 0;
  for (const t of k.longtasks) end = Math.max(end, t.t + t.d);
  return performance.now() - end;
}

/** Read the lab metrics and describe the LCP element. */
export function perfRead() {
  const kk = window.__kk || { shifts: [], longtasks: [], fonts: [] };
  const sel = (el) => {
    if (!el || el.nodeType !== 1) return null;
    const parts = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 4 && e !== document.documentElement; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + e.id); break; }
      const cls = [...e.classList].slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const nav = performance.getEntriesByType('navigation')[0];
  const ttfb = nav ? nav.responseStart : null;
  let lcpEl = null, sub = null;
  const el = kk.lcpEl;
  if (el && el.nodeType === 1) {
    const c = getComputedStyle(el);
    const img = el.tagName === 'IMG' ? el : null;
    const bgm = /url\(["']?([^"')]+)["']?\)/.exec(c.backgroundImage || '');
    let url = img ? img.currentSrc || img.src : bgm ? new URL(bgm[1], document.baseURI).href : kk.lcpUrl || null;
    if (url && url.startsWith('data:')) url = 'data:';
    const preloads = [...document.querySelectorAll('link[rel~="preload"][as="image"]')].map((l) => (l.href || '') + ' ' + (l.getAttribute('imagesrcset') || ''));
    const file = url ? url.split(/[?#]/)[0].split('/').pop() : '';
    lcpEl = {
      tag: el.tagName.toLowerCase(),
      selector: sel(el),
      kind: img ? 'img' : el.tagName === 'VIDEO' ? 'video' : bgm ? 'background' : 'text',
      url,
      src: img ? img.getAttribute('src') : null,
      srcset: img ? img.getAttribute('srcset') || (el.parentElement && el.parentElement.tagName === 'PICTURE' ? [...el.parentElement.querySelectorAll('source')].map((s) => s.getAttribute('srcset')).join(', ') : null) : null,
      loading: img ? (img.getAttribute('loading') || '').toLowerCase() : null,
      fetchpriority: img ? (img.getAttribute('fetchpriority') || '').toLowerCase() : null,
      preloaded: !!file && preloads.some((p) => p.includes(url) || p.includes(file)),
      font: c.fontFamily,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    };
    const res = url && url !== 'data:' ? performance.getEntriesByName(url)[0] : null;
    if (res && ttfb !== null && kk.lcp) sub = { ttfb: Math.round(ttfb), loadDelay: Math.max(0, Math.round(res.startTime - ttfb)), download: Math.round(res.responseEnd - res.startTime), renderDelay: Math.max(0, Math.round(kk.lcp - res.responseEnd)) };
    else if (ttfb !== null && kk.lcp) sub = { ttfb: Math.round(ttfb), renderDelay: Math.max(0, Math.round(kk.lcp - ttfb)) };
  }
  // @font-face rules without font-display (same-origin sheets only)
  const noDisplay = []; let blockedSheets = 0; let faces = 0;
  const walk = (list) => {
    for (const r of list) {
      if (typeof CSSFontFaceRule !== 'undefined' && r instanceof CSSFontFaceRule) {
        faces++;
        if (!r.style.getPropertyValue('font-display')) noDisplay.push(r.style.getPropertyValue('font-family').replace(/["']/g, '').trim());
      } else if (r.cssRules) walk(r.cssRules);
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { blockedSheets++; } }
  return {
    lcp: kk.lcp, fcp: kk.fcp, ttfb,
    shifts: kk.shifts.map((s) => ({ t: s.t, v: s.v, n: s.n.map(sel).filter(Boolean).slice(0, 3) })),
    longtasks: kk.longtasks.slice(), fonts: kk.fonts.slice(),
    lcpEl, sub, fontFaces: { faces, noDisplay: [...new Set(noDisplay)], blockedSheets },
  };
}

/** Scroll slowly to the bottom (late shifts: lazy content, banners), then back to the top. */
export async function perfScroll() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = Math.max(200, Math.floor(innerHeight * 0.8));
  for (let i = 0, y = 0; i < 25; i++) {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (y >= max) break;
    y = Math.min(max, y + step);
    window.scrollTo(0, y);
    await sleep(150);
  }
  await sleep(500);
  window.scrollTo(0, 0);
  return true;
}

/**
 * DOM checks on a phone-sized page. o = { t, part: 'full' | 'first', dpr }.
 * 'first' (used at 360x780): first screen and horizontal overflow only.
 * 'full' (at 390x844): additionally sticky chrome, body size, line length, side scrollers, hover-only CSS,
 * 100vh hero, phone links, input types, target spacing and image sizes.
 */
export async function mobileScan(o) {
  const T = (o && o.t) || {};
  const th = (id) => T[id] || {};
  const part = (o && o.part) || 'full';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = innerHeight;
  const out = { vw, vh, findings: [], stats: {}, images: [] };
  const csC = new Map();
  const cs = (el) => { let c = csC.get(el); if (!c) { c = getComputedStyle(el); csC.set(el, c); } return c; };
  const sel = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 4 && e !== document.documentElement; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + CSS.escape(e.id)); break; }
      if (e === document.body) { parts.unshift('body'); break; }
      const cls = [...e.classList].filter((c) => !/^(is-|has-|js-)/.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.map((c) => CSS.escape(c)).join('.');
      const p = e.parentElement;
      if (p) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')'; }
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const push = (rule, severity, el, detail, value, extra) => out.findings.push({ rule, severity, selector: el ? sel(el) : undefined, detail, value, ...(extra || {}) });
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
      const c = cs(p);
      if (c.display === 'none' || c.visibility === 'hidden' || c.visibility === 'collapse' || parseFloat(c.opacity) < 0.05) return false;
    }
    return true;
  };
  const CONSENT = /cookie|consent|gdpr|dsgvo|privacy|datenschutz-?banner|cmp/i;
  const isConsent = (el) => {
    for (let p = el; p && p.nodeType === 1 && p !== document.body; p = p.parentElement) {
      if (CONSENT.test((p.id || '') + ' ' + (typeof p.className === 'string' ? p.className : '') + ' ' + (p.getAttribute('aria-label') || ''))) return true;
    }
    return false;
  };
  const words = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
  const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const lineBoxes = (el) => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const fs = parseFloat(cs(el).fontSize) || 16;
    const rows = [];
    for (const r of rg.getClientRects()) {
      if (r.width < 0.5 || r.height < 0.5 || r.height > fs * 3) continue;
      const mid = r.top + r.height / 2;
      if (!rows.some((x) => Math.abs(x - mid) < Math.max(3, fs * 0.45))) rows.push(mid);
    }
    return rows.length;
  };
  const cvx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  // any computed colour (rgb, oklch, lab, color()) -> [r, g, b, a]; the canvas does the conversion
  const rgba = (s) => {
    if (!s || s === 'transparent') return [0, 0, 0, 0];
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?/.exec(s);
    if (m) { let a = m[4] === undefined ? 1 : parseFloat(m[4]); if (m[5] === '%') a /= 100; return [+m[1], +m[2], +m[3], a]; }
    let a = 1, opaque = s;
    const am = /\/\s*([\d.]+)(%?)\s*\)\s*$/.exec(s);
    if (am) { a = parseFloat(am[1]) / (am[2] === '%' ? 100 : 1); opaque = s.replace(/\/\s*[\d.]+%?\s*\)\s*$/, ')'); }
    cvx.clearRect(0, 0, 1, 1); cvx.fillStyle = '#010203'; cvx.fillStyle = opaque; cvx.fillRect(0, 0, 1, 1);
    const d = cvx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], a];
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const groundOf = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const c = cs(p);
      if (c.backgroundImage && c.backgroundImage !== 'none') return null;
      const bg = rgba(c.backgroundColor);
      if (bg && bg[3] > 0.5) return bg;
    }
    return [255, 255, 255, 1];
  };
  const PRICE = /\d+(?:[.,]\d+)?\s?(?:€|EUR(?![A-Za-z]))|€\s?\d/;

  // fixed/sticky chrome glued to the top or bottom edge (bars only: at least 40 % of the width), consent dialogs apart
  const chrome = () => {
    const els = [];
    let consent = 0;
    for (const el of document.body.querySelectorAll('*')) {
      const p = cs(el).position;
      if (p !== 'fixed' && p !== 'sticky') continue;
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.4 || r.bottom <= 0 || r.top >= vh) continue;
      if (isConsent(el)) { consent = Math.max(consent, Math.min(r.bottom, vh) - Math.max(r.top, 0)); continue; }
      els.push({ el, top: Math.max(0, r.top), bottom: Math.min(vh, r.bottom) });
    }
    let top = 0, topEl = null;
    for (let changed = true; changed;) {
      changed = false;
      for (const e of els) if (e.top <= top + 1 && e.bottom > top + 0.5) { top = e.bottom; topEl = topEl || e.el; changed = true; }
    }
    let bot = vh, botEl = null;
    for (let changed = true; changed;) {
      changed = false;
      for (const e of els) if (e.bottom >= bot - 1 && e.top < bot - 0.5) { bot = e.top; botEl = botEl || e.el; changed = true; }
    }
    if (top >= bot) bot = top;
    return { top: Math.round(top), bottom: Math.round(vh - bot), topEl, botEl, consent: Math.round(consent) };
  };

  window.scrollTo(0, 0);
  await sleep(30);

  // ---------- C9 sticky chrome share (390 only) ----------
  if (part === 'full') {
    const t = th('sticky-share');
    const atRest = chrome();
    const docH = document.documentElement.scrollHeight;
    if (docH > vh * 1.5) {
      window.scrollTo(0, Math.round((docH - vh) * (t.scroll_at ?? 0.4)));
      await sleep(300);
      const down = chrome();
      window.scrollTo(0, Math.max(0, scrollY - 50));
      await sleep(200);
      const up = chrome();
      window.scrollTo(0, 0);
      await sleep(80);
      const share = down.top / vh, both = (down.top + down.bottom) / vh;
      out.stats.sticky = { top: down.top, bottom: down.bottom, topAtRest: atRest.top, hidesOnScrollDown: down.top < up.top - 4, consent: Math.max(atRest.consent, down.consent) };
      const warnS = t.warn_share ?? 0.15, strong = t.strong_share ?? 0.25, total = t.total_share ?? 0.3;
      if (share > warnS) push('sticky-share', 'warn', down.topEl, `Sticky/fixed chrome at the top covers ${Math.round(share * 100)} % of the 390x${vh} screen (${down.top}px) after scrolling` + (share > strong ? `, more than ${Math.round(strong * 100)} %: shrink or hide it on scroll-down` : `; keep it at ${Math.round(warnS * 100)} % or less`) + ' (content-to-chrome ratio, NN/g 2021, P; thresholds H).', +share.toFixed(3));
      else if (both > total) push('sticky-share', 'warn', down.botEl || down.topEl, `Sticky chrome at top and bottom together covers ${Math.round(both * 100)} % of the screen (${down.top}+${down.bottom}px), more than ${Math.round(total * 100)} % (P/H).`, +both.toFixed(3));
    } else out.stats.sticky = { top: atRest.top, bottom: atRest.bottom, short: true, consent: atRest.consent };
  }

  // ---------- C10/C11 first screen ----------
  {
    const rest = chrome();
    const limit = vh - rest.bottom;
    const CTA_TEXT = /kontakt|anfrage|anfragen|termin|angebot|anrufen|rückruf|buchen|bestellen|contact|book|call|quote/i;
    let best = null; const found = [];
    for (const el of document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], input[type="button"]')) {
      if (el.closest('[aria-hidden="true"]') || isConsent(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top < -0.5 || r.bottom > limit + 0.5 || r.left < -0.5 || r.right > vw + 0.5) continue;
      const href = (el.getAttribute('href') || '').toLowerCase();
      const text = ((el.innerText || el.value || el.getAttribute('aria-label') || '') + '').trim();
      const c = cs(el);
      const bg = rgba(c.backgroundColor);
      const g = groundOf(el);
      const filled = bg && bg[3] >= 0.9 && r.height >= 28 && r.height <= 90 && r.width >= 40 && (!g || dist(bg, g) > 30);
      const kind = filled ? 'filled' : href.startsWith('tel:') ? 'tel' : href.startsWith('mailto:') ? 'mailto' : CTA_TEXT.test(text) ? 'text' : null;
      if (!kind) continue;
      found.push({ el, r, kind, text: text.slice(0, 40) });
      if (!best || (best.kind !== 'filled' && kind === 'filled')) best = found[found.length - 1];
    }
    const s = { primary: found.length, first: best ? { selector: sel(best.el), kind: best.kind, text: best.text } : null, bottomChrome: rest.bottom };
    if (!found.length) push('cta-first-screen', 'warn', null, `No primary action, phone or contact link fully inside the first ${vw}x${vh} screen` + (rest.bottom ? ` (above the ${rest.bottom}px bottom bar)` : '') + '. 57 % of viewing time is above the fold, 74 % within two screens (NN/g 2018, M, measured on desktop).');
    else if (part === 'full') {
      const t = th('cta-reach');
      const ref = found.find((f) => f.kind === 'filled') || best;
      const pct = (ref.r.top + ref.r.height / 2) / vh;
      s.reachPct = Math.round(pct * 100);
      if (found.every((f) => { const p = (f.r.top + f.r.height / 2) / vh; return p < (t.top_share ?? 0.12) || p > 1 - (t.bottom_share ?? 0.05); }))
        push('cta-reach', 'info', ref.el, `Primary action sits only at ${s.reachPct} % of the screen height (header or bottom edge); the centre and lower middle are tapped most accurately (Hoober 2017, M). The thumb-zone heat map is not evidence.`, s.reachPct);
    }
    // words and H1
    let fw = 0;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const txt = n.textContent; if (!txt.trim()) continue;
      const pe = n.parentElement;
      if (!pe || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(pe.tagName) || pe.closest('[aria-hidden="true"]') || isConsent(pe) || !visible(pe)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rr = rg.getBoundingClientRect();
      if (rr.height < 1 || rr.bottom <= 0 || rr.top >= limit) continue;
      fw += words(txt);
    }
    s.words = fw;
    const tw2 = th('first-screen-words-mobile');
    if (part === 'full' && (fw < (tw2.min ?? 8) || fw > (tw2.max ?? 90))) push('first-screen-words-mobile', 'info', null, `${fw} words in the first ${vw}x${vh} screen (house range ${tw2.min ?? 8} to ${tw2.max ?? 90}, H): ` + (fw < (tw2.min ?? 8) ? 'too few to say who you are and what you offer.' : 'a wall of text; people read about 20 % of the words on a page (NN/g, M).'), fw);
    const h1 = [...document.querySelectorAll('h1')].find(visible);
    if (h1) {
      const r = h1.getBoundingClientRect();
      const lines = lineBoxes(h1);
      s.h1 = { lines, top: Math.round(r.top), bottom: Math.round(r.bottom) };
      const maxL = th('h1-first-screen').max_lines ?? 4;
      if (r.top < -0.5 || r.bottom > limit + 0.5 || lines > maxL) push('h1-first-screen', 'warn', h1, r.bottom > limit + 0.5 || r.top < -0.5 ? `H1 is not fully visible in the first ${vw}x${vh} screen (bottom edge at ${Math.round(r.bottom)}px of ${Math.round(limit)}px; H).` : `H1 wraps to ${lines} lines at ${vw}px (more than ${maxL}; H). Shorten it or reduce the size on phones.`, lines);
    }
    out.stats.firstScreen = s;
  }

  // ---------- C16 overflow at 360 ----------
  if (part === 'first') {
    const sw = document.documentElement.scrollWidth;
    const px = th('overflow-360').px ?? 1;
    if (sw > vw + px) {
      const culprits = [];
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.right <= vw + 1 || cs(el).position === 'fixed') continue;
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/(hidden|clip|auto|scroll)/.test(cs(p).overflowX) && p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; }
        if (clipped || culprits.some((c) => c.contains(el))) continue;
        culprits.push(el);
        if (culprits.length >= 3) break;
      }
      push('overflow-360', 'error', culprits[0] || null, `At 360x780 (4.5 % of German phone traffic) the page scrolls sideways by ${sw - vw}px` + (culprits.length ? '; sticking out: ' + culprits.map(sel).join(', ') : '') + ' (WCAG 1.4.10).', sw - vw, { wcag: '1.4.10' });
    }
    return out;
  }

  // ---------- C12 body text size ----------
  {
    const t = th('body-size-mobile');
    const sizes = [];
    for (const el of document.querySelectorAll('p, li, dd, td')) {
      if (el.closest('nav, [aria-hidden="true"]') || isConsent(el)) continue;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt.length < (t.min_chars ?? 40) || el.querySelector('p, li, dd, td, ul, ol') || !visible(el)) continue;
      sizes.push(parseFloat(cs(el).fontSize));
    }
    const m = median(sizes);
    out.stats.bodySize = m === null ? null : { median: m, n: sizes.length };
    if (m !== null && m < (t.warn_px ?? 16)) push('body-size-mobile', 'warn', null, `Median body text size at ${vw}px is ${m}px (${sizes.length} paragraphs)` + (m < (t.strong_px ?? 14) ? `, below ${t.strong_px ?? 14}px: hard to read on a phone` : `; use at least ${t.warn_px ?? 16}px`) + ' (browser default, Apple 17 pt, Material 16 sp, P; Rello 2016: comprehension improved up to 18 pt, M).', m);
  }

  // ---------- C13 line length on the phone ----------
  {
    const t = th('line-length-mobile');
    const cv = document.createElement('canvas').getContext('2d');
    const cpls = [];
    for (const el of document.querySelectorAll('p, li, dd, blockquote')) {
      if (el.closest('nav, pre, code, table, [aria-hidden="true"]') || isConsent(el)) continue;
      if (el.querySelector('p, li, dd, blockquote, ul, ol')) continue;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt.length < (t.min_chars ?? 120) || !visible(el)) continue;
      const c = cs(el);
      cv.font = `${c.fontStyle} ${c.fontWeight} ${c.fontSize} ${c.fontFamily}`;
      const cw = cv.measureText(txt).width / txt.length + (parseFloat(c.letterSpacing) || 0);
      const w = el.clientWidth - (parseFloat(c.paddingLeft) || 0) - (parseFloat(c.paddingRight) || 0);
      if (cw > 0 && w > 0) cpls.push(Math.round(w / cw));
    }
    const m = median(cpls);
    out.stats.lineLength = m === null ? null : { median: m, n: cpls.length };
    if (m !== null && (m < (t.min ?? 30) || m > (t.max ?? 75))) push('line-length-mobile', 'warn', null, `Median line length at ${vw}px is about ${m} characters (${cpls.length} paragraphs); aim for ${t.min ?? 30} to ${t.max ?? 75} on phones (Dyson 2004, M, contested; P).`, m);
  }

  // ---------- C7 horizontal scroll containers ----------
  {
    const t = th('hscroll-container');
    const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    let n = 0; const list = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (/^(PRE|CODE|TEXTAREA|SELECT|IFRAME)$/.test(el.tagName) || el.closest('pre, [aria-hidden="true"]')) continue;
      const c = cs(el);
      const scrollable = /(auto|scroll)/.test(c.overflowX) || /\bx\b|both|inline/.test(c.scrollSnapType || '');
      if (!scrollable || el.scrollWidth <= el.clientWidth + 1 || el.clientWidth < 100 || !visible(el)) continue;
      if (el.querySelector(':scope > table') || el.tagName === 'TABLE') continue; // data tables in a scroll wrapper are a known pattern
      n++;
      const cr = el.getBoundingClientRect();
      let kids = [...el.children];
      if (kids.length === 1 && kids[0].children.length > 1) kids = [...kids[0].children];
      const next = kids.find((k) => k.getBoundingClientRect().right > cr.right + 1);
      let peek = false;
      if (next) { const kr = next.getBoundingClientRect(); const shown = (cr.right - kr.left) / kr.width; peek = shown >= (t.peek_min ?? 0.15) && shown <= (t.peek_max ?? 0.85); }
      const area = el.parentElement || el;
      const arrows = [...area.querySelectorAll('button, [role="button"], a')].some((b) => !el.contains(b) && visible(b) && /next|prev|weiter|zurück|vor|nächste|vorherige|›|»|→|←|‹|«/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')));
      const keyboard = el.tabIndex >= 0 && el.hasAttribute('tabindex') || !!el.querySelector(FOCUSABLE);
      const txt = el.textContent || '';
      const essential = el.querySelector('a[href^="tel:"]') ? 'phone link' : el.querySelector('input, select, textarea, form') ? 'form field' : PRICE.test(txt) ? 'prices' : (el.closest('nav, [role="navigation"]') || el.querySelector('nav, [role="navigation"]')) ? 'main navigation' : null;
      const issues = [];
      if (!peek && !arrows) issues.push('no visual cue that it continues (no partly visible item, no arrows)');
      if (!keyboard) issues.push('not reachable by keyboard (no tabindex, nothing focusable inside; WCAG 2.1.1)');
      if (essential) issues.push(essential + ' hidden in a side scroller');
      if (issues.length) { list.push(sel(el)); if (list.length <= 4) push('hscroll-container', 'warn', el, `Horizontal scroller at ${vw}px: ${issues.join('; ')} (NN/g 2014: people miss content in side scrollers, P).`, issues.length); }
      if (n >= 20) break;
    }
    out.stats.hscroll = { containers: n, flagged: list.length };
  }

  // ---------- C8 hover-only content (CSSOM) ----------
  {
    const rules = []; let blocked = 0;
    const walk = (list, cond) => {
      for (const r of list) {
        if (r.selectorText !== undefined && r.style) rules.push({ r, cond });
        else if (typeof CSSMediaRule !== 'undefined' && r instanceof CSSMediaRule) walk(r.cssRules, (cond ? cond + ' and ' : '') + '(' + r.media.mediaText + ')');
        else if (r.cssRules) walk(r.cssRules, cond);
      }
    };
    for (const s of document.styleSheets) { try { walk(s.cssRules, s.media && s.media.mediaText ? '(' + s.media.mediaText + ')' : ''); } catch { blocked++; } }
    const split = (st) => { const res = []; let d = 0, cur = ''; for (const ch of st) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && !d) { res.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) res.push(cur.trim()); return res; };
    const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*([>+~])\s*/g, '$1').trim();
    const all = new Set();
    for (const { r } of rules) for (const p of split(r.selectorText)) all.add(norm(p));
    const reveals = (st) => {
      const d = st.getPropertyValue('display'), v = st.getPropertyValue('visibility'), op = st.getPropertyValue('opacity'), mh = st.getPropertyValue('max-height'), h = st.getPropertyValue('height'), cp = st.getPropertyValue('clip-path');
      return (d && d !== 'none') || v === 'visible' || (op !== '' && parseFloat(op) > 0.05) || (mh && !/^0(px|rem|em)?$/.test(mh) && mh !== 'none') || (h && !/^0(px|rem|em)?$/.test(h)) || (cp && cp !== 'none');
    };
    const hiddenNow = (el) => {
      const c = cs(el);
      const r = el.getBoundingClientRect();
      return c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05 || ((r.height < 2 || parseFloat(c.maxHeight) === 0) && /(hidden|clip)/.test(c.overflow)) || /inset\((50%|100%)|circle\(0/.test(c.clipPath || '');
    };
    const seen = new Set(); let hits = 0;
    for (const { r, cond } of rules) {
      if (!r.selectorText.includes(':hover')) continue;
      if (/\(\s*(any-)?hover\s*:\s*hover\s*\)/.test(cond)) continue; // scoped to devices that can hover
      if (cond) { try { if (!matchMedia(cond).matches) continue; } catch { continue; } }
      if (!reveals(r.style)) continue;
      for (const part of split(r.selectorText)) {
        if (!part.includes(':hover') || /:focus/.test(part)) continue;
        const np = norm(part);
        if ([':focus', ':focus-within', ':focus-visible'].some((x) => all.has(np.replace(/:hover/g, x)))) continue;
        const base = part.replace(/:hover/g, '').trim();
        const idx = part.indexOf(':hover');
        const hostSel = part.slice(0, idx).replace(/:hover/g, '').trim() || '*';
        if (!base || /[>+~]$/.test(base)) continue;
        let targets = [], hosts = [];
        try { targets = [...document.querySelectorAll(base)].slice(0, 20); hosts = [...document.querySelectorAll(hostSel)].slice(0, 50); } catch { continue; }
        if (hosts.some((h) => h.matches('details, summary, button[aria-expanded], [aria-expanded]') || h.querySelector(':scope > button[aria-expanded], :scope > [aria-expanded]'))) continue; // toggled by click as well
        for (const el of targets) {
          if (seen.has(el) || !hiddenNow(el)) continue;
          const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
          const interactive = el.matches('a[href], button') || !!el.querySelector('a[href], button');
          if (!txt && !interactive) continue;
          seen.add(el); hits++;
          if (hits > 6) continue;
          const contact = el.querySelector('a[href^="tel:"], a[href^="mailto:"]') || PRICE.test(txt);
          push('hover-only', interactive ? 'error' : 'warn', el, `Content appears only on :hover (${part.slice(0, 60)}) with no :focus/:focus-within rule or click toggle: "${txt.slice(0, 60)}"` + (interactive ? '. It holds links or buttons that touch and keyboard users cannot reach (WCAG 2.1.1, 1.4.13).' : contact ? '. It holds prices or contact details; touch screens have no hover (Media Queries 4).' : '. Touch screens have no hover (Media Queries 4).'), txt.length, interactive ? { wcag: '2.1.1' } : {});
        }
      }
    }
    out.stats.hoverOnly = { rules: rules.length, hits, blockedSheets: blocked };
    // matched-rule index reused by the 100vh check below
    out.__rules = rules;
  }

  // ---------- C17 100vh hero ----------
  {
    const t = th('vh-hero');
    const minH = (t.min_height_share ?? 0.9) * vh;
    const rules = out.__rules || [];
    delete out.__rules;
    let flagged = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (flagged >= 2) break;
      const r = el.getBoundingClientRect();
      if (r.top >= vh || r.bottom <= 0 || r.height < minH || r.height > vh * 1.6 || /^(SCRIPT|STYLE)$/.test(el.tagName)) continue;
      let old = null, modern = false;
      const check = (st, src) => {
        for (const prop of ['height', 'min-height']) {
          const v = st.getPropertyValue(prop);
          if (!v) continue;
          if (/(s|d|l)vh\b/.test(v)) modern = true;
          else if (/(^|[^a-z])(9\d|1\d\d)(\.\d+)?vh\b/.test(v)) old = old || src + ' { ' + prop + ': ' + v + ' }';
        }
      };
      check(el.style, 'style=""');
      for (const { r: rule, cond } of rules) {
        if (cond) { try { if (!matchMedia(cond).matches) continue; } catch { continue; } }
        let m = false; try { m = el.matches(rule.selectorText); } catch { /* invalid */ }
        if (m) check(rule.style, rule.selectorText.slice(0, 50));
      }
      if (old && !modern) { flagged++; push('vh-hero', 'warn', el, `First-screen element sized with ${old} and no svh/dvh fallback: on phones it jumps when the address bar moves; use 100svh or 100dvh (P).`, Math.round(r.height)); }
    }
  }

  // ---------- C20 phone number without tel: link ----------
  {
    const txt = document.body.innerText || '';
    const re = /(?<![\p{L}\p{N}+])(\+49|0049|0)[\s(]*\d[\d\s\/()-]{5,}\d/gu;
    let num = null;
    for (const m of txt.matchAll(re)) {
      const digits = m[0].replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) continue;
      const before = txt.slice(Math.max(0, m.index - 30), m.index);
      if (/IBAN|BIC|USt|Steuer|HRB|HRA|Konto|BLZ|Kunden-?nr|Rechnung|Datum|Fax/i.test(before)) continue;
      num = m[0].trim(); break;
    }
    if (num && !document.querySelector('a[href^="tel:"]')) push('phone-not-tappable', 'warn', null, `Phone number "${num}" in the text but no tel: link on the page; on a phone it should start a call with one tap (P).`, num);
  }

  // ---------- C19 input type on phones (autocomplete itself: a11y check autocomplete-missing) ----------
  {
    for (const el of document.querySelectorAll('input')) {
      const ty = (el.getAttribute('type') || 'text').toLowerCase();
      if (ty !== 'text' && ty !== 'search' && ty !== '') continue;
      if (!visible(el)) continue;
      const lab = [el.name, el.id, el.getAttribute('placeholder'), el.getAttribute('aria-label'), el.getAttribute('autocomplete'), ...(el.labels ? [...el.labels].map((l) => l.textContent) : [])].join(' ').toLowerCase();
      const mail = /e-?mail/.test(lab), tel = /(^|[^a-z])(tel|phone|telefon|mobil|handy|rufnummer)/.test(lab);
      if (mail === tel) continue; // neither, or a combined "phone or e-mail" field
      push('input-type', 'warn', el, `${mail ? 'E-mail' : 'Phone'} field with type="${ty || 'text'}": phones show the full keyboard; use type="${mail ? 'email' : 'tel'}" (P).`, ty);
    }
  }

  // ---------- C14 target spacing (info) ----------
  {
    const t = th('target-spacing');
    const big = [];
    for (const el of document.querySelectorAll('a[href], button, [role="button"], input[type="submit"]')) {
      if (el.closest('[aria-hidden="true"]') || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width >= (t.min_size_px ?? 44) && r.height >= (t.min_size_px ?? 44)) big.push({ el, r: { l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY } });
      if (big.length >= 300) break;
    }
    let pairs = 0; let ex = null;
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
      const a = big[i].r, b = big[j].r;
      if (big[i].el.contains(big[j].el) || big[j].el.contains(big[i].el)) continue;
      const dx = Math.max(0, b.l - a.r, a.l - b.r), dy = Math.max(0, b.t - a.b, a.t - b.b);
      const gap = Math.max(dx, dy);
      if ((dx === 0 || dy === 0) && gap < (t.min_gap_px ?? 8)) { pairs++; if (!ex) ex = sel(big[i].el) + ' / ' + sel(big[j].el) + ' ' + Math.round(gap) + 'px'; }
    }
    out.stats.targetSpacing = { targets: big.length, closePairs: pairs };
    if (pairs > (t.max ?? 0)) push('target-spacing', 'info', null, `${pairs} pair(s) of touch targets closer than ${t.min_gap_px ?? 8}px, e.g. ${ex} (Material 8 dp, S; info only, WCAG 2.5.8 is the hard rule).`, pairs);
  }

  // ---------- C5 image sizes (bytes and waste are computed on the Node side) ----------
  {
    const dpr = (o && o.dpr) || 3;
    for (const img of document.querySelectorAll('img')) {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith('data:') || /\.svg(\?|#|$)/i.test(src) || !img.naturalWidth || !visible(img)) continue;
      const r = img.getBoundingClientRect();
      const needW = Math.ceil(r.width * dpr), needH = Math.ceil(r.height * dpr);
      if (img.naturalWidth <= needW && img.naturalHeight <= needH) continue;
      const res = performance.getEntriesByName(src)[0];
      out.images.push({ url: src, selector: sel(img), w: Math.round(r.width), h: Math.round(r.height), nw: img.naturalWidth, nh: img.naturalHeight, needW, needH, bytes: res && res.encodedBodySize ? res.encodedBodySize : null });
      if (out.images.length >= 40) break;
    }
  }
  window.scrollTo(0, 0);
  return out;
}
