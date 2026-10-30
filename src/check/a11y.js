// Accessibility passes (WCAG 2.2 AA, EN 301 549 V4.1.1, BFSG/BITV information duties), Node side.
// Browser-side functions: a11y-probe.js. Rule ids match the `kk:` values in knowledge/packs/a11y-eu.json
// (field `automated`); costs and severities live in knowledge/packs/tells.json like every other hard rule.
// Never claims conformance: the report section counts what remains manual.
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { getPack } from '../knowledge.js';
import {
  clipScan, reflowScan, orientationScan, motionScan, walkPrepare, walkStep, openMobileMenu,
  hoverCandidates, hoverState, forcedRects, forcedAnalyze, a11yStatic,
} from './a11y-probe.js';

export const STANDARD = 'WCAG 2.2 AA / EN 301 549 V4.1.1';
export const PROFILES = ['none', 'bfsg', 'public'];

/** Primary success criterion or clause per rule (the pack item carries level and EN clause). */
const RULE_META = {
  'contrast': { wcag: '1.4.3' }, 'contrast-gradient': { wcag: '1.4.3' }, 'contrast-unmeasurable': { wcag: '1.4.3' },
  'img-alt': { wcag: '1.1.1' }, 'accessible-name': { wcag: '4.1.2' }, 'icon-name': { wcag: '4.1.2' }, 'label-in-name': { wcag: '2.5.3' },
  'page-overflow': { wcag: '1.4.10' }, 'reflow-320': { wcag: '1.4.10' }, 'text-spacing': { wcag: '1.4.12' }, 'text-resize-200': { wcag: '1.4.4' }, 'zoom-disabled': { wcag: '1.4.4' },
  'target-size': { wcag: '2.5.8' }, 'target-size-mobile': { wcag: '2.5.5' },
  'focus-visible': { wcag: '2.4.7' }, 'focus-obscured': { wcag: '2.4.11' }, 'focus-order': { wcag: '2.4.3' }, 'keyboard-trap': { wcag: '2.1.2' }, 'click-handler-not-focusable': { wcag: '2.1.1' },
  'non-text-contrast': { wcag: '1.4.11' }, 'forced-colors': { pack: 'en-9.7' }, 'forced-color-adjust-scan': { pack: 'en-9.7' },
  'lang-mismatch': { wcag: '3.1.1' }, 'lang-parts': { wcag: '3.1.2' },
  'reduced-motion': { wcag: '2.3.3' }, 'reduced-motion-ignored': { wcag: '2.3.3' }, 'pause-control-missing': { wcag: '2.2.2' }, 'autoplay-audio': { wcag: '1.4.2' },
  'autocomplete-missing': { wcag: '1.3.5' }, 'auth-paste': { wcag: '3.3.8' }, 'captcha-detect': { wcag: '3.3.8' }, 'redundant-entry': { wcag: '3.3.7' }, 'form-errors': { wcag: '3.3.1' },
  'consent-banner': { pack: 'practice-cookie-banner' }, 'statement-link': { pack: 'law-bfsg-info' }, 'statement-content': { pack: 'law-bfsg-info' },
  'public-sector-links': { pack: 'law-bitv-leichte-sprache' }, 'overlay-detect': { pack: 'practice-no-overlay' }, 'pdf-link-scan': { pack: 'en-10-pdf' },
  'consistent-nav': { wcag: '3.2.3' }, 'consistent-help': { wcag: '3.2.6' }, 'consistent-id': { wcag: '3.2.4' }, 'title-unique': { wcag: '2.4.2' }, 'multiple-ways': { wcag: '2.4.5' },
  'dragging': { wcag: '2.5.7' }, 'hover-content': { wcag: '1.4.13' }, 'orientation': { wcag: '1.3.4' },
};
const PRINCIPLE = { 1: 'perceivable', 2: 'operable', 3: 'understandable', 4: 'robust' };

function packIndex() {
  const p = getPack('a11y-eu');
  const byId = new Map();
  if (p) for (const it of p.items) byId.set(it.id, it);
  return { pack: p, byId };
}

/** Add wcag, en301549, level and pack_item to a finding (in place). Returns true when it is an accessibility finding. */
export function annotate(f, idx = packIndex()) {
  const rule = f.rule.startsWith('axe-') ? 'axe' : f.rule;
  const meta = RULE_META[rule] || {};
  const wcag = f.wcag !== undefined ? f.wcag : meta.wcag || null;
  const itemId = f.pack_item || meta.pack || (wcag ? 'wcag-' + wcag : null);
  const it = itemId ? idx.byId.get(itemId) : null;
  if (!wcag && !it) return false;
  f.wcag = wcag;
  f.pack_item = it ? it.id : null;
  f.en301549 = f.en301549 || (it ? it.en301549 : wcag ? '9.' + wcag : null);
  if (f.level === undefined) f.level = it ? it.level : wcag === '2.4.12' || wcag === '2.3.3' || wcag === '2.5.5' ? 'AAA' : null;
  return true;
}

// ---------------------------------------------------------------- axe-core
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const LEVEL_TAG = /^wcag2(1|2)?(a|aa)$/;
const scOf = (tags) => tags.map((t) => t.match(/^wcag(\d)(\d)(\d+)$/)).filter(Boolean).map((m) => `${m[1]}.${m[2]}.${m[3]}`);

/** axe at one state of the page: every WCAG A/AA violation is an error whatever its impact; best-practice ones are warnings. */
export async function runAxe(page, axeFile, skip, label) {
  const loaded = await page.evaluate(() => !!window.axe).catch(() => false);
  if (!loaded) await page.addScriptTag({ path: axeFile });
  const r = await page.evaluate(async ({ skip, tags }) => {
    const rules = { 'audio-caption': { enabled: true }, 'css-orientation-lock': { enabled: true } };
    for (const s of skip) rules[s] = { enabled: false };
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, rules, resultTypes: ['violations', 'incomplete'] });
    const pick = (v) => ({ id: v.id, impact: v.impact, help: v.help, tags: v.tags, nodes: v.nodes.length, target: (v.nodes[0] && v.nodes[0].target || []).join(' ') });
    return { violations: res.violations.map(pick), incomplete: res.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })) };
  }, { skip, tags: AXE_TAGS });
  const findings = r.violations.map((v) => {
    const sc = scOf(v.tags);
    const legal = v.tags.some((t) => LEVEL_TAG.test(t));
    const impact = v.impact || 'minor';
    return {
      rule: legal ? 'axe-' + impact : 'axe-best-practice',
      severity: legal ? 'error' : 'warn',
      selector: v.target,
      detail: `axe ${v.id}: ${v.help} (${v.nodes} node(s), impact ${impact}${label ? ', ' + label : ''})`,
      value: v.id,
      wcag: sc[0] || null,
      ...(sc.length > 1 ? { wcag_all: sc } : {}),
    };
  });
  return { findings, incomplete: r.incomplete };
}

// ---------------------------------------------------------------- keyboard walk
/**
 * Tab through the page: focus visible (first `visualTabs` steps, needs probe.js focusPrepare first),
 * focus not obscured (2.4.11), order jumps and positive tabindex (2.4.3), keyboard traps (2.1.2), consent banner reachability.
 */
export async function keyboardWalk(page, vw, { visualTabs = 0, maxTabs = 40 } = {}) {
  const out = [];
  const push = (rule, severity, selector, detail, extra) => out.push({ rule, severity, viewport: vw, selector, detail, ...(extra || {}) });
  const prep = await page.evaluate(walkPrepare);
  const seen = new Map();
  const seq = [];
  let tested = 0, missing = 0, wrapped = false, trap = null, iframeRun = 0, bannerAt = -1;
  for (let k = 0; k < maxTabs; k++) {
    await page.keyboard.press('Tab');
    const visual = k < visualTabs;
    const r = await page.evaluate(walkStep, { sig: visual, wait: visual });
    if (r.body) { if (seq.length) { wrapped = true; break; } continue; }
    if (r.iframe) { iframeRun++; if (iframeRun === 15) push('keyboard-trap', 'warn', r.sel, 'Focus stays inside an iframe for 15 Tab presses; cross-origin content is not inspectable, test it by hand (WCAG 2.1.2).'); if (iframeRun >= 15) break; continue; }
    iframeRun = 0;
    if (seen.has(r.id)) {
      if (seen.size < prep.tabbable) {
        // revisited before the end of the page: try to leave
        const cycle = new Set(seq.slice(seen.get(r.id)).map((s) => s.id));
        let escaped = false;
        if (r.inDialog) {
          await page.keyboard.press('Escape');
          const e = await page.evaluate(walkStep, {});
          escaped = e.body || !cycle.has(e.id);
        }
        if (!escaped) {
          for (let j = 0; j < 4 && !escaped; j++) {
            await page.keyboard.press('Shift+Tab');
            const e = await page.evaluate(walkStep, {});
            if (e.body || !cycle.has(e.id)) escaped = true;
          }
        }
        if (!escaped) trap = { sel: r.sel, box: r.trapBox, n: cycle.size };
      }
      break;
    }
    seen.set(r.id, seq.length);
    seq.push(r);
    if (r.inBanner && bannerAt < 0) bannerAt = seq.length;
    if (visual && r.known && r.visible) {
      tested++;
      if (r.same) { missing++; push('focus-visible', 'error', r.sel, `No visible focus: ${r.sel}${r.text ? ' ("' + r.text + '")' : ''} looks the same focused and at rest (WCAG 2.4.7). Add a :focus-visible style.`); }
    }
    if (r.sampled && r.obscured) {
      const all = r.obscured >= r.sampled;
      push('focus-obscured', all ? 'error' : 'warn', r.sel, `Focused ${r.sel}${r.text ? ' ("' + r.text + '")' : ''} is ${all ? 'completely' : 'partly'} hidden behind ${r.by || 'a fixed/sticky element'}${r.byBanner ? ' (the consent banner)' : ''} (WCAG ${all ? '2.4.11' : '2.4.12'}). Add scroll-padding for sticky bars or move the bar.`, all ? {} : { wcag: '2.4.12', level: 'AAA' });
    }
    if (r.tabindex > 0) push('focus-order', 'warn', r.sel, `Positive tabindex="${r.tabindex}" on ${r.sel}: it reorders the whole tab sequence (WCAG 2.4.3).`);
    const prev = seq[seq.length - 2];
    if (prev && !r.inBanner && !prev.inBanner && !r.inDialog && prev.y - r.y > r.vh) push('focus-order', 'warn', r.sel, `Focus jumps ${Math.round(prev.y - r.y)}px back up the page from ${prev.sel} to ${r.sel} (WCAG 2.4.3): DOM order and visual order differ.`);
  }
  if (trap) push('keyboard-trap', 'error', trap.sel, `Keyboard trap: Tab and Shift+Tab cycle through ${trap.n} element(s) in ${trap.box || 'one component'} and never leave it, while ${prep.tabbable - seen.size} focusable element(s) stay unreachable (WCAG 2.1.2).`);
  if (prep.banner) {
    if (bannerAt < 0 && (wrapped || trap || seq.length >= Math.min(maxTabs, prep.tabbable))) push('consent-banner', 'error', prep.banner, `Consent banner ${prep.banner} is never reached by Tab (${seq.length} steps): keyboard users cannot accept or reject (WCAG 2.1.1).`);
    else if (bannerAt > 5) push('consent-banner', 'warn', prep.banner, `Consent banner is reached only at Tab step ${bannerAt}; move focus into it or place it first in the DOM (WCAG 2.4.3).`);
  }
  // ordered list of distinct obscured findings only once per selector
  const uniq = []; const keys = new Set();
  for (const f of out) { const k = f.rule + '|' + f.selector + '|' + f.severity; if (!keys.has(k)) { keys.add(k); uniq.push(f); } }
  return { findings: uniq, stats: { tabbable: prep.tabbable, steps: seq.length, wrapped, trap: !!trap, tested, missing, banner: prep.banner, bannerAt } };
}

// ---------------------------------------------------------------- page passes
const newOnes = (before, after) => { const b = new Set(before.map((x) => x.key)); return after.filter((x) => !b.has(x.key)); };
const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

const SPACING_CSS = '*,*::before,*::after{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';

/** WCAG 1.4.12: inject the text-spacing bookmarklet styles, report only new clipping. */
export async function textSpacingPass(page, vw, base) {
  const before = base || await page.evaluate(clipScan);
  const h = await page.addStyleTag({ content: SPACING_CSS });
  await frames(page);
  const after = await page.evaluate(clipScan);
  await h.evaluate((n) => n.remove());
  await frames(page, 1);
  return newOnes(before, after).slice(0, 8).map((x) => ({
    rule: 'text-spacing', severity: 'error', viewport: vw, selector: x.key,
    detail: `With WCAG text spacing (line-height 1.5, letter 0.12em, word 0.16em) text is ${x.kind === 'spill' ? 'spilling out of' : x.kind === 'ellipsis' ? 'truncated with an ellipsis in' : x.kind === 'line-clamp' ? 'cut by line-clamp in' : 'cut off by'} its box ("${x.text}", ${Math.max(x.dx, x.dy)}px). Avoid fixed heights and nowrap on text containers (WCAG 1.4.12).`,
    value: Math.max(x.dx, x.dy),
  }));
}

/** WCAG 1.4.4 (heuristic): text-only zoom to 200 % via the root font size. */
export async function textResizePass(page, vw, base) {
  const before = base || await page.evaluate(clipScan);
  const sizes0 = await page.evaluate(() => [...document.querySelectorAll('p, li, h1, h2, h3, a, button, label')].slice(0, 200).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  const h = await page.addStyleTag({ content: 'html{font-size:200%!important}' });
  await frames(page);
  const sizes1 = await page.evaluate(() => [...document.querySelectorAll('p, li, h1, h2, h3, a, button, label')].slice(0, 200).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  const after = await page.evaluate(clipScan);
  await h.evaluate((n) => n.remove());
  await frames(page, 1);
  const out = [];
  const grew = sizes0.filter((s, i) => sizes1[i] > s * 1.3).length;
  if (sizes0.length >= 5 && grew / sizes0.length < 0.5) out.push({ rule: 'text-resize-200', severity: 'warn', viewport: vw, detail: `Only ${grew} of ${sizes0.length} text elements grow with the root font size: font sizes in px ignore the browser's text-size setting (WCAG 1.4.4). Use rem.`, value: grew });
  for (const x of newOnes(before, after).slice(0, 5)) out.push({ rule: 'text-resize-200', severity: 'warn', viewport: vw, selector: x.key, detail: `At 200 % text size text no longer fits its box ("${x.text}", ${Math.max(x.dx, x.dy)}px, ${x.kind}) (WCAG 1.4.4).`, value: Math.max(x.dx, x.dy) });
  return out;
}

/** WCAG 1.4.10 at 320 px (and the content area left by sticky bars), then 1.3.4 at 844x390. Changes the viewport; run last. */
export async function reflowPass(page, base) {
  const out = [];
  await page.setViewportSize({ width: 320, height: 640 });
  await frames(page);
  const r = await page.evaluate(reflowScan);
  if (r.overflow > 0) out.push({ rule: 'reflow-320', severity: 'error', viewport: 320, selector: r.culprits[0], detail: `At 320 px (400 % zoom) the page scrolls sideways by ${r.overflow}px; sticking out: ${r.culprits.join(', ')} (WCAG 1.4.10).`, value: r.overflow });
  for (const c of r.cut.slice(0, 4)) out.push({ rule: 'reflow-320', severity: 'error', viewport: 320, selector: c.sel, detail: `At 320 px text is cut at the viewport edge ("${c.text}", ${c.px}px outside) (WCAG 1.4.10).`, value: c.px });
  if (base) {
    const now = await page.evaluate(clipScan);
    for (const x of newOnes(base, now).filter((x) => x.kind === 'clipped').slice(0, 4)) out.push({ rule: 'reflow-320', severity: 'error', viewport: 320, selector: x.key, detail: `At 320 px text no longer fits its box ("${x.text}", ${Math.max(x.dx, x.dy)}px ${x.kind}) (WCAG 1.4.10).`, value: Math.max(x.dx, x.dy) });
  }
  if (r.cover > 0.5) out.push({ rule: 'reflow-320', severity: 'warn', viewport: 320, selector: r.coverEls[0], detail: `At 320x640 fixed/sticky bars cover ${Math.round(r.cover * 100)} % of the screen height (${r.coverEls.join(', ')}): too little content area at 400 % zoom.`, value: r.cover });
  await page.setViewportSize({ width: 844, height: 390 });
  await frames(page);
  const o = await page.evaluate(orientationScan);
  if (o.hidden || o.overlay) out.push({ rule: 'orientation', severity: 'error', viewport: 844, selector: o.overlay || 'main', detail: o.overlay ? `In landscape (844x390) an overlay asks to rotate the device (${o.overlay}) (WCAG 1.3.4).` : 'In landscape (844x390) the main content is hidden (WCAG 1.3.4).' });
  return out;
}

/** WCAG 2.2.2 and 1.4.2 in the normal state; 2.3.3 under prefers-reduced-motion (call with reduce=true after emulateMedia). */
export async function motionPass(page, vw, reduce) {
  const m = await page.evaluate(motionScan);
  const out = [];
  if (!reduce) {
    for (const it of m.items.filter((x) => !x.control).slice(0, 4)) out.push({ rule: 'pause-control-missing', severity: 'error', viewport: vw, selector: it.sel, detail: `${it.sel} moves for more than 5 s (${it.what}) and has no pause/stop control nearby (WCAG 2.2.2).` });
  } else {
    const moving = m.items.filter((x) => !/^audio/.test(x.what));
    if (moving.length) out.push({ rule: 'reduced-motion-ignored', severity: 'warn', viewport: vw, selector: moving[0].sel, detail: `Under prefers-reduced-motion: reduce ${moving.length} element(s) keep moving for more than 5 s, e.g. ${moving.slice(0, 3).map((x) => x.sel + ' (' + x.what + ')').join(', ')} (WCAG 2.3.3, house standard in motion.md).`, value: moving.length });
  }
  return { findings: out, stats: { moving: m.items.length, media: m.media.length } };
}

/** EN 301 549 V4.1.1 9.7: elements that lose all contrast when the user's forced-colours theme is active. */
export async function forcedColorsPass(page, vw) {
  const maxH = 2400;
  const rects = await page.evaluate(forcedRects, maxH);
  if (!rects.length) return [];
  const docH = await page.evaluate(() => Math.min(document.documentElement.scrollHeight, 2400));
  const clip = { x: 0, y: 0, width: vw, height: Math.max(1, docH) };
  const a = await page.screenshot({ type: 'png', fullPage: true, clip });
  await page.emulateMedia({ forcedColors: 'active' });
  await frames(page);
  const b = await page.screenshot({ type: 'png', fullPage: true, clip });
  await page.emulateMedia({ forcedColors: 'none' });
  const lost = await page.evaluate(forcedAnalyze, { a: 'data:image/png;base64,' + a.toString('base64'), b: 'data:image/png;base64,' + b.toString('base64'), rects });
  return lost.slice(0, 6).map((s) => ({ rule: 'forced-colors', severity: 'warn', viewport: vw, selector: s, detail: `${s} disappears in forced-colours mode (Windows contrast themes): its shape is drawn with background colour, box-shadow or a mask. Use currentColor, real borders or SVG fill (EN 301 549 V4.1.1 clause 9.7).` }));
}

/** WCAG 1.4.13: hover content must be dismissible (Escape) and hoverable. */
export async function hoverPass(page, vw) {
  const out = [];
  const cands = await page.evaluate(hoverCandidates);
  for (const c of cands) {
    await page.mouse.move(c.x, c.y);
    await page.waitForTimeout(120);
    let s = await page.evaluate(hoverState, c.n);
    if (!s.visible) continue; // not hover-triggered
    await page.mouse.move(c.x, c.y + 1);
    await page.mouse.move(s.x, s.y, { steps: 4 });
    await page.waitForTimeout(80);
    const h = await page.evaluate(hoverState, c.n);
    if (!h.visible) out.push({ rule: 'hover-content', severity: 'error', viewport: vw, selector: c.sel, detail: `Content shown on hover over ${c.sel} disappears when the pointer moves onto it (WCAG 1.4.13, hoverable).` });
    await page.mouse.move(c.x, c.y);
    await page.waitForTimeout(60);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    s = await page.evaluate(hoverState, c.n);
    if (s.visible) out.push({ rule: 'hover-content', severity: 'error', viewport: vw, selector: c.sel, detail: `Content shown on hover over ${c.sel} stays open after Escape (WCAG 1.4.13, dismissible). CSS-only :hover menus need a small script that closes them on Escape.` });
    await page.mouse.move(1, 1);
  }
  return { findings: out, stats: { candidates: cands.length } };
}

/** Mobile state: open the burger menu and run axe on it. */
export async function mobileMenuOpen(page) {
  const clicked = await page.evaluate(openMobileMenu).catch(() => false);
  if (clicked) await page.waitForTimeout(250);
  return clicked;
}

export async function staticPass(page, vw, { origin, profile }) {
  await page.evaluate(walkPrepare); // finds the consent banner
  const r = await page.evaluate(a11yStatic, { origin, profile });
  return { findings: r.hard.map((f) => ({ ...f, viewport: vw })), facts: r.facts };
}

// ---------------------------------------------------------------- statement and documents
async function fetchSame(href, { mode, origin, fileRootUrl, ctx, maxBytes = 2e6 }) {
  const u = new URL(href);
  u.hash = '';
  if (mode === 'file' && u.protocol === 'file:' && fileRootUrl && u.href.startsWith(fileRootUrl)) {
    const p = fileURLToPath(u);
    const s = await stat(p).catch(() => null);
    if (!s || !s.isFile() || s.size > maxBytes) return null;
    return await readFile(p);
  }
  if (mode === 'url' && origin && u.origin === origin && ctx) {
    const res = await ctx.request.get(u.href, { maxRedirects: 0, timeout: 6000 }).catch(() => null);
    if (!res || !res.ok()) return null;
    const b = await res.body().catch(() => null);
    return b && b.length <= maxBytes ? b : null;
  }
  return null;
}

const MONTHS = { januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12, january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10, december: 12 };
function datesIn(text) {
  const out = [];
  for (const m of text.matchAll(/\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\b/g)) out.push(new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])));
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) out.push(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
  for (const m of text.matchAll(/\b(\d{1,2})\.?\s+([A-Za-zäÄ]+)\s+(\d{4})\b/g)) { const mo = MONTHS[m[2].toLowerCase()]; if (mo) out.push(new Date(Date.UTC(+m[3], mo - 1, +m[1]))); }
  return out.filter((d) => !Number.isNaN(+d));
}

/**
 * BFSG § 14 / Anlage 3, BITV § 7: is there an accessibility information page linked from the footer, and does it name what it must?
 * Never states conformity: it reports what was found and what is missing.
 */
export async function statementPass({ facts, profile, scope, mode, origin, fileRootUrl, ctx, pageHtml, vw, now = new Date() }) {
  const out = [];
  const push = (rule, severity, detail, extra) => out.push({ rule, severity, viewport: vw, detail, ...(extra || {}) });
  const strict = profile === 'bfsg' || profile === 'public' || (scope && (scope.kind === 'likely-b2c-commerce' || scope.kind === 'booking'));
  const st = facts.statement;
  const info = { found: !!st, href: st ? st.raw : null, checked: false, missing: [] };
  if (!st) {
    push('statement-link', strict ? 'error' : 'warn', `No link to accessibility information ("Barrierefreiheit", "Erklärung zur Barrierefreiheit", "Accessibility") in the footer${strict ? (profile === 'public' ? ' (required for public bodies, § 12b BGG / BITV § 7)' : ' (required when the site sells to or books for consumers, § 14 BFSG + Anlage 3)') : ''}.`, profile === 'public' ? { pack_item: 'law-bitv-statement' } : {});
    return { findings: out, info };
  }
  let html = null;
  try {
    if (st.raw && st.raw.startsWith('#')) html = pageHtml;
    else html = (await fetchSame(st.href, { mode, origin, fileRootUrl, ctx }))?.toString('utf8') || null;
  } catch { html = null; }
  if (!html) { info.note = 'accessibility information page found but not fetched (other origin or not reachable); check its content by hand'; return { findings: out, info }; }
  info.checked = true;
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const dates = datesIn(text);
  const contact = /mailto:|tel:|<form\b/i.test(html);
  const miss = (what, detail, sev = 'warn') => { info.missing.push(what); push('statement-content', sev, detail, profile === 'public' ? { pack_item: 'law-bitv-statement' } : {}); };
  if (!dates.length) miss('date', 'Accessibility information page found; no date of the assessment (Stand/geprüft am) found.');
  if (!contact) miss('contact', 'Accessibility information page found; no contact for reporting barriers (mailto:, tel: or form) found.');
  if (profile === 'bfsg' && !/(marktüberwachung|marktueberwachung|\bMLBF\b|mlbf-barrierefreiheit)/i.test(text)) miss('mlbf', 'Accessibility information page found; the market surveillance authority (MLBF, Anlage 3 lit. d BFSG) is not named.');
  if (profile === 'public') {
    if (!/(feedback|kontakt)/i.test(text)) miss('feedback', 'Accessibility statement found; no feedback mechanism named (§ 7 BITV 2.0).');
    if (!/schlichtung/i.test(text)) miss('schlichtung', 'Accessibility statement found; no reference to the Schlichtungsstelle (§ 16 BGG).');
    if (!/(vollständig|vollstaendig|teilweise|nicht vereinbar|fully|partially|not compliant)/i.test(text)) miss('status', 'Accessibility statement found; no compliance status (vollständig / teilweise / nicht vereinbar).');
    const latest = dates.length ? Math.max(...dates.map(Number)) : 0;
    if (latest && now - latest > 395 * 864e5) miss('stale', `Accessibility statement is dated ${new Date(latest).toISOString().slice(0, 10)}, more than 13 months ago (annual review, § 7 BITV 2.0).`);
  }
  return { findings: out, info };
}

/** EN 301 549 clause 10 basics for linked PDFs: tagged, structure tree, language, title shown. No PDF/UA verdict. */
export async function pdfPass({ urls, mode, origin, fileRootUrl, ctx, vw }) {
  const out = [];
  const checked = [];
  for (const href of urls.slice(0, 5)) {
    let buf = null;
    try { buf = await fetchSame(href, { mode, origin, fileRootUrl, ctx, maxBytes: 10e6 }); } catch { buf = null; }
    if (!buf) continue;
    let s = buf.toString('latin1');
    // object streams hide the catalog: inflate Flate streams and search those too
    if (!/\/StructTreeRoot/.test(s) || !/\/MarkInfo/.test(s)) {
      let extra = '';
      const re = /stream\r?\n/g; let m, n = 0;
      while ((m = re.exec(s)) && n < 200 && extra.length < 4e6) {
        const end = s.indexOf('endstream', m.index);
        if (end < 0) break;
        try { extra += inflateSync(Buffer.from(s.slice(m.index + m[0].length, end), 'latin1')).toString('latin1'); } catch { /* not flate */ }
        n++;
      }
      s += extra;
    }
    const miss = [];
    if (!/\/MarkInfo\s*<<[^>]*\/Marked\s+true/.test(s)) miss.push('not tagged (MarkInfo /Marked true)');
    if (!/\/StructTreeRoot/.test(s)) miss.push('no structure tree');
    if (!/\/Lang\s*\(/.test(s)) miss.push('no document language (/Lang)');
    if (!/\/Title\s*[(<]/.test(s)) miss.push('no title');
    if (!/\/DisplayDocTitle\s+true/.test(s)) miss.push('title not shown (DisplayDocTitle)');
    const cd = s.match(/\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})/);
    const created = cd ? `${cd[1]}-${cd[2]}-${cd[3]}` : null;
    const name = decodeURIComponent(href.split('/').pop().split(/[?#]/)[0]);
    checked.push({ file: name, created, missing: miss });
    if (miss.length) out.push({ rule: 'pdf-link-scan', severity: 'warn', viewport: vw, selector: name, detail: `Linked PDF ${name}${created ? ' (created ' + created + (created < '2025-06-28' ? ', before 28.06.2025: BFSG exemption may apply' : '') + ')' : ''}: ${miss.join(', ')} (EN 301 549 clause 10, PDF/UA). Export tagged from the source; check with veraPDF or PAC.` });
  }
  return { findings: out, checked };
}

// ---------------------------------------------------------------- site mode
const lower = (s) => String(s || '').toLowerCase().trim();
/** Cross-page comparisons (3.2.3, 3.2.4, 3.2.6, 2.4.2, 2.4.5) from per-page facts: [{ target, facts }]. */
export function siteFindings(pages) {
  const out = [];
  const push = (rule, severity, detail, extra) => out.push({ rule, severity, detail, ...(extra || {}) });
  const P = pages.filter((p) => p.facts);
  if (P.length < 2) return out;
  // consistent navigation: relative order of shared items
  const key = (l) => l.href || lower(l.text);
  const ref = P[0];
  for (const p of P.slice(1)) {
    const a = ref.facts.nav.map(key), b = p.facts.nav.map(key);
    const shared = a.filter((x) => b.includes(x));
    const orderA = shared, orderB = b.filter((x) => shared.includes(x));
    if (shared.length >= 2 && orderA.join('|') !== orderB.join('|')) push('consistent-nav', 'error', `Navigation order differs between ${ref.target} and ${p.target}: ${orderA.slice(0, 5).join(' > ')} vs ${orderB.slice(0, 5).join(' > ')} (WCAG 3.2.3).`);
  }
  // consistent help: relative order of help mechanisms present on both pages
  for (const p of P.slice(1)) {
    const a = ref.facts.help, b = p.facts.help;
    const shared = a.filter((x) => b.includes(x));
    if (shared.length >= 2 && shared.join('|') !== b.filter((x) => shared.includes(x)).join('|')) push('consistent-help', 'error', `Help mechanisms appear in a different order on ${p.target} (${b.join(', ')}) than on ${ref.target} (${a.join(', ')}) (WCAG 3.2.6).`);
    const lost = a.filter((x) => !b.includes(x));
    if (lost.length && b.length) push('consistent-help', 'warn', `${p.target} lacks help mechanism(s) the first page offers in the header/footer: ${lost.join(', ')} (WCAG 3.2.6 applies when they repeat).`);
  }
  // consistent identification: same target, different names
  const names = new Map();
  for (const p of P) for (const [href, text] of Object.entries(p.facts.links || {})) { if (!names.has(href)) names.set(href, new Map()); const m = names.get(href); const t = lower(text); if (!m.has(t)) m.set(t, p.target); }
  let ci = 0;
  for (const [href, m] of names) if (m.size > 1 && ci < 4 && !/^(#|tel:|mailto:)/.test(href)) { ci++; push('consistent-id', 'warn', `Link to ${href} is named differently across pages: ${[...m.keys()].map((t) => '"' + t + '"').join(' vs ')} (WCAG 3.2.4).`); }
  // titles
  const titles = new Map();
  for (const p of P) { const t = lower(p.facts.title); if (!titles.has(t)) titles.set(t, { shown: p.facts.title, list: [] }); titles.get(t).list.push(p.target); }
  for (const [t, { shown, list }] of titles) {
    if (list.length > 1) push('title-unique', 'warn', `${list.length} pages share the title "${shown || '(empty)'}": ${list.join(', ')} (WCAG 2.4.2).`);
    if (/^(home|startseite|index|untitled|unbenannt|document|)$/.test(t)) push('title-unique', 'warn', `Generic page title "${shown || '(empty)'}" on ${list.join(', ')} (WCAG 2.4.2).`);
  }
  // multiple ways
  if (!P.some((p) => p.facts.search) && !P.some((p) => p.facts.sitemap) && P.length >= 3) {
    const routes = new Map();
    for (const p of P) for (const l of p.facts.internalLinks || []) routes.set(l, (routes.get(l) || 0) + 1);
    const thin = P.filter((p) => { const name = p.target.split('/').pop(); return [...routes.entries()].filter(([l]) => l && l.endsWith(name)).reduce((s, [, n]) => s + n, 0) < 2; });
    push('multiple-ways', 'warn', `No search and no sitemap link on ${P.length} pages${thin.length ? '; ' + thin.length + ' page(s) reachable by fewer than two links' : ''}: offer a second way to find pages (WCAG 2.4.5).`);
  }
  // statement link on every page
  const noSt = P.filter((p) => !p.facts.statement);
  if (noSt.length && noSt.length < P.length) push('statement-link', 'warn', `Accessibility information is not linked on every page: missing on ${noSt.map((p) => p.target).join(', ')}.`);
  return out;
}

// ---------------------------------------------------------------- report section
/**
 * Report section `a11y`: findings with WCAG SC and EN 301 549 clause, grouped by principle, the manual remainder and the summary line.
 */
export function a11ySection({ hard, stats = {}, profile = 'none', scope = null, statement = null, pdfs = null, at = new Date(), medium = 'web' }) {
  const idx = packIndex();
  const findings = [];
  for (const f of hard) {
    if (f.severity === 'info' && f.rule !== 'captcha-detect' && f.rule !== 'redundant-entry') continue;
    if (!annotate(f, idx)) continue;
    findings.push({ rule: f.rule, severity: f.severity, wcag: f.wcag, level: f.level, en301549: f.en301549, pack_item: f.pack_item, viewport: f.viewport, selector: f.selector, detail: f.detail, ...(f.page ? { page: f.page } : {}) });
  }
  const byPrinciple = { perceivable: 0, operable: 0, understandable: 0, robust: 0, other: 0 };
  const bySc = {};
  for (const f of findings) {
    const p = f.wcag ? PRINCIPLE[f.wcag[0]] : 'other';
    byPrinciple[p || 'other']++;
    const k = f.wcag || f.pack_item;
    (bySc[k] ||= { errors: 0, warnings: 0, pack_item: f.pack_item, level: f.level });
    if (f.severity === 'error') bySc[k].errors++; else if (f.severity === 'warn') bySc[k].warnings++;
  }
  const items = idx.pack ? idx.pack.items.filter((it) => (it.applies_to || []).includes(medium) && (it.level === 'A' || it.level === 'AA' || it.id.startsWith('law-') || it.id.startsWith('en-'))) : [];
  const fullyAuto = (a) => typeof a === 'string' && /(^|; )(kk|axe):/.test(a) && !/(manual|partial|heuristic|only|planned)/i.test(a);
  const manual = items.filter((it) => !fullyAuto(it.automated)).map((it) => it.id);
  if (profile !== 'public') for (const id of ['law-bitv-statement', 'law-bitv-leichte-sprache']) { const i = manual.indexOf(id); if (i >= 0) manual.splice(i, 1); }
  const d = at instanceof Date ? at : new Date(at);
  const date = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warn').length;
  return {
    standard: STANDARD,
    pack: idx.pack ? idx.pack.version : null,
    profile,
    summary: `geprüft nach ${STANDARD} (automatisierbare Teile), Stand ${date}; manuelle Prüfpunkte: ${manual.length}`,
    summary_en: `checked against ${STANDARD} (automatable parts), as of ${date}; manual checkpoints: ${manual.length}`,
    note: 'Automated checks cover only part of WCAG 2.2; the manual protocol in references/accessibility-eu.md is still required. This is not a conformance statement.',
    errors,
    warnings,
    by_principle: byPrinciple,
    by_criterion: bySc,
    findings,
    manual,
    scope_hint: scope ? { ...scope, note: scope.kind === 'likely-b2c-commerce' || scope.kind === 'booking' ? 'Possible BFSG scope; depends on consumer contract and company size (see references/accessibility-eu.md).' : 'No shop or booking signals found; BFSG scope still depends on the services offered (see references/accessibility-eu.md).' } : null,
    statement,
    pdfs,
    axe: stats.axe || null,
    keyboard: stats.keyboard || null,
  };
}
