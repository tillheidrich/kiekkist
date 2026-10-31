// kk fidelity <ref url|spec dir> <build url|file|dir>: does the build hit the reference's proportions?
// Side-by-side montages (first screen and full page at 1440 and 390), a section geometry diff with px deltas,
// type role deltas (size, line height, line count) and position deltas of key elements. Writes FIDELITY.md and
// fidelity.json and appends one line per run to FIDELITY-log.md (round history).
// Also used as before/after for existing sites (labels "before" / "after").
// Side-by-side, not a pixel overlay: a pixel diff is only meaningful (and only allowed) for permitted reconstructions.
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { classifyTarget, openTarget, defaultOut, slugOf } from './targets.js';
import { measureTarget, widthsOf } from './spec.js';
import { montage } from './montage.js';
import { CHECKLIST } from './workflow.js';

function loadSpecDir(dir) {
  const f = join(dir, 'spec.json');
  if (!existsSync(f)) return null;
  const spec = JSON.parse(readFileSync(f, 'utf8'));
  for (const w of Object.keys(spec.viewports)) { const s = spec.viewports[w].shots || {}; for (const k of ['first', 'full']) if (!s[k] || !existsSync(s[k])) { const alt = join(dir, 'shots', `${k}-${w}.jpg`); s[k] = existsSync(alt) ? alt : null; } spec.viewports[w].shots = s; }
  return spec;
}

const d = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.round(b - a) : null);
const pct = (a, b) => (typeof a === 'number' && typeof b === 'number' && a ? Math.round(((b - a) / a) * 1000) / 10 : null);
const off = (delta, base, tolPx = 12, tolPct = 6) => delta !== null && Math.abs(delta) > Math.max(tolPx, Math.abs(base || 0) * tolPct / 100);

/** Pure: compare two measurements (spec.json shape). */
export function diffSpecs(ref, build, widths) {
  const ws = widths || widthsOf(ref).filter((w) => build.viewports[w]);
  const out = { widths: ws, per: {}, flags: 0 };
  for (const w of ws) {
    const a = ref.viewports[w], b = build.viewports[w]; if (!a || !b) continue;
    const r = { doc: { ref: a.doc_h, build: b.doc_h, delta: d(a.doc_h, b.doc_h), pct: pct(a.doc_h, b.doc_h) }, container: {}, sections: [], roles: [], positions: [], media: {}, grids: {} };
    r.container = { ref: a.container.width, build: b.container.width, delta: d(a.container.width, b.container.width), left_ref: a.container.left, left_build: b.container.left, left_delta: d(a.container.left, b.container.left) };
    r.container.flag = off(r.container.delta, 0, 8, 0) || off(r.container.left_delta, 0, 8, 0);
    const n = Math.max(a.sections.length, b.sections.length);
    for (let i = 0; i < n; i++) {
      const x = a.sections[i], y = b.sections[i];
      const row = { i: i + 1, ref: x ? x.el : null, build: y ? y.el : null, y_ref: x?.y ?? null, y_build: y?.y ?? null, h_ref: x?.h ?? null, h_build: y?.h ?? null, vh_ref: x?.h_vh ?? null, vh_build: y?.h_vh ?? null };
      row.dy = d(row.y_ref, row.y_build); row.dh = d(row.h_ref, row.h_build);
      row.flag = !x || !y || off(row.dh, row.h_ref, 16, 5);
      r.sections.push(row);
    }
    for (const role of ['h1', 'h2', 'h3', 'body', 'nav_link', 'button', 'small']) {
      const x = a.roles[role], y = b.roles[role]; if (!x && !y) continue;
      const row = { role, fs_ref: x?.fs ?? null, fs_build: y?.fs ?? null, lh_ref: x?.lh ?? null, lh_build: y?.lh ?? null, lines_ref: x?.lines ?? null, lines_build: y?.lines ?? null, ff_ref: x?.ff ?? null, ff_build: y?.ff ?? null };
      row.dfs = typeof row.fs_ref === 'number' && typeof row.fs_build === 'number' ? Math.round((row.fs_build - row.fs_ref) * 10) / 10 : null;
      row.flag = !x || !y || Math.abs(row.dfs || 0) > Math.max(1.5, (row.fs_ref || 0) * 0.06) || (row.lines_ref && row.lines_build && row.lines_ref !== row.lines_build);
      r.roles.push(row);
      if (x?.box && y?.box && ['h1', 'button', 'nav_link'].includes(role)) {
        const p = { what: role + ' box', ref: x.box, build: y.box, dx: d(x.box.x, y.box.x), dy: d(x.box.y, y.box.y), dw: d(x.box.w, y.box.w), dh: d(x.box.h, y.box.h) };
        p.flag = [p.dx, p.dy].some((v) => Math.abs(v) > 12) || off(p.dw, x.box.w, 16, 8); r.positions.push(p);
      }
    }
    if (a.nav && b.nav) { const p = { what: 'navigation', ref: a.nav.box, build: b.nav.box, dx: 0, dy: d(a.nav.box.y, b.nav.box.y), dw: d(a.nav.box.w, b.nav.box.w), dh: d(a.nav.box.h, b.nav.box.h) }; p.flag = Math.abs(p.dh) > 12; r.positions.push(p); }
    const hero = (m) => m.media.filter((x) => x.first_screen).sort((p, q) => q.box.w * q.box.h - p.box.w * p.box.h)[0] || null;
    const ha = hero(a), hb = hero(b);
    if (ha || hb) { const p = { what: 'first-screen media', ref: ha?.box || null, build: hb?.box || null, ratio_ref: ha?.named ?? null, ratio_build: hb?.named ?? null }; if (ha && hb) { p.dx = d(ha.box.x, hb.box.x); p.dy = d(ha.box.y, hb.box.y); p.dw = d(ha.box.w, hb.box.w); p.dh = d(ha.box.h, hb.box.h); p.flag = off(p.dw, ha.box.w, 24, 8) || off(p.dh, ha.box.h, 24, 8); } else p.flag = true; r.positions.push(p); }
    const hist = (m) => m.media.reduce((o, x) => ((o[x.named] = (o[x.named] || 0) + 1), o), {});
    r.media = { ref: hist(a), build: hist(b) };
    r.grids = { ref: a.grids.slice(0, 6).map((g) => g.columns + ' cols ' + g.ratio), build: b.grids.slice(0, 6).map((g) => g.columns + ' cols ' + g.ratio) };
    r.flags = r.sections.filter((x) => x.flag).length + r.roles.filter((x) => x.flag).length + r.positions.filter((x) => x.flag).length + (r.container.flag ? 1 : 0);
    out.flags += r.flags;
    out.per[w] = r;
  }
  return out;
}

export async function runFidelity({ ref, build, out, widths = [1440, 390], labels = ['reference', 'build'], round, allowLoopback = true, allowFiles = true, log = () => {} } = {}) {
  let refSpec = null, refLabel = ref;
  if (allowFiles && typeof ref === 'string' && existsSync(resolve(ref)) && existsSync(join(resolve(ref), 'spec.json'))) refSpec = loadSpecDir(resolve(ref));
  const dir = resolve(out || defaultOut('fidelity', String(build)));
  mkdirSync(dir, { recursive: true });
  const measure = async (target, sub) => {
    const t = await classifyTarget(target, { allowLoopback, allowFiles });
    const o = await openTarget(t);
    try { const m = await measureTarget(o, { viewports: widths, shotsDir: join(dir, sub), sweep: false, log }); return { target: o.label, ...m }; } finally { await o.close(); }
  };
  if (!refSpec) { log(`measure ${labels[0]}`); refSpec = await measure(ref, 'ref'); }
  else refLabel = refSpec.target + ' (spec ' + ref + ')';
  const ws = widths.filter((w) => refSpec.viewports[w]);
  if (!ws.length) throw new Error(`the reference spec has none of the widths ${widths.join(', ')}; run kk spec with --viewports ${widths.join(',')}`);
  log(`measure ${labels[1]}`);
  const buildSpec = await measure(build, 'build');
  const diff = diffSpecs(refSpec, buildSpec, ws);
  const montages = {};
  for (const w of ws) for (const k of ['first', 'full']) {
    const a = refSpec.viewports[w].shots?.[k], b = buildSpec.viewports[w]?.shots?.[k];
    if (!a || !b) continue;
    const f = join(dir, `montage-${k}-${w}.jpg`);
    await montage([{ file: a, label: labels[0].toUpperCase() }, { file: b, label: labels[1].toUpperCase() }], f, { columns: 2, scale: w >= 1000 ? 0.5 : 0.8, title: `${k === 'first' ? 'first screen' : 'full page'} ${w}px` });
    montages[`${k}-${w}`] = f;
  }
  const logFile = join(dir, 'FIDELITY-log.md');
  const prev = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter((l) => /^\| \d/.test(l)).length : 0;
  const r = round ?? prev + 1;
  const result = { tool: 'kiekkist', kind: 'fidelity', version: 1, measured_at: new Date().toISOString(), round: r, labels, ref: refLabel, build: buildSpec.target, diff, montages };
  writeFileSync(join(dir, 'fidelity.json'), JSON.stringify(result, null, 1));
  writeFileSync(join(dir, 'FIDELITY.md'), renderFidelityMd(result));
  if (!existsSync(logFile)) writeFileSync(logFile, `# Fidelity rounds: ${slugOf(buildSpec.target)}\n\n| round | date | flags | ${ws.map((w) => `doc height delta ${w}`).join(' | ')} |\n|---|---|---|${ws.map(() => '---').join('|')}|\n`);
  appendFileSync(logFile, `| ${r} | ${result.measured_at.slice(0, 16).replace('T', ' ')} | ${diff.flags} | ${ws.map((w) => diff.per[w] ? `${diff.per[w].doc.delta} (${diff.per[w].doc.pct} %)` : '-').join(' | ')} |\n`);
  return { dir, result };
}

const s = (v) => (v === null || v === undefined ? '-' : typeof v === 'number' && v > 0 ? '+' + v : String(v));
const bx = (b) => (b ? `${b.w}x${b.h} @${b.x},${b.y}` : '-');
const table = (head, rows) => (rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '-').replace(/\|/g, '/')).join(' | ')} |`)].join('\n') : '_none_');

export function renderFidelityMd(res) {
  const [A, B] = res.labels; const L = [];
  L.push(`# Fidelity round ${res.round}: ${A} vs ${B}`, '');
  L.push(`${A}: ${res.ref}  `, `${B}: ${res.build}  `, `Measured ${res.measured_at.slice(0, 16).replace('T', ' ')} UTC. ${res.diff.flags} value(s) outside tolerance (marked **CHECK**; sections: height off by more than 16 px and 5 %, type: size off by more than 6 % or a different line count, positions: more than 12 px).`, '');
  L.push('Montages (left ' + A + ', right ' + B + '): ' + Object.entries(res.montages).map(([k, f]) => `${k}: ${f}`).join(', '), '');
  for (const w of res.diff.widths) {
    const r = res.diff.per[w]; if (!r) continue;
    L.push(`## ${w} px`, '');
    L.push(`Document height ${r.doc.ref} -> ${r.doc.build} (${s(r.doc.delta)} px, ${s(r.doc.pct)} %). Content width ${r.container.ref ?? '-'} -> ${r.container.build ?? '-'} (${s(r.container.delta)}), left edge ${r.container.left_ref ?? '-'} -> ${r.container.left_build ?? '-'}${r.container.flag ? ' **CHECK**' : ''}.`, '');
    L.push('### Sections (paired by order)', '');
    L.push(table(['#', A, B, 'y', 'height', 'delta y', 'delta h', 'vh', ''], r.sections.map((x) => [x.i, x.ref, x.build, `${x.y_ref ?? '-'} / ${x.y_build ?? '-'}`, `${x.h_ref ?? '-'} / ${x.h_build ?? '-'}`, s(x.dy), s(x.dh), `${x.vh_ref ?? '-'} / ${x.vh_build ?? '-'}`, x.flag ? '**CHECK**' : ''])));
    L.push('', '### Type roles', '');
    L.push(table(['role', 'family', 'size', 'delta', 'line-height', 'lines', ''], r.roles.map((x) => [x.role, `${x.ff_ref ?? '-'} / ${x.ff_build ?? '-'}`, `${x.fs_ref ?? '-'} / ${x.fs_build ?? '-'}`, s(x.dfs), `${x.lh_ref ?? '-'} / ${x.lh_build ?? '-'}`, `${x.lines_ref ?? '-'} / ${x.lines_build ?? '-'}`, x.flag ? '**CHECK**' : ''])));
    L.push('', '### Positions', '');
    L.push(table(['element', A, B, 'dx', 'dy', 'dw', 'dh', ''], r.positions.map((p) => [p.what + (p.ratio_ref || p.ratio_build ? ` (${p.ratio_ref ?? '-'} / ${p.ratio_build ?? '-'})` : ''), bx(p.ref), bx(p.build), s(p.dx), s(p.dy), s(p.dw), s(p.dh), p.flag ? '**CHECK**' : ''])));
    L.push('', `Image formats ${A}: ${Object.entries(r.media.ref).map(([k, v]) => `${k} x${v}`).join(', ') || '-'}; ${B}: ${Object.entries(r.media.build).map(([k, v]) => `${k} x${v}`).join(', ') || '-'}.`);
    L.push(`Grids ${A}: ${r.grids.ref.join('; ') || '-'}; ${B}: ${r.grids.build.join('; ') || '-'}.`, '');
  }
  L.push('## Checklist (judge with the montages open; tick, or write what is still off)', '');
  for (const c of CHECKLIST) L.push(`- [ ] ${c.q}`);
  L.push('', 'At least two correction rounds before showing the result. Deliberate deviations (brand, copy, content amount, legal replacements) are not errors: write them under "Deliberately different" with the reason.', '', '## Deliberately different', '', '- ', '', '## Fixes for the next round', '', '- ');
  return L.join('\n') + '\n';
}
