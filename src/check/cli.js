#!/usr/bin/env node
// Usage: node src/check/cli.js <file|url> [--tokens path] [--json] [--shots dir]
//        [--viewports 390,768,1440] [--no-axe] [--allow-host host] [--compare <file|dir>]
//        [--page <file|url>]... [--profile none|bfsg|public] [--no-a11y] [--perf] [--perf-runs n] [--no-mobile]
//        [--brand-font name]... [--ban signal]...
// Exit code: 0 = no hard errors, 1 = hard errors found, 2 = could not run.
import { checkTarget } from './index.js';
import { similarity } from './similarity.js';

const HELP = `kiekkist check <file|url> [options]

  --tokens <path>      tokens.json (DTCG) or CSS with custom properties: measure token drift
  --json               print the full report as JSON
  --shots <dir>        save a full-page screenshot per viewport
  --viewports <list>   comma separated widths (default 390,768,1440)
  --no-axe             skip axe-core
  --allow-host <host>  allow subresources from this host (repeatable; default: target only)
  --compare <target>   also report structural similarity to another file, theme dir or URL
  --brand-font <name>  family fixed by the client's brand: exempt from the reflex-font signal (repeatable)
  --ban <signal>       house rules: this counted signal (id from references/tells.md, e.g. gradient-text, eyebrow)
                       is a hard error at its first occurrence (repeatable or comma separated)
  --no-js-pass         skip the second load without JavaScript
  --page <file|url>    site mode: also check this page and compare navigation, help, titles (repeatable)
  --profile <p>        none (default), bfsg (private provider in BFSG scope) or public (BITV): severity of the
                       accessibility-statement checks and scope wording
  --no-a11y            skip the accessibility passes (reflow 320, text spacing, keyboard walk, forced colours, forms)
  --perf               thorough mobile lab run: 3 throttled loads (median), font-swap run, CLS after scrolling
  --perf-runs <n>      number of throttled loads (default 1, 3 with --perf)
  --no-mobile          skip the mobile evidence (390/360 first screen, lab run with the Moto G Power profile)
  --root <dir>         serve <dir> on 127.0.0.1 and check files under it as URLs, so root-relative paths
                       (/_astro/…, /assets/…) resolve, e.g. node src/check/cli.js dist/index.html --root dist
`;

function parseArgs(argv) {
  const o = { allowHosts: [], brandFonts: [], banned: [], pages: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(a + ' needs a value'); return v; };
    if (a === '--tokens') o.tokens = next();
    else if (a === '--json') o.json = true;
    else if (a === '--shots') o.shots = next();
    else if (a === '--viewports') o.viewports = next().split(',').map(Number).filter(Boolean);
    else if (a === '--no-axe') o.axe = false;
    else if (a === '--allow-host') o.allowHosts.push(next());
    else if (a === '--compare') o.compare = next();
    else if (a === '--brand-font') o.brandFonts.push(next());
    else if (a === '--ban') o.banned.push(...next().split(',').map((x) => x.trim()).filter(Boolean));
    else if (a === '--no-js-pass') o.noJs = false;
    else if (a === '--page') o.pages.push(next());
    else if (a === '--profile') o.profile = next();
    else if (a === '--no-a11y') o.a11y = false;
    else if (a === '--perf') o.perf = true;
    else if (a === '--perf-runs') o.perfRuns = Number(next());
    else if (a === '--no-mobile') o.mobile = false;
    else if (a === '--root') o.root = next();
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('--')) throw new Error('Unknown option ' + a);
    else o.target = a;
  }
  return o;
}

const pad = (s, n) => String(s).padEnd(n);

function render(r) {
  const L = [];
  L.push(`Kiekkist check  ${r.target}`);
  L.push(`Score ${r.score}/100  Grade ${r.grade}   viewports ${r.viewports.join('/')}px   ${r.stats.ms} ms`);
  if (r.knowledge) L.push(`Rules ${r.rules_version}   packs: ` + Object.entries(r.knowledge).map(([k, v]) => k + ' ' + v).join(', '));
  L.push('');
  const errs = r.hard.filter((f) => f.severity === 'error');
  const warns = r.hard.filter((f) => f.severity === 'warn');
  L.push(`HARD ERRORS (${errs.length})`);
  if (!errs.length) L.push('  none');
  const byRule = {};
  for (const f of errs) (byRule[f.rule] ||= []).push(f);
  for (const [rule, fs] of Object.entries(byRule)) {
    L.push(`  ${rule}  x${fs.length}`);
    for (const f of fs.slice(0, 6)) L.push(`    @${f.page && r.mode === 'site' ? f.page + (f.viewport ? ' ' + f.viewport : '') : f.viewport ?? '-'}  ${f.selector ? f.selector + '  ' : ''}${f.detail}`);
    if (fs.length > 6) L.push(`    ... ${fs.length - 6} more`);
  }
  if (warns.length) {
    L.push('');
    L.push(`WARNINGS (${warns.length})`);
    for (const f of warns.slice(0, 10)) L.push(`  ${f.rule} @${f.page && r.mode === 'site' ? f.page + (f.viewport ? ' ' + f.viewport : '') : f.viewport ?? '-'}  ${f.selector ? f.selector + '  ' : ''}${f.detail}`);
    if (warns.length > 10) L.push(`  ... ${warns.length - 10} more`);
  }
  L.push('');
  L.push('SLOP SIGNALS (counted, threshold = allowed)');
  for (const c of r.counts) {
    const mark = c.over ? (c.info ? 'INFO' : 'OVER') : '  ok';
    L.push(`  ${mark}  ${pad(c.label, 52)} ${pad(c.count + (c.unit || ''), 5)} / ${c.threshold}${c.unit || ''}${c.over && c.examples && c.examples.length ? '   ' + c.examples.slice(0, 3).join(', ') : ''}`);
  }
  if (r.drift) {
    L.push('');
    L.push(`TOKEN DRIFT  ${Math.round(r.drift.colorShare * 100)}% of colour weight off-palette (${r.drift.paletteSize} tokens, CIEDE2000 > ${r.drift.maxDE})`);
    for (const o of r.drift.offPalette.slice(0, 5)) L.push(`  ${o.color}  ${o.kinds.join('/')}  nearest ${o.nearest}  dE ${o.deltaE}`);
    if (r.drift.fontsOutside.length) L.push(`  fonts not in tokens: ${r.drift.fontsOutside.join(', ')}`);
  }
  if (r.a11y) {
    L.push('');
    L.push(`ACCESSIBILITY  ${r.a11y.errors} error(s), ${r.a11y.warnings} warning(s)   profile ${r.a11y.profile}`);
    const crit = Object.entries(r.a11y.by_criterion).sort((a, b) => b[1].errors - a[1].errors || a[0].localeCompare(b[0], 'en', { numeric: true }));
    for (const [k, v] of crit.slice(0, 14)) L.push(`  ${pad(k, 22)} ${pad(v.level || '-', 4)} ${v.errors} error(s) ${v.warnings} warning(s)`);
    if (r.a11y.scope_hint) L.push(`  scope: ${r.a11y.scope_hint.kind}${r.a11y.scope_hint.signals.length ? ' (' + r.a11y.scope_hint.signals.join(', ') + ')' : ''}. ${r.a11y.scope_hint.note}`);
    L.push('  ' + r.a11y.summary);
    L.push('  ' + r.a11y.note);
  }
  if (r.mobile) {
    const m = r.mobile;
    L.push('');
    L.push(`MOBILE  ${m.errors_count} error(s), ${m.warnings_count} warning(s)   ${m.profile}`);
    if (m.lab) {
      const lab = m.lab;
      L.push(`  lab (median of ${lab.runs.length}): LCP ${lab.lcp_ms === null ? '-' : (lab.lcp_ms / 1000).toFixed(1) + ' s'}  CLS ${lab.cls.toFixed(3)}  TBT ${lab.tbt_ms} ms  FCP ${lab.fcp_ms === null ? '-' : (lab.fcp_ms / 1000).toFixed(1) + ' s'}` + (lab.cls_after_scroll !== undefined ? `  CLS after scroll ${lab.cls_after_scroll.toFixed(3)}` : '') + (lab.lcp_element ? `   LCP element: ${lab.lcp_element.kind} ${lab.lcp_element.selector || ''}` : ''));
    }
    if (m.transfer) {
      const t = m.transfer, w = t.web_almanac_2025_median_kb;
      L.push(`  transfer ${t.total_kb} KB (WA 2025 median ${w.total}): ` + ['html', 'css', 'js', 'font', 'img', 'media', 'other'].filter((k) => t.by_type_kb[k] || w[k]).map((k) => `${k} ${t.by_type_kb[k]}${w[k] ? '/' + w[k] : ''}`).join(', ') + `   fonts ${m.fonts.files} file(s)` + (typeof m.fonts.swap_shift === 'number' ? `, swap shift ${m.fonts.swap_shift}` : ''));
    }
    for (const f of m.findings.filter((x) => !x.reused && x.severity !== 'info').slice(0, 12)) L.push(`  ${pad(f.severity, 5)} [${f.class || '-'}] ${pad(f.rule, 22)} @${f.viewport ?? '-'}  ${f.detail}`);
    L.push('  ' + m.note);
    L.push('  ' + m.summary);
  }
  if (r.mode === 'site') {
    L.push('');
    L.push('PAGES');
    for (const p of r.pages) L.push(`  ${pad(p.score + '/100 ' + p.grade, 10)} ${p.target}`);
  }
  const blocked = (r.findings || []).find((f) => f.rule === 'blocked-requests');
  if (blocked) { L.push(''); L.push(blocked.detail); }
  if (r.shots && r.shots.length) { L.push(''); L.push('Screenshots: ' + r.shots.join(', ')); }
  L.push('');
  L.push(r.summary);
  L.push(r.summary_de);
  return L.join('\n');
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n\n' + HELP); return 2; }
  if (o.help || !o.target) { console.log(HELP); return o.help ? 0 : 2; }
  let srv = null;
  if (o.root) { // build output with absolute paths: serve the folder and check URLs instead of file:// paths
    const { resolve, relative, sep } = await import('node:path');
    const { serveDir } = await import('../export/serve.js');
    const root = resolve(o.root);
    srv = await serveDir(root);
    const toUrl = (t) => { if (/^https?:\/\//i.test(t)) return t; const rel = relative(root, resolve(t)); if (rel.startsWith('..')) throw new Error(`${t} is not inside --root ${o.root}`); return srv.url + '/' + rel.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1'); };
    try { o.target = toUrl(o.target); o.pages = o.pages.map(toUrl); } catch (e) { await srv.close(); console.error(e.message); return 2; }
  }
  const isUrl = /^https?:\/\//i.test(o.target);
  const opts = { tokens: o.tokens, shots: o.shots, axe: o.axe !== false, allowHosts: o.allowHosts, brandFonts: o.brandFonts, banned: o.banned, noJs: o.noJs !== false, a11y: o.a11y !== false, profile: o.profile || 'none', mobile: o.mobile !== false, perf: !!o.perf };
  if (o.perfRuns) opts.perfRuns = o.perfRuns;
  if (o.viewports && o.viewports.length) opts.viewports = o.viewports;
  if (o.pages.length) opts.pages = [o.target, ...o.pages];
  else if (isUrl) opts.url = o.target; else opts.file = o.target;
  let report;
  try { report = await checkTarget(opts); } catch (e) { console.error('check failed: ' + e.message); if (srv) await srv.close(); return 2; }
  finally { if (srv && !o.compare) await srv.close().catch(() => {}); }
  if (o.compare && report.mode !== 'site') {
    try {
      const other = /^https?:\/\//i.test(o.compare) ? await checkTarget({ url: o.compare, viewports: [1440], axe: false, a11y: false }) : o.compare;
      report.similarity = await similarity(report, other);
    } catch (e) { report.similarity = { error: e.message }; }
  }
  if (srv && o.compare) await srv.close().catch(() => {});
  if (o.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(render(report));
    if (report.similarity) {
      const s = report.similarity;
      console.log(s.error ? `\nSimilarity: ${s.error}` : `\nSimilarity to ${o.compare}: ${s.score} (${s.verdict} / ${s.verdict_de})  ` +
        Object.entries(s.parts).map(([k, v]) => `${k} ${v.sim}`).join(', '));
    }
  }
  return report.hard.some((f) => f.severity === 'error') ? 1 : 0;
}

main().then((code) => process.exit(code));
