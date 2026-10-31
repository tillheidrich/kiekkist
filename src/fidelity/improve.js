// kk improve <url|file|dir>: audit an EXISTING site before polishing or redesigning it.
// Measures it like kk spec (1440 + 390, breakpoint sweep), optionally kk motion, runs the checker (accessibility
// profile, privacy and third parties, mobile lab) and turns the numbers into IMPROVE.md: keep / fix / redesign lists
// and a target spec draft that keeps the brand (logo, colours unless they fail contrast, fonts, content, URLs) but
// raises composition quality. With a reference library (KK_REFS_FILE) it suggests two or three matching references.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getBrowser, withContextSlot, withDeadline } from '../browser.js';
import { classifyTarget, openTarget, defaultOut } from './targets.js';
import { measureTarget } from './spec.js';
import { runMotion } from './motion.js';

const r2 = (v) => Math.round(v * 100) / 100;

/** Pure: findings from a measurement (+ optional check report and motion result). */
export function analyseSite({ spec, check = null, motion = null }) {
  const keep = [], fix = [], redesign = [];
  const ws = Object.keys(spec.viewports).map(Number).sort((a, b) => b - a);
  const D = spec.viewports[ws[0]], M = spec.viewports[ws[ws.length - 1]];
  const add = (list, area, text, evidence) => list.push({ area, text, evidence });
  // brand: what stays
  const fonts = [...new Set(D.type_scale.slice(0, 8).map((t) => t.ff))].slice(0, 3);
  add(keep, 'brand', `Fonts ${fonts.join(', ')} (licence to confirm with the client).`, 'type scale at ' + ws[0]);
  add(keep, 'brand', `Colours: backgrounds ${D.colors.bg.slice(0, 3).map((c) => c.hex).join(', ')}; text ${D.colors.text.slice(0, 2).map((c) => c.hex).join(', ')}. They stay unless they fail contrast (then lightness only).`, 'colour shares');
  add(keep, 'content', 'All URLs, page titles, headings, body text, structured data, forms and legal pages (SEO and legal substance). Changes only with the client.', 'rule');
  // type hierarchy
  const h1 = D.roles.h1, h2 = D.roles.h2, body = D.roles.body;
  if (h1 && body) {
    const q = h1.fs / body.fs;
    if (q < 2) add(fix, 'type', `Flat hierarchy: h1 is only ${r2(q)}x body (${h1.fs}/${body.fs} px at ${ws[0]}). Aim for 3 to 5x on desktop.`, 'roles.h1/body');
    else add(keep, 'type', `h1 / body ratio ${r2(q)} at ${ws[0]}.`, 'roles');
  }
  if (h1 && h2 && h1.fs / h2.fs < 1.25) add(fix, 'type', `h1 and h2 nearly the same size (${h1.fs} / ${h2.fs} px): no clear second level.`, 'roles.h1/h2');
  const sizes = [...new Set(D.type_scale.filter((t) => t.chars >= 20).map((t) => Math.round(t.fs)))].sort((a, b) => a - b);
  const close = sizes.filter((s, i) => i && s / sizes[i - 1] < 1.08);
  if (sizes.length > 9 || close.length > 2) add(fix, 'type', `Noisy type scale: ${sizes.length} sizes in use (${sizes.join(', ')} px), ${close.length} steps closer than 8 %. Reduce to 5 to 7 steps on one ratio.`, 'type_scale');
  const mBody = M.roles.body;
  if (mBody && mBody.fs < 16) add(fix, 'type', `Running text ${mBody.fs} px on phones (${ws[ws.length - 1]}): 16 to 17 px.`, 'roles.body@' + ws[ws.length - 1]);
  if (body && body.chars_per_line > 85) add(fix, 'type', `Lines too long: about ${body.chars_per_line} characters per line at ${ws[0]} (45 to 75).`, 'roles.body.chars_per_line');
  // rhythm
  const pads = D.sections.flatMap((s) => [s.pad_top, s.pad_bottom]).filter((p) => p >= 8).map((p) => Math.round(p / 4) * 4);
  const distinct = [...new Set(pads)].sort((a, b) => a - b);
  if (distinct.length > 5) add(fix, 'rhythm', `Inconsistent vertical rhythm: ${distinct.length} different section paddings (${distinct.join(', ')} px). Use three steps (e.g. 64 / 96 / 128 at desktop).`, 'sections.pad');
  else if (distinct.length) add(keep, 'rhythm', `Section paddings on ${distinct.length} step(s): ${distinct.join(', ')} px.`, 'sections.pad');
  if (D.overflow_x || M.overflow_x) add(fix, 'layout', `Horizontal overflow at ${[D.overflow_x && ws[0], M.overflow_x && ws[ws.length - 1]].filter(Boolean).join(' and ')} px.`, 'overflow_x');
  // images
  for (const m of [...D.media, ...M.media].filter((x) => x.cropped && x.fit === 'fill').slice(0, 4)) add(fix, 'images', `Distorted image ${m.el}: shown ${m.ratio}, file ${m.natural_ratio}, object-fit fill. Use object-fit cover with a set aspect-ratio and focal point.`, 'media');
  const ratios = new Set(D.media.filter((x) => x.kind === 'img').map((x) => x.named));
  if (D.media.filter((x) => x.kind === 'img').length >= 6 && ratios.size >= 5) add(fix, 'images', `Image formats all over the place (${[...ratios].join(', ')}): define 2 or 3 formats per slot type.`, 'media.named');
  // hero composition
  const first = D.sections[0] && D.sections[0].tag === 'header' && D.sections[1] ? D.sections[1] : D.sections[0];
  const heroMedia = D.media.some((x) => x.first_screen && x.box.w >= D.vw * 0.35);
  if (first && h1 && !heroMedia && h1.fs < (body?.fs || 16) * 2.5) add(redesign, 'hero', `No hero composition: first block ${first.h} px (${first.h_vh} vh), no large first-screen image, h1 ${h1.fs} px. The first screen needs a deliberate composition (type as image, a strong photo crop, or a split).`, 'sections[0], media, roles.h1');
  // grids: uniform cards
  const uniform = D.grids.filter((g) => g.kind === 'grid' && g.columns === 3 && new Set(g.col_widths).size === 1);
  if (uniform.length >= 2) add(redesign, 'layout', `${uniform.length} sections built as three equal columns (${uniform.map((g) => g.el).slice(0, 3).join(', ')}): the page reads as a template. Vary the compositions section by section.`, 'grids');
  // checker
  if (check) {
    const errs = (check.hard || []).filter((f) => f.severity === 'error');
    const contrast = errs.filter((f) => /contrast/.test(f.rule));
    if (contrast.length) add(fix, 'contrast', `${contrast.length} contrast error(s), e.g. ${contrast.slice(0, 2).map((f) => f.detail).join('; ')}. Adjust lightness, keep hue.`, 'kk check');
    const a11y = errs.filter((f) => !/contrast/.test(f.rule));
    if (a11y.length) add(fix, 'accessibility', `${a11y.length} further hard error(s): ${[...new Set(a11y.map((f) => f.rule))].slice(0, 8).join(', ')}.`, 'kk check');
    if (!errs.length) add(keep, 'accessibility', 'No hard errors in the automatic checks (manual protocol still open).', 'kk check');
    const slop = (check.counts || []).filter((c) => c.over && !c.info);
    const STRUCTURAL = /^(three-cards|centred-hero|saas-sequence|icon-tiles|nested-cards|uniform-radius|uniform-shadow|section-rhythm|repeat-structure|logo-wall|testimonial-carousel|device-mockups|stat-counters|numbered-sections|gradient-surface|purple-gradient|radial-glow|rainbow-gradient|glass|dot-grid|pill-badges|infographic-look|sector-palettes|warm-saas|indigo-tech)$/;
    for (const c of slop.slice(0, 12)) add(STRUCTURAL.test(c.rule) ? redesign : fix, 'generic', `Generic pattern: ${c.label || c.rule} (${c.count}, threshold ${c.threshold}).`, 'slop tell ' + c.rule);
    const tp = (check.hard || []).find((f) => f.rule === 'third-party') || (check.findings || []).find((f) => f.rule === 'blocked-requests');
    if (tp) add(fix, 'privacy', `Third-party requests: ${String(tp.detail).slice(0, 220)}`, 'kk check');
    const lab = check.mobile?.lab;
    if (lab && lab.lcp_ms > 2500) add(fix, 'performance', `Mobile LCP ${(lab.lcp_ms / 1000).toFixed(1)} s (target < 2.5 s)${lab.lcp_element ? ', LCP element ' + lab.lcp_element.kind : ''}.`, 'mobile lab');
    else if (lab) add(keep, 'performance', `Mobile LCP ${lab.lcp_ms === null ? '-' : (lab.lcp_ms / 1000).toFixed(1) + ' s'}, CLS ${lab.cls}.`, 'mobile lab');
    if (lab && lab.cls > 0.1) add(fix, 'performance', `Layout shift CLS ${lab.cls} (target < 0.1).`, 'mobile lab');
  }
  if (motion) {
    const p = motion.probe;
    if (p.running.length && !p.reduced_motion_blocks) add(fix, 'motion', `${p.running.length} running animation(s) and no prefers-reduced-motion rule.`, 'kk motion');
    const heavy = p.libs.filter((l) => ['gsap', 'lenis', 'locomotive', 'three', 'barba', 'swup', 'lottie'].includes(l));
    if (heavy.length) add(fix, 'motion', `Motion libraries ${heavy.join(', ')}: rebuild the effects in CSS (scroll-driven animations, View Transitions) and drop the library.`, 'kk motion');
    if (!p.running.length && !p.transitions.length) add(fix, 'motion', 'No interaction feedback at all (no transitions): add hover and focus states.', 'kk motion');
  }
  return { keep, fix, redesign, depth: redesign.length >= 2 ? 'redesign' : 'polish' };
}

/** Pure: a target spec that keeps the brand and raises the composition. */
export function targetSpec(spec) {
  const ws = Object.keys(spec.viewports).map(Number).sort((a, b) => b - a);
  const D = spec.viewports[ws[0]];
  const body = Math.max(16, Math.round(D.roles.body?.fs || 16));
  const ratio = 1.25;
  const step = (k) => Math.round(body * ratio ** k);
  const cw = D.container.width && D.container.width >= 960 && D.container.width <= 1440 ? D.container.width : 1200;
  return {
    container: { desktop: cw, gutters: { desktop: Math.max(32, Math.round((D.vw - cw) / 2)), phone: 24 } },
    type: { ratio, body: { desktop: body, phone: Math.max(16, body) }, small: Math.round(body * 0.85), h3: step(2), h2: step(4), h1: { desktop: step(7), phone: Math.round(step(7) * 0.5) }, line_height: { body: 1.55, display: 1.05 }, measure: '60-70ch' },
    rhythm: { section_padding: { desktop: [64, 96, 128], phone: [40, 56, 72] }, gap: [16, 24, 32, 48] },
    fonts: [...new Set(D.type_scale.slice(0, 8).map((t) => t.ff))].slice(0, 2),
    colors: { bg: D.colors.bg.slice(0, 3).map((c) => c.hex), text: D.colors.text.slice(0, 2).map((c) => c.hex), note: 'brand colours kept; failing pairs get a lightness change only' },
  };
}

export async function runImprove({ target, out, profile = 'bfsg', perf = false, motion = true, refs = true, industry, mood, allowLoopback = true, allowFiles = true, log = () => {} } = {}) {
  const t = await classifyTarget(target, { allowLoopback, allowFiles });
  const opened = await openTarget(t);
  const dir = resolve(out || defaultOut('improve', opened.label)); mkdirSync(dir, { recursive: true });
  let spec;
  try {
    const m = await measureTarget(opened, { viewports: [1440, 390], shotsDir: join(dir, 'shots'), log });
    spec = { tool: 'kiekkist', kind: 'spec', version: 1, measured_at: new Date().toISOString(), target: opened.label, public: opened.isPublic, blocked_hosts: [...opened.blocked], ...m };
    writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
  } finally { await opened.close(); }
  log('check');
  let check = null, checkError = null;
  try {
    const { checkTarget } = await import('../check/index.js');
    const browser = await getBrowser();
    const o = t.kind === 'file' || t.kind === 'dir' ? { file: t.path, fileRoot: t.root } : { url: t.url };
    check = await withContextSlot(() => withDeadline(perf ? 180_000 : 120_000, null, () => checkTarget({ ...o, browser, profile, perf })));
    writeFileSync(join(dir, 'check.json'), JSON.stringify(check, null, 1));
  } catch (e) { checkError = String(e.message || e); }
  let mo = null;
  if (motion) { log('motion'); try { mo = (await runMotion({ target, out: join(dir, 'motion'), allowLoopback, allowFiles })).motion; } catch (e) { mo = null; } }
  const a = analyseSite({ spec, check, motion: mo });
  const ts = targetSpec(spec);
  let suggestions = null;
  if (refs) {
    const R = await import('../refs.js');
    if (R.refsConfigured()) suggestions = R.searchRefs({ industry, query: [industry, mood].filter(Boolean).join(' ') || undefined, limit: 3 }).items.map((x) => ({ id: x.id, title: x.title, url: x.live_url || x.url, cluster: x.cluster?.name || null }));
  }
  const result = { tool: 'kiekkist', kind: 'improve', version: 1, measured_at: spec.measured_at, target: spec.target, depth: a.depth, keep: a.keep, fix: a.fix, redesign: a.redesign, target_spec: ts, references: suggestions, check: check ? { score: check.score, grade: check.grade, errors: (check.hard || []).filter((f) => f.severity === 'error').length } : { error: checkError }, motion: mo ? { libs: mo.probe.libs, running: mo.probe.running.length, reduced_motion_blocks: mo.probe.reduced_motion_blocks } : null };
  writeFileSync(join(dir, 'improve.json'), JSON.stringify(result, null, 1));
  writeFileSync(join(dir, 'IMPROVE.md'), renderImproveMd(result));
  return { dir, result };
}

export function renderImproveMd(r) {
  const L = [];
  const list = (xs) => (xs.length ? xs.map((x) => `- **${x.area}**: ${x.text} _(${x.evidence})_`) : ['- nothing measured']);
  L.push(`# Improve: ${r.target}`, '');
  L.push(`Audited ${r.measured_at.slice(0, 10)} with kk improve (measured at 1440 and 390, checker${r.check.error ? ' FAILED: ' + r.check.error : ` ${r.check.score}/100 ${r.check.grade}, ${r.check.errors} hard error(s)`}${r.motion ? `, motion: ${r.motion.running} running animation(s), libraries ${r.motion.libs.join(', ') || 'none'}` : ''}).`);
  L.push(`Suggested depth: **${r.depth}** (${r.depth === 'redesign' ? 'structural problems: new composition from a reference spec, brand and content kept' : 'same structure, fix the list below'}). Workflow: get_workflow mode=${r.depth}.`, '');
  L.push('## Keep', '', ...list(r.keep), '', '## Fix', '', ...list(r.fix), '', '## Redesign candidates', '', ...list(r.redesign), '');
  const t = r.target_spec;
  L.push('## Target spec (draft, brand kept)', '');
  L.push(`- Container ${t.container.desktop} px at 1440, gutters ${t.container.gutters.desktop} px desktop / ${t.container.gutters.phone} px phone.`);
  L.push(`- Type on ratio ${t.type.ratio}: body ${t.type.body.desktop} px (phone ${t.type.body.phone}), small ${t.type.small}, h3 ${t.type.h3}, h2 ${t.type.h2}, h1 ${t.type.h1.desktop} px desktop / ${t.type.h1.phone} px phone; line height ${t.type.line_height.body} body, ${t.type.line_height.display} display; measure ${t.type.measure}. Fonts kept: ${t.fonts.join(', ')}.`);
  L.push(`- Section padding steps ${t.rhythm.section_padding.desktop.join(' / ')} desktop, ${t.rhythm.section_padding.phone.join(' / ')} phone; gaps ${t.rhythm.gap.join(' / ')}.`);
  L.push(`- Colours kept: ${t.colors.bg.join(', ')} / text ${t.colors.text.join(', ')} (${t.colors.note}).`);
  L.push('- For a redesign: replace this block with SPEC.md measured from the chosen reference (kk spec), then map the brand onto it.', '');
  if (r.references) L.push('## Matching references from the library', '', ...(r.references.length ? r.references.map((x) => `- ${x.id}: ${x.title || ''} ${x.url} ${x.cluster ? '(' + x.cluster + ')' : ''}`) : ['- none found for this industry/mood']), '');
  L.push('## Rules for existing sites', '', '- Never break SEO-relevant content or URLs: same paths (or 301), titles, headings, body text, structured data, internal links.', '- Before/after: kk fidelity <before> <after> --labels before,after; kk check on both, no regression.', '- Deliver back into their stack (patch, theme update or kk export --target wordpress|astro|html).');
  return L.join('\n') + '\n';
}
