// Browser-side measurement. Every function in this file is serialised by
// Playwright and runs inside the page, so each one must be self-contained
// (no imports, no closures over module scope).
//
// Own implementation. Ideas follow the author's earlier rendern.py / signaturen.py
// (opacity chain, per-element overflow for German compounds, "count, don't
// ban") and the public cluster list in Anthropic's frontend-design skill.
// WCAG 2.2 contrast formula is normative text, no third-party code.

/** Before scrolling: remember text that is invisible at rest (reveal start states). */
export function captureRest() {
  const hidden = [];
  const els = document.body ? document.body.querySelectorAll('*') : [];
  for (const el of els) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|HEAD|META|LINK)$/.test(el.tagName)) continue;
    let own = '';
    for (const c of el.childNodes) if (c.nodeType === 3) own += c.textContent;
    if (!own.trim()) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let a = 1;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
      const cs = getComputedStyle(p);
      a *= parseFloat(cs.opacity);
      if (cs.visibility === 'hidden') a = 0;
    }
    if (a < 0.05) hidden.push(el);
  }
  window.__mkRest = hidden;
  return hidden.length;
}

/** Scroll the page once from top to bottom so lazy images and reveal effects fire. */
export async function scrollThrough() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = Math.max(200, Math.floor(innerHeight * 0.8));
  let y = 0;
  for (let i = 0; i < 60; i++) {
    const max = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0) - innerHeight;
    if (y >= max) break;
    y = Math.min(max, y + step);
    window.scrollTo(0, y);
    await sleep(60);
  }
  await sleep(120);
  window.scrollTo(0, 0);
  // the animations the scroll triggered are waited for by settle(), which runs next
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  return true;
}

/**
 * Wait until the page holds still before anything is measured (contrast, axe).
 * Still = no short, time-based CSS/Web Animation running or waiting in its delay, and no DOM
 * mutation for `quiet` ms; at most `cap` ms. Short animations still running at the cap are
 * finished (their end state is what a visitor sees). Long ones (infinite, or ending after 5 s)
 * are cancelled for the measurement, so their rest style is measured instead of a random frame;
 * resumeMotion() restarts them before the motion checks. Scroll-driven animations are left alone
 * (their state follows the scroll position, which is deterministic).
 * opts = { cap = 3000, quiet = 350 }
 */
export async function settle(opts) {
  const cap = (opts && opts.cap) || 3000, quiet = (opts && opts.quiet) || 350;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = performance.now();
  if (!window.__kkMO && document.documentElement) {
    window.__kkMut = 0; window.__kkMutAt = performance.now() - 200; // a page that was quiet before we looked waits at most quiet-200 ms
    window.__kkMO = new MutationObserver((list) => { window.__kkMut += list.length; window.__kkMutAt = performance.now(); });
    window.__kkMO.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  }
  window.__kkFrozen = window.__kkFrozen || [];
  const timeBased = (a) => !a.timeline || a.timeline === document.timeline;
  const endOf = (a) => { try { const t = a.effect.getComputedTiming(); return t.endTime; } catch { return 0; } };
  const long = (a) => { const e = endOf(a); return e === Infinity || e > 5000; };
  const freezeLong = () => {
    for (const a of document.getAnimations ? document.getAnimations() : []) {
      if (!timeBased(a) || a.playState !== 'running' || !long(a)) continue;
      try { a.cancel(); if (!window.__kkFrozen.includes(a)) window.__kkFrozen.push(a); } catch { /* ignore */ }
    }
  };
  const shortRunning = () => (document.getAnimations ? document.getAnimations() : []).filter((a) => timeBased(a) && (a.playState === 'running' || a.pending) && !long(a));
  let waited = 0, finished = 0;
  for (;;) {
    freezeLong();
    const run = shortRunning();
    const calm = performance.now() - window.__kkMutAt >= quiet;
    if (!run.length && calm) break;
    if (performance.now() - t0 >= cap) {
      for (const a of run) { try { a.finish(); finished++; } catch { /* scroll-linked or zero-length */ } }
      break;
    }
    await sleep(50); waited++;
  }
  // two frames so finished/cancelled animations reach the computed style
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__kkSettledMut = window.__kkMut;
  return { ms: Math.round(performance.now() - t0), finished, frozen: window.__kkFrozen.length, capped: performance.now() - t0 >= cap };
}

/** After a measurement: did anything start moving or change since the last settle()? (then measure again) */
export function movedSinceSettle() {
  const timeBased = (a) => !a.timeline || a.timeline === document.timeline;
  const anim = (document.getAnimations ? document.getAnimations() : []).some((a) => {
    if (!timeBased(a) || !(a.playState === 'running' || a.pending)) return false;
    try { const e = a.effect.getComputedTiming().endTime; return e !== Infinity && e <= 5000; } catch { return false; }
  });
  return anim || (window.__kkMut || 0) !== (window.__kkSettledMut || 0);
}

/** Restart the long animations settle() cancelled, so the motion checks (WCAG 2.2.2, 2.3.3) see them. */
export function resumeMotion() {
  const list = window.__kkFrozen || [];
  window.__kkFrozen = [];
  let n = 0;
  for (const a of list) { try { a.play(); n++; } catch { /* element gone */ } }
  return n;
}

/** Main measurement for one viewport. opts = { slop: boolean, once: boolean, cfg: { t: { ruleId: threshold } } } */
export function probe(opts) {
  const TH = (opts && opts.cfg && opts.cfg.t) || {};
  const th = (id) => TH[id] || {};
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = innerHeight;
  const out = { vw, vh, hard: [], stats: {}, slop: null, usage: null, fingerprint: null };
  const push = (rule, severity, el, detail, value) => {
    out.hard.push({ rule, severity, selector: el ? sel(el) : undefined, detail, value });
  };

  // ---------- helpers ----------
  const csCache = new Map();
  const cs = (el) => { let c = csCache.get(el); if (!c) { c = getComputedStyle(el); csCache.set(el, c); } return c; };
  function sel(el) {
    const parts = [];
    let e = el;
    for (let i = 0; i < 4 && e && e.nodeType === 1 && e !== document.documentElement; i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + CSS.escape(e.id)); break; }
      if (e === document.body) { parts.unshift('body'); break; }
      const cls = [...e.classList].filter((c) => !/^(is-|has-|js-)/.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.map((c) => CSS.escape(c)).join('.');
      const p = e.parentElement;
      if (p) {
        const same = [...p.children].filter((c) => c.tagName === e.tagName);
        if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')';
      }
      parts.unshift(s);
      e = e.parentElement;
    }
    return parts.join(' > ');
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const colCache = new Map();
  // Any CSS colour string -> [r,g,b,a] in sRGB 0..255 (canvas does the conversion,
  // so oklch()/lab()/color() computed values work too).
  function rgba(str) {
    if (!str) return null;
    if (colCache.has(str)) return colCache.get(str);
    let res = null;
    const s = str.trim();
    if (s === 'transparent' || s === 'none') res = [0, 0, 0, 0];
    else {
      const leg = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/);
      if (leg) {
        let a = leg[4] === undefined ? 1 : parseFloat(leg[4]);
        if (leg[5] === '%') a /= 100;
        res = [+leg[1], +leg[2], +leg[3], a];
      } else {
        let a = 1, opaque = s;
        const m = s.match(/\/\s*([\d.]+)(%?)\s*\)\s*$/);
        if (m) { a = parseFloat(m[1]) / (m[2] === '%' ? 100 : 1); opaque = s.replace(/\/\s*[\d.]+%?\s*\)\s*$/, ')'); }
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = '#010203';
        cx.fillStyle = opaque;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        res = [d[0], d[1], d[2], a];
      }
    }
    colCache.set(str, res);
    return res;
  }
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const over = (top, a, base) => [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a)];
  const opCache = new Map();
  function opacityChain(el) {
    if (!el || el.nodeType !== 1) return 1;
    if (opCache.has(el)) return opCache.get(el);
    const v = parseFloat(cs(el).opacity) * opacityChain(el.parentElement);
    opCache.set(el, v);
    return v;
  }
  function ownText(el) { let t = ''; for (const c of el.childNodes) if (c.nodeType === 3) t += c.textContent; return t.replace(/\s+/g, ' ').trim(); }
  function srOnly(el, r) {
    const c = cs(el);
    if (r.width <= 2 && r.height <= 2) return true;
    if (c.clip && /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(c.clip)) return true;
    if (c.clipPath && /inset\(50%/.test(c.clipPath)) return true;
    return false;
  }
  const clipCache = new Map();
  // visually-hidden pattern on the element or any ancestor (clip rect(0..), 1px box with overflow hidden)
  function clippedAway(el) {
    if (!el || el.nodeType !== 1 || el === document.body) return false;
    if (clipCache.has(el)) return clipCache.get(el);
    const c = cs(el);
    const r = el.getBoundingClientRect();
    let v = srOnly(el, r) || (/(hidden|clip)/.test(c.overflow) && (r.width <= 2 || r.height <= 2));
    if (!v) v = clippedAway(el.parentElement);
    clipCache.set(el, v);
    return v;
  }
  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const c = cs(el);
    if (c.visibility === 'hidden' || c.visibility === 'collapse') return false;
    if (opacityChain(el) < 0.05) return false;
    if (clippedAway(el)) return false;
    return true;
  }
  // line boxes of a block: [{top, left, right, h}] (inline children counted once)
  function lineBoxes(el) {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const fs = parseFloat(cs(el).fontSize) || 16;
    const rows = [];
    for (const r of rg.getClientRects()) {
      if (r.width < 0.5 || r.height < 0.5 || r.height > fs * 3) continue;
      const mid = r.top + r.height / 2;
      const row = rows.find((x) => Math.abs(x.mid - mid) < Math.max(3, fs * 0.45));
      if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); }
      else rows.push({ mid, top: r.top, left: r.left, right: r.right, h: r.height });
    }
    return rows.sort((a, b) => a.mid - b.mid);
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // the ground an element sits on: first ancestor with an opaque colour or an image/gradient
  function groundOf(el) {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const c = cs(p);
      if (c.backgroundImage && c.backgroundImage !== 'none') return { image: true };
      const bg = rgba(c.backgroundColor);
      if (bg && bg[3] > 0.5) return { rgb: bg };
    }
    return { rgb: [255, 255, 255, 1] };
  }
  const BTN_SEL = 'a[href], button, [role="button"], input[type="submit"], input[type="button"]';
  // filled buttons: opaque fill that differs from the ground (white on white is not a fill)
  function filledButtons() {
    const res = [];
    for (const el of document.querySelectorAll(BTN_SEL)) {
      if (el.closest('[aria-hidden="true"]') || !visible(el)) continue;
      const c = cs(el); const r = el.getBoundingClientRect();
      if (r.height < 28 || r.height > 90 || r.width < 40) continue;
      const bg = rgba(c.backgroundColor);
      if (!bg || bg[3] < 0.9) continue;
      const g = groundOf(el);
      if (!g.image && dist(bg, g.rgb) <= 30) continue;
      res.push({ el, rgb: bg.slice(0, 3), r, y: r.top + scrollY });
    }
    return res;
  }
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|HEAD|META|LINK|TITLE|BR|WBR)$/;
  const all = [...document.body.querySelectorAll('*')].filter((e) => !SKIP.test(e.tagName) && !e.closest('svg') || e.tagName.toLowerCase() === 'svg');
  const textEls = [];
  for (const el of all) {
    if (el.tagName.toLowerCase() === 'svg') continue;
    const t = ownText(el);
    if (!t) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!visible(el)) continue;
    textEls.push(el);
  }
  out.stats.textElements = textEls.length;
  const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  out.stats.docHeight = docH;

  // ---------- 1. page overflow ----------
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    const culprits = [];
    const insideClipper = (el) => {
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        if (/(hidden|clip|auto|scroll)/.test(cs(p).overflowX) && p.getBoundingClientRect().right <= vw + 1) return true;
      }
      return false;
    };
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.right <= vw + 1) continue;
      if (cs(el).position === 'fixed') continue;
      if (insideClipper(el)) continue;
      // keep the outermost element that sticks out, not each descendant
      if (culprits.some((c) => c.contains(el))) continue;
      culprits.push(el);
      if (culprits.length >= 3) break;
    }
    if (!culprits.length) {
      // text that runs past the viewport although every box fits (long compound)
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n && culprits.length < 3; n = tw.nextNode()) {
        if (!n.textContent.trim() || !n.parentElement || insideClipper(n.parentElement)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const rr of rg.getClientRects()) if (rr.right > vw + 1) { if (!culprits.includes(n.parentElement)) culprits.push(n.parentElement); break; }
      }
    }
    push('page-overflow', 'error', culprits[0] || null,
      'Page scrolls horizontally: ' + (sw - vw) + 'px wider than the ' + vw + 'px viewport' +
      (culprits.length ? '. Sticking out: ' + culprits.map(sel).join(', ') : ''), sw - vw);
  }

  // ---------- 2. text running out of its container (German compounds) ----------
  {
    const overflowing = [];
    for (const el of all) {
      if (el.tagName.toLowerCase() === 'svg') continue;
      if (el === document.body || el === document.documentElement) continue;
      const c = cs(el);
      if (c.display === 'inline' || c.display === 'contents' || c.display === 'none') continue;
      if (/(auto|scroll)/.test(c.overflowX)) continue;
      if (el.clientWidth <= 0) continue;
      if (el.scrollWidth <= el.clientWidth + 1) continue;
      if (!el.textContent.trim()) continue;
      if (c.textOverflow === 'ellipsis') continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      if (!visible(el)) continue;
      overflowing.push(el);
    }
    // deepest only
    const deepest = overflowing.filter((el) => !overflowing.some((o) => o !== el && el.contains(o)));
    const seen = new Set();
    for (const el of deepest) {
      const c = cs(el);
      const clips = /(hidden|clip)/.test(c.overflowX);
      const r = el.getBoundingClientRect();
      const right = r.right - parseFloat(c.borderRightWidth || 0);
      const left = r.left + parseFloat(c.borderLeftWidth || 0);
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let hit = null, maxOver = 0;
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent.trim()) continue;
        const pe = n.parentElement;
        if (pe && (pe.closest('[aria-hidden="true"]') || !visible(pe))) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const rr of rg.getClientRects()) {
          if (rr.width < 2) continue;
          const straddles = (rr.left < right - 1 && rr.right > right + 1) || (rr.left < left - 1 && rr.right > left + 1);
          const outside = rr.right > right + 1 || rr.left < left - 1;
          if (clips ? straddles : outside) {
            const o = Math.max(rr.right - right, left - rr.left);
            if (o > maxOver) { maxOver = o; hit = n; }
          }
        }
      }
      if (!hit || maxOver < 1.5) continue;
      const words = (hit.textContent.match(/[\p{L}\p{N}­-]+/gu) || []).sort((a, b) => b.length - a.length);
      const word = words[0] || '';
      const key = sel(el);
      if (seen.has(key)) continue; seen.add(key);
      // A clipping container cuts whole boxes (carousel peek, masked slider): warn.
      // Text leaving its container visibly is a layout error.
      push(clips ? 'content-clipped' : 'text-overflow', clips ? 'warn' : 'error', el,
        (clips ? 'Text is cut off by an overflow:hidden container (' + Math.round(maxOver) + 'px)' : 'Text runs ' + Math.round(maxOver) + 'px out of its container') +
        (word.length >= 12 ? '. Longest word: "' + word + '" (long compound? add &shy; soft hyphens; hyphens:auto only works where the browser ships a German dictionary)' : ''),
        Math.round(maxOver));
    }
  }

  // ---------- 3. contrast (WCAG 2.2 AA, effective colour) ----------
  {
    const bgInfo = new Map();
    function layerOf(e) {
      if (bgInfo.has(e)) return bgInfo.get(e);
      const c = cs(e);
      const tag = e.tagName;
      let info;
      if (/^(IMG|VIDEO|CANVAS|PICTURE|IFRAME|OBJECT|EMBED)$/.test(tag)) info = { kind: 'photo' };
      else if (tag.toLowerCase() === 'svg') {
        const r = e.getBoundingClientRect();
        info = r.width * r.height > 40000 ? { kind: 'photo' } : { kind: 'none' };
      } else {
        const bi = c.backgroundImage;
        const col = rgba(c.backgroundColor) || [0, 0, 0, 0];
        if (bi && bi !== 'none' && /url\(/.test(bi)) info = { kind: 'photo' };
        else if (bi && bi !== 'none' && /gradient\(/.test(bi)) {
          const stops = (bi.match(/(rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-f]{3,8}\b/gi) || []).map(rgba).filter(Boolean);
          info = { kind: 'gradient', stops, color: col };
        } else info = { kind: col[3] > 0.004 ? 'color' : 'none', color: col };
      }
      bgInfo.set(e, info);
      return info;
    }
    // Returns {kind:'color', bg:[r,g,b]} | {kind:'gradient', bgs:[[r,g,b]...]} | {kind:'photo'}
    function backgroundBehind(el, x, y) {
      let stack = null;
      if (x >= 0 && y >= 0 && x < vw && y < vh) {
        const list = document.elementsFromPoint(x, y);
        const idx = list.indexOf(el);
        if (idx >= 0) stack = list.slice(idx);
      }
      if (!stack) { stack = []; for (let p = el; p; p = p.parentElement) stack.push(p); }
      const layers = [];
      for (const e of stack) {
        if (e !== el && el.contains(e)) continue;
        const L = layerOf(e);
        if (L.kind === 'none') continue;
        const op = e === el || e.contains(el) ? 1 : opacityChain(e);
        if (L.kind === 'photo') { layers.push({ kind: 'photo' }); break; }
        if (L.kind === 'gradient') { layers.push({ kind: 'gradient', stops: L.stops, color: L.color, op }); break; }
        const a = L.color[3] * op;
        layers.push({ kind: 'color', rgb: L.color, a });
        if (a >= 0.99) break;
      }
      const bottom = layers[layers.length - 1];
      if (bottom && bottom.kind === 'photo') return { kind: 'photo' };
      let bases;
      if (bottom && bottom.kind === 'gradient') {
        const under = bottom.color && bottom.color[3] > 0.5 ? bottom.color : [255, 255, 255, 1];
        bases = (bottom.stops.length ? bottom.stops : [under]).map((s) => over(s, s[3] * bottom.op, under));
        layers.pop();
      } else bases = [[255, 255, 255]];
      const res = bases.map((b) => {
        let c = b;
        for (let i = layers.length - 1; i >= 0; i--) if (layers[i].kind === 'color') c = over(layers[i].rgb, layers[i].a, c);
        return c;
      });
      return bottom && bottom.kind === 'gradient' ? { kind: 'gradient', bgs: res } : { kind: 'color', bg: res[0] };
    }
    const sorted = textEls.map((el) => ({ el, top: el.getBoundingClientRect().top + scrollY })).sort((a, b) => a.top - b.top);
    let checked = 0, unmeasurable = 0;
    for (const { el } of sorted) {
      const c = cs(el);
      if (el.closest(':disabled, [aria-disabled="true"], [disabled]')) continue;
      let fg = rgba(c.webkitTextFillColor && c.webkitTextFillColor !== c.color ? c.webkitTextFillColor : c.color);
      if (!fg) continue;
      if (fg[3] < 0.05) {
        const sw2 = parseFloat(c.webkitTextStrokeWidth || '0');
        const st = rgba(c.webkitTextStrokeColor);
        if (sw2 > 0.3 && st && st[3] > 0.05) fg = st; else continue; // gradient text / transparent fill
      }
      // bring the element into the viewport so elementsFromPoint sees it
      let r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > vh) { window.scrollTo(0, Math.max(0, r.top + scrollY - vh * 0.3)); r = el.getBoundingClientRect(); }
      let x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 12);
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const rr = rg.getClientRects()[0];
        if (rr && rr.width > 1) { x = rr.left + Math.min(rr.width / 2, 20); y = rr.top + rr.height / 2; break; }
      }
      x = Math.min(Math.max(x, 1), vw - 1);
      const back = backgroundBehind(el, x, y);
      const px = parseFloat(c.fontSize);
      const bold = (parseInt(c.fontWeight, 10) || 400) >= 700;
      const large = px >= 24 || (bold && px >= 18.66);
      const need = large ? 3 : 4.5;
      const a = fg[3] * opacityChain(el);
      const text = ownText(el).slice(0, 40);
      if (back.kind === 'photo') {
        unmeasurable++;
        push('contrast-unmeasurable', 'warn', el, 'Contrast not measurable: text over a photo/image ("' + text + '"). Check by eye or add a scrim.');
        continue;
      }
      checked++;
      if (back.kind === 'gradient') {
        const ks = back.bgs.map((b) => ratio(over(fg, a, b), b));
        const worst = Math.min(...ks);
        if (worst < need - 0.01) push('contrast-gradient', 'warn', el,
          'Contrast over a gradient not reliably measurable; worst stop ' + worst.toFixed(2) + ':1 (needs ' + need + ':1) for "' + text + '"', +worst.toFixed(2));
        continue;
      }
      const k = ratio(over(fg, a, back.bg), back.bg);
      if (k < need - 0.01) {
        push('contrast', 'error', el,
          'Contrast ' + k.toFixed(2) + ':1, needs ' + need + ':1 (' + Math.round(px) + 'px' + (bold ? ' bold' : '') + (a < 0.99 ? ', effective opacity ' + a.toFixed(2) : '') + ') for "' + text + '"',
          +k.toFixed(2));
      }
    }
    window.scrollTo(0, 0);
    out.stats.contrastChecked = checked;
    out.stats.contrastUnmeasurable = unmeasurable;
  }

  // ---------- 4. target size ----------
  {
    const TSEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="switch"], [role="menuitem"]';
    const targets = [];
    for (const el of document.querySelectorAll(TSEL)) {
      if (el.closest('[aria-hidden="true"]') || !visible(el)) continue;
      if (el.parentElement && el.parentElement.closest(TSEL)) continue; // nested target: outer counts
      const c = cs(el);
      const r = el.getBoundingClientRect();
      // WCAG 2.5.8 inline exception: link inside a run of text
      let inline = false;
      if (c.display.startsWith('inline') && !c.display.includes('block') && !c.display.includes('flex') && !c.display.includes('grid')) {
        const block = el.parentElement;
        const bt = block ? (block.innerText || '').trim() : '';
        const et = (el.innerText || '').trim();
        if (bt.length > et.length + 12) inline = true;
      }
      if ((el.type === 'checkbox' || el.type === 'radio') && el.labels && el.labels.length) {
        const lr = el.labels[0].getBoundingClientRect();
        if (lr.width >= 24 && lr.height >= 24) inline = true;
      }
      targets.push({ el, r, inline, cx: r.left + r.width / 2, cy: r.top + r.height / 2, small: r.width < 24 - 0.5 || r.height < 24 - 0.5 });
    }
    let mobileSmall = 0; const mobileEx = [];
    for (const t of targets) {
      if (t.inline) continue;
      if (t.small) {
        let ok = true;
        for (const o of targets) {
          if (o === t) continue;
          if (o.small) { if (Math.hypot(o.cx - t.cx, o.cy - t.cy) < 24) { ok = false; break; } }
          else {
            const dx = Math.max(o.r.left - t.cx, 0, t.cx - o.r.right);
            const dy = Math.max(o.r.top - t.cy, 0, t.cy - o.r.bottom);
            if (Math.hypot(dx, dy) < 12) { ok = false; break; }
          }
        }
        if (!ok) {
          push('target-size', 'error', t.el, 'Click target ' + Math.round(t.r.width) + 'x' + Math.round(t.r.height) + 'px is below 24x24 and too close to its neighbours (WCAG 2.5.8)', Math.round(Math.min(t.r.width, t.r.height)));
          continue;
        }
      }
      if (vw < 600 && (t.r.width < 44 - 0.5 || t.r.height < 44 - 0.5)) {
        mobileSmall++;
        if (mobileEx.length < 4) mobileEx.push(sel(t.el) + ' ' + Math.round(t.r.width) + 'x' + Math.round(t.r.height));
      }
    }
    if (mobileSmall) out.hard.push({ rule: 'target-size-mobile', severity: 'warn', detail: mobileSmall + ' touch target(s) below 44x44px on mobile, e.g. ' + mobileEx.join('; '), value: mobileSmall });
    out.stats.targets = targets.length;
  }

  // ---------- 5. input font size on mobile ----------
  if (vw < 600) {
    for (const el of document.querySelectorAll('input, select, textarea')) {
      if (/^(checkbox|radio|range|color|file|submit|button|image|hidden|reset)$/.test(el.type)) continue;
      if (!visible(el)) continue;
      const px = parseFloat(cs(el).fontSize);
      if (px < 16) push('input-font-size', 'error', el, 'Form field font-size ' + px + 'px on mobile; below 16px iOS zooms in on focus', px);
    }
  }

  // ---------- 5b. one filled primary button per screen ----------
  {
    const fb = filledButtons();
    const bands = {};
    for (const b of fb) { const k = Math.floor(b.y / vh); (bands[k] ||= []).push(b); }
    const lim = th('multiple-primary').max ?? 1;
    const worst = Object.values(bands).sort((a, b) => b.length - a.length)[0];
    if (worst && worst.length > lim) push('multiple-primary', 'warn', worst[1].el, worst.length + ' filled primary buttons within one screen (' + vh + 'px band): ' + worst.slice(0, 4).map((b) => sel(b.el)).join(', ') + '. Make one primary, the others secondary or links.', worst.length);
    out.stats.filledButtons = fb.length;
    if (opts.slop) {
      const t = th('cta-colours');
      const cols = [];
      for (const b of fb) if (!cols.some((c) => dist(c, b.rgb) <= (t.distance ?? 30))) cols.push(b.rgb);
      if (cols.length > (t.max ?? 1)) push('cta-colours', 'warn', null, cols.length + ' different fill colours on primary buttons: ' + cols.map((c) => 'rgb(' + c.join(',') + ')').join(', ') + '. One CTA colour sitewide.', cols.length);
    }
  }

  // ---------- 5c. zoom must stay possible ----------
  if (opts.once) {
    const mv = document.querySelector('meta[name="viewport"]');
    const ct = mv ? (mv.getAttribute('content') || '').toLowerCase() : '';
    const ms = ct.match(/maximum-scale\s*=\s*([\d.]+)/);
    if (/user-scalable\s*=\s*(no|0)/.test(ct) || (ms && parseFloat(ms[1]) < (th('zoom-disabled').min_scale ?? 2))) push('zoom-disabled', 'error', null, 'Zoom is disabled: <meta name="viewport" content="' + ct + '"> (WCAG 1.4.4)', ct);
  }

  // ---------- 6./7. alt text and accessible names (viewport-independent) ----------
  if (opts.once) {
    for (const el of document.querySelectorAll('img, input[type="image"], [role="img"]')) {
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.tagName === 'IMG' || el.tagName === 'INPUT') {
        if (!el.hasAttribute('alt') && el.getAttribute('role') !== 'presentation' && el.getAttribute('role') !== 'none' && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
          push('img-alt', 'error', el, 'Image without alt attribute (use alt="" if decorative): ' + (el.getAttribute('src') || '').slice(0, 60));
      } else if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')) {
        push('img-alt', 'error', el, 'role="img" without aria-label');
      }
    }
    const nameOf = (el) => {
      const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
      const lb = el.getAttribute('aria-labelledby');
      if (lb) { const t = lb.split(/\s+/).map((id) => { const n = document.getElementById(id); return n ? n.textContent : ''; }).join(' ').trim(); if (t) return t; }
      if (el.tagName === 'INPUT') { const v = el.value || el.getAttribute('value') || el.getAttribute('alt'); if (v && v.trim()) return v.trim(); if (el.labels && el.labels.length) return el.labels[0].textContent.trim(); }
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let t = '';
      for (let n = tw.currentNode; n; n = tw.nextNode()) {
        if (n.nodeType === 3) { const pe = n.parentElement; if (pe && pe.closest('[aria-hidden="true"]') && !el.closest('[aria-hidden="true"]')) continue; t += n.textContent; }
        else if (n !== el) {
          if (n.tagName === 'IMG' && n.getAttribute('alt')) t += ' ' + n.getAttribute('alt');
          if (n.getAttribute && n.getAttribute('aria-label') && !n.closest('[aria-hidden="true"]')) t += ' ' + n.getAttribute('aria-label');
          if (n.tagName && n.tagName.toLowerCase() === 'title' && n.closest('svg')) t += ' ' + n.textContent;
        }
      }
      if (t.trim()) return t.trim();
      const ti = el.getAttribute('title'); if (ti && ti.trim()) return ti.trim();
      return '';
    };
    for (const el of document.querySelectorAll('a[href], button, [role="button"], [role="link"], input[type="submit"], input[type="button"], input[type="reset"], summary')) {
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if ((r.width < 1 || r.height < 1) && cs(el).display === 'none') continue;
      if (!nameOf(el)) push('accessible-name', 'error', el, (el.tagName === 'A' ? 'Link' : 'Button') + ' without accessible name (no text, aria-label or alt)');
    }
    // content that stays invisible after scrolling (reveal that never fired)
    const rest = window.__mkRest || [];
    let revealed = 0, stuck = 0; const stuckEx = [];
    for (const el of rest) {
      if (!el.isConnected) continue;
      if (visible(el)) revealed++;
      else if (!el.closest('nav, dialog, [role="dialog"], [aria-hidden="true"], [hidden], details:not([open])')) { stuck++; if (stuckEx.length < 3) stuckEx.push(sel(el)); }
    }
    if (stuck) out.hard.push({ rule: 'content-hidden', severity: 'warn', detail: stuck + ' text element(s) still invisible (opacity 0) after scrolling through the page, e.g. ' + stuckEx.join('; '), value: stuck });
    out.stats.revealedAfterScroll = revealed;
  }

  // ---------- slop signals, colour usage, fingerprint (widest viewport only) ----------
  if (opts.slop) {
    const S = {};
    const firstFamily = (stack) => (stack || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
    const isHeading = (el) => /^H[1-6]$/.test(el.tagName) || el.getAttribute('role') === 'heading';
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')].filter(visible);
    const bodyPx = (() => {
      const ps = [...document.querySelectorAll('p, li')].filter(visible).map((p) => parseFloat(cs(p).fontSize)).sort((a, b) => a - b);
      return ps.length ? ps[Math.floor(ps.length / 2)] : parseFloat(cs(document.body).fontSize);
    })();

    // fonts used by visible text, weighted by characters
    const fonts = {};
    for (const el of textEls) {
      const c = cs(el);
      const fam = firstFamily(c.fontFamily).toLowerCase();
      const n = ownText(el).length;
      const f = fonts[fam] || (fonts[fam] = { name: fam, stack: c.fontFamily, chars: 0, headingChars: 0 });
      f.chars += n;
      if (el.closest('h1, h2, h3') || parseFloat(c.fontSize) >= Math.max(28, bodyPx * 1.8)) f.headingChars += n;
    }
    S.fonts = Object.values(fonts);

    // gradients (incl. ::before/::after blobs) and gradient text
    const gradients = []; let gradientText = 0; const gradientTextEx = [];
    let radialGlows = 0, dotGrids = 0; const radialEx = [];
    for (const el of all) {
      for (const pseudo of [null, '::before', '::after']) {
        const c = pseudo ? getComputedStyle(el, pseudo) : cs(el);
        const bi = c.backgroundImage;
        if (!bi || bi === 'none' || !/gradient\(/.test(bi)) continue;
        if (pseudo && (c.content === 'none' || c.content === 'normal')) continue;
        let w, h;
        if (pseudo) { const r0 = el.getBoundingClientRect(); w = parseFloat(c.width) || r0.width; h = parseFloat(c.height) || r0.height; }
        else { if (!visible(el)) continue; const r = el.getBoundingClientRect(); w = r.width; h = r.height; }
        const clipText = /text/.test(c.backgroundClip || '') || /text/.test(c.webkitBackgroundClip || '');
        if (clipText) { gradientText++; if (gradientTextEx.length < 3) gradientTextEx.push(sel(el)); continue; }
        const stops = (bi.match(/(rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-f]{3,8}\b/gi) || []).map(rgba).filter((s) => s && s[3] > 0.15);
        if (/radial-gradient\(/.test(bi)) {
          const tile = (c.backgroundSize || '').match(/^([\d.]+)px(?:\s+([\d.]+)px)?/);
          const tileMax = th('dot-grid').tile_px ?? 40;
          if (tile && parseFloat(tile[1]) <= tileMax && !/no-repeat/.test(c.backgroundRepeat)) { dotGrids++; continue; }
          if (/transparent|rgba?\([^)]*[,/]\s*0(\.0+)?\s*\)|\/\s*0%?\s*\)/.test(bi)) { radialGlows++; if (radialEx.length < 3) radialEx.push(sel(el) + (pseudo || '')); }
        }
        if (/repeating-/.test(bi) && stops.length <= 2) continue; // stripes/hairlines, not a colour wash
        gradients.push({ selector: sel(el) + (pseudo || ''), area: w * h, w, h, stops: stops.map((s) => s.slice(0, 3)) });
      }
    }
    S.gradients = gradients; S.gradientText = gradientText; S.gradientTextEx = gradientTextEx;
    S.radialGlows = radialGlows; S.radialEx = radialEx; S.dotGrids = dotGrids;
    S.viewportArea = vw * vh; S.vw = vw;

    // glass, big shadows, radius uniformity
    let glass = 0; const glassEx = []; let bigShadow = 0; const shadowEx = [];
    const boxes = []; const boxEls = []; const shadowValues = [];
    let customCursor = 0, bounce = 0, transitionAll = 0, pulsingDots = 0; const bounceEx = [], transitionAllEx = [];
    const stripeMin = th('side-stripe').min_px ?? 2;
    const stripeSig = new Map();
    const secs = (v) => (v || '0s').split(',').map((x) => parseFloat(x) * (/ms\s*$/.test(x) ? 1 : 1000));
    for (const el of all) {
      if (el.tagName.toLowerCase() === 'svg') continue;
      const c = cs(el);
      // motion and cursor (computed, visible or not: start states are often hidden)
      if (c.cursor === 'none' || /url\(/.test(c.cursor)) customCursor++;
      const tf = (c.transitionTimingFunction || '') + ',' + (c.animationTimingFunction || '');
      for (const m of tf.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
        const v = m[1].split(',').map(parseFloat);
        if (v.length === 4 && (v[1] < 0 || v[1] > 1 || v[3] < 0 || v[3] > 1)) { bounce++; if (bounceEx.length < 3) bounceEx.push(sel(el)); break; }
      }
      const tp = (c.transitionProperty || '').split(',').map((x) => x.trim());
      const td = secs(c.transitionDuration);
      if (tp.some((x, i) => x === 'all' && (td[i % td.length] || 0) > 0)) { transitionAll++; if (transitionAllEx.length < 3) transitionAllEx.push(sel(el)); }
      if (c.animationName && c.animationName !== 'none' && /infinite/.test(c.animationIterationCount)) {
        const rr = el.getBoundingClientRect();
        if (rr.width > 0 && rr.width <= (th('pulsing-dot').max_px ?? 16) && rr.height <= (th('pulsing-dot').max_px ?? 16)) pulsingDots++;
      }
      // side stripes: one coloured side clearly heavier than the others
      if (el.parentElement) {
        for (const side of ['Left', 'Right', 'Top']) {
          const w = parseFloat(c['border' + side + 'Width']);
          if (!(w >= stripeMin) || c['border' + side + 'Style'] === 'none') continue;
          const col = rgba(c['border' + side + 'Color']);
          if (!col || col[3] < 0.3) continue;
          const others = ['Top', 'Right', 'Bottom', 'Left'].filter((x) => x !== side);
          const heavier = others.every((o) => parseFloat(c['border' + o + 'Width']) < w - 0.5 || (c['border' + o + 'Color'] !== c['border' + side + 'Color'] && parseFloat(c['border' + o + 'Width']) <= w));
          if (!heavier) continue;
          const k = side + '|' + col.slice(0, 3).join(',');
          const m = stripeSig.get(el.parentElement) || {};
          (m[k] ||= []).push(el); stripeSig.set(el.parentElement, m);
          break;
        }
      }
      const bf = c.backdropFilter || c.webkitBackdropFilter;
      const vis = () => visible(el);
      if (bf && bf !== 'none' && vis()) { glass++; if (glassEx.length < 3) glassEx.push(sel(el)); }
      if (c.boxShadow && c.boxShadow !== 'none' && vis()) {
        let big = false;
        for (const part of c.boxShadow.split(/,(?![^()]*\))/)) {
          if (/inset/.test(part)) continue;
          const nums = part.replace(/(rgba?|oklch|oklab|lab|lch|color|hsla?)\([^()]*\)/g, '').match(/-?[\d.]+px/g) || [];
          const [, oy = '0', blur = '0'] = nums.map((n) => n);
          if (parseFloat(blur) >= 16 || (Math.abs(parseFloat(oy)) >= 8 && parseFloat(blur) >= 10)) big = true;
        }
        if (big) { bigShadow++; if (shadowEx.length < 3) shadowEx.push(sel(el)); }
      }
      const r = el.getBoundingClientRect();
      if (r.width >= 80 && r.height >= 48 && r.width * r.height >= 6000 && el !== document.body && r.width < vw * 0.98) {
        const bg = rgba(c.backgroundColor);
        const hasBg = bg && bg[3] > 0.05 || (c.backgroundImage && c.backgroundImage !== 'none');
        const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(c['border' + s + 'Width']) > 0 && c['border' + s + 'Style'] !== 'none').length >= 3;
        const hasShadow = c.boxShadow && c.boxShadow !== 'none';
        if ((hasBg || hasBorder || hasShadow) && vis() && !/^(IMG|VIDEO|INPUT|TEXTAREA|SELECT|BUTTON|IFRAME)$/.test(el.tagName)) {
          let rad = c.borderTopLeftRadius;
          rad = rad.endsWith('%') ? parseFloat(rad) / 100 * r.width : parseFloat(rad);
          if (rad >= r.height / 2 - 1 && r.height < 120) continue; // pill: a control, not a box
          boxes.push(Math.round(rad || 0));
          boxEls.push({ el, rad: rad || 0, r });
          if (hasShadow) shadowValues.push(c.boxShadow);
        }
      }
    }
    S.glass = glass; S.glassEx = glassEx; S.bigShadow = bigShadow; S.shadowEx = shadowEx; S.boxRadii = boxes;
    S.shadowValues = shadowValues; S.customCursor = customCursor; S.bounce = bounce; S.bounceEx = bounceEx;
    S.transitionAll = transitionAll; S.transitionAllEx = transitionAllEx; S.pulsingDots = pulsingDots;
    {
      let groups = 0; const ex = [];
      for (const [parent, m] of stripeSig) for (const els of Object.values(m)) if (els.filter(visible).length >= 2) { groups++; if (ex.length < 3) ex.push(sel(parent)); }
      S.stripeGroups = groups; S.stripeEx = ex;
    }
    // nested cards: a rounded box inside another rounded box, both at least 120x60
    {
      const cards = boxEls.filter((b) => b.rad > 0 && b.r.width >= 120 && b.r.height >= 60);
      let n = 0; const ex = [];
      for (const b of cards) if (cards.some((o) => o !== b && o.el.contains(b.el))) { n++; if (ex.length < 3) ex.push(sel(b.el)); }
      S.nestedCards = n; S.nestedEx = ex;
    }
    // fonts inside one card
    {
      const lim = th('card-fonts').families ?? 3;
      let n = 0; const ex = [];
      for (const b of boxEls) {
        const fams = new Set();
        for (const t of textEls) if (b.el.contains(t)) fams.add(firstFamily(cs(t).fontFamily).toLowerCase());
        if (fams.size >= lim && !boxEls.some((o) => o !== b && b.el.contains(o.el))) { n++; if (ex.length < 2) ex.push(sel(b.el) + ' (' + [...fams].join(', ') + ')'); }
      }
      S.cardFonts = n; S.cardFontsEx = ex;
    }

    // eyebrows: small caps labels directly above a heading
    const headRects = headings.map((h) => [h, h.getBoundingClientRect()]).concat(
      textEls.filter((e) => !isHeading(e) && parseFloat(cs(e).fontSize) >= Math.max(26, bodyPx * 1.7)).map((e) => [e, e.getBoundingClientRect()]));
    let eyebrows = 0; const eyebrowEx = [];
    for (const el of textEls) {
      const t = ownText(el);
      if (t.length < 2 || t.length > 40) continue;
      const c = cs(el);
      const px = parseFloat(c.fontSize);
      if (px > 15.5) continue;
      const caps = c.textTransform === 'uppercase' || (t === t.toUpperCase() && /\p{Lu}{3}/u.test(t));
      const r = el.getBoundingClientRect();
      const bg = rgba(c.backgroundColor);
      const rad = parseFloat(c.borderTopLeftRadius) || 0;
      const pill = bg && bg[3] > 0.05 && rad >= r.height / 2 - 2 || (parseFloat(c.borderTopWidth) > 0 && rad >= r.height / 2 - 2);
      const tracked = parseFloat(c.letterSpacing) >= 0.04 * px;
      if (!(caps && (tracked || pill)) && !(pill && caps)) continue;
      if (el.closest('a, button, nav, footer, label')) continue;
      const above = headRects.some(([h, hr]) => h !== el && !h.contains(el) && !el.contains(h) && hr.top >= r.bottom - 4 && hr.top - r.bottom <= 100 && hr.left < r.right && hr.right > r.left &&
        (Math.abs(hr.left - r.left) < 24 || Math.abs((hr.left + hr.right) / 2 - (r.left + r.right) / 2) < 24));
      if (above) { eyebrows++; if (eyebrowEx.length < 3) eyebrowEx.push('"' + t + '"'); }
    }
    S.eyebrows = eyebrows; S.eyebrowEx = eyebrowEx; S.headings = headings.length;

    // numbered section markers 01 / 02 / 03
    const nums = new Set(); const numEls = [];
    for (const el of textEls) {
      const t = ownText(el);
      const m = t.match(/^(0[1-9])(\s*[./·—–:)-]\s*.{0,40})?$/);
      if (m && !el.closest('ol, time, table, code, pre')) { nums.add(m[1]); numEls.push(el); }
    }
    // a real sequence (steps, timeline) sits in one list-like group: the markers' common ancestor is a
    // component, not the page, and the items it holds are not page sections. Then it is not counted.
    if (numEls.length >= 2) {
      let lca = numEls[0].parentElement;
      while (lca && !numEls.every((e) => lca.contains(e))) lca = lca.parentElement;
      const items = lca ? [...lca.children].filter((k) => numEls.some((e) => k.contains(e))) : [];
      const pageLevel = !lca || /^(BODY|HTML|MAIN)$/.test(lca.tagName) || items.some((k) => /^(SECTION|HEADER|FOOTER|ARTICLE)$/.test(k.tagName) || k.querySelector('h2'));
      if (!pageLevel) nums.clear();
    }
    S.numbered = nums.size;

    // three equal cards with an icon on top
    let threeCards = 0; const threeEx = [];
    const iconish = (n) => {
      if (!n) return false;
      const t = n.tagName.toLowerCase();
      const r = n.getBoundingClientRect();
      if (r.width > 96 || r.height > 96 || r.width < 8) return false;
      if (t === 'svg' || t === 'img' || t === 'i') return true;
      if (/icon|ico|emoji|symbol/i.test(n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className || '')) return true;
      const tx = (n.textContent || '').trim();
      return tx.length <= 3 && /\p{Extended_Pictographic}/u.test(tx);
    };
    for (const el of all) {
      const kids = [...el.children].filter((k) => visible(k));
      if (kids.length !== 3) continue;
      const rs = kids.map((k) => k.getBoundingClientRect());
      if (rs[0].width < 120 || rs[0].height < 80) continue;
      if (!rs.every((r) => Math.abs(r.top - rs[0].top) < 6 && Math.abs(r.width - rs[0].width) <= Math.max(3, rs[0].width * 0.03))) continue;
      let withIcon = 0;
      for (const k of kids) {
        const h = k.querySelector('h2, h3, h4, h5, strong, b, [role="heading"]');
        let first = null;
        for (const d of k.querySelectorAll('*')) { if (d.closest('svg') && d.tagName.toLowerCase() !== 'svg') continue; const dr = d.getBoundingClientRect(); if (dr.width > 0 && dr.height > 0 && (d.children.length === 0 || d.tagName.toLowerCase() === 'svg')) { first = d; break; } }
        if (first && iconish(first) && (!h || first.getBoundingClientRect().bottom <= h.getBoundingClientRect().top + 4)) withIcon++;
      }
      if (withIcon >= 2) { threeCards++; if (threeEx.length < 2) threeEx.push(sel(el)); }
    }
    S.threeCards = threeCards; S.threeEx = threeEx;

    // button-like elements
    const buttonLike = [...document.querySelectorAll('a[href], button, [role="button"], input[type="submit"]')].filter((el) => {
      if (!visible(el)) return false;
      const c = cs(el); const r = el.getBoundingClientRect();
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') return true;
      const bg = rgba(c.backgroundColor);
      const border = parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none';
      return ((bg && bg[3] > 0.2) || border || (c.backgroundImage && c.backgroundImage !== 'none')) && parseFloat(c.paddingLeft) >= 8 && r.height >= 28 && r.height <= 90;
    });

    // centred hero with two buttons
    let centredHero = 0;
    const h1 = [...document.querySelectorAll('h1')].find(visible);
    if (h1) {
      const r = h1.getBoundingClientRect();
      const centred = cs(h1).textAlign === 'center' || (Math.abs((r.left + r.right) / 2 - vw / 2) < vw * 0.04 && r.width < vw * 0.85);
      let box = h1.parentElement;
      while (box && box !== document.body && box.getBoundingClientRect().height < 300) box = box.parentElement;
      if (centred && box) {
        const btns = buttonLike.filter((b) => box.contains(b) && b.getBoundingClientRect().top >= r.top);
        if (btns.length >= 2) centredHero = 1;
      }
    }
    S.centredHero = centredHero;

    // emoji in headings
    let emojiHead = 0;
    for (const h of headings) { const t = (h.textContent || '').replace(/[©®™]/g, ''); if (/\p{Extended_Pictographic}/u.test(t)) emojiHead++; }
    S.emojiHeadings = emojiHead;

    // skipped heading levels (document order, visible h1-h6)
    {
      let prev = 0, n = 0; const ex = [];
      for (const h of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        if (!visible(h)) continue;
        const lv = +h.tagName[1];
        if (prev && lv > prev + 1) { n++; if (ex.length < 3) ex.push('h' + prev + ' → h' + lv + ' (' + sel(h) + ')'); }
        prev = lv;
      }
      S.headingSkips = n; S.headingSkipEx = ex;
    }
    // orphan word on the last line of h1/h2
    {
      const minW = th('orphan-heading').min_words ?? 4;
      let n = 0; const ex = [];
      for (const h of document.querySelectorAll('h1, h2')) {
        if (!visible(h)) continue;
        const words = (h.textContent || '').trim().split(/\s+/).filter(Boolean);
        if (words.length < minW) continue;
        const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        let last = null; for (let t = tw.nextNode(); t; t = tw.nextNode()) if (t.textContent.trim()) last = t;
        if (!last) continue;
        const m = last.textContent.match(/(\S+)\s*$/);
        if (!m) continue;
        const start = m.index, end = m.index + m[1].length;
        const rw = document.createRange(); rw.setStart(last, start); rw.setEnd(last, end);
        const wr = [...rw.getClientRects()].filter((r) => r.width > 0.5)[0];
        const rb = document.createRange(); rb.setStart(h, 0); rb.setEnd(last, start);
        const br = [...rb.getClientRects()].filter((r) => r.width > 0.5);
        if (!wr || !br.length) continue;
        const prevTop = Math.max(...br.map((r) => r.top + r.height / 2));
        if (wr.top + wr.height / 2 > prevTop + wr.height * 0.5) { n++; if (ex.length < 3) ex.push('"' + m[1] + '" in ' + sel(h)); }
      }
      S.orphans = n; S.orphanEx = ex;
    }
    // H1 line count, words in the first screen, justified and long centred text, tracked caps, pure black
    {
      const h1v = [...document.querySelectorAll('h1')].find(visible);
      S.h1Lines = h1v ? lineBoxes(h1v).length : 0;
      let fw = 0, just = 0, centred = 0, caps = 0, black = 0, mdots = 0;
      const centredMax = th('long-centred').lines ?? 3;
      for (const el of textEls) {
        const c = cs(el); const r = el.getBoundingClientRect(); const t = ownText(el);
        if (r.top < vh && r.bottom > 0) fw += (t.match(/\S+/g) || []).length;
        const px = parseFloat(c.fontSize);
        if (c.textTransform === 'uppercase' && parseFloat(c.letterSpacing) >= 0.02 * px) caps++;
        if ((t.match(/\s·\s/g) || []).length >= 2) mdots++;
        if (!/^(P|LI|DD|BLOCKQUOTE|FIGCAPTION|DIV|SPAN)$/.test(el.tagName)) continue;
        if (c.textAlign === 'justify' && lineBoxes(el).length >= 2) just++;
        if (c.textAlign === 'center' && /^(P|LI|DD|BLOCKQUOTE)$/.test(el.tagName) && lineBoxes(el).length > centredMax) centred++;
        const col = rgba(c.color);
        if (/^(P|LI|DD)$/.test(el.tagName) && col && col[0] === 0 && col[1] === 0 && col[2] === 0 && col[3] > 0.99 && lum(groundOf(el).rgb || [255, 255, 255]) > 0.5) black++;
      }
      S.firstScreenWords = fw; S.justified = just; S.longCentred = centred; S.trackedCaps = caps; S.pureBlack = black; S.middleDots = mdots;
    }
    // body line length (hard, widest viewport)
    {
      const t = th('line-length');
      const maxCh = t.max_ch ?? 80, tight = t.tight_from_ch ?? 76, minLh = t.min_line_height ?? 1.45, minChars = t.min_chars ?? 120;
      const found = [];
      for (const el of document.querySelectorAll('p, li, dd, blockquote, figcaption')) {
        if (el.closest('nav, pre, code, table, [aria-hidden="true"]') || !visible(el)) continue;
        if (el.querySelector('p, li, dd, blockquote, ul, ol')) continue;
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt.length < minChars) continue;
        const rows = lineBoxes(el);
        if (rows.length < 2) continue;
        const widths = rows.map((x) => x.right - x.left);
        const cw = widths.reduce((a, b) => a + b, 0) / txt.length;
        if (!(cw > 0)) continue;
        const cpl = Math.round(Math.max(...widths) / cw);
        const c = cs(el); const fs = parseFloat(c.fontSize);
        const lh = c.lineHeight === 'normal' ? 1.2 : parseFloat(c.lineHeight) / fs;
        if (cpl > maxCh || (cpl > tight && lh < minLh)) found.push({ el, cpl, lh });
      }
      found.sort((a, b) => b.cpl - a.cpl);
      for (const f of found.slice(0, 3)) push('line-length', 'error', f.el, 'Body line length about ' + f.cpl + ' characters per line (line height ' + f.lh.toFixed(2) + '); keep it at 45 to 75, never above ' + maxCh + ' (' + tight + ' to ' + maxCh + ' only with line height ≥ ' + minLh + ')', f.cpl);
    }

    // dashes in running text
    let dashes = 0, words = 0;
    for (const el of textEls) {
      if (el.closest('h1, h2, h3, h4, h5, h6, code, pre, nav, title')) continue;
      const t = ownText(el);
      words += (t.match(/\S+/g) || []).length;
      dashes += (t.match(/—/g) || []).length; // the spaced German en dash "–" is a normal Gedankenstrich
    }
    S.dashes = dashes; S.words = words;

    // single highlighted word in the H1
    let hiH1 = 0; const hiEx = [];
    for (const h of [...document.querySelectorAll('h1')].filter(visible)) {
      const hc = cs(h);
      const total = (h.textContent || '').trim().length;
      for (const d of h.querySelectorAll('*')) {
        const t = (d.textContent || '').trim();
        if (!t || t.split(/\s+/).length > 3 || t.length > total * 0.6) continue;
        const dc = cs(d);
        const diff = dc.color !== hc.color || dc.fontStyle !== hc.fontStyle || firstFamily(dc.fontFamily) !== firstFamily(hc.fontFamily) ||
          /text/.test(dc.backgroundClip || '') || /text/.test(dc.webkitBackgroundClip || '') || (dc.backgroundImage !== 'none');
        if (diff) { hiH1++; hiEx.push('"' + t + '"'); break; }
      }
    }
    S.highlightH1 = hiH1; S.highlightEx = hiEx;

    // scroll reveal
    let revealClasses = 0;
    const RX = /(^|[\s_-])(reveal|fade-?(in|up|down|left|right)?|slide-?(up|in)|aos-[\w-]+|animate__[\w-]+|scroll-?reveal|wow|in-?view|appear|animate-on-scroll)($|[\s_-])/i;
    for (const el of all) {
      const cn = typeof el.className === 'string' ? el.className : '';
      if (RX.test(cn) || el.hasAttribute('data-aos') || el.hasAttribute('data-animate') || el.hasAttribute('data-reveal') || el.hasAttribute('data-scroll')) revealClasses++;
    }
    S.revealClasses = revealClasses;
    S.revealedAtRest = (window.__mkRest || []).filter((e) => e.isConnected && visible(e)).length;

    // mono labels
    let mono = 0; const monoEx = [];
    const isData = (el, t) => {
      if (el.closest('table, time, data, dl, [datetime], output, var')) return true;
      const ns = t.replace(/\s/g, '');
      const digits = (ns.match(/\d/g) || []).length;
      if (ns.length && digits / ns.length >= 0.4) return true;
      if (/^[\d\s.,:;/+%€$£×x#-]+$/.test(t)) return true;
      if (/\d\s?(€|EUR|%|km|m²|m2|kg|kWh|h|Uhr|min)\b/.test(t) || /^\d{1,2}:\d{2}/.test(t) || /^[A-Z]{2,}-?\d+/.test(t)) return true;
      return false;
    };
    for (const el of textEls) {
      if (el.closest('code, pre, kbd, samp, textarea')) continue;
      const t = ownText(el);
      const c = cs(el);
      if (t.length > 40 || parseFloat(c.fontSize) > 14.5) continue;
      if (!/(^|[\s"'])(mono|monospace|ui-monospace)|courier|consolas|menlo|monaco|code|jetbrains|fira mono|plex mono|sf mono|space mono|dm mono|geist mono/i.test(firstFamily(c.fontFamily))) continue;
      if (isData(el, t)) continue;
      mono++; if (monoEx.length < 3) monoEx.push('"' + t + '"');
    }
    S.monoLabels = mono; S.monoEx = monoEx;

    // arrows on buttons / links
    let arrows = 0;
    const links = [...document.querySelectorAll('a[href], button')].filter(visible);
    for (const el of links) { const t = (el.textContent || '').trim(); if (/(→|↗|⟶|->|»|›)\s*$/.test(t) || /^\s*(→|↗|⟶)/.test(t)) arrows++; }
    S.arrows = arrows; S.buttons = buttonLike.length;

    // logo wall
    let logoWalls = 0;
    for (const el of all) {
      const kids = [...el.children].filter(visible);
      if (kids.length < 5) continue;
      const logos = kids.filter((k) => {
        const r = k.getBoundingClientRect();
        if (r.height > 110) return false;
        const t = (k.textContent || '').trim();
        const media = k.matches('img, svg, picture') || k.querySelector('img, svg');
        return media && t.length <= 24;
      });
      if (logos.length >= 5 && logos.length >= kids.length * 0.8) {
        const tops = new Set(logos.map((k) => Math.round(k.getBoundingClientRect().top / 20)));
        if (tops.size <= 2) logoWalls++;
      }
    }
    S.logoWalls = logoWalls;

    // testimonial carousel
    let carousels = 0;
    const CX = /(carousel|slider|swiper|splide|slick|glide|embla|marquee|owl|flickity|keen)/i;
    const TX = /(testimonial|review|kundenstimm|stimmen|referenz|quote|zitat)/i;
    for (const el of all) {
      const id = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '');
      const isCar = CX.test(id) || el.getAttribute('aria-roledescription') === 'carousel' ||
        (/(auto|scroll|hidden)/.test(cs(el).overflowX) && el.scrollWidth > el.clientWidth * 1.3 && el.clientWidth > 200);
      if (!isCar) continue;
      const quotes = el.querySelectorAll('blockquote, q, figure, [class*="testimonial"], [class*="review"], [class*="quote"]').length;
      let ctx = TX.test(id) || quotes >= 2;
      for (let p = el.parentElement; !ctx && p && p !== document.body; p = p.parentElement) {
        const pid = (typeof p.className === 'string' ? p.className : '') + ' ' + (p.id || '');
        if (TX.test(pid)) ctx = true;
      }
      if (ctx && !(el.parentElement && el.parentElement.closest('[data-kk-car]'))) { carousels++; el.setAttribute('data-kk-car', ''); }
    }
    for (const el of document.querySelectorAll('[data-kk-car]')) el.removeAttribute('data-kk-car');
    S.testimonialCarousels = carousels;

    // big-number stats
    let stats = 0;
    for (const el of textEls) {
      const t = ownText(el);
      if (/^[+~≈>]?\s?\d{1,3}([.,\s]?\d{3})*([.,]\d+)?\s?(\+|%|k\+?|K\+?|M\+?|Mio\.?|Mrd\.?|x|×|\/7|h)?$/.test(t) && parseFloat(cs(el).fontSize) >= 28) stats++;
      else if (el.hasAttribute('data-count') || el.hasAttribute('data-countup') || /count-?up|counter/i.test(typeof el.className === 'string' ? el.className : '')) stats++;
    }
    S.statCounters = stats;

    // media and images
    {
      let autoplay = 0, noPoster = 0, noDims = 0; const noDimsEx = [];
      for (const m of document.querySelectorAll('video, audio')) {
        if (m.hasAttribute('autoplay') && !m.hasAttribute('controls')) autoplay++;
        if (m.tagName === 'VIDEO' && !m.getAttribute('poster')) { const r = m.getBoundingClientRect(); if (r.width > 0 && r.top + scrollY < vh) noPoster++; }
      }
      const imgs = [...document.querySelectorAll('img')];
      for (const im of imgs) {
        if (im.hasAttribute('width') && im.hasAttribute('height')) continue;
        if (cs(im).aspectRatio && cs(im).aspectRatio !== 'auto') continue;
        noDims++; if (noDimsEx.length < 3) noDimsEx.push(sel(im));
      }
      const content = imgs.filter((im) => visible(im) && im.getBoundingClientRect().width >= 100);
      S.captionsEverywhere = content.length >= (th('captions-everywhere').min_images ?? 3) && content.every((im) => { const f = im.closest('figure'); return f && f.querySelector('figcaption'); }) ? 1 : 0;
      S.autoplay = autoplay; S.heroVideoNoPoster = noPoster; S.imgNoDims = noDims; S.imgNoDimsEx = noDimsEx;
      const icons = [];
      for (const e of document.querySelectorAll('svg, i, span[class], [data-lucide], [data-icon]')) {
        const cn = e.className && e.className.baseVal !== undefined ? e.className.baseVal : (typeof e.className === 'string' ? e.className : '');
        const extra = (e.getAttribute('data-lucide') ? ' lucide' : '') + (e.getAttribute('data-icon') ? ' ' + e.getAttribute('data-icon') : '');
        if ((cn + extra).trim() && (e.tagName.toLowerCase() !== 'span' || /icon|lucide|ph-|fa-|ti-|bi-|material/i.test(cn))) icons.push((cn + extra).trim());
        if (icons.length >= 400) break;
      }
      S.iconClasses = icons;
      const urls = new Set();
      for (const im of imgs) { for (const u of [im.currentSrc, im.getAttribute('src')]) if (u) urls.add(new URL(u, location.href).href); }
      for (const so of document.querySelectorAll('source[srcset], img[srcset]')) for (const part of (so.getAttribute('srcset') || '').split(',')) { const u = part.trim().split(/\s+/)[0]; if (u) try { urls.add(new URL(u, location.href).href); } catch { /* bad url */ } }
      for (const el of all) { const bi = cs(el).backgroundImage; if (bi && bi.includes('url(')) for (const m of bi.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(m[1]); if (urls.size > 400) break; }
      S.imageUrls = [...urls].filter((u) => /^https?:/.test(u)).slice(0, 400);
      let text = '';
      for (const el of textEls) { if (el.closest('code, pre, kbd, samp')) continue; text += ownText(el) + '\n'; if (text.length > 100000) break; }
      S.text = text;
    }

    // page background and accents (for colour clusters)
    const bodyBg = rgba(cs(document.body).backgroundColor);
    const htmlBg = rgba(cs(document.documentElement).backgroundColor);
    S.pageBg = bodyBg && bodyBg[3] > 0.5 ? bodyBg : htmlBg && htmlBg[3] > 0.5 ? htmlBg : [255, 255, 255, 1];
    // dominant surface: largest opaque background in the first screens
    const surf = {};
    for (const el of all) {
      const c = cs(el); const bg = rgba(c.backgroundColor);
      if (!bg || bg[3] < 0.9) continue;
      const r = el.getBoundingClientRect(); const a = r.width * r.height;
      if (a < vw * 200) continue;
      const k = bg.slice(0, 3).join(','); surf[k] = (surf[k] || 0) + a;
    }
    const topSurf = Object.entries(surf).sort((a, b) => b[1] - a[1])[0];
    S.surfaceBg = topSurf ? topSurf[0].split(',').map(Number) : S.pageBg.slice(0, 3);
    const accents = [];
    for (const b of buttonLike) {
      const c = cs(b); const bg = rgba(c.backgroundColor); const r = b.getBoundingClientRect();
      if (bg && bg[3] > 0.5) accents.push({ rgb: bg.slice(0, 3), w: r.width * r.height, kind: 'button' });
    }
    for (const a of document.querySelectorAll('a[href]')) { if (!visible(a)) continue; const c = rgba(cs(a).color); if (c) accents.push({ rgb: c.slice(0, 3), w: 200, kind: 'link' }); }
    for (const h of headings) for (const d of h.querySelectorAll('*')) { const c = rgba(cs(d).color); if (c) accents.push({ rgb: c.slice(0, 3), w: 400, kind: 'heading-accent' }); }
    for (const el of textEls) { const c = rgba(cs(el).color); if (c) accents.push({ rgb: c.slice(0, 3), w: ownText(el).length, kind: 'text' }); }
    for (const g of gradients) for (const s of g.stops) accents.push({ rgb: s, w: Math.min(g.area, vw * vh) / Math.max(1, g.stops.length) / 50, kind: 'gradient' });
    S.accents = accents;
    out.slop = S;

    // ---------- colour usage (for token drift) ----------
    const usage = {};
    const add = (col, w, kind) => {
      if (!col || col[3] < 0.1 || w <= 0) return;
      const k = kind + '|' + col.slice(0, 3).join(',');
      usage[k] = (usage[k] || 0) + w;
    };
    const vArea = vw * vh;
    for (const el of all) {
      if (el.tagName.toLowerCase() === 'svg') continue;
      if (!visible(el)) continue;
      const c = cs(el); const r = el.getBoundingClientRect();
      add(rgba(c.backgroundColor), Math.min(r.width * r.height, vArea * 2) / 1000, 'bg');
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const bw = parseFloat(c['border' + s + 'Width']);
        if (bw > 0 && c['border' + s + 'Style'] !== 'none') add(rgba(c['border' + s + 'Color']), (s === 'Top' || s === 'Bottom' ? r.width : r.height) * bw / 50, 'border');
      }
    }
    for (const el of textEls) { const c = cs(el); add(rgba(c.color), ownText(el).length * parseFloat(c.fontSize) / 10, 'text'); }
    out.usage = Object.entries(usage).map(([k, w]) => { const [kind, rgb] = k.split('|'); return { kind, rgb: rgb.split(',').map(Number), w }; });

    // ---------- structural fingerprint ----------
    let root = document.querySelector('main') || document.body;
    for (let i = 0; i < 4; i++) {
      const kids = [...root.children].filter(visible);
      const tall = kids.filter((k) => k.getBoundingClientRect().height > 0.8 * root.getBoundingClientRect().height);
      if (kids.length <= 2 && tall.length === 1 && !/^(MAIN|HEADER|FOOTER|SECTION)$/.test(tall[0].tagName)) root = tall[0]; else break;
    }
    let blocks = [...root.children].filter((k) => visible(k) && k.getBoundingClientRect().height >= 60);
    if (root.tagName === 'MAIN') {
      const before = [...document.body.querySelectorAll('header, nav')].filter((e) => visible(e) && !root.contains(e) && !e.parentElement.closest('header, nav')).slice(0, 1);
      const after = [...document.body.querySelectorAll('footer')].filter((e) => visible(e) && !root.contains(e)).slice(-1);
      blocks = before.concat(blocks, after);
    }
    const classify = (b) => {
      const tag = b.tagName;
      const r = b.getBoundingClientRect();
      const txt = (b.innerText || '').trim();
      const w = (txt.match(/\S+/g) || []).length;
      if (tag === 'FOOTER' || b.getAttribute('role') === 'contentinfo') return 'footer';
      if ((tag === 'HEADER' || tag === 'NAV') && r.height < 200 && !b.querySelector('h1')) return 'nav';
      if (b.querySelector('h1')) return 'hero';
      if (b.querySelector('form, input, textarea')) return 'form';
      if (b.querySelectorAll('details, [class*="faq"]').length >= 2) return 'faq';
      if (b.querySelector('blockquote, [class*="testimonial"], [class*="quote"]')) return 'quote';
      let imgArea = 0; for (const m of b.querySelectorAll('img, picture, video, svg')) { const mr = m.getBoundingClientRect(); imgArea += mr.width * mr.height; }
      // repeated similar children = cards
      let cards = 0;
      for (const g of [b, ...b.querySelectorAll('*')]) {
        const kids = [...g.children].filter(visible);
        if (kids.length < 3) continue;
        const rs = kids.map((k) => k.getBoundingClientRect());
        if (rs[0].width < 100 || rs[0].height < 60) continue;
        if (rs.filter((x) => Math.abs(x.width - rs[0].width) < 4).length === kids.length && kids.every((k) => k.tagName === kids[0].tagName)) { cards = kids.length; break; }
      }
      const logoish = [...b.querySelectorAll('*')].some((g) => { const k = [...g.children]; return k.length >= 5 && k.every((x) => x.matches('img, svg') || (x.querySelector('img, svg') && (x.textContent || '').trim().length < 24)); });
      if (logoish) return 'logos';
      if (cards >= 3) return 'cards-' + Math.min(cards, 4);
      if (imgArea > 0.5 * r.width * r.height) return 'media';
      if (r.height < 500 && w < 60 && b.querySelector('a[href], button')) return 'cta';
      return 'text';
    };
    const seq = blocks.map(classify);
    const headingFam = S.fonts.slice().sort((a, b) => b.headingChars - a.headingChars)[0];
    const bodyFam = S.fonts.slice().sort((a, b) => (b.chars - b.headingChars) - (a.chars - a.headingChars))[0];
    const h1px = h1 ? parseFloat(cs(h1).fontSize) : (headings[0] ? parseFloat(cs(headings[0]).fontSize) : bodyPx);
    out.fingerprint = {
      sections: seq,
      headingFont: headingFam && headingFam.headingChars ? headingFam.name : (bodyFam ? bodyFam.name : null),
      bodyFont: bodyFam ? bodyFam.name : null,
      typeScale: +(h1px / bodyPx).toFixed(2),
      bodyPx,
      words,
      density: +(words / Math.max(1, docH / 1000)).toFixed(1),
      docHeight: docH,
      textAlignH1: h1 ? cs(h1).textAlign : null,
    };
  }
  return out;
}

/** Visible text length and counters that read 0 (used with and without JavaScript). */
export function textPresence() {
  let chars = 0, zeros = 0;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05) return false;
    }
    return true;
  };
  for (const el of document.body ? document.body.querySelectorAll('*') : []) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
    own = own.replace(/\s+/g, ' ').trim();
    if (!own) continue;
    const cn = typeof el.className === 'string' ? el.className : '';
    const counter = el.hasAttribute('data-count') || el.hasAttribute('data-countup') || el.hasAttribute('data-target') || /count-?up|counter/i.test(cn) || parseFloat(getComputedStyle(el).fontSize) >= 28;
    if (counter && /^[+~≈>]?\s?0+([.,]0+)?\s?(\+|%|k\+?|K\+?|M\+?|x|×)?$/.test(own)) zeros++;
    if (vis(el)) chars += own.length;
  }
  return { chars, zeros };
}

/** Mark elements that move (CSS animation, or transition of at least minMs) and remember their motion styles. */
export function motionMark(minMs) {
  const secs = (v) => (v || '0s').split(',').map((x) => parseFloat(x) * (/ms\s*$/.test(x) ? 1 : 1000));
  const sig = (c) => [c.animationName, c.animationDuration, c.animationIterationCount, c.animationPlayState, c.transitionDuration, c.transitionProperty, c.scrollBehavior].join('|');
  let n = 0; const ex = [];
  window.__kkMotion = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const c = getComputedStyle(el);
    const anim = c.animationName && c.animationName !== 'none' && Math.max(...secs(c.animationDuration)) > 0;
    const tr = Math.max(...secs(c.transitionDuration)) >= minMs;
    if (!anim && !tr) continue;
    window.__kkMotion.set(el, sig(c));
    n++;
    if (ex.length < 3) ex.push(el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '') + (anim ? ' (animation ' + c.animationName + ')' : ' (transition ' + c.transitionDuration + ')'));
  }
  let mq = false;
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch { continue; }
    const walk = (rs) => { for (const r of rs) { if (r.media && /prefers-reduced-motion/.test(r.media.mediaText)) mq = true; if (r.cssRules) walk(r.cssRules); } };
    walk(rules || []);
  }
  return { n, ex, mediaQuery: mq };
}

/** After emulating prefers-reduced-motion: how many marked elements changed their motion styles. */
export function motionCompare() {
  const sig = (c) => [c.animationName, c.animationDuration, c.animationIterationCount, c.animationPlayState, c.transitionDuration, c.transitionProperty, c.scrollBehavior].join('|');
  let changed = 0;
  for (const [el, before] of window.__kkMotion || []) if (el.isConnected && sig(getComputedStyle(el)) !== before) changed++;
  window.__kkMotion = null;
  return changed;
}

/** Keyboard focus test, step 1: remember the rest style of every focusable element. */
export function focusPrepare() {
  const SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  const P = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth', 'borderBottomWidth', 'backgroundColor', 'backgroundImage', 'color', 'textDecorationLine', 'textDecorationThickness', 'textDecorationColor', 'textUnderlineOffset', 'transform', 'opacity'];
  const PP = ['content', 'opacity', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'boxShadow', 'transform', 'width', 'height', 'outlineStyle'];
  window.__kkFocusSig = (el) => {
    const c = getComputedStyle(el);
    const noOutline = c.outlineStyle === 'none' || parseFloat(c.outlineWidth) === 0;
    // an outline that is not drawn (style none or width 0) carries no focus signal, whatever its offset or colour
    let s = P.map((p) => (noOutline && /^outline/.test(p) ? 'none' : c[p])).join('|');
    for (const ps of ['::before', '::after']) { const q = getComputedStyle(el, ps); if (q.content && q.content !== 'none' && q.content !== 'normal') s += '#' + PP.map((p) => q[p]).join('|'); }
    return s;
  };
  const rest = new Map();
  for (const el of document.querySelectorAll(SEL)) rest.set(el, window.__kkFocusSig(el));
  window.__kkFocusRest = rest;
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
  window.scrollTo(0, 0);
  return rest.size;
}

/** Keyboard focus test, step 2 (after each Tab): does the focused element look different from rest? */
export async function focusStep() {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 60));
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement || el.tagName === 'IFRAME') return null;
  const parts = []; let e = el;
  for (let i = 0; i < 3 && e && e.nodeType === 1 && e !== document.body; i++) {
    let s = e.tagName.toLowerCase();
    if (e.id) { parts.unshift(s + '#' + e.id); break; }
    const cls = [...e.classList].slice(0, 2); if (cls.length) s += '.' + cls.join('.');
    const p = e.parentElement; if (p) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')'; }
    parts.unshift(s); e = e.parentElement;
  }
  const rest = window.__kkFocusRest ? window.__kkFocusRest.get(el) : undefined;
  const r = el.getBoundingClientRect();
  return { sel: parts.join(' > '), known: rest !== undefined, same: rest !== undefined && rest === window.__kkFocusSig(el), visible: r.width > 1 && r.height > 1, text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30) };
}
