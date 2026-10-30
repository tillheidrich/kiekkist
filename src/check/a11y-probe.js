// Browser-side accessibility measurements (WCAG 2.2 AA, EN 301 549 V4.1.1).
// Like probe.js: every exported function is serialised by Playwright and runs
// inside the page, so each one is self-contained (no imports, no module scope).
// Node-side orchestration, rule metadata and the report section: a11y.js.

/** Init script (runs before page scripts): remember elements that get click-like listeners. */
export function clickRecorder() {
  try {
    const orig = EventTarget.prototype.addEventListener;
    const kinds = /^(click|mousedown|mouseup|pointerdown|pointerup|touchstart|touchend)$/;
    EventTarget.prototype.addEventListener = function (type, fn, o) {
      try { if (kinds.test(type) && this && this.nodeType === 1) this.__kkClk = true; } catch { /* ignore */ }
      return orig.call(this, type, fn, o);
    };
  } catch { /* ignore */ }
}

/** Text that no longer fits its box: overflow, clipping by overflow:hidden, ellipsis, line-clamp. Keys for before/after diffs. */
export function clipScan() {
  const sel = (el) => {
    const parts = []; let e = el;
    for (let i = 0; i < 4 && e && e.nodeType === 1 && e !== document.documentElement; i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + CSS.escape(e.id)); break; }
      if (e === document.body) { parts.unshift('body'); break; }
      const cls = [...e.classList].slice(0, 2); if (cls.length) s += '.' + cls.map((c) => CSS.escape(c)).join('.');
      const p = e.parentElement; if (p) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')'; }
      parts.unshift(s); e = e.parentElement;
    }
    return parts.join(' > ');
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05) return false; }
    return !el.closest('[aria-hidden="true"]');
  };
  const out = [];
  for (const el of document.body ? document.body.querySelectorAll('*') : []) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|svg|BR|IMG|VIDEO|CANVAS|IFRAME|SELECT|OPTION|INPUT|TEXTAREA)$/.test(el.tagName) || el.closest('svg')) continue;
    const c = getComputedStyle(el);
    if (c.display === 'inline' || c.display === 'contents' || c.display === 'none') continue;
    if (!el.textContent.trim()) continue;
    const ox = c.overflowX, oy = c.overflowY;
    if (/(auto|scroll)/.test(ox) || /(auto|scroll)/.test(oy)) continue;
    const w = el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
    const h = el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0;
    if (!w && !h) continue;
    let kind = null;
    if (c.textOverflow === 'ellipsis' && w) kind = 'ellipsis';
    else if (c.webkitLineClamp && c.webkitLineClamp !== 'none' && h) kind = 'line-clamp';
    else if ((/(hidden|clip)/.test(ox) && w) || (/(hidden|clip)/.test(oy) && h)) kind = 'clipped';
    else if (w || h) kind = 'spill';
    if (!kind || !vis(el)) continue;
    out.push({ el, key: sel(el), kind, text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), dx: Math.max(0, el.scrollWidth - el.clientWidth), dy: Math.max(0, el.scrollHeight - el.clientHeight) });
    if (out.length >= 400) break;
  }
  // deepest per branch only
  return out.filter((o) => !out.some((x) => x !== o && o.el.contains(x.el))).map(({ el, ...o }) => o);
}

/** Reflow at the current (narrow) viewport: horizontal scrolling and text cut at the viewport edge, with WCAG 1.4.10 exceptions. */
export function reflowScan() {
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = innerHeight;
  const sel = (el) => {
    const parts = []; let e = el;
    for (let i = 0; i < 4 && e && e.nodeType === 1 && e !== document.documentElement; i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + CSS.escape(e.id)); break; }
      if (e === document.body) { parts.unshift('body'); break; }
      const cls = [...e.classList].slice(0, 2); if (cls.length) s += '.' + cls.map((c) => CSS.escape(c)).join('.');
      parts.unshift(s); e = e.parentElement;
    }
    return parts.join(' > ');
  };
  const exempt = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const t = p.tagName;
      if (/^(TABLE|PRE|CODE|CANVAS|VIDEO)$/.test(t) || p.getAttribute('role') === 'table' || p.getAttribute('role') === 'grid') return true;
      if (t === 'FIGURE' && p.querySelector('img, svg, canvas')) return true;
      if (t === 'IFRAME' && /map/i.test(p.getAttribute('src') || '')) return true;
      if (p !== el) {
        const c = getComputedStyle(p);
        if (/(auto|scroll)/.test(c.overflowX)) return true; // scroll container: content scrolls inside (focusability checked by axe scrollable-region-focusable)
        if (/(hidden|clip)/.test(c.overflowX) && p.getBoundingClientRect().right <= vw + 1 && p.getBoundingClientRect().left >= -1) return 'clipper';
      }
    }
    return false;
  };
  const hiddenEl = (el) => { for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05 || c.display === 'none') return true; } return !!el.closest('[aria-hidden="true"], [inert]'); };
  const res = { vw, overflow: 0, culprits: [], cut: [], cover: 0, coverEls: [] };
  const se = document.scrollingElement || document.documentElement;
  if (se.scrollWidth > vw + 1) {
    const culprits = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.right <= vw + 1) continue;
      const c = getComputedStyle(el);
      if (c.position === 'fixed') continue;
      if (culprits.some((x) => x.contains(el))) continue;
      if (exempt(el)) continue;
      culprits.push(el);
      if (culprits.length >= 3) break;
    }
    if (culprits.length) { res.overflow = se.scrollWidth - vw; res.culprits = culprits.map(sel); }
  }
  // text whose line boxes straddle the viewport edge while the page itself does not scroll (cut by overflow-x:hidden on html/body)
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = tw.nextNode(); n && res.cut.length < 5; n = tw.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement) continue;
    const pe = n.parentElement;
    if (seen.has(pe) || hiddenEl(pe)) continue;
    const ex = exempt(pe);
    if (ex === true) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const rr of rg.getClientRects()) {
      if (rr.width < 2) continue;
      if ((rr.left < vw - 1 && rr.right > vw + 1) || (rr.left < -1 && rr.right > 1)) {
        if (getComputedStyle(pe).position === 'fixed') break;
        seen.add(pe); res.cut.push({ sel: sel(pe), text: n.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), px: Math.round(Math.max(rr.right - vw, -rr.left)) });
        break;
      }
    }
  }
  // fixed/sticky bars eat the content area at 400 % zoom
  const iv = [];
  for (const el of document.body.querySelectorAll('*')) {
    const c = getComputedStyle(el);
    if (c.position !== 'fixed' && c.position !== 'sticky') continue;
    if (hiddenEl(el)) continue;
    const r = el.getBoundingClientRect();
    const top = Math.max(0, r.top), bot = Math.min(vh, r.bottom);
    if (bot - top < 4 || r.width < vw * 0.5) continue;
    if (el.parentElement && el.parentElement.closest && iv.some((x) => x.el.contains(el))) continue;
    iv.push({ el, top, bot });
  }
  iv.sort((a, b) => a.top - b.top);
  let cov = 0, end = -1;
  for (const x of iv) { if (x.bot <= end) continue; cov += x.bot - Math.max(x.top, end); end = x.bot; }
  res.cover = vh ? +(cov / vh).toFixed(2) : 0;
  res.coverEls = iv.slice(0, 3).map((x) => sel(x.el));
  return res;
}

/** Landscape phone: content hidden or a "please rotate" overlay (WCAG 1.3.4). */
export function orientationScan() {
  const main = document.querySelector('main, [role="main"]') || document.body;
  const r = main.getBoundingClientRect();
  const c = getComputedStyle(main);
  let hidden = r.width < 2 || r.height < 2 || c.display === 'none' || c.visibility === 'hidden';
  let overlay = null;
  for (const el of document.body.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'absolute') continue;
    const b = el.getBoundingClientRect();
    if (b.width < innerWidth * 0.8 || b.height < innerHeight * 0.8 || s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) < 0.1) continue;
    if (/(bitte\s+)?(drehen|hochformat|querformat|rotate|portrait|landscape)/i.test(el.textContent || '')) { overlay = (el.id ? '#' + el.id : el.tagName.toLowerCase()); break; }
  }
  return { hidden, overlay };
}

/** Running motion: infinite or longer than 5 s animations, playing or autoplaying media, with or without a pause control nearby. */
export function motionScan() {
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  const nameOf = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
  const CTRL = /(pause|stopp?|anhalten|pausieren|abspielen|wiedergabe|play)/i;
  const hasControl = (el) => {
    if ((el.tagName === 'VIDEO' || el.tagName === 'AUDIO') && el.controls) return true;
    let box = el.closest('section, figure, article, aside, header, footer, [role="region"], [aria-roledescription="carousel"]');
    if (!box) { box = el; for (let i = 0; i < 3 && box.parentElement && box.parentElement !== document.body; i++) box = box.parentElement; }
    for (const b of box.querySelectorAll('button, [role="button"], a[href], input[type="checkbox"], [role="switch"]')) if (CTRL.test(nameOf(b))) return true;
    return false;
  };
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) < 0.05) return false; } return true; };
  const moving = new Map();
  for (const a of document.getAnimations ? document.getAnimations() : []) {
    if (a.playState !== 'running' || !a.effect || !a.effect.target) continue;
    const t = a.effect.getComputedTiming ? a.effect.getComputedTiming() : a.effect.getTiming();
    const long = t.iterations === Infinity || (t.activeDuration || 0) > 5000 || (t.endTime || 0) > 5000;
    if (!long) continue;
    let el = a.effect.target; if (el.nodeType !== 1) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 2500 || !vis(el)) continue;
    if (!moving.has(el)) moving.set(el, 'animation ' + (a.animationName || a.id || 'waapi'));
  }
  for (const el of document.querySelectorAll('marquee, blink')) moving.set(el, el.tagName.toLowerCase());
  const media = [];
  for (const m of document.querySelectorAll('video, audio')) {
    const playing = !m.paused || m.autoplay || m.hasAttribute('autoplay');
    if (!playing) continue;
    const long = m.loop || !(m.duration > 0) || m.duration > 5;
    const audible = !(m.muted || m.hasAttribute('muted')) && m.volume > 0;
    media.push({ sel: sel(m), audible, controls: m.controls });
    if (long && (m.tagName === 'AUDIO' || vis(m))) moving.set(m, (m.tagName === 'VIDEO' ? 'video' : 'audio') + (m.loop ? ' loop' : '') + (m.autoplay ? ' autoplay' : ''));
  }
  const items = [...moving.entries()].map(([el, what]) => ({ sel: sel(el), what, control: hasControl(el) }));
  return { items, media };
}

/**
 * Keyboard walk, step 0: number of tabbable elements, the consent banner (if any).
 * Uses window.__kkFocusSig from probe.js focusPrepare when present.
 */
export function walkPrepare() {
  const SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(el); return c.visibility !== 'hidden' && !el.closest('[inert], [aria-hidden="true"]'); };
  let tabbable = 0;
  for (const el of document.querySelectorAll(SEL)) if (el.tabIndex >= 0 && vis(el)) tabbable++;
  // consent banner: known CMP roots or a visible fixed/dialog box about cookies
  const KNOWN = '#usercentrics-root, #CybotCookiebotDialog, #BorlabsCookieBox, #cmplz-cookiebanner-container, .cmplz-cookiebanner, .klaro, #ccm19-banner, .ccm-root, #onetrust-banner-sdk, #cc-main, #cookie-notice, .cookie-banner, #cookie-banner, [data-cookie-banner]';
  let banner = null;
  for (const el of document.querySelectorAll(KNOWN)) if (vis(el)) { banner = el; break; }
  if (!banner) {
    for (const el of document.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog[open], aside, section, div, form')) {
      const c = getComputedStyle(el);
      if (!(c.position === 'fixed' || c.position === 'sticky' || el.matches('[role="dialog"], [role="alertdialog"], dialog[open]'))) continue;
      if (!vis(el)) continue;
      const t = (el.textContent || '').slice(0, 2000);
      if (!/(cookie|einwilligung|consent|datenschutzeinstellungen|tracking)/i.test(t)) continue;
      if (!el.querySelector('button, a, [role="button"], [onclick], div, span')) continue;
      banner = el; break;
    }
  }
  window.__kkBanner = banner;
  window.__kkWalkN = 0;
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
  window.scrollTo(0, 0);
  return { tabbable, banner: banner ? (banner.id ? '#' + banner.id : banner.tagName.toLowerCase() + (banner.classList.length ? '.' + [...banner.classList].slice(0, 2).join('.') : '')) : null };
}

/** Keyboard walk, one step after Tab: identity, focus visibility (optional), obscured by fixed/sticky content, banner/dialog membership. */
export async function walkStep(o) {
  await new Promise((r) => requestAnimationFrame(() => (o && o.wait ? requestAnimationFrame(() => setTimeout(r, 60)) : r())));
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { body: true };
  if (!el.__kkWid) el.__kkWid = ++window.__kkWalkN;
  const parts = []; let e = el;
  for (let i = 0; i < 3 && e && e.nodeType === 1 && e !== document.body; i++) {
    let s = e.tagName.toLowerCase();
    if (e.id) { parts.unshift(s + '#' + e.id); break; }
    const cls = [...e.classList].slice(0, 2); if (cls.length) s += '.' + cls.join('.');
    const p = e.parentElement; if (p) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')'; }
    parts.unshift(s); e = e.parentElement;
  }
  const r = el.getBoundingClientRect();
  const res = {
    id: el.__kkWid, sel: parts.join(' > '), iframe: el.tagName === 'IFRAME', visible: r.width > 1 && r.height > 1,
    y: Math.round(r.top + scrollY), x: Math.round(r.left), vh: innerHeight,
    text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30),
    tabindex: parseInt(el.getAttribute('tabindex') || '0', 10) || 0,
    inBanner: !!(window.__kkBanner && window.__kkBanner.contains(el)),
    inDialog: !!el.closest('dialog[open], [aria-modal="true"]'),
    trapBox: (() => { const b = el.closest('dialog, [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="application"], [data-trap], section, form, nav, aside, div'); return b ? (b.id ? '#' + b.id : b.tagName.toLowerCase() + (b.classList.length ? '.' + [...b.classList].slice(0, 2).join('.') : '')) : null; })(),
  };
  if (o && o.sig && window.__kkFocusRest && window.__kkFocusSig) {
    const rest = window.__kkFocusRest.get(el);
    res.known = rest !== undefined;
    res.same = rest !== undefined && rest === window.__kkFocusSig(el);
  }
  // obscured: sample a 3x3 grid inside the part of the element that is in the viewport
  if (res.visible && !res.iframe) {
    const x0 = Math.max(0, r.left), x1 = Math.min(innerWidth, r.right), y0 = Math.max(0, r.top), y1 = Math.min(innerHeight, r.bottom);
    let sampled = 0, hidden = 0, by = null;
    if (x1 - x0 >= 1 && y1 - y0 >= 1) {
      const fixedAnc = (n) => { for (let p = n; p && p.nodeType === 1; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') return p; } return null; };
      for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
        const x = x0 + (x1 - x0) * fx, y = y0 + (y1 - y0) * fy;
        const top = document.elementFromPoint(x, y);
        sampled++;
        if (!top || top === el || el.contains(top) || top.contains(el)) continue;
        const f = fixedAnc(top);
        if (f && !f.contains(el)) { hidden++; by = by || f; }
      }
    } else if (r.bottom <= 0 || r.top >= innerHeight) { sampled = 9; hidden = 0; res.offscreen = true; }
    res.sampled = sampled; res.obscured = hidden;
    if (by) res.by = by.id ? '#' + by.id : by.tagName.toLowerCase() + (by.classList.length ? '.' + [...by.classList].slice(0, 2).join('.') : '');
    res.byBanner = !!(by && window.__kkBanner && (window.__kkBanner === by || window.__kkBanner.contains(by) || by.contains(window.__kkBanner)));
  }
  return res;
}

/** Mobile menu: open the first collapsed toggle in header/nav. Returns true when something was clicked. */
export function openMobileMenu() {
  const c = document.querySelector('header button[aria-expanded="false"], nav button[aria-expanded="false"], header [role="button"][aria-expanded="false"], [aria-controls][aria-expanded="false"]');
  if (!c) return false;
  const r = c.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  c.click();
  return true;
}

/** Top-level nav items that reveal hidden content on hover, and tooltip triggers. */
export function hoverCandidates() {
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) < 0.05) return false; } return true; };
  const out = [];
  let n = 0;
  for (const li of document.querySelectorAll('nav li, header li')) {
    const sub = li.querySelector(':scope > ul, :scope > div, :scope > [role="menu"]');
    if (!sub || vis(sub) || !vis(li)) continue;
    const r = li.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) continue;
    sub.__kkHov = ++n; li.__kkHovT = n;
    const first = li.querySelector('a, button, span');
    out.push({ n, x: r.left + r.width / 2, y: r.top + r.height / 2, sel: li.id ? '#' + li.id : 'nav item "' + ((first || li).textContent || '').trim().slice(0, 30) + '"' });
    if (out.length >= 2) break;
  }
  if (out.length < 2) {
    for (const t of document.querySelectorAll('[aria-describedby]')) {
      const tip = document.getElementById(t.getAttribute('aria-describedby').split(/\s+/)[0]);
      if (!tip || tip.getAttribute('role') !== 'tooltip' || vis(tip) || !vis(t)) continue;
      const r = t.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) continue;
      tip.__kkHov = ++n;
      out.push({ n, x: r.left + r.width / 2, y: r.top + r.height / 2, sel: t.id ? '#' + t.id : t.tagName.toLowerCase() + ' (tooltip)' });
      if (out.length >= 2) break;
    }
  }
  return out;
}

/** Is the hover content number n visible now; where is its centre. */
export function hoverState(n) {
  let el = null;
  for (const e of document.querySelectorAll('*')) if (e.__kkHov === n) { el = e; break; }
  if (!el) return { visible: false };
  const r = el.getBoundingClientRect();
  let v = r.width >= 1 && r.height >= 1;
  for (let p = el; v && p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) < 0.05) v = false; }
  return { visible: v, x: r.left + Math.min(r.width / 2, 40), y: r.top + Math.min(r.height / 2, 12), focusMoved: document.activeElement !== document.body };
}

/** Rectangles of interactive elements and icons in the top part of the page (document coordinates), for the forced-colours comparison. */
export function forcedRects(maxH) {
  const out = [];
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return false; for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) < 0.05) return false; } return !el.closest('[aria-hidden="true"]') || el.tagName.toLowerCase() === 'svg'; };
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, [role="checkbox"], [role="switch"], [role="radio"], label > span:empty, svg')) {
    if (!vis(el)) continue;
    if (el.tagName.toLowerCase() === 'svg' && !el.closest('a, button, [role="button"]')) continue;
    const r = el.getBoundingClientRect();
    const y = r.top + scrollY;
    if (y + r.height > maxH) continue;
    if (out.some((o) => o.el.contains(el) && o.el !== el && el.tagName.toLowerCase() !== 'svg')) continue;
    const label = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('name') || '';
    const s = el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '') + (label ? ' "' + label.slice(0, 20) + '"' : '');
    out.push({ el, sel: s, x: Math.round(r.left + scrollX), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height) });
    if (out.length >= 60) break;
  }
  return out.map(({ el, ...o }) => o);
}

/** Compare two screenshots (data URLs) per rectangle: which rectangles lose all contrast in forced-colours mode. */
export async function forcedAnalyze(o) {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [a, b] = await Promise.all([load(o.a), load(o.b)]);
  const W = Math.min(a.width, b.width), H = Math.min(a.height, b.height);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x; };
  const A = mk(a), B = mk(b);
  const spread = (ctx, r) => {
    const x = Math.max(0, r.x), y = Math.max(0, r.y), w = Math.min(W - x, r.w), h = Math.min(H - y, r.h);
    if (w < 4 || h < 4) return null;
    const d = ctx.getImageData(x, y, w, h).data;
    let mn = [255, 255, 255], mx = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4 * 3) for (let k = 0; k < 3; k++) { if (d[i + k] < mn[k]) mn[k] = d[i + k]; if (d[i + k] > mx[k]) mx[k] = d[i + k]; }
    return Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  };
  const lost = [];
  for (const r of o.rects) {
    // include a 3 px ring so a border or outline drawn around the box counts as visible
    const g = { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 };
    const sa = spread(A, g), sb = spread(B, g);
    if (sa === null || sb === null) continue;
    if (sa >= 40 && sb <= 6) lost.push(r.sel);
  }
  return lost;
}

/**
 * Static accessibility scan of the loaded page (one viewport): language, names, forms, consent banner,
 * statement link, scope hints, overlays, click handlers, non-text contrast, forced-colour overrides, site facts.
 * opts = { origin, profile }
 */
export function a11yStatic(opts) {
  const out = { hard: [], facts: {} };
  const push = (rule, severity, el, detail, value, extra) => out.hard.push({ rule, severity, selector: el ? sel(el) : undefined, detail, value, ...(extra || {}) });
  const csC = new Map();
  const cs = (el) => { let c = csC.get(el); if (!c) { c = getComputedStyle(el); csC.set(el, c); } return c; };
  function sel(el) {
    const parts = []; let e = el;
    for (let i = 0; i < 4 && e && e.nodeType === 1 && e !== document.documentElement; i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + CSS.escape(e.id)); break; }
      if (e === document.body) { parts.unshift('body'); break; }
      const cls = [...e.classList].filter((c) => !/^(is-|has-|js-)/.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.map((c) => CSS.escape(c)).join('.');
      const p = e.parentElement;
      if (p) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')'; }
      parts.unshift(s); e = e.parentElement;
    }
    return parts.join(' > ');
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = cs(p); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) < 0.05) return false; }
    return true;
  };
  const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const visText = (el) => {
    let t = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) t += c.textContent;
        else if (c.nodeType === 1) {
          if (c.getAttribute('aria-hidden') === 'true' || /^(SCRIPT|STYLE|svg|SVG)$/.test(c.tagName)) continue;
          const s = cs(c); if (s.display === 'none' || s.visibility === 'hidden') continue;
          const r = c.getBoundingClientRect(); if ((r.width <= 1 && r.height <= 1) || (s.clip && /rect\(0/.test(s.clip)) || /inset\(50%/.test(s.clipPath || '')) continue;
          if (c.tagName === 'IMG') continue;
          walk(c);
        }
      }
    };
    walk(el);
    return t.replace(/\s+/g, ' ').trim();
  };
  const labelText = (el) => {
    const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    if (ids.length) return ids.map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    if (el.labels && el.labels.length) return [...el.labels].map((l) => l.textContent).join(' ').trim();
    return (el.getAttribute('placeholder') || el.getAttribute('title') || '').trim();
  };
  const tokensOf = (s) => (s || '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-zäöüß0-9]+/).filter(Boolean);

  // ---------- language (3.1.1, 3.1.2) ----------
  {
    const DE = new Set('der die das und ist nicht mit für auf den dem des ein eine einen wir sie ich zu im von bei auch sich oder wie nach'.split(' '));
    const EN = new Set('the and is of to with for not are you we this that our your from on in it be by or'.split(' '));
    const langOf = (txt) => {
      const w = txt.toLowerCase().match(/\p{L}+/gu) || [];
      let d = 0, e = 0; for (const x of w) { if (DE.has(x)) d++; if (EN.has(x)) e++; }
      return { d, e, words: w.length, lang: d >= 3 && d > 2 * e ? 'de' : e >= 3 && e > 2 * d ? 'en' : null };
    };
    const pageLang = (document.documentElement.getAttribute('lang') || '').toLowerCase().split('-')[0];
    const root = document.querySelector('main, [role="main"]') || document.body;
    const sample = (root.innerText || '').slice(0, 3000);
    const L = langOf(sample);
    out.facts.lang = { declared: pageLang || null, detected: L.lang, de: L.d, en: L.e };
    if (pageLang && L.lang && (pageLang === 'de' || pageLang === 'en') && L.lang !== pageLang && L.words >= 30) {
      push('lang-mismatch', 'error', document.documentElement, `<html lang="${pageLang}"> but the main text reads as ${L.lang === 'de' ? 'German' : 'English'} (${L.d} German vs ${L.e} English stopwords). Screen readers pronounce it in the wrong language.`, L.lang);
    }
    if ((pageLang === 'de' || pageLang === 'en') && !out.hard.some((f) => f.rule === 'lang-mismatch')) {
      let n = 0; const ex = [];
      for (const b of document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, td, dd')) {
        if (b.querySelector('p, li, h1, h2, h3, h4, h5, h6, blockquote')) continue;
        const t = (b.innerText || '').trim();
        if ((t.match(/\p{L}+/gu) || []).length < 6 || !visible(b)) continue;
        const own = b.closest('[lang]');
        const declared = own ? own.getAttribute('lang').toLowerCase().split('-')[0] : pageLang;
        const l = langOf(t);
        if (l.lang && l.lang !== declared && l.lang !== pageLang) { n++; if (ex.length < 3) ex.push('"' + t.slice(0, 40) + '"'); }
        else if (l.lang && l.lang !== declared && declared !== pageLang) { /* lang set to something else, fine */ }
      }
      if (n) push('lang-parts', 'warn', null, `${n} text block(s) in ${pageLang === 'de' ? 'English' : 'German'} without a lang attribute, e.g. ${ex.join(', ')} (WCAG 3.1.2). Mark them with lang="${pageLang === 'de' ? 'en' : 'de'}".`, n);
    }
  }

  // ---------- names: label in name (2.5.3), icon names from title only (4.1.2) ----------
  {
    for (const el of document.querySelectorAll('a[href], button, [role="button"], [role="link"], [role="menuitem"], [role="tab"], input[type="submit"], input[type="button"]')) {
      if (el.closest('[aria-hidden="true"]') || !visible(el)) continue;
      const vt = el.tagName === 'INPUT' ? (el.value || '') : visText(el);
      const al = el.getAttribute('aria-labelledby') ? labelText(el) : (el.getAttribute('aria-label') || '').trim();
      if ((el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) && al && norm(vt).length >= 2 && /\p{L}/u.test(vt)) {
        const nv = norm(vt), na = norm(al);
        if (!na.includes(nv)) push('label-in-name', 'error', el, `Visible label "${vt.slice(0, 40)}" is not part of the accessible name "${al.slice(0, 50)}" (WCAG 2.5.3); voice control users say what they see. Start the aria-label with the visible text, or drop it.`, vt.slice(0, 40));
      }
      if (!vt && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        const imgAlt = [...el.querySelectorAll('img[alt]')].some((i) => i.getAttribute('alt').trim());
        const svgT = [...el.querySelectorAll('svg title, [aria-label]')].some((t) => (t.textContent || t.getAttribute('aria-label') || '').trim());
        const srText = (el.textContent || '').trim();
        if (!imgAlt && !svgT && !srText && (el.getAttribute('title') || '').trim()) push('icon-name', 'warn', el, `Icon-only control named only by its title attribute ("${el.getAttribute('title').slice(0, 40)}"): titles are not reliably announced and never shown on touch. Use aria-label or visually hidden text.`);
      }
      if (vt) for (const s of el.querySelectorAll('svg')) {
        if (s.closest('[aria-hidden="true"]')) continue;
        if (s.getAttribute('role') === 'img' || s.querySelector('title')) { push('icon-name', 'warn', s, `Decorative icon inside "${vt.slice(0, 30)}" is exposed (role="img" or <title>) and is read twice. Add aria-hidden="true" to the svg.`); break; }
      }
    }
  }

  // ---------- forms: autocomplete (1.3.5), paste (3.3.8), CAPTCHA (3.3.8), redundant entry (3.3.7), errors and required cues (3.3.1, 3.3.2) ----------
  {
    const PERSONAL = new Set(['email', 'mail', 'telefon', 'phone', 'tel', 'mobil', 'mobile', 'handy', 'vorname', 'nachname', 'firstname', 'lastname', 'fname', 'lname', 'name', 'fullname', 'strasse', 'straße', 'street', 'address', 'adresse', 'anschrift', 'plz', 'postal', 'postcode', 'zip', 'ort', 'city', 'stadt', 'wohnort', 'land', 'country', 'firma', 'company', 'organisation', 'organization', 'unternehmen', 'geburtsdatum', 'birthday', 'bday', 'username', 'benutzername']);
    let acMissing = 0; const acEx = [];
    const fields = [...document.querySelectorAll('input, select, textarea')].filter((el) => !/^(hidden|submit|button|reset|image|checkbox|radio|range|color|file)$/.test(el.type || '') && el.type !== 'password');
    for (const el of fields) {
      if (!visible(el)) continue;
      const toks = [...tokensOf(el.name), ...tokensOf(el.id), ...tokensOf(labelText(el))];
      if (el.type === 'email' || el.type === 'tel') toks.push(el.type === 'email' ? 'email' : 'tel');
      if (!toks.some((t) => PERSONAL.has(t))) continue;
      const ac = (el.getAttribute('autocomplete') || '').trim().toLowerCase();
      if (!ac || ac === 'off' || ac === 'on' || ac === 'nope' || ac === 'false') { acMissing++; if (acEx.length < 3) acEx.push(sel(el) + (ac ? ' (autocomplete="' + ac + '")' : '')); }
    }
    if (acMissing) push('autocomplete-missing', 'warn', null, `${acMissing} personal-data field(s) without a valid autocomplete token, e.g. ${acEx.join('; ')} (WCAG 1.3.5). Use name, given-name, family-name, email, tel, street-address, postal-code, address-level2, country-name, organization.`, acMissing);

    const auth = [...document.querySelectorAll('input[type="password"], input[autocomplete="one-time-code"], input[maxlength="1"]')];
    for (const el of auth) {
      try {
        const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: new DataTransfer() });
        el.dispatchEvent(ev);
        if (ev.defaultPrevented) push('auth-paste', 'error', el, `Pasting into ${el.type === 'password' ? 'the password field' : 'the code field'} is blocked (paste event cancelled). Password managers and copied codes must work (WCAG 3.3.8).`);
      } catch { /* ignore */ }
      if (el.type === 'password' && /^(off|nope|false)$/i.test(el.getAttribute('autocomplete') || '')) push('auth-paste', 'warn', el, 'Password field with autocomplete="off": tells password managers not to fill it (WCAG 3.3.8). Use current-password or new-password.');
    }
    const groups = new Map();
    for (const el of document.querySelectorAll('input[maxlength="1"]')) { const p = el.parentElement; groups.set(p, (groups.get(p) || []).concat(el)); }
    for (const [p, g] of groups) if (g.length >= 4 && g.length <= 8 && !g.some((x) => x.getAttribute('autocomplete') === 'one-time-code')) push('auth-paste', 'warn', p, `Split code input (${g.length} boxes) without autocomplete="one-time-code": codes cannot be filled or pasted in one go (WCAG 3.3.8).`);

    const srcs = [...document.querySelectorAll('script[src], iframe[src]')].map((s) => s.getAttribute('src'));
    const capt = [];
    const has = (re) => srcs.some((s) => re.test(s));
    if (document.querySelector('.g-recaptcha:not([data-size="invisible"])') || (has(/google\.com\/recaptcha\/api\.js(?!\?render=)/) && !has(/render=/))) capt.push(['reCAPTCHA v2 (checkbox/image challenge)', 'warn']);
    else if (has(/recaptcha/)) capt.push(['reCAPTCHA (score based)', 'info']);
    if (document.querySelector('.h-captcha') || has(/hcaptcha\.com/)) capt.push(['hCaptcha (image challenge)', 'warn']);
    if (document.querySelector('.cf-turnstile') || has(/challenges\.cloudflare\.com\/turnstile/)) capt.push(['Cloudflare Turnstile', 'info']);
    if (document.querySelector('.frc-captcha') || has(/friendlycaptcha/)) capt.push(['Friendly Captcha', 'info']);
    if (document.querySelector('#mtcaptcha') || has(/mtcaptcha/)) capt.push(['MTCaptcha (text challenge)', 'warn']);
    if (document.querySelector('[class*="slider-captcha"], [class*="puzzle-captcha"], .geetest_holder') || has(/geetest/)) capt.push(['slider/puzzle CAPTCHA', 'warn']);
    for (const [what, sev] of capt) push('captcha-detect', sev, null, `${what} found. ${sev === 'warn' ? 'Image, text and puzzle challenges are cognitive function tests; ' : ''}Verify a non-cognitive alternative exists (WCAG 3.3.8) and that it works by keyboard.`, what);

    for (const el of document.querySelectorAll('input')) {
      if (!visible(el)) continue;
      const k = [el.name, el.id, labelText(el)].join(' ');
      if (!/(wiederhol|bestätig|bestaetig|confirm|repeat|erneut)/i.test(k)) continue;
      if (el.type === 'password') push('redundant-entry', 'info', el, 'Password confirmation field: allowed as a security exception to WCAG 3.3.7, but a "show password" toggle serves people better.');
      else if (el.type === 'email' || /mail/i.test(k)) push('redundant-entry', 'warn', el, 'E-mail must be typed twice (confirmation field). WCAG 3.3.7: do not ask for the same information again; show it for checking instead.');
    }

    for (const f of document.querySelectorAll('form')) {
      if (!visible(f)) continue;
      const req = [...f.querySelectorAll('[required], [aria-required="true"]')].filter((x) => visible(x) && x.type !== 'hidden');
      if (!req.length) continue;
      const formText = (f.innerText || '');
      const explained = /(\*\s*(=|:)?\s*(pflicht|erforderlich|required))|(pflichtfeld|pflichtangabe|required field|mandatory|alle felder)/i.test(formText);
      const noCue = req.filter((x) => { const t = labelText(x); return !/(\*|pflicht|erforderlich|required|benötigt)/i.test(t); });
      if (noCue.length && !explained) push('form-errors', 'warn', noCue[0], `${noCue.length} required field(s) whose label gives no cue (no "*" with explanation, no "Pflichtfeld") (WCAG 3.3.2).`, noCue.length);
      else if (req.some((x) => /\*/.test(labelText(x))) && !explained) push('form-errors', 'warn', req[0], 'Required fields are marked with "*" but the form never explains it (WCAG 3.3.2). Add "* Pflichtfeld" above the form.');
      if (f.hasAttribute('novalidate')) {
        const live = f.querySelector('[role="alert"], [role="status"], [aria-live]');
        const bound = req.filter((x) => x.getAttribute('aria-describedby') || x.getAttribute('aria-errormessage'));
        if (!live && bound.length < req.length) push('form-errors', 'warn', f, `Form uses custom validation (novalidate) but ${req.length - bound.length} required field(s) have no aria-describedby/aria-errormessage and the form has no live region (WCAG 3.3.1). Check that errors are announced and named in text.`);
      }
    }
  }

  // ---------- dragging (2.5.7) ----------
  {
    const CAR = '.swiper, .splide, .embla, .flickity-enabled, .glide, .slick-slider, .owl-carousel, .keen-slider, [data-carousel], [aria-roledescription="carousel"]';
    for (const c of document.querySelectorAll(CAR)) {
      if (!visible(c) || c.parentElement.closest(CAR)) continue;
      const btns = [...c.querySelectorAll('button, [role="button"], a[href^="#"]')].filter(visible);
      const outside = c.parentElement ? [...c.parentElement.children].filter((x) => x !== c && (x.matches('button, [role="button"]') || (/(nav|arrow|prev|next|control|pagination)/i.test(String(x.className)) && x.querySelector('button, [role="button"]')))).filter(visible) : [];
      if (!btns.length && !outside.length) push('dragging', 'warn', c, 'Carousel without visible previous/next buttons: swiping or dragging is the only way to move it (WCAG 2.5.7).');
    }
    const BA = 'img-comparison-slider, .juxtapose, .twentytwenty-container, .beer-slider, .ba-slider, [data-before-after], .before-after';
    for (const c of document.querySelectorAll(BA)) if (visible(c) && !c.querySelector('input[type="range"], button, [role="slider"][tabindex]') && c.tagName.toLowerCase() !== 'img-comparison-slider') push('dragging', 'warn', c, 'Before/after slider without a range input or buttons: dragging is the only way to use it (WCAG 2.5.7).');
    const drag = [...document.querySelectorAll('[draggable="true"]')].filter(visible);
    if (drag.length && !document.querySelector('[aria-roledescription*="sortier"], [aria-roledescription*="sortable"], button[aria-label*="nach oben" i], button[aria-label*="move up" i], button[aria-label*="hoch" i]')) push('dragging', 'warn', drag[0], `${drag.length} draggable element(s) and no single-pointer alternative (move up/down buttons) found (WCAG 2.5.7).`, drag.length);
  }

  // ---------- overlays (practice) ----------
  {
    const HOSTS = /(acsbapp\.com|accessibe\.com|userway\.org|eye-able(-cdn)?\.com|equalweb\.com|audioeye\.com|maxaccess\.io|enable\.co\.il|accessiblyapp\.com|purplelens|reciteme\.com|readspeaker\.com\/.*webreader|assistiv|onlineaccessibility|allyable|adally|accessibilityadapter)/i;
    const src = [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).find((s) => HOSTS.test(s));
    const dom = document.querySelector('#acsb-trigger, .acsb-trigger, #userwayAccessibilityIcon, .uwy, #eyeAble_customToolOpenerID, .eyeAble, #enable-toolbar, .asw-menu-btn');
    if (src || dom) push('overlay-detect', 'warn', dom || null, `Accessibility overlay widget found (${src ? src.slice(0, 60) : sel(dom)}). Overlays do not make a site conform; fix the source.`);
  }

  // ---------- click handlers on elements the keyboard cannot reach (2.1.1) ----------
  {
    const NATIVE = 'a[href], button, input, select, textarea, summary, details, label, option, iframe, audio[controls], video[controls], [contenteditable=""], [contenteditable="true"]';
    const FOC = NATIVE + ', [tabindex]:not([tabindex="-1"])';
    let n = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (!(el.__kkClk || el.hasAttribute('onclick') || typeof el.onclick === 'function')) continue;
      if (/^(HTML|BODY|MAIN|FORM|SCRIPT|STYLE|svg|SVG)$/.test(el.tagName)) continue;
      if (el.matches(NATIVE) || el.tabIndex >= 0) continue;
      if (el.closest(FOC) || el.querySelector(FOC)) continue;
      if (!visible(el)) continue;
      if (el.closest('[aria-hidden="true"], [inert]')) continue;
      if (cs(el).cursor !== 'pointer' && !el.hasAttribute('onclick')) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > innerWidth * innerHeight * 0.6) continue; // backdrop or full-screen layer
      n++;
      if (n <= 8) push('click-handler-not-focusable', 'error', el, `<${el.tagName.toLowerCase()}> reacts to clicks but cannot be reached by keyboard ("${visText(el).slice(0, 30) || (el.getAttribute('aria-label') || '')}"); use a <button> or <a href> (WCAG 2.1.1).`);
    }
    out.facts.clickNotFocusable = n;
  }

  // ---------- non-text contrast of form fields and icons (1.4.11) ----------
  {
    const rgba = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 1;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const cache = new Map();
      return (s) => {
        if (!s) return null; if (cache.has(s)) return cache.get(s);
        let res;
        const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/);
        if (s === 'transparent' || s === 'none') res = [0, 0, 0, 0];
        else if (m) { let a = m[4] === undefined ? 1 : parseFloat(m[4]); if (m[5] === '%') a /= 100; res = [+m[1], +m[2], +m[3], a]; }
        else {
          let a = 1, op = s; const mm = s.match(/\/\s*([\d.]+)(%?)\s*\)\s*$/);
          if (mm) { a = parseFloat(mm[1]) / (mm[2] === '%' ? 100 : 1); op = s.replace(/\/\s*[\d.]+%?\s*\)\s*$/, ')'); }
          cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#010203'; cx.fillStyle = op; cx.fillRect(0, 0, 1, 1);
          const d = cx.getImageData(0, 0, 1, 1).data; res = [d[0], d[1], d[2], a];
        }
        cache.set(s, res); return res;
      };
    })();
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const over = (t, a, b) => [t[0] * a + b[0] * (1 - a), t[1] * a + b[1] * (1 - a), t[2] * a + b[2] * (1 - a)];
    const ground = (el) => {
      const layers = [];
      for (let p = el; p; p = p.parentElement) {
        const c = cs(p);
        if (c.backgroundImage && c.backgroundImage !== 'none' && p !== el) return null; // image or gradient: not measurable
        const bg = rgba(c.backgroundColor);
        if (bg && bg[3] > 0.004) { layers.push(bg); if (bg[3] >= 0.99) break; }
      }
      let base = [255, 255, 255];
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], layers[i][3], base);
      return base;
    };
    let n = 0;
    const FIELDS = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="range"]):not([type="color"]):not([type="file"]), select, textarea, [role="checkbox"], [role="switch"], [role="radio"], [role="textbox"], [role="combobox"]';
    for (const el of document.querySelectorAll(FIELDS)) {
      if (!visible(el) || el.disabled || el.closest('[aria-hidden="true"]')) continue;
      const c = cs(el);
      if ((el.type === 'checkbox' || el.type === 'radio') && c.appearance !== 'none' && c.webkitAppearance !== 'none') continue; // native control: UA rendering
      const outer = ground(el.parentElement || el);
      if (!outer) continue;
      const own = rgba(c.backgroundColor);
      const fill = own && own[3] > 0.004 ? over(own, own[3], outer) : outer;
      let best = ratio(fill, outer);
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        if (parseFloat(c['border' + side + 'Width']) < 1 || c['border' + side + 'Style'] === 'none') continue;
        const bc = rgba(c['border' + side + 'Color']); if (!bc) continue;
        best = Math.max(best, ratio(over(bc, bc[3], outer), outer), ratio(over(bc, bc[3], fill), fill));
      }
      const sh = c.boxShadow && c.boxShadow !== 'none' ? (c.boxShadow.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i) || [])[0] : null;
      if (sh) { const s2 = rgba(sh); if (s2) best = Math.max(best, ratio(over(s2, s2[3], outer), outer)); }
      if (best < 3 - 0.01) { n++; if (n <= 6) push('non-text-contrast', 'error', el, `Form field boundary ${best.toFixed(2)}:1 against its surroundings, needs 3:1 (WCAG 1.4.11). Darken the border or give the field a contrasting fill.`, +best.toFixed(2)); }
    }
    for (const b of document.querySelectorAll('a[href], button, [role="button"]')) {
      if (!visible(b) || b.closest('[aria-hidden="true"]') || visText(b)) continue;
      const svg = b.querySelector('svg'); if (!svg || !visible(svg)) continue;
      const shape = [...svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse, use')].find((s) => { const sc = cs(s); return (sc.fill !== 'none' && rgba(sc.fill)?.[3] > 0.1) || (sc.stroke !== 'none' && rgba(sc.stroke)?.[3] > 0.1); });
      if (!shape) continue;
      const sc = cs(shape);
      const col = sc.stroke !== 'none' && parseFloat(sc.strokeWidth) > 0 && rgba(sc.stroke)?.[3] > 0.1 ? rgba(sc.stroke) : rgba(sc.fill);
      if (!col) continue;
      const g = ground(svg);
      if (!g) continue;
      const k = ratio(over(col, col[3] * parseFloat(cs(svg).opacity || 1), g), g);
      if (k < 3 - 0.01) { n++; if (n <= 10) push('non-text-contrast', 'error', b, `Icon ${k.toFixed(2)}:1 against its background, needs 3:1 for an icon-only control (WCAG 1.4.11).`, +k.toFixed(2)); }
    }
    out.facts.nonTextFails = n;
  }

  // ---------- forced-color-adjust: none (EN 301 549 V4.1.1 clause 9.7) ----------
  {
    let n = 0; const ex = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (cs(el).forcedColorAdjust !== 'none') continue;
      if (el.parentElement && cs(el.parentElement).forcedColorAdjust === 'none') continue; // inherited
      if (!visible(el)) continue;
      n++; if (ex.length < 3) ex.push(sel(el));
    }
    if (n) push('forced-color-adjust-scan', 'warn', null, `forced-color-adjust: none on ${n} element(s), e.g. ${ex.join(', ')}: overrides the user's contrast theme (EN 301 549 V4.1.1 clause 9.7) unless essential (logos, colour swatches).`, n);
  }

  // ---------- consent banner: first layer (practice item; privacy-eu.md) ----------
  {
    const b = window.__kkBanner;
    if (b && b.isConnected && visible(b)) {
      const ctrls = [...b.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"], div, span')].filter((x) => visible(x) && !x.querySelector('button, a, div, span'));
      const nm = (x) => (x.innerText || x.value || x.getAttribute('aria-label') || '').trim();
      const acc = ctrls.find((x) => /(alle\s+)?(akzeptier|annehmen|zustimm|einverstanden|accept|allow all|agree|alle erlauben)/i.test(nm(x)));
      const rej = ctrls.find((x) => /(ablehnen|nur\s+(notwendige|erforderliche|essenzielle)|reject|decline|deny|necessary only|only necessary|essential only)/i.test(nm(x)));
      out.facts.banner = { sel: sel(b), accept: !!acc, reject: !!rej };
      if (acc && !rej) push('consent-banner', 'warn', b, 'Consent banner has "accept" on the first layer but no equally easy "reject" (see privacy-eu.md).');
      if (acc && rej) {
        const ra = rej.getBoundingClientRect(), aa = acc.getBoundingClientRect();
        if (ra.width * ra.height < 0.7 * aa.width * aa.height) push('consent-banner', 'warn', rej, `"${nm(rej).slice(0, 30)}" is much smaller than "${nm(acc).slice(0, 30)}" (${Math.round(ra.width)}x${Math.round(ra.height)} vs ${Math.round(aa.width)}x${Math.round(aa.height)}); reject must be as easy as accept (see privacy-eu.md).`);
      }
    }
  }

  // ---------- media (1.4.2) ----------
  for (const m of document.querySelectorAll('video, audio')) {
    const auto = m.autoplay || m.hasAttribute('autoplay') || !m.paused;
    if (auto && !(m.muted || m.hasAttribute('muted'))) push('autoplay-audio', 'error', m, `<${m.tagName.toLowerCase()}> starts playing with sound. Audio that plays automatically for more than 3 s needs a pause/stop or volume control; better: start muted (WCAG 1.4.2).`);
  }

  // ---------- statement link, scope hint, public-sector links ----------
  {
    const RE = /(barrierefrei|barrierefreiheit|accessibility|erkl(ä|ae)rung-zur-barrierefreiheit|informationen-zur-barrierefreiheit|accessibility-statement)/i;
    const links = [...document.querySelectorAll('a[href]')];
    const all = document.body.querySelectorAll('*');
    const cut = all.length ? all[Math.floor(all.length * 0.75)] : null;
    const late = (a) => a.closest('footer, [role="contentinfo"]') || (cut && (cut.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING));
    const st = links.find((a) => late(a) && (RE.test(a.textContent || '') || RE.test(a.getAttribute('href') || '')));
    out.facts.statement = st ? { href: st.href, raw: st.getAttribute('href'), text: (st.textContent || '').trim().slice(0, 60) } : null;
    const sig = [];
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { const j = JSON.stringify(JSON.parse(s.textContent)); if (/"@type":\s*"(Product|Offer|AggregateOffer)"/.test(j) && /"price"/.test(j)) sig.push('JSON-LD Product/Offer with price'); if (/"@type":\s*"(Reservation|ReserveAction|LodgingReservation|FoodEstablishmentReservation)"/.test(j)) sig.push('JSON-LD Reservation'); } catch { /* ignore */ }
    }
    const ctl = [...document.querySelectorAll('a[href], button, input[type="submit"], [role="button"]')];
    const BUY = /(in den warenkorb|zur kasse|jetzt kaufen|kostenpflichtig bestellen|zahlungspflichtig|add to cart|checkout|buy now)/i;
    const BOOK = /(termin buchen|jetzt buchen|online buchen|tisch reservieren|zimmer buchen|reservieren|book now|book a table|book an appointment|\bbuchen\b)/i;
    const b1 = ctl.find((x) => BUY.test(x.textContent || x.value || '')); if (b1) sig.push('control "' + (b1.textContent || b1.value).trim().slice(0, 30) + '"');
    const b2 = ctl.find((x) => BOOK.test(x.textContent || x.value || '')); if (b2) sig.push('booking control "' + (b2.textContent || b2.value).trim().slice(0, 30) + '"');
    const u1 = links.find((a) => /\/(cart|warenkorb|checkout|kasse)(\/|$|\?)/i.test(a.getAttribute('href') || '')); if (u1) sig.push('link ' + u1.getAttribute('href').slice(0, 40));
    const u2 = links.find((a) => /\/(booking|buchung|reservierung|termin)(\/|$|\?)/i.test(a.getAttribute('href') || '')); if (u2) sig.push('link ' + u2.getAttribute('href').slice(0, 40));
    const WID = [['Shopify', /cdn\.shopify\.com|shopify/i], ['Shopware', /shopware/i], ['WooCommerce', /woocommerce/i], ['Snipcart', /snipcart/i], ['Medusa', /medusa/i], ['Calendly', /calendly/i], ['Doctolib', /doctolib/i], ['Treatwell', /treatwell/i], ['Planity', /planity/i], ['OpenTable', /opentable/i], ['Quandoo', /quandoo/i], ['Booking engine', /(bookingengine|booking-engine|simplebooking|cultbooking|dirs21|seekda|hotelnetsolutions)/i]];
    const hosts = [...document.querySelectorAll('script[src], iframe[src], link[href]')].map((s) => s.getAttribute('src') || s.getAttribute('href') || '');
    for (const [nm, re] of WID) if (hosts.some((h) => re.test(h)) || (nm === 'Shopify' && window.Shopify) || (nm === 'Snipcart' && document.querySelector('#snipcart, .snipcart-add-item'))) sig.push(nm);
    const commerce = sig.some((s) => /Product|Offer|control "|cart|warenkorb|checkout|kasse|Shopify|Shopware|WooCommerce|Snipcart|Medusa/i.test(s));
    const booking = sig.some((s) => /booking|Reservation|buchung|reservierung|termin|Calendly|Doctolib|Treatwell|Planity|OpenTable|Quandoo|engine/i.test(s));
    out.facts.scope = { kind: commerce ? 'likely-b2c-commerce' : booking ? 'booking' : sig.length ? 'unknown' : 'presentation', signals: [...new Set(sig)].slice(0, 8) };
    out.facts.publicLinks = { leichteSprache: links.some((a) => /leichte\s*sprache/i.test(a.textContent || '') || /leichte-sprache/i.test(a.getAttribute('href') || '')), gebaerden: links.some((a) => /(gebärdensprache|gebaerdensprache|\bDGS\b)/i.test(a.textContent || '') || /gebaerden/i.test(a.getAttribute('href') || '')) };
    out.facts.pdfs = [...new Set(links.map((a) => a.href).filter((h) => /\.pdf(\?|#|$)/i.test(h) && (h.startsWith('file:') || (opts && opts.origin && h.startsWith(opts.origin)))))].slice(0, 5);
  }

  // ---------- site facts for multi-page checks (3.2.3, 3.2.4, 3.2.6, 2.4.2, 2.4.5) ----------
  {
    const path = (a) => { try { const u = new URL(a.href); return (u.protocol === 'file:' ? u.pathname.split('/').pop() : u.pathname.replace(/\/index\.html?$/, '/')) + (u.hash && u.hash.length > 1 && u.protocol !== 'file:' ? '' : ''); } catch { return a.getAttribute('href'); } };
    const nav = document.querySelector('header nav, nav[aria-label], nav, [role="navigation"]');
    out.facts.title = (document.title || '').trim();
    out.facts.nav = nav ? [...nav.querySelectorAll('a[href]')].filter((a) => !a.closest('[hidden]')).map((a) => ({ text: (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), href: path(a), current: a.getAttribute('aria-current') ? true : false })).slice(0, 40) : [];
    const helpKind = (a) => {
      const h = (a.getAttribute('href') || '').toLowerCase();
      if (h.startsWith('tel:')) return 'phone';
      if (h.startsWith('mailto:')) return 'email';
      if (/(\/|^)(kontakt|contact)/.test(h)) return 'contact';
      if (/(\/|^)(hilfe|help|faq|support)/.test(h)) return 'help';
      return null;
    };
    const frame = [...document.querySelectorAll('header a[href], footer a[href], [role="banner"] a[href], [role="contentinfo"] a[href]')];
    const help = [];
    for (const a of frame) { const k = helpKind(a); if (k && !help.includes(k)) help.push(k); }
    if (document.querySelector('#chat-widget, .chat-widget, [id*="tawk"], [class*="intercom"], #crisp-chatbox, [id*="userlike"], [class*="zammad-chat"]')) help.push('chat');
    out.facts.help = help;
    const map = {};
    for (const a of [...(nav ? nav.querySelectorAll('a[href]') : []), ...frame]) { const p = path(a); const t = (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); if (p && t && !(p in map)) map[p] = t; }
    out.facts.links = map;
    out.facts.search = !!document.querySelector('input[type="search"], [role="search"], form[action*="search" i], form[action*="such" i]');
    out.facts.sitemap = [...document.querySelectorAll('a[href]')].some((a) => /sitemap|seitenübersicht|inhaltsverzeichnis/i.test((a.getAttribute('href') || '') + ' ' + (a.textContent || '')));
    out.facts.internalLinks = [...new Set([...document.querySelectorAll('a[href]')].map(path).filter(Boolean))].slice(0, 200);
  }
  return out;
}
