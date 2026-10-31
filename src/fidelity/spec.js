// kk spec <url|file|dir>: multi-viewport measurement of a reference (or an own build) as raw material for SPEC.md.
// Writes spec.json, SPEC.draft.md and screenshots (first screen, full page, optional viewport frames) into a working
// folder (default .kiekkist/fidelity/<slug>/spec). Never stores the page's HTML, CSS or scripts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse, formatHex, converter } from 'culori';
import { withContextSlot, settle } from '../browser.js';
import { classifyTarget, openTarget, quietOverlays, contextOpts, defaultOut, gotoChecked } from './targets.js';
import { measureInPage, sweepInPage, SWEEP_WIDTHS, detectBreakpoints } from './measure.js';

export const SPEC_VERSION = 1;
export const DEFAULT_VIEWPORTS = [1440, 1024, 768, 390];
const toOklch = converter('oklch');
const MAX_SHOT_H = 16000;

export function colorInfo(raw) {
  const c = parse(raw); if (!c) return { raw, hex: null };
  const o = toOklch(c);
  return { hex: formatHex(c), oklch: o ? `oklch(${(o.l || 0).toFixed(3)} ${(o.c || 0).toFixed(3)} ${Math.round(o.h || 0)})` : null, alpha: c.alpha ?? 1 };
}
function mergeColors(list, key) {
  const m = new Map();
  for (const x of list) { const ci = colorInfo(x.c); if (ci.alpha !== undefined && ci.alpha <= 0.02) continue; const k = ci.hex ? ci.hex + (ci.alpha < 1 ? '/' + ci.alpha.toFixed(2) : '') : x.c; const prev = m.get(k); if (prev) prev[key] += x[key]; else m.set(k, { ...ci, [key]: x[key] }); }
  return [...m.values()].sort((a, b) => b[key] - a[key]);
}

/** Load the page in one context per width, measure, take shots. Shared by kk spec, kk fidelity and kk improve. */
export async function measureTarget(opened, { viewports = DEFAULT_VIEWPORTS, shotsDir, frames = false, full = true, sweep = true, settleMs = 1500, log = () => {} } = {}) {
  const per = {}; let sweepRows = null;
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });
  for (const w of [...new Set(viewports.map(Number))].sort((a, b) => b - a)) {
    log(`measure ${w}px`);
    await withContextSlot(async () => {
      const ctx = await opened.newContext(contextOpts(w));
      try {
        const page = await ctx.newPage();
        await gotoChecked(page, opened.url, { waitUntil: 'load' });
        await page.waitForTimeout(settleMs);
        if (opened.isPublic) await quietOverlays(page);
        const docH = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
        await settle(page, Math.min(docH, 14_000));
        const m = await page.evaluate(measureInPage, contextOpts(w).viewport.height);
        m.colors.text = mergeColors(m.colors.text, 'share');
        m.colors.bg = mergeColors(m.colors.bg, 'area');
        for (const s of m.sections) { const ci = colorInfo(s.bg); s.bg_hex = ci.alpha > 0.02 ? ci.hex : null; }
        const files = {};
        if (shotsDir) {
          await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
          files.first = join(shotsDir, `first-${w}.jpg`);
          await page.screenshot({ path: files.first, type: 'jpeg', quality: 72 });
          if (full) {
            files.full = join(shotsDir, `full-${w}.jpg`);
            const H = Math.min(m.doc_h, MAX_SHOT_H);
            await page.screenshot({ path: files.full, type: 'jpeg', quality: 60, fullPage: H === m.doc_h, ...(H < m.doc_h ? { clip: { x: 0, y: 0, width: w, height: H } } : {}) }).catch(async () => { await page.screenshot({ path: files.full, type: 'jpeg', quality: 60 }); });
          }
          if (frames) {
            files.frames = [];
            const vh = m.vh;
            for (let y = 0, i = 0; y < m.doc_h && i < 14; y += vh, i++) {
              await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(700);
              const f = join(shotsDir, `frame-${w}-${String(i).padStart(2, '0')}.jpg`);
              await page.screenshot({ path: f, type: 'jpeg', quality: 62 }); files.frames.push(f);
            }
          }
        }
        if (sweep && !sweepRows && w >= 1024) {
          sweepRows = [];
          for (const sw of SWEEP_WIDTHS) { await page.setViewportSize({ width: sw, height: 900 }); await page.waitForTimeout(250); sweepRows.push(await page.evaluate(sweepInPage)); }
        }
        await opened.clean(ctx);
        per[w] = { ...m, shots: files };
      } finally { await ctx.close().catch(() => {}); }
    });
  }
  return { viewports: per, sweep: sweepRows, breakpoints: sweepRows ? detectBreakpoints(sweepRows) : null };
}

export async function runSpec({ target, out, viewports = DEFAULT_VIEWPORTS, frames = false, sweep = true, allowLoopback = true, allowFiles = true, log } = {}) {
  const t = await classifyTarget(target, { allowLoopback, allowFiles });
  const opened = await openTarget(t);
  const dir = resolve(out || defaultOut('spec', opened.label));
  mkdirSync(dir, { recursive: true });
  try {
    const m = await measureTarget(opened, { viewports, shotsDir: join(dir, 'shots'), frames, sweep, log });
    const spec = { tool: 'kiekkist', kind: 'spec', version: SPEC_VERSION, measured_at: new Date().toISOString(), target: opened.label, public: opened.isPublic, blocked_hosts: [...opened.blocked], ...m };
    writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
    writeFileSync(join(dir, 'SPEC.draft.md'), renderSpecMd(spec));
    return { dir, spec, files: ['spec.json', 'SPEC.draft.md', 'shots/'] };
  } finally { await opened.close(); }
}

// ---------- Markdown
const n = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? '-' : typeof v === 'number' ? (d ? v.toFixed(d) : String(Math.round(v * 100) / 100)) : String(v));
const box = (b) => (b ? `${b.w}x${b.h} at (${b.x}, ${b.y})` : '-');
const table = (head, rows) => (rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '-').replace(/\|/g, '/')).join(' | ')} |`)].join('\n') : '_none measured_');
export const widthsOf = (spec) => Object.keys(spec.viewports).map(Number).sort((a, b) => b - a);

export function renderSpecMd(spec) {
  const ws = widthsOf(spec); const W = ws[0]; const top = spec.viewports[W]; const small = spec.viewports[ws[ws.length - 1]];
  const L = [];
  L.push(`# Visual specification (draft): ${spec.target}`, '');
  L.push(`Measured ${spec.measured_at.slice(0, 10)} with kk spec (Chromium, DPR 1) at ${ws.map((w) => `${w}x${spec.viewports[w].vh}`).join(', ')}. All values CSS px. Raw data: spec.json; screenshots: shots/.`);
  L.push('This draft holds measured numbers only. Fill the TODO blocks by looking at the screenshots, then save it as SPEC.md. Screenshots of third-party pages stay in this private working folder: never commit or publish them.', '');
  L.push('## 1. Breakpoints');
  L.push(spec.sweep ? table(['between', 'what changes'], (spec.breakpoints || []).map((b) => [`${b.between[0]} -> ${b.between[1]}`, b.changes.join('; ')])) : '_no sweep_');
  if (top.media_queries.length) L.push('', 'Declared in CSS: ' + top.media_queries.map((q) => `${q.query} (${q.count})`).join(', '));
  if (spec.sweep) L.push('', table(['width', 'h1 px', 'h1 lines', 'body px', 'nav links', 'grid cols', 'doc height'], spec.sweep.map((r) => [r.w, n(r.h1_fs), n(r.h1_lines), n(r.body_fs), n(r.nav_links), r.grid_cols.join('/') || '-', r.doc_h])));
  L.push('', '## 2. Page frame');
  L.push(table(['viewport', 'container x', 'content width', 'gutters L/R', 'max-widths seen', 'doc height', 'overflow-x'], ws.map((w) => { const v = spec.viewports[w]; return [w, n(v.container.left), n(v.container.width), `${n(v.container.gutter_left)} / ${n(v.container.gutter_right)}`, v.container.max_widths.map((m) => m.value).join(', ') || '-', v.doc_h, v.overflow_x ? 'YES' : 'no']; })));
  L.push('', `Body text ${n(top.body_fs)} px at ${W}; root ${n(top.root_fs)} px. Radii by frequency: ${top.radii.map((r) => `${r.value} (${r.count})`).join(', ') || '-'}.`);
  L.push('', '## 3. Type scale');
  const roleNames = ['h1', 'h2', 'h3', 'body', 'nav_link', 'button', 'small'];
  L.push(table(['role', 'family', 'weight', ...ws.map((w) => `size ${w}`), 'line-height', 'tracking', 'case', `ratio to body (${W})`], roleNames.filter((r) => top.roles[r]).map((r) => { const t = top.roles[r]; return [r, t.ff, t.fw, ...ws.map((w) => n(spec.viewports[w].roles[r]?.fs)), n(t.lh), n(t.ls), t.tt === 'none' ? '-' : t.tt, n(t.fs / (top.body_fs || 16), 2)]; })));
  const ratios = []; const h1 = top.roles.h1, h2 = top.roles.h2, bd = top.roles.body;
  if (h1 && bd) ratios.push(`h1 / body = ${n(h1.fs / bd.fs, 2)}`); if (h1 && h2) ratios.push(`h1 / h2 = ${n(h1.fs / h2.fs, 2)}`); if (h2 && bd) ratios.push(`h2 / body = ${n(h2.fs / bd.fs, 2)}`);
  if (ratios.length) L.push('', `Ratios at ${W}: ${ratios.join('; ')}.`);
  L.push('', `All distinct text styles at ${W} (largest first):`, '', table(['family', 'size', 'weight', 'line-height', 'tracking', 'case', 'chars', 'used on', 'x body'], top.type_scale.map((t) => [t.ff, t.fs, t.fw, n(t.lh), n(t.ls), t.tt === 'none' ? '-' : t.tt, t.chars, t.tags, t.ratio_to_body])));
  L.push('', '## 4. Line breaks (display text)');
  for (const w of [W, ws[ws.length - 1]]) { if (!spec.viewports[w]) continue; L.push('', `At ${w}:`, '', table(['element', 'size / lh', 'box', 'lines', 'line widths', 'measure (em)', 'chars per line'], spec.viewports[w].breaks.map((b) => [b.el, `${b.fs}/${n(b.lh)}`, box(b.box), b.lines, b.line_widths.join(', '), b.measure_em, n(b.chars_per_line)]))); if (w === ws[ws.length - 1]) break; }
  L.push('', '## 5. Sections in order');
  L.push(`Geometry at ${W}${small !== top ? `; ${ws[ws.length - 1]} in brackets (paired by order)` : ''}.`, '');
  L.push(table(['#', 'element', 'y', 'height', 'vh', 'padding t/b', 'background', 'sticky', 'media', 'heading'], top.sections.map((s, i) => { const m = small !== top ? small.sections[i] : null; return [i + 1, s.el, `${s.y}${m ? ` [${m.y}]` : ''}`, `${s.h}${m ? ` [${m.h}]` : ''}`, s.h_vh, `${n(s.pad_top)} / ${n(s.pad_bottom)}`, (s.bg_hex || '-') + (s.bg_image ? ' + ' + s.bg_image : ''), s.sticky ? 'yes' : '', s.media || '', s.heading ? `${s.heading.tag} ${s.heading.fs}px at +${s.heading.y_in}` : '']; })));
  L.push('', '## 6. Grids and column rows');
  L.push(table(['viewport', 'element', 'kind', 'box', 'columns', 'widths', 'ratio', 'gap col/row'], ws.flatMap((w) => spec.viewports[w].grids.slice(0, w === W ? 12 : 6).map((g) => [w, g.el, g.kind, box(g.box), g.columns, g.col_widths.join(', '), g.ratio, `${n(g.col_gap)} / ${n(g.row_gap)}`]))));
  L.push('', '## 7. Image formats');
  for (const w of [W, ws[ws.length - 1]]) { const v = spec.viewports[w]; L.push('', `At ${w}:`, '', table(['kind', 'element', 'box', 'ratio', 'named', 'crop vs file', 'fit / position', 'radius', 'bleed', 'first screen'], v.media.slice(0, 24).map((m) => [m.kind, m.el, box(m.box), m.ratio, m.named, m.cropped === null ? '-' : m.cropped ? `cropped (file ${m.natural_ratio})` : 'as file', `${m.fit} / ${m.position}`, m.radius, m.bleed ? 'yes' : '', m.first_screen ? 'yes' : '']))); if (w === ws[ws.length - 1]) break; }
  L.push('', '## 8. Colours');
  L.push(`Text by share of characters at ${W}: ${top.colors.text.map((c) => `${c.hex || c.raw}${c.alpha < 1 ? ' a' + c.alpha.toFixed(2) : ''} ${(c.share * 100).toFixed(1)} %`).join(', ')}.`);
  L.push('', `Backgrounds by area: ${top.colors.bg.map((c) => `${c.hex || c.raw} (${c.oklch || '-'})`).join(', ')}.`);
  if (top.colors.gradients.length) L.push('', 'Gradients:', ...top.colors.gradients.map((g) => `- ${g.el} ${box(g.box)}: ${g.value}`));
  L.push('', '## 9. Fixed and sticky layers, navigation');
  L.push(table(['element', 'position', 'box (viewport)', 'z', 'background', 'backdrop', 'mask'], top.layers.map((l) => [l.el, l.position, box(l.box), l.z, colorInfo(l.bg).hex || l.bg, l.backdrop || '', l.mask ? 'yes' : ''])));
  if (top.nav) L.push('', `Navigation ${top.nav.el}: ${box(top.nav.box)}, ${top.nav.links_visible} visible links at ${W}${small?.nav ? `, ${small.nav.links_visible} at ${ws[ws.length - 1]}` : ''}; position ${top.nav.position}.`);
  if (spec.blocked_hosts?.length) L.push('', `Blocked during the measurement (not loaded): ${spec.blocked_hosts.join(', ')}.`);
  L.push('', '## 10. TODO by hand (from the screenshots)');
  L.push('- Signature elements (what makes this page recognisable) and for each: take as principle, or replace with an own alternative (LEGAL.md).');
  L.push('- Hero composition in one sentence with positions (what sits where, in px from the measurements above).');
  L.push('- Image art direction: crops, subjects, colour, what our own images must match.');
  L.push('- Motion: run kk motion and copy the OBSERVED rows here.');
  L.push('- What we deliberately do differently (brand, copy, colour, fonts, distinctive artwork).');
  return L.join('\n') + '\n';
}
