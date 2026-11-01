// Slop counters, token drift and scoring. "Count, don't ban": every signal is
// legitimate on its own; only the pile-up past a threshold is the fingerprint.
// Thresholds, costs, labels and pattern lists come from the knowledge packs
// `tells` and `reflex-fonts` (knowledge/packs). src/check/fallback.js is the
// generated built-in copy used when a pack cannot be loaded.
import { oklchOf, inHue, hex, fromBytes, deltaE, parseColor } from './color.js';
import { isGenericFamily } from './tokens.js';
import { getPack } from '../knowledge.js';
import { FALLBACK } from './fallback.js';

const SERIF_NAMES = /(serif|playfair|fraunces|lora|garamond|baskerville|newsreader|georgia|times|merriweather|crimson|spectral|tiempos|sectra|canela|recoleta|cormorant|bodoni|caslon|charter|source serif|pt serif|noto serif|libre)/i;

const near = (rgb, hexStr, max) => deltaE(fromBytes(rgb), parseColor(hexStr)) < max;

/**
 * Checker configuration from the packs. Pack items win; items the pack lacks (an older
 * local pack) fall back to the built-in copy, so a rule never runs without a threshold.
 */
export function loadConfig() {
  return configFrom(getPack('tells'), getPack('reflex-fonts'));
}

/** Build the configuration from two packs; null means "pack missing" and uses the built-in copy. */
export function configFrom(tp, rp) {
  const rules = {};
  for (const it of FALLBACK.tells.items) rules[it.id] = { ...it, origin: 'builtin' };
  if (tp) for (const it of tp.items) if (it.checker === 'auto') rules[it.id] = { ...it, origin: tp.file || 'shipped' };
  const reflexSrc = rp ? rp.items.filter((i) => !i.retired) : FALLBACK.reflexFonts.items;
  const reflex = reflexSrc.map((i) => ({ name: String(i.name).toLowerCase(), match: i.match || 'exact', role: i.role || 'any' }));
  return {
    rules,
    reflex,
    versions: {
      tells: tp ? tp.version : 'builtin ' + FALLBACK.tells.version,
      'reflex-fonts': rp ? rp.version : 'builtin ' + FALLBACK.reflexFonts.version,
    },
  };
}

/** The part of the configuration the browser-side probe needs (plain JSON). */
export function probeConfig(cfg) {
  const t = {};
  for (const [id, r] of Object.entries(cfg.rules)) if (r.threshold) t[id] = r.threshold;
  return { t };
}

/** Rule ids the checker can emit (hard findings and counters). Tests compare this with the pack. */
export const MEASURED_RULES = [
  // hard (probe.js / index.js / rules.js)
  'contrast', 'contrast-gradient', 'contrast-unmeasurable', 'page-overflow', 'text-overflow', 'content-clipped', 'img-alt', 'accessible-name',
  'target-size', 'target-size-mobile', 'input-font-size', 'zoom-disabled', 'focus-visible', 'reduced-motion', 'font-cdn', 'third-party',
  'placeholder', 'line-length', 'no-js-content', 'multiple-primary', 'cta-colours', 'axe', 'content-hidden', 'load-failed',
  'token-drift-color', 'token-drift-font',
  // accessibility passes (a11y.js / a11y-probe.js), ids as in knowledge/packs/a11y-eu.json
  'reflow-320', 'text-spacing', 'text-resize-200', 'focus-obscured', 'focus-order', 'keyboard-trap', 'click-handler-not-focusable',
  'non-text-contrast', 'forced-colors', 'forced-color-adjust-scan', 'lang-mismatch', 'lang-parts', 'label-in-name', 'icon-name',
  'pause-control-missing', 'reduced-motion-ignored', 'autoplay-audio', 'autocomplete-missing', 'auth-paste', 'captcha-detect',
  'redundant-entry', 'form-errors', 'consent-banner', 'statement-link', 'statement-content', 'public-sector-links', 'overlay-detect',
  'pdf-link-scan', 'consistent-nav', 'consistent-help', 'consistent-id', 'title-unique', 'multiple-ways', 'dragging', 'hover-content',
  'orientation',
  // mobile evidence (mobile.js / mobile-probe.js), group "mobile" in the tells pack
  'lab-lcp', 'lab-cls', 'lab-tbt', 'transfer-total', 'transfer-js', 'transfer-critical', 'font-files', 'font-format',
  'lcp-image-lazy', 'lcp-image-priority', 'lcp-image-discoverable', 'lcp-image-bytes', 'img-oversized', 'font-swap-shift',
  'hscroll-container', 'hover-only', 'sticky-share', 'cta-first-screen', 'cta-reach', 'first-screen-words-mobile', 'h1-first-screen',
  'body-size-mobile', 'line-length-mobile', 'target-spacing', 'overflow-360', 'vh-hero', 'phone-not-tappable', 'input-type',
  // counted
  'reflex-font', 'font-families', 'card-fonts', 'eyebrow', 'tracked-caps', 'highlight-word', 'gradient-text', 'mono-labels', 'long-centred',
  'h1-lines', 'first-screen-words', 'orphan-heading', 'heading-skip', 'justified-text',
  'three-cards', 'numbered-sections', 'stat-counters', 'counter-zero-nojs', 'uniform-radius', 'uniform-shadow', 'big-shadow', 'nested-cards',
  'side-stripe', 'centred-hero', 'logo-wall', 'testimonial-carousel', 'captions-everywhere', 'emoji-heading', 'js-errors', 'autoplay-no-controls',
  'hero-video-no-poster', 'img-dimensions',
  'gradient-surface', 'purple-gradient', 'radial-glow', 'dot-grid', 'rainbow-gradient', 'glass', 'cream-serif-terracotta', 'acid-on-black',
  'purple-on-black', 'gold-accent', 'pure-black-text',
  'scroll-reveal', 'pulsing-dot', 'bounce-easing', 'transition-all', 'custom-cursor',
  'dashes', 'arrow-buttons', 'middle-dot', 'filler-en', 'filler-de', 'not-x-but-y', 'ellipsis-dots',
  'icon-library', 'sparkle-icon',
];

/** Does a used family match a reflex entry? */
export function reflexMatch(name, entry) {
  return entry.match === 'prefix' ? name === entry.name || name.startsWith(entry.name + ' ') : name === entry.name;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Word-bounded matcher; all-caps short tokens (TBD, TODO) are case-sensitive. */
function phraseRe(p, global = false) {
  const cs = p.length <= 6 && p === p.toUpperCase() && /[A-Z]/.test(p);
  return new RegExp('(?<![\\p{L}\\p{N}])' + escRe(p) + '(?![\\p{L}\\p{N}])', (cs ? 'u' : 'iu') + (global ? 'g' : ''));
}
const countPhrases = (text, list) => {
  let n = 0; const hits = [];
  for (const p of list || []) { const m = text.match(phraseRe(p, true)); if (m) { n += m.length; hits.push(p); } }
  return { n, hits };
};

/** Hard findings derived from page text and URLs (placeholder text and placeholder image hosts). */
export function textFindings(S, cfg = loadConfig()) {
  const out = [];
  if (!S) return out;
  const pats = cfg.rules.placeholder?.patterns || {};
  const text = S.text || '';
  for (const p of pats.text || []) {
    const m = text.match(phraseRe(p));
    if (m) {
      const i = m.index; const ctx = text.slice(Math.max(0, i - 25), i + p.length + 25).replace(/\s+/g, ' ').trim();
      out.push({ rule: 'placeholder', severity: 'error', detail: `Placeholder text "${p}": …${ctx}…`, value: p });
    }
  }
  for (const host of pats.images || []) {
    const u = (S.imageUrls || []).find((x) => { try { const h = new URL(x).host; return h === host || h.endsWith('.' + host); } catch { return false; } });
    if (u) out.push({ rule: 'placeholder', severity: 'error', detail: `Placeholder image service ${host}: ${u.slice(0, 80)}`, value: host });
  }
  return out;
}

/**
 * Image-slot leftovers in the rendered HTML (rule `placeholder`, severity error): working notes for missing photos that
 * reach the visitor, e.g. "Foto folgt: brand/hero", "siehe docs/IMAGE-PROMPTS.md", "Image slot brand/room-1 can replace
 * this photo", a baked label "img: brand/food-1", or an alt text / aria-label that starts with "Platzhalter" or "Image slot".
 * Scripts, styles, templates and comments are ignored; text in any other element counts, hidden or not, because a slot
 * note must not ship at all.
 */
export const SLOT_PATTERNS = [
  { id: 'image-prompts', re: /siehe\s+(?:docs\/)?IMAGE-PROMPTS/i, label: 'reference to IMAGE-PROMPTS' },
  { id: 'image-prompts-file', re: /\bIMAGE-PROMPTS\.md\b/i, label: 'reference to IMAGE-PROMPTS.md' },
  { id: 'foto-folgt', re: /\bFoto folgt\b/i, label: '"Foto folgt"' },
  { id: 'image-slot', re: /\bImage slot\b/i, label: '"Image slot"' },
  { id: 'img-label', re: /\bimg:\s*[a-z0-9][a-z0-9-]*\/[a-z0-9-]+/i, label: 'slot label "img: <slug>/…"' },
  { id: 'bild-label', re: /\bBild:\s*[a-z0-9][a-z0-9-]*\/[a-z0-9-]+/, label: 'slot label "Bild: <slug>/…"' },
];
const SLOT_ATTR_RE = /\b(alt|aria-label)\s*=\s*(["'])\s*((?:Platzhalter|Image slot)[^"']*)\2/gi;
const decodeEntities = (t) => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export function slotFindings(html) {
  const out = [];
  if (!html || typeof html !== 'string') return out;
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  for (const m of body.matchAll(SLOT_ATTR_RE)) {
    out.push({ rule: 'placeholder', severity: 'error', detail: `Image slot left in ${m[1]}: "${decodeEntities(m[3]).slice(0, 90)}". Write a real description of the photo or remove the slot.`, value: `${m[1].toLowerCase()}-placeholder` });
  }
  const text = decodeEntities(body.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ');
  const hit = new Set();
  for (const p of SLOT_PATTERNS) {
    if (p.id === 'image-prompts-file' && hit.has('image-prompts')) continue;
    const m = p.re.exec(text);
    if (!m) continue;
    hit.add(p.id);
    const ctx = text.slice(Math.max(0, m.index - 25), m.index + m[0].length + 35).trim();
    out.push({ rule: 'placeholder', severity: 'error', detail: `Image slot note visible (${p.label}): …${ctx}…. Replace it with the photo or leave a calm block without text.`, value: p.id });
  }
  return out;
}

/** Turn the browser's slop measurements into Counter[] (+ examples). */
export function buildCounters(S, cfg = loadConfig(), { brandFonts = [] } = {}) {
  const C = [];
  const R = cfg.rules;
  const T = (id) => R[id]?.threshold || {};
  const max = (id, d = 0) => (typeof T(id).max === 'number' ? T(id).max : d);
  const add = (rule, count, threshold, extra = {}) => {
    const r = R[rule] || {};
    C.push({ rule, label: r.name || rule, label_de: r.name_de || r.name || rule, count, threshold, over: count > threshold, ...(r.kind === 'info' ? { info: true } : {}), ...extra });
  };
  if (!S) return C;

  // ---- typography ----
  const brand = new Set(brandFonts.map((f) => String(f).toLowerCase()));
  const used = S.fonts.filter((f) => f.chars >= 20 && !isGenericFamily(f.name));
  const reflex = used.filter((f) => !brand.has(f.name) && cfg.reflex.some((e) => reflexMatch(f.name, e) && (e.role !== 'display' || f.headingChars > 0))).map((f) => f.name);
  add('reflex-font', reflex.length, max('reflex-font'), { examples: reflex, ...(brand.size ? { exempt: [...brand] } : {}) });
  add('font-families', used.length, max('font-families', 3), { examples: used.map((f) => f.name) });
  add('card-fonts', S.cardFonts || 0, max('card-fonts'), { examples: S.cardFontsEx });
  add('eyebrow', S.eyebrows, max('eyebrow', 2), { examples: S.eyebrowEx });
  add('tracked-caps', S.trackedCaps || 0, max('tracked-caps', 4));
  add('highlight-word', S.highlightH1, max('highlight-word'), { examples: S.highlightEx });
  add('gradient-text', S.gradientText, max('gradient-text'), { examples: S.gradientTextEx });
  add('mono-labels', S.monoLabels, max('mono-labels', 3), { examples: S.monoEx });
  add('long-centred', S.longCentred || 0, max('long-centred', 1));
  add('h1-lines', S.h1Lines || 0, max('h1-lines', 3));
  add('first-screen-words', S.firstScreenWords || 0, max('first-screen-words', 200));
  add('orphan-heading', S.orphans || 0, max('orphan-heading'), { examples: S.orphanEx });
  add('heading-skip', S.headingSkips || 0, max('heading-skip'), { examples: S.headingSkipEx });
  add('justified-text', S.justified || 0, max('justified-text'));

  // ---- structure ----
  add('three-cards', S.threeCards, max('three-cards'), { examples: S.threeEx });
  add('numbered-sections', S.numbered, max('numbered-sections', 2));
  add('stat-counters', S.statCounters, max('stat-counters', 2));
  add('counter-zero-nojs', S.counterZero || 0, max('counter-zero-nojs'));
  {
    const t = T('uniform-radius');
    let radiusShare = 0, modal = null;
    if (S.boxRadii.length >= (t.min_boxes ?? 6)) {
      const freq = {};
      for (const r of S.boxRadii) if (r > 0) { const k = Math.round(r / 2) * 2; freq[k] = (freq[k] || 0) + 1; }
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
      if (top) { modal = +top[0]; radiusShare = Math.round((top[1] / S.boxRadii.length) * 100); }
    }
    add('uniform-radius', radiusShare, t.max ?? 80, { unit: '%', boxes: S.boxRadii.length, ...(modal ? { examples: [modal + 'px'] } : {}) });
  }
  {
    const t = T('uniform-shadow');
    const sh = S.shadowValues || [];
    let share = 0;
    if (sh.length >= (t.min_boxes ?? 6)) {
      const f = {}; for (const v of sh) f[v] = (f[v] || 0) + 1;
      share = Math.round((Math.max(...Object.values(f)) / sh.length) * 100);
    }
    add('uniform-shadow', share, t.max ?? 90, { unit: '%', boxes: sh.length });
  }
  add('big-shadow', S.bigShadow, max('big-shadow', 3), { examples: S.shadowEx });
  add('nested-cards', S.nestedCards || 0, max('nested-cards', 1), { examples: S.nestedEx });
  add('side-stripe', S.stripeGroups || 0, max('side-stripe', 1), { examples: S.stripeEx });
  add('centred-hero', S.centredHero, max('centred-hero'));
  add('logo-wall', S.logoWalls, max('logo-wall'));
  add('testimonial-carousel', S.testimonialCarousels, max('testimonial-carousel'));
  add('captions-everywhere', S.captionsEverywhere || 0, max('captions-everywhere'));
  add('emoji-heading', S.emojiHeadings, max('emoji-heading'));
  add('js-errors', (S.jsErrors || []).length, max('js-errors'), { examples: (S.jsErrors || []).slice(0, 3) });
  add('autoplay-no-controls', S.autoplay || 0, max('autoplay-no-controls'));
  add('hero-video-no-poster', S.heroVideoNoPoster || 0, max('hero-video-no-poster'));
  add('img-dimensions', S.imgNoDims || 0, max('img-dimensions'), { examples: S.imgNoDimsEx });

  // ---- colour and surface ----
  const large = S.gradients.filter((g) => g.area >= 0.15 * S.viewportArea || (g.w >= 0.5 * S.vw && g.h >= 200));
  add('gradient-surface', large.length, max('gradient-surface', 1), { examples: large.slice(0, 3).map((g) => g.selector) });
  const purple = S.gradients.filter((g) => {
    const o = g.stops.map(oklchOf);
    const hasPurple = o.some((x) => x.c >= 0.08 && inHue(x.h, 270, 335));
    const hasBlueOrPink = o.some((x) => x.c >= 0.06 && (inHue(x.h, 225, 275) || inHue(x.h, 335, 15)));
    const span = o.filter((x) => x.c >= 0.06).map((x) => x.h);
    return hasPurple && (hasBlueOrPink || (span.length >= 2 && Math.max(...span) - Math.min(...span) >= 15));
  });
  add('purple-gradient', purple.length, max('purple-gradient'), { examples: purple.slice(0, 3).map((g) => g.selector) });
  add('radial-glow', S.radialGlows || 0, max('radial-glow'), { examples: S.radialEx });
  add('dot-grid', S.dotGrids || 0, max('dot-grid'));
  {
    const span = T('rainbow-gradient').hue_span ?? 180;
    const rainbow = S.gradients.filter((g) => {
      const hs = g.stops.map(oklchOf).filter((x) => x.c >= 0.06 && !Number.isNaN(x.h)).map((x) => x.h).sort((a, b) => a - b);
      if (hs.length < 4) return false;
      let gap = 360 - hs[hs.length - 1] + hs[0];
      for (let i = 1; i < hs.length; i++) gap = Math.max(gap, hs[i] - hs[i - 1]);
      return 360 - gap > span;
    });
    add('rainbow-gradient', rainbow.length, max('rainbow-gradient'), { examples: rainbow.slice(0, 2).map((g) => g.selector) });
  }
  add('glass', S.glass, max('glass', 1), { examples: S.glassEx });

  const surf = oklchOf(S.surfaceBg);
  const headFont = S.fonts.slice().sort((a, b) => b.headingChars - a.headingChars)[0];
  const serifDisplay = !!headFont && headFont.headingChars > 0 && (SERIF_NAMES.test(headFont.name) || /(^|,)\s*serif\s*$/i.test(headFont.stack)) && !/sans/i.test(headFont.name);
  const accents = S.accents.filter((a) => a.kind !== 'text');
  const terracotta = accents.some((a) => { const o = oklchOf(a.rgb); return (o.c >= 0.08 && o.c <= 0.2 && o.l >= 0.5 && o.l <= 0.76 && inHue(o.h, 25, 60)) || near(a.rgb, '#D97757', 8); });
  const cream = (surf.l >= 0.92 && surf.l <= 0.99 && surf.c >= 0.008 && surf.c <= 0.05 && inHue(surf.h, 55, 105)) || near(S.surfaceBg, '#F4F1EA', 4);
  const creamParts = [cream && 'cream background', serifDisplay && 'serif display', terracotta && 'terracotta accent'].filter(Boolean);
  add('cream-serif-terracotta', creamParts.length, max('cream-serif-terracotta', 2), { examples: creamParts });
  const darkSurf = surf.l < 0.22 && surf.c < 0.04;
  const acid = darkSurf && accents.some((a) => { const o = oklchOf(a.rgb); return (o.c >= 0.15 && o.l >= 0.75 && inHue(o.h, 95, 150)) || (o.c >= 0.17 && o.l >= 0.55 && o.l <= 0.72 && inHue(o.h, 25, 45)); });
  add('acid-on-black', acid ? 1 : 0, max('acid-on-black'));
  const violet = darkSurf && accents.some((a) => { const o = oklchOf(a.rgb); return o.c >= 0.1 && inHue(o.h, 270, 330); });
  add('purple-on-black', violet ? 1 : 0, max('purple-on-black'));
  const gold = accents.filter((a) => a.kind !== 'gradient').some((a) => { const o = oklchOf(a.rgb); return o.c >= 0.08 && o.l >= 0.6 && o.l <= 0.85 && inHue(o.h, 70, 95); });
  add('gold-accent', gold ? 1 : 0, max('gold-accent'));
  add('pure-black-text', S.pureBlack || 0, max('pure-black-text'));

  // ---- motion ----
  add('scroll-reveal', Math.max(S.revealClasses, S.revealedAtRest), max('scroll-reveal', 3));
  add('pulsing-dot', S.pulsingDots || 0, max('pulsing-dot'));
  add('bounce-easing', S.bounce || 0, max('bounce-easing'), { examples: S.bounceEx });
  add('transition-all', S.transitionAll || 0, max('transition-all'), { examples: S.transitionAllEx });
  add('custom-cursor', S.customCursor || 0, max('custom-cursor'));

  // ---- copy ----
  {
    const t = T('dashes');
    add('dashes', S.dashes, Math.max(t.max ?? 2, Math.ceil(S.words / (t.per_words || 250))), { words: S.words });
  }
  {
    const t = T('arrow-buttons');
    add('arrow-buttons', S.arrows, Math.max(t.min ?? 1, Math.floor(S.buttons * (t.max_share ?? 0.3))));
  }
  add('middle-dot', S.middleDots || 0, max('middle-dot', 2));
  const text = S.text || '';
  const fe = countPhrases(text, R['filler-en']?.patterns);
  add('filler-en', fe.n, max('filler-en', 1), { examples: fe.hits });
  const fd = countPhrases(text, R['filler-de']?.patterns);
  add('filler-de', fd.n, max('filler-de', 1), { examples: fd.hits });
  {
    let n = 0; const ex = [];
    for (const p of R['not-x-but-y']?.patterns || []) {
      let re; try { re = new RegExp(p, 'giu'); } catch { continue; }
      for (const m of text.matchAll(re)) { n++; if (ex.length < 2) ex.push(m[0].slice(0, 60)); }
    }
    add('not-x-but-y', n, max('not-x-but-y'), { examples: ex });
  }
  add('ellipsis-dots', (text.match(/(?<!\.)\.\.\.(?!\.)/g) || []).length, max('ellipsis-dots'));

  // ---- imagery ----
  {
    const pats = R['icon-library']?.patterns || [];
    const hits = new Set(); let n = 0;
    for (const cls of S.iconClasses || []) {
      for (const tok of cls.toLowerCase().split(/\s+/)) {
        const p = pats.find((q) => (q.endsWith('-') ? tok.startsWith(q) && tok.length > q.length : tok === q || tok.startsWith(q + '-')));
        if (p) { n++; hits.add(p.replace(/-$/, '')); break; }
      }
    }
    add('icon-library', n, max('icon-library'), { examples: [...hits] });
  }
  const sparkles = (text.match(/✨/gu) || []).length + (S.iconClasses || []).filter((c) => /sparkle/i.test(c)).length;
  add('sparkle-icon', sparkles, max('sparkle-icon'));
  return C;
}

/** Token drift: rendered colours vs palette (CIEDE2000), fonts vs token fonts. */
export function tokenDrift(usage, fonts, palette, maxDE = 6) {
  if (!palette) return null;
  const res = { maxDE, paletteSize: palette.colors.length, colorShare: 0, elementShare: 0, offPalette: [], fontsOutside: [], byKind: {} };
  if (palette.colors.length && usage) {
    let total = 0, off = 0, n = 0, nOff = 0;
    const agg = new Map();
    for (const u of usage) {
      const c = fromBytes(u.rgb);
      let best = Infinity, bestName = null;
      for (const p of palette.colors) { const d = deltaE(c, p.rgb); if (d < best) { best = d; bestName = p.name; } }
      total += u.w; n++;
      const k = res.byKind[u.kind] || (res.byKind[u.kind] = { total: 0, off: 0 });
      k.total += u.w;
      if (best > maxDE) {
        off += u.w; nOff++; k.off += u.w;
        const h = hex(u.rgb);
        const e = agg.get(h) || { color: h, kinds: new Set(), weight: 0, nearest: bestName, deltaE: +best.toFixed(1) };
        e.kinds.add(u.kind); e.weight += u.w; agg.set(h, e);
      }
    }
    res.colorShare = total ? +(off / total).toFixed(3) : 0;
    res.elementShare = n ? +(nOff / n).toFixed(3) : 0;
    res.offPalette = [...agg.values()].sort((a, b) => b.weight - a.weight).slice(0, 8).map((e) => ({ ...e, kinds: [...e.kinds], weight: Math.round(e.weight) }));
    for (const k of Object.values(res.byKind)) k.share = k.total ? +(k.off / k.total).toFixed(3) : 0;
  }
  if (palette.fonts.length && fonts) {
    const allowed = new Set(palette.fonts);
    res.fontsOutside = fonts.filter((f) => f.chars >= 20 && !isGenericFamily(f.name) && !allowed.has(f.name)).map((f) => f.name);
  }
  return res;
}

// ---------- scoring ----------
/** Cost per hard error and cap, from the pack (`cost` field of hard items). */
export function hardCosts(cfg = loadConfig()) {
  const out = {};
  for (const [id, r] of Object.entries(cfg.rules)) if (r.cost) out[id] = r.cost;
  return out;
}
const WARN_COST = { per: 0.5, cap: 4 };
// axe WCAG violations count by impact (every A/AA violation is an error; impact sets its weight)
const AXE_WEIGHT = { 'axe-critical': 1.34, 'axe-serious': 1, 'axe-moderate': 0.67, 'axe-minor': 0.34 };
const SLOP_CAP = 40;
const DRIFT_CAP = 12;

export function gradeOf(score) {
  return score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';
}

/** Unique hard errors: same element failing the same rule at several viewports counts once (page-overflow per viewport). */
export function uniqueErrors(hard) {
  const seen = new Map();
  for (const f of hard) {
    if (f.severity !== 'error') continue;
    const key = f.rule + '|' + (f.rule === 'page-overflow' ? f.viewport : f.selector || f.detail);
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()];
}

export function score({ hard, counts, drift }, cfg = loadConfig()) {
  const HARD_COST = hardCosts(cfg);
  const deductions = [];
  const errs = uniqueErrors(hard);
  const byRule = {};
  for (const f of errs) {
    const r = f.rule.startsWith('axe') ? 'axe' : f.rule;
    byRule[r] = (byRule[r] || 0) + (AXE_WEIGHT[f.rule] ?? 1);
  }
  for (const [r, n] of Object.entries(byRule)) {
    const c = HARD_COST[r] || { per: 3, cap: 9 };
    deductions.push({ kind: 'hard', rule: r, n: Math.round(n), cost: Math.min(c.cap, n * c.per) });
  }
  const warns = new Set(hard.filter((f) => f.severity === 'warn').map((f) => f.rule + '|' + (f.selector || f.detail))).size;
  if (warns) deductions.push({ kind: 'warn', rule: 'warnings', n: warns, cost: Math.min(WARN_COST.cap, warns * WARN_COST.per) });
  let slop = 0;
  for (const c of counts.filter((x) => x.over)) {
    const excess = c.unit === '%' ? (c.count - c.threshold) / 5 : c.count - c.threshold;
    const cost = c.info ? 1.5 : 3 + Math.min(3, Math.max(0, excess - 1) * 0.5);
    slop += cost;
    deductions.push({ kind: 'slop', rule: c.rule, n: c.count, cost });
  }
  if (slop > SLOP_CAP) deductions.push({ kind: 'slop', rule: 'slop-cap', n: 0, cost: SLOP_CAP - slop });
  if (drift) {
    let d = 0;
    if (drift.colorShare > 0.1) d += Math.min(9, drift.colorShare * 18);
    d += Math.min(6, drift.fontsOutside.length * 3);
    if (d) deductions.push({ kind: 'drift', rule: 'token-drift', n: 0, cost: Math.min(DRIFT_CAP, d) });
  }
  const total = deductions.reduce((s, d) => s + d.cost, 0);
  const sc = Math.max(0, Math.round(100 - total));
  return { score: sc, grade: gradeOf(sc), deductions };
}

// ---------- summaries ----------
export function summarize({ score: sc, grade, deductions, hard, counts, drift, viewports }, cfg = loadConfig()) {
  const RULE_TEXT = {};
  for (const [id, r] of Object.entries(cfg.rules)) if (r.kind === 'hard') RULE_TEXT[id] = [r.name, r.name_de || r.name];
  const errs = uniqueErrors(hard);
  const warns = hard.filter((f) => f.severity === 'warn').length;
  const hardD = deductions.filter((d) => d.kind === 'hard').sort((a, b) => b.cost - a.cost);
  const overC = counts.filter((c) => c.over && !c.info);
  const infoC = counts.filter((c) => c.over && c.info);
  const vpsOverflow = [...new Set(errs.filter((f) => f.rule === 'page-overflow').map((f) => f.viewport))];
  const en = [], de = [];
  en.push(`Score ${sc}/100, grade ${grade} (viewports ${viewports.join('/')}px).`);
  de.push(`Ergebnis ${sc}/100, Note ${grade} (Viewports ${viewports.join('/')} px).`);
  if (errs.length) {
    en.push(`${errs.length} hard error(s): ` + hardD.map((d) => `${d.n}x ${(RULE_TEXT[d.rule] || [d.rule])[0]} (-${Math.round(d.cost)})`).join(', ') + (vpsOverflow.length ? `; page overflow at ${vpsOverflow.join(', ')}px` : '') + '.');
    de.push(`${errs.length} harte(r) Fehler: ` + hardD.map((d) => `${d.n}x ${(RULE_TEXT[d.rule] || [, d.rule])[1]} (-${Math.round(d.cost)})`).join(', ') + (vpsOverflow.length ? `; seitlicher Überlauf bei ${vpsOverflow.join(', ')} px` : '') + '.');
  } else {
    en.push('No hard errors.');
    de.push('Keine harten Fehler.');
  }
  if (warns) { en.push(`${warns} warning(s) (e.g. contrast over photos not measurable, touch targets below 44px).`); de.push(`${warns} Warnung(en) (z. B. Kontrast über Fotos nicht messbar, Touch-Ziele unter 44 px).`); }
  if (overC.length) {
    en.push(`${overC.length} of ${counts.filter((c) => !c.info).length} slop signals over threshold: ` + overC.map((c) => `${c.label} ${c.count}${c.unit || ''}>${c.threshold}${c.unit || ''}`).join('; ') + '.');
    de.push(`${overC.length} von ${counts.filter((c) => !c.info).length} Slop-Signalen über der Schwelle: ` + overC.map((c) => `${c.label_de} ${c.count}${c.unit || ''}>${c.threshold}${c.unit || ''}`).join('; ') + '.');
  } else {
    en.push('No slop signal over its threshold.');
    de.push('Kein Slop-Signal über der Schwelle.');
  }
  if (infoC.length) {
    const f = infoC.flatMap((c) => c.examples || []).join(', ');
    en.push(`Info: reflex font(s) in use (${f}); legitimate when chosen on purpose.`);
    de.push(`Hinweis: Reflex-Schrift(en) im Einsatz (${f}); legitim, wenn bewusst gewählt.`);
  }
  if (drift) {
    const pct = Math.round(drift.colorShare * 100);
    en.push(`Token drift: ${pct}% of rendered colour weight is outside the palette (CIEDE2000 > ${drift.maxDE})` + (drift.fontsOutside.length ? `; fonts outside tokens: ${drift.fontsOutside.join(', ')}` : '') + '.');
    de.push(`Token-Drift: ${pct} % des gerenderten Farbgewichts liegen außerhalb der Palette (CIEDE2000 > ${drift.maxDE})` + (drift.fontsOutside.length ? `; Schriften außerhalb der Tokens: ${drift.fontsOutside.join(', ')}` : '') + '.');
  }
  return { summary: en.join(' '), summary_de: de.join(' ') };
}
