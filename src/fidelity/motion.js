// kk motion <url|file|dir>: what moves, measured. document.getAnimations() with keyframes and timing, declared
// @keyframes and transitions, scroll and view timelines, motion libraries named in script URLs, load frames, a scroll
// sweep (which elements change opacity/transform/colour with scroll) and hover diffs via page.hover().
// Every row is marked OBSERVED (measured or read from the page) or INFERRED (deduced). Never stores scripts or CSS.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withContextSlot } from '../browser.js';
import { classifyTarget, openTarget, quietOverlays, contextOpts, defaultOut, gotoChecked } from './targets.js';
import { montage } from './montage.js';

export function staticMotionProbe() {
  const label = (e) => { if (!e || !e.tagName) return null; const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : ''; return e.tagName.toLowerCase() + (e.id ? '#' + e.id.slice(0, 24) : '') + (c ? '.' + c.slice(0, 32) : ''); };
  const srcs = [...document.scripts].map((s) => (s.src || '') + ' ' + (s.textContent || '').slice(0, 6000)).join(' ').toLowerCase();
  const LIBS = { gsap: 'gsap', scrolltrigger: 'scrolltrigger', lenis: 'lenis', locomotive: 'locomotive-scroll', barba: 'barba', swup: 'swup', 'framer-motion': 'framer-motion', motion: 'motion.dev', lottie: 'lottie', three: 'three', pixi: 'pixi', splittype: 'split-type', splitting: 'splitting', swiper: 'swiper', splide: 'splide', aos: 'aos.js', anime: 'anime', rive: 'rive', spline: 'spline', webflow: 'webflow', embla: 'embla' };
  const libs = Object.entries(LIBS).filter(([, k]) => srcs.includes(k)).map(([n]) => n);
  const keyframes = [], scrollTL = [], viewTL = [], transRules = []; let reduced = 0, viewTransitionRule = false;
  const walk = (rules) => { for (const r of rules) {
    if (r.type === 7) { const steps = [...r.cssRules].slice(0, 6).map((k) => ({ at: k.keyText, props: [...k.style].slice(0, 6).map((p) => `${p}: ${k.style.getPropertyValue(p).slice(0, 60)}`) })); if (keyframes.length < 40) keyframes.push({ name: r.name, steps }); }
    if (r.conditionText && /prefers-reduced-motion/.test(r.conditionText)) reduced++;
    if (r.constructor && r.constructor.name === 'CSSViewTransitionRule') viewTransitionRule = true;
    if (r.style) { const at = r.style.getPropertyValue('animation-timeline'); if (at && !/^(auto|none|initial|inherit|unset)(,\s*(auto|none))*$/.test(at.trim())) (/view/.test(at) ? viewTL : scrollTL).push({ selector: (r.selectorText || '').slice(0, 80), timeline: at.slice(0, 60), range: r.style.getPropertyValue('animation-range').slice(0, 60) || null }); if (r.style.getPropertyValue('view-timeline-name') || r.style.getPropertyValue('scroll-timeline-name')) scrollTL.push({ selector: (r.selectorText || '').slice(0, 80), timeline: 'named ' + (r.style.getPropertyValue('view-timeline-name') || r.style.getPropertyValue('scroll-timeline-name')) }); }
    if (r.cssRules) walk(r.cssRules); } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
  const trans = {};
  for (const e of [...document.body.querySelectorAll('*')].slice(0, 6000)) { const s = getComputedStyle(e); if (s.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) { const k = `${s.transitionProperty.slice(0, 80)} | ${s.transitionDuration.slice(0, 40)} | ${s.transitionTimingFunction.slice(0, 80)} | ${s.transitionDelay.slice(0, 30)}`; (trans[k] ||= { count: 0, example: label(e) }).count++; } }
  const anims = document.getAnimations().slice(0, 40).map((a) => { const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {}; const tl = a.timeline; const kfs = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []; return { name: a.animationName || a.transitionProperty || a.constructor.name, kind: a.constructor.name, target: label(a.effect && a.effect.target), duration: t.duration, delay: t.delay, easing: t.easing === 'linear' && kfs[0] && kfs[0].easing && kfs[0].easing !== 'linear' ? kfs[0].easing + ' (keyframe)' : t.easing, iterations: t.iterations, fill: t.fill, play: a.playState, timeline: tl ? tl.constructor.name : null, keyframes: a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().slice(0, 4).map((k) => Object.fromEntries(Object.entries(k).filter(([p]) => !['composite', 'computedOffset'].includes(p)).map(([p, v]) => [p, String(v).slice(0, 50)]))) : [] }; });
  return { libs, keyframes, transitions: Object.entries(trans).sort((a, b) => b[1].count - a[1].count).slice(0, 20).map(([k, v]) => { const [prop, dur, ease, delay] = k.split(' | '); return { property: prop, duration: dur, easing: ease, delay, count: v.count, example: v.example }; }),
    running: anims, scroll_timelines: scrollTL.slice(0, 12), view_timelines: viewTL.slice(0, 12), reduced_motion_blocks: reduced, view_transitions: viewTransitionRule || srcs.includes('startviewtransition'),
    video: document.querySelectorAll('video').length, canvas: document.querySelectorAll('canvas').length, smooth_scroll_css: getComputedStyle(document.documentElement).scrollBehavior };
}

// Snapshot of the visual state of watched elements (for the scroll sweep).
export function watchState() {
  const label = (e) => { const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : ''; return e.tagName.toLowerCase() + (e.id ? '#' + e.id.slice(0, 24) : '') + (c ? '.' + c.slice(0, 32) : ''); };
  if (!window.__kkWatch) {
    const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const pick = [...document.querySelectorAll('h1, h2, h3, header, nav, section, img, video, figure, [class*="hero"], [class*="reveal"], [class*="fade"]')].filter(shown).slice(0, 60);
    const fixed = [...document.body.querySelectorAll('*')].slice(0, 5000).filter((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position)).slice(0, 12);
    window.__kkWatch = [...new Set([...pick, ...fixed])];
  }
  return { y: Math.round(scrollY), bodyBg: getComputedStyle(document.body).backgroundColor, running: document.getAnimations().length,
    els: window.__kkWatch.map((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { el: label(e), op: +(+s.opacity).toFixed(2), tf: s.transform === 'none' ? 'none' : s.transform.slice(0, 60), clip: s.clipPath === 'none' ? 'none' : s.clipPath.slice(0, 40), color: s.color, bg: s.backgroundColor, top: Math.round(r.top) }; }) };
}

export function diffSweep(states) {
  const out = []; if (!states.length) return out;
  const n = states[0].els.length;
  for (let i = 0; i < n; i++) {
    for (const prop of ['op', 'tf', 'clip', 'color', 'bg']) {
      const vals = states.map((s) => s.els[i]?.[prop]);
      const changes = []; for (let k = 1; k < vals.length; k++) if (vals[k] !== vals[k - 1]) changes.push(k);
      if (!changes.length) continue;
      const first = changes[0], last = changes[changes.length - 1];
      out.push({ el: states[0].els[i].el, property: { op: 'opacity', tf: 'transform', clip: 'clip-path', color: 'color', bg: 'background' }[prop], from: vals[first - 1], to: vals[last], y_from: states[first - 1].y, y_to: states[last].y, steps_changed: changes.length,
        technique: changes.length >= 3 ? 'scrubbed with scroll (INFERRED: value changes on several consecutive steps)' : 'triggered once at a scroll position (INFERRED)' });
    }
    // fixed element that moves (hide-on-scroll navigation)
  }
  if (states.some((s) => s.bodyBg !== states[0].bodyBg)) out.push({ el: 'body', property: 'background', from: states[0].bodyBg, to: states.find((s) => s.bodyBg !== states[0].bodyBg).bodyBg, y_from: 0, y_to: states.find((s) => s.bodyBg !== states[0].bodyBg).y, steps_changed: 1, technique: 'page tint changes with scroll (INFERRED)' });
  return out.slice(0, 60);
}

function hoverSnapshot(e) {
  const props = ['backgroundColor', 'color', 'opacity', 'transform', 'filter', 'boxShadow', 'width', 'height', 'clipPath', 'borderColor', 'textDecorationLine', 'backgroundSize', 'scale', 'translate'];
  const label = (x) => { const c = typeof x.className === 'string' ? x.className.trim().split(/\s+/)[0] : ''; return x.tagName.toLowerCase() + (c ? '.' + c.slice(0, 30) : ''); };
  return { body: getComputedStyle(document.body).backgroundColor, els: [e, ...e.querySelectorAll('*')].slice(0, 14).map((x) => { const s = getComputedStyle(x); return { el: label(x), ...Object.fromEntries(props.map((p) => [p, String(s[p]).slice(0, 70)])) }; }) };
}
const hoverDiff = (a, b) => { const ch = []; a.els.forEach((x, i) => { const y = b.els[i]; if (!y) return; for (const k of Object.keys(x)) if (k !== 'el' && x[k] !== y[k]) ch.push({ el: x.el, property: k, from: x[k], to: y[k] }); }); if (a.body !== b.body) ch.push({ el: 'body', property: 'backgroundColor', from: a.body, to: b.body }); return ch; };

export async function runMotion({ target, out, width = 1440, hovers = 8, sweepVh = 10, allowLoopback = true, allowFiles = true, log = () => {} } = {}) {
  const t = await classifyTarget(target, { allowLoopback, allowFiles });
  const opened = await openTarget(t);
  const dir = resolve(out || defaultOut('motion', opened.label)); const shots = join(dir, 'shots'); mkdirSync(shots, { recursive: true });
  try {
    const res = await withContextSlot(async () => {
      const ctx = await opened.newContext(contextOpts(width));
      try {
        const page = await ctx.newPage();
        const t0 = Date.now(); const loadFrames = [];
        await gotoChecked(page, opened.url, { waitUntil: 'commit' });
        for (const ms of [100, 400, 800, 1400, 2500, 4000]) { const w = ms - (Date.now() - t0); if (w > 0) await page.waitForTimeout(w); const f = join(shots, `load-${ms}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 50 }).catch(() => {}); loadFrames.push({ ms, file: f }); }
        log('static probe');
        const probe = await page.evaluate(staticMotionProbe);
        if (opened.isPublic) await quietOverlays(page);
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
        const vh = contextOpts(width).viewport.height;
        const docH = await page.evaluate(() => document.documentElement.scrollHeight);
        const states = []; const scrollFrames = [];
        const maxY = Math.min(docH - vh, vh * sweepVh);
        log('scroll sweep');
        for (let y = 0, k = 0; y <= Math.max(0, maxY); y += Math.round(vh / 3), k++) {
          await page.mouse.wheel(0, y - (await page.evaluate(() => scrollY))); await page.waitForTimeout(450);
          states.push(await page.evaluate(watchState));
          if (k % 3 === 0 && scrollFrames.length < 10) { const f = join(shots, `scroll-${String(scrollFrames.length).padStart(2, '0')}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 50 }); scrollFrames.push({ y, file: f }); }
        }
        // hide-on-scroll navigation: fixed layer that moved up after scrolling down
        const navMove = states.length > 2 ? states[0].els.map((e, i) => ({ el: e.el, top0: e.top, top1: states[states.length - 1].els[i]?.top, tf1: states[states.length - 1].els[i]?.tf })).filter((x) => x.top0 <= 2 && x.top1 < -10 && x.top1 > -400) : [];
        log('hover diffs');
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
        const cands = await page.evaluate((max) => {
          const out = []; const shown = (e) => { const r = e.getBoundingClientRect(); return r.width >= 24 && r.height >= 16; };
          for (const e of document.querySelectorAll('a, button, [role="button"], article, li, figure, [class*="card"], [class*="item"]')) {
            if (!shown(e)) continue; const s = getComputedStyle(e);
            const own = s.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
            const inner = /^(A|BUTTON)$/.test(e.tagName) && [...e.querySelectorAll('*')].slice(0, 20).some((x) => getComputedStyle(x).transitionDuration.split(',').some((d) => parseFloat(d) > 0));
            if (!own && !inner) continue;
            if ([...document.querySelectorAll('[data-kk-hover]')].some((p) => p.contains(e) || e.contains(p))) continue; e.setAttribute('data-kk-hover', String(out.length)); out.push(e.tagName.toLowerCase()); if (out.length >= max) break;
          }
          return out.length;
        }, hovers);
        const hoverRows = [];
        for (let i = 0; i < cands; i++) {
          const loc = page.locator(`[data-kk-hover="${i}"]`);
          try {
            await loc.scrollIntoViewIfNeeded({ timeout: 1500 }); await page.mouse.move(2, 2); await page.waitForTimeout(350);
            const before = await loc.evaluate(hoverSnapshot);
            await loc.hover({ timeout: 1500, force: true }); await page.waitForTimeout(90);
            const mid = await loc.evaluate(hoverSnapshot); await page.waitForTimeout(800);
            const after = await loc.evaluate(hoverSnapshot);
            const changes = hoverDiff(before, after);
            if (!changes.length) continue;
            const settled = hoverDiff(mid, after).length === 0;
            const bb = await loc.boundingBox(); const f = join(shots, `hover-${i}.jpg`);
            if (bb) await page.screenshot({ path: f, type: 'jpeg', quality: 60, clip: { x: Math.max(0, bb.x - 24), y: Math.max(0, bb.y - 24), width: Math.min(width, bb.width + 48), height: Math.min(vh, bb.height + 48) } }).catch(() => {});
            const sig = changes.map((c) => c.property + c.to).join('|');
            const same = hoverRows.find((h) => h.sig === sig && h.target === before.els[0].el);
            if (same) { same.count++; continue; }
            hoverRows.push({ target: before.els[0].el, changes: changes.slice(0, 10), settled_after_90ms: settled, shot: bb ? f : null, sig, count: 1 });
          } catch {}
        }
        // cursor follower: a small fixed element that moves with the pointer
        await page.mouse.move(300, 300); await page.waitForTimeout(250);
        const c1 = await page.evaluate(() => [...document.body.querySelectorAll('*')].slice(0, 5000).filter((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width < 160).map((e) => Math.round(e.getBoundingClientRect().x)));
        await page.mouse.move(900, 500); await page.waitForTimeout(300);
        const c2 = await page.evaluate(() => [...document.body.querySelectorAll('*')].slice(0, 5000).filter((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width < 160).map((e) => Math.round(e.getBoundingClientRect().x)));
        const cursorFollower = c1.some((x, i) => c2[i] !== undefined && Math.abs(c2[i] - x) > 200);
        await opened.clean(ctx);
        return { probe, sweep: diffSweep(states), states_count: states.length, nav_hide: navMove, hovers: hoverRows, cursor_follower: cursorFollower, load_frames: loadFrames, scroll_frames: scrollFrames };
      } finally { await ctx.close().catch(() => {}); }
    });
    const strips = {};
    strips.load = join(dir, 'strip-load.jpg'); await montage(res.load_frames.map((f) => ({ file: f.file, label: f.ms + ' ms' })), strips.load, { columns: 3, scale: 0.33 });
    if (res.scroll_frames.length) { strips.scroll = join(dir, 'strip-scroll.jpg'); await montage(res.scroll_frames.map((f) => ({ file: f.file, label: 'y ' + f.y })), strips.scroll, { columns: 3, scale: 0.33 }); }
    const motion = { tool: 'kiekkist', kind: 'motion', version: 1, measured_at: new Date().toISOString(), target: opened.label, width, ...res, strips };
    writeFileSync(join(dir, 'motion.json'), JSON.stringify(motion, null, 1));
    writeFileSync(join(dir, 'MOTION.draft.md'), renderMotionMd(motion));
    return { dir, motion };
  } finally { await opened.close(); }
}

// Effect, not technique: how a measured behaviour should be rebuilt (references/fidelity.md, motion translation).
export function translationHints(m) {
  const h = [];
  const libs = m.probe.libs || [];
  if (libs.some((l) => ['gsap', 'scrolltrigger', 'locomotive', 'motion', 'framer-motion'].includes(l))) h.push('Scroll and reveal effects come from a JS library: rebuild the effect with CSS scroll-driven animations (animation-timeline: view() / scroll()) or one IntersectionObserver class toggle; no library.');
  if (libs.includes('lenis') || libs.includes('locomotive')) h.push('Smooth-scroll library present: do not rebuild it; keep native scrolling.');
  if (libs.some((l) => ['barba', 'swup'].includes(l))) h.push('Page transitions via a router library: use cross-document View Transitions (@view-transition { navigation: auto }) instead.');
  if (libs.some((l) => ['three', 'pixi', 'spline', 'rive'].includes(l)) || m.probe.canvas) h.push('WebGL/canvas scene: replace with an own still, a short muted loop with poster, or CSS layers (masks, clip-path, gradients); never ship the scene.');
  if (libs.includes('lottie')) h.push('Lottie animation: redraw as SVG with CSS keyframes (stroke-dashoffset, transform).');
  if (m.cursor_follower) h.push('Cursor follower measured: replace with hover/focus states inside the element (works for touch and keyboard).');
  if (m.sweep.some((s) => /scrubbed/.test(s.technique))) h.push('Scrubbed scroll changes measured: CSS scroll-driven animation with animation-range; finished state without support.');
  if (m.nav_hide.length) h.push('Navigation hides on scroll down: one passive, rAF-throttled scroll handler toggling a class; transform transition.');
  h.push('Always: prefers-reduced-motion turns all of it off; content visible without JS; a static snapshot state (?static or print) shows every element in its finished state.');
  return h;
}

export function renderMotionMd(m) {
  const p = m.probe; const L = [];
  const ms = (v) => (typeof v === 'number' ? Math.round(v) + ' ms' : String(v ?? '-'));
  const table = (head, rows) => (rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '-').replace(/\|/g, '/')).join(' | ')} |`)].join('\n') : '_none measured_');
  L.push(`# Motion (draft): ${m.target}`, '');
  L.push(`Measured ${m.measured_at.slice(0, 10)} with kk motion at ${m.width} px: document.getAnimations(), @keyframes, computed transitions, scroll/view timelines, script URLs (library names only), load frames at 100-4000 ms, a scroll sweep in thirds of the viewport (${m.states_count} states), page.hover() with styles before, after 90 ms and after 890 ms.`);
  L.push('OBSERVED = measured value or rule read from the page. INFERRED = deduced from frames or value patterns. Edit, then save as MOTION.md.', '');
  L.push(`Libraries named in scripts: ${p.libs.join(', ') || 'none'}. Video ${p.video}, canvas ${p.canvas}. View transitions: ${p.view_transitions ? 'yes' : 'no'}. prefers-reduced-motion blocks: ${p.reduced_motion_blocks}. scroll-behavior: ${p.smooth_scroll_css}.`, '');
  L.push('## Summary table', '');
  const rows = [];
  for (const a of p.running) rows.push([a.target, a.timeline && a.timeline !== 'DocumentTimeline' ? 'scroll/view timeline' : 'load / state', a.name, `${ms(a.duration)}${a.delay ? ' +' + ms(a.delay) : ''} ${a.easing || ''}${a.iterations === Infinity ? ' infinite' : ''}`, 'OBSERVED (getAnimations)']);
  for (const t of p.transitions.slice(0, 10)) rows.push([`${t.example} (+${t.count - 1})`, 'state change (hover/class)', t.property, `${t.duration} ${t.easing}${t.delay && !/^0s$/.test(t.delay) ? ' delay ' + t.delay : ''}`, 'OBSERVED (declared)']);
  for (const s of p.scroll_timelines.concat(p.view_timelines)) rows.push([s.selector, 'scroll', s.timeline, s.range || '-', 'OBSERVED (CSS rule)']);
  for (const s of m.sweep.slice(0, 20)) rows.push([s.el, `scroll y ${s.y_from}-${s.y_to}`, `${s.property}: ${s.from} -> ${s.to}`, s.technique.replace(/ \(INFERRED.*\)/, ''), 'OBSERVED values, technique INFERRED']);
  for (const nv of m.nav_hide) rows.push([nv.el, 'scroll down', `top ${nv.top0} -> ${nv.top1}`, '-', 'OBSERVED position']);
  for (const h of m.hovers) rows.push([h.target + (h.count > 1 ? ` (x${h.count})` : ''), 'hover', h.changes.map((c) => `${c.el} ${c.property}: ${c.from} -> ${c.to}`).slice(0, 3).join('; '), h.settled_after_90ms ? 'instant (< 90 ms)' : 'transition (> 90 ms)', 'OBSERVED (page.hover)']);
  if (m.cursor_follower) rows.push(['fixed element', 'pointer move', 'follows the cursor', '-', 'OBSERVED position']);
  L.push(table(['element', 'trigger', 'property / effect', 'duration / easing', 'status'], rows));
  if (p.keyframes.length) { L.push('', '## Keyframes declared', ''); for (const k of p.keyframes.slice(0, 20)) L.push(`- \`${k.name}\`: ${k.steps.map((s) => `${s.at} { ${s.props.join('; ')} }`).join(' ')}`); }
  L.push('', '## Frames', '', `Load strip: ${m.strips.load}${m.strips.scroll ? `; scroll strip: ${m.strips.scroll}` : ''}; single frames and hover crops in shots/.`);
  L.push('', '## Translation (effect, not technique)', '', ...translationHints(m).map((x) => '- ' + x));
  return L.join('\n') + '\n';
}
