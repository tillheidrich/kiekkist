#!/usr/bin/env node
// kk – command line for Kiekkist. Talks to a running instance (KK_URL, KK_TOKEN) or runs a local MCP server (kk mcp).
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
function themeDirOf(slugOrDir) {
  if (slugOrDir && existsSync(join(resolve(slugOrDir), 'pages', 'index.html'))) return resolve(slugOrDir);
  for (const base of [join(resolve(process.env.KK_DATA_DIR || './data'), 'themes'), join(REPO, 'examples', 'themes')]) if (slugOrDir && existsSync(join(base, slugOrDir, 'pages', 'index.html'))) return join(base, slugOrDir);
  console.error('theme folder not found: ' + slugOrDir + ' (pass a folder with pages/index.html or --theme <slug>)'); process.exit(2);
}

const URL_ = (process.env.KK_URL || 'http://localhost:4410').replace(/\/$/, '');
const TOKEN = process.env.KK_TOKEN || '';
const [cmd, ...rest] = process.argv.slice(2);
const flags = {}; const args = [];
const BOOL = new Set(['free', 'paid', 'force', 'json', 'build', 'no-check', 'processors', 'recheck', 'form-test', 'tailwind', 'no-perf', 'no-a11y', 'list', 'perf', 'no-mobile', 'frames', 'no-sweep', 'no-motion', 'no-refs', 'has-spec', 'full', 'keep']);
for (let i = 0; i < rest.length; i++) { const a = rest[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = !BOOL.has(k) && rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true; flags[k] = v; } else args.push(a); }
const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : undefined);

async function call(method, path, body) {
  const r = await fetch(URL_ + '/api' + path, { method, headers: { 'content-type': 'application/json', ...(TOKEN ? { authorization: 'Bearer ' + TOKEN } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { console.error(`${r.status} ${await r.text()}`); process.exit(1); }
  const ct = r.headers.get('content-type') || '';
  return ct.includes('json') ? r.json() : ct.includes('zip') ? Buffer.from(await r.arrayBuffer()) : r.text();
}
const out = (v) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const BIN = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.ico']);
function readDirFiles(dir) {
  const files = {};
  const walk = (d) => { for (const n of readdirSync(d)) { if (n.startsWith('.') || n === 'shots' || n === 'check.json') continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else { const rel = relative(dir, p); files[rel] = BIN.has(extname(n).toLowerCase()) ? { base64: readFileSync(p).toString('base64') } : readFileSync(p, 'utf8'); } } };
  walk(dir); return files;
}

const HELP = `kk – Kiekkist CLI   (KK_URL=${URL_}${TOKEN ? ', token set' : ''})

  kk add <url> [--industry a,b] [--tags x,y] [--mechanism "…"] [--board <id>]   collect a page
  kk refs [query] [--industry x] [--judgment love|like|meh|no]                   search references
  kk judge <ref|theme|direction> <id> <love|like|meh|no> ["why"]                 record your verdict
  kk boards | kk board <id> | kk new-board "<name>" [--client x] [--brief "…"]
  kk direction <board> <index.html> --name "…" [--label safe|middle|bold] [--thesis "…"]
  kk decide <board> <direction> "<reason>" [--combine "…"]
  kk themes [--industry x] | kk theme <slug> [--out dir]                          list / download a theme
  kk save-theme <dir> [--name "…"]                                               upload a theme folder
  kk check <file.html|url|--theme slug> [--tokens f] [--json]                     measure; exit 1 on errors
           [--profile none|bfsg|public] [--pages all|a.html,b.html|url,url] [--perf] [--no-mobile]
           [--brand-font "Family,Family"] [--ban gradient-text,eyebrow]            site mode, lab depth, house rules
  kk compare <board> [--ignore h1,background] [--json]                           are the directions really different? exit 1 if a pair is too similar
  kk profile                                                                     taste profile (markdown)
  kk sources [--industry x]
  kk gallery [query] [--industry x] [--medium web] [--free|--paid]               search the Kiekkist Gallery (links only; get designs via its /mcp-gallery)
  kk mcp                                                                         local MCP server over stdio (uses KK_DATA_DIR)

Local, no server needed:
  kk export <theme-dir>|--theme slug --target html|astro|react|wordpress|elementor [--out dir]
            [--cms none|sveltia|decap|pages|keystatic|directus|storyblok] [--site-url https://…] [--lang de] [--name "Client"]
            [--force] [--build] [--no-check] [--json]                            exit 0 ok, 1 post-export check failed, 2 bad input
  kk export --list                                                               targets (ready and planned)
  kk verify-exports <theme-dir>|--theme slug [--targets astro,react,wordpress,elementor,html] [--keep] [--json]
            release gate: exports and runs astro check + build, tsc --noEmit + vite build, php -l + Theme Check
            (WordPress Playground), Elementor kit shape, html post-export check   exit 0 all passed, 1 a gate failed, 2 bad input
            offline: KK_VERIFY_NODE_MODULES=<dir with astro/ and react/ tool installs>, KK_THEME_CHECK_DIR, KK_PLAYGROUND_CLI
  kk tokens <theme-dir>|--theme slug [--format css|theme.json|tailwind|elementor] token file for an existing project
  kk launch <url|export-dir> [--sheet file] [--pages 20] [--only dns,tls,privacy,legal,search,perf,forms,a11y,ops,handover]
            [--form <endpoint> --form-test] [--processors] [--recheck] [--json]  exit 0 no automatic errors, 1 errors, 2 unreachable
  kk launch-sheet init|get|tick <site> [--item id --by "Name" --note "…"] [--sheet file]
  kk dns-plan <domain> [--web host|ip] [--mail all-inkl|brevo|microsoft|google|strato|ionos] [--ca letsencrypt.org]
  Prepares and verifies; never registers, pays, signs or changes DNS.

Visual fidelity (local; measures and screenshots into .kiekkist/fidelity/<slug>/, never stores a page's HTML):
  kk spec <url|file|dir> [--out dir] [--viewports 1440,1024,768,390] [--frames] [--no-sweep]
                                                                                 SPEC.draft.md + spec.json + shots
  kk motion <url|file|dir> [--out dir] [--width 1440] [--hovers 8]                MOTION.draft.md + motion.json + strips
  kk fidelity <ref url|spec dir> <build url|file|dir> [--out dir] [--widths 1440,390] [--labels before,after] [--round n]
                                                                                 FIDELITY.md, montages, deltas; exit 1 if values are off
  kk improve <url|file|dir> [--out dir] [--profile bfsg] [--perf] [--no-motion] [--industry x] [--mood y]
                                                                                 IMPROVE.md: keep / fix / redesign + target spec (existing sites)
  kk workflow [new|polish|redesign]                                              steps, checklist, bans, distance and media rules
  kk references [query] [--industry x] [--cluster C07] [--has-spec] | kk reference <id>   private library (KK_REFS_FILE)
`;

const run = {
  async add() { out(await call('POST', '/refs', { url: args[0], industry: list(flags.industry), tags: list(flags.tags), mechanism: flags.mechanism, note: flags.note }).then(async (r) => { if (flags.board) await call('POST', `/boards/${flags.board}/refs`, { ref_id: r.id, note: flags.mechanism }); return { id: r.id, status: r.status, url: r.url }; })); },
  async refs() { const q = new URLSearchParams({ q: args[0] || '', industry: flags.industry || '', judgment: flags.judgment || '', limit: flags.limit || '50' }); const r = await call('GET', '/refs?' + q); for (const i of r.items) console.log(`${i.id}  ${(i.judgment || '-').padEnd(5)} ${i.domain || i.url}  ${i.mechanism || ''}`); console.log(`(${r.total})`); },
  async judge() { const [kind, id, judgment, ...why] = args; await call('POST', '/judge', { kind, id, judgment, note: why.join(' ') || undefined, by: 'till' }); console.log(`ok: ${kind} ${id} = ${judgment}`); },
  async boards() { for (const b of await call('GET', '/boards')) console.log(`${b.id}  ${b.status.padEnd(10)} ${b.name}  (${b.ref_count} refs, ${b.direction_count} directions)`); },
  async board() { out(await call('GET', '/boards/' + args[0])); },
  async 'new-board'() { const b = await call('POST', '/boards', { name: args[0], client: flags.client, brief: flags.brief }); out({ id: b.id, share: `${URL_}/s/${b.share_token}` }); },
  async direction() { const html = readFileSync(args[1], 'utf8'); out(await call('POST', `/boards/${args[0]}/directions`, { name: flags.name, label: flags.label, thesis: flags.thesis, html })); },
  async decide() { out(await call('POST', `/boards/${args[0]}/decide`, { direction_id: args[1], reason: args[2], combine_note: flags.combine })); },
  async themes() { for (const t of await call('GET', '/themes?' + new URLSearchParams({ industry: flags.industry || '' }))) console.log(`${t.slug.padEnd(32)} ${(t.check_grade || '-')}  ${(t.judgment || '-').padEnd(5)} ${t.name}  [${(t.media || []).join(',')}]`); },
  async theme() {
    if (!flags.out) return out(await call('GET', `/themes/${args[0]}`));
    const t = await call('GET', `/themes/${args[0]}?files=1`);
    const dir = resolve(flags.out); mkdirSync(dir, { recursive: true });
    for (const [rel, content] of Object.entries(t.content || {})) { const p = join(dir, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, content); }
    const zip = await call('GET', `/themes/${args[0]}/zip`); writeFileSync(join(dir, `${args[0]}.zip`), zip);
    console.log(`text files written to ${dir}, full theme incl. assets in ${args[0]}.zip`);
  },
  async 'save-theme'() { const dir = resolve(args[0]); let meta = {}; if (existsSync(join(dir, 'theme.json'))) meta = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8')); out(await call('POST', '/themes', { ...meta, name: flags.name || meta.name, slug: meta.slug, files: readDirFiles(dir) }).then((t) => ({ slug: t.slug, url: `${URL_}/themes/${t.slug}` }))); },
  async compare() {
    const r = await call('POST', `/boards/${args[0]}/compare`, { ignore: list(flags.ignore) });
    process.exitCode = r.ok ? 0 : 1;
    if (flags.json) return out(r);
    console.log(r.summary_de || r.summary);
    for (const p of r.pairs) console.log(`  ${p.verdict.padEnd(12)} ${p.a} / ${p.b}  blink ${p.blink?.desktop ?? '-'}/${p.blink?.mobile ?? '-'}  ${p.signals.join('; ')}`);
  },
  async check() {
    let report;
    const tokens = flags.tokens ? readFileSync(flags.tokens, 'utf8') : undefined;
    const tok = tokens && /\.json$/i.test(flags.tokens) ? JSON.parse(tokens) : tokens;
    const opts = { profile: flags.profile, perf: flags.perf ? true : undefined, mobile: flags['no-mobile'] ? false : undefined, brand_fonts: list(flags['brand-font']), banned: list(flags.ban) };
    if (flags.pages) opts.pages = flags.pages === true || flags.pages === 'all' ? true : list(flags.pages);
    if (flags.theme) report = await call('POST', `/themes/${flags.theme}/check`, opts);
    else if (/^https?:/.test(args[0])) report = await call('POST', '/check', { url: args[0], tokens: tok, ...opts });
    else {
      if (opts.pages) { console.error('--pages works with --theme <slug> or a URL (local files: node src/check/cli.js <file> --page <file>)'); process.exit(2); }
      report = await call('POST', '/check', { html: readFileSync(args[0], 'utf8'), tokens: tok, ...opts });
    }
    const failed = !report || report.incomplete || (report.hard || []).some((f) => f.severity === 'error');
    process.exitCode = failed ? 1 : 0;
    if (flags.json) return out(report);
    console.log(`${report.grade}  ${report.score}/100${report.incomplete ? ' (incomplete)' : ''}  ${report.summary || ''}`);
    if (report.mode === 'site') for (const p of report.pages || []) console.log(`  PAGE  ${p.grade} ${p.score}/100  ${p.target}`);
    for (const f of (report.hard || []).filter((x) => x.severity === 'error')) console.log(`  ERROR ${f.rule}${f.page ? ' ' + f.page : ''}${f.viewport ? '@' + f.viewport : ''}: ${f.detail}`);
    for (const c of (report.counts || []).filter((c) => c.over)) console.log(`  SLOP  ${c.label || c.rule}: ${c.count} (threshold ${c.threshold})`);
    if (report.mobile) console.log(`  MOBILE ${report.mobile.summary_en || report.mobile.summary}`);
  },
  async gallery() {
    const q = new URLSearchParams({ q: args.join(' '), industry: flags.industry || '', medium: flags.medium || '', free: flags.free ? 'true' : flags.paid ? 'false' : '' });
    const r = await call('GET', '/gallery-proxy?' + q);
    if (flags.json) return out(r);
    if (!r.ok) { console.error(r.error); process.exitCode = 1; return; }
    for (const d of r.items) console.log(`${d.free ? 'free' : 'paid'}  ${d.slug.padEnd(24)} ${d.name}  [${d.industry.join(', ')}]\n      ${d.page_url}`);
    console.log(`(${r.total} from ${r.source}${r.cached ? ', cached' : ''})`);
  },
  async profile() { out(await call('GET', '/profile?format=md')); },
  async sources() { for (const s of await call('GET', '/sources?' + new URLSearchParams({ industry: flags.industry || '' }))) console.log(`${s.name.padEnd(28)} ${s.url}\n    ${s.good_for || ''}`); },
  async export() {
    const { exportTheme, listTargets } = await import('../src/export/index.js');
    if (flags.list) { for (const t of listTargets()) console.log(`${t.id.padEnd(20)} tier ${String(t.tier).padEnd(9)} ${t.status}${t.todo ? '\n    ' + t.todo : ''}`); return; }
    if (!flags.target) { console.error('--target is required (html, astro, react, wordpress, elementor)'); process.exit(2); }
    const themeDir = themeDirOf(flags.theme || args[0]);
    let r;
    try { r = await exportTheme({ themeDir, target: flags.target, out: flags.out, cms: flags.cms, siteUrl: flags['site-url'], lang: flags.lang, name: flags.name, force: !!flags.force, build: !!flags.build, check: !flags['no-check'] }); }
    catch (e) { console.error(e.message); process.exit(e.code === 'BAD_INPUT' ? 2 : 1); }
    process.exitCode = r.code;
    if (flags.json) return out(r);
    if (r.code === 2) { console.error('export refused, fix the theme first:'); for (const e of r.validation.errors) console.error('  ERROR ' + e); return; }
    console.log(`${flags.target} export written to ${r.out_dir} (${r.files} files)`);
    for (const n of r.notes) console.log('  note: ' + n);
    for (const w of r.validation.warnings) console.log('  warn: ' + w);
    if (r.check) {
      console.log(`post-export check: ${r.check.ok ? 'passed' : 'FAILED'}; compare theme/export: ${r.check.compare.verdict} (blink ${r.check.compare.blink?.desktop}/${r.check.compare.blink?.mobile})`);
      for (const p of r.check.pages) console.log(`  ${p.page.padEnd(20)} ${p.grade} ${p.score}/100  ${p.hard_failures.length} hard error(s)${p.blocked_requests.length ? '  blocked: ' + p.blocked_requests.join(', ') : ''}`);
      for (const g of r.check.regressions) console.log('  REGRESSION ' + g);
      if (r.check.baseline_rules.length) console.log('  already in the theme: ' + r.check.baseline_rules.join(', '));
    }
  },
  async 'verify-exports'() {
    const { verifyExports } = await import('../src/export/verify.js');
    const themeDir = themeDirOf(flags.theme || args[0]);
    let r;
    try { r = await verifyExports({ themeDir, targets: list(flags.targets), keep: !!flags.keep, work: flags.work }); }
    catch (e) { console.error(e.message); process.exit(e.code === 'BAD_INPUT' ? 2 : 1); }
    process.exitCode = r.ok ? 0 : 1;
    if (flags.json) return out(r);
    for (const t of r.results) { console.log(`${t.ok ? 'PASS' : 'FAIL'}  ${t.target}`); for (const g of t.gates) console.log(`  ${g.ok ? 'ok  ' : 'FAIL'} ${g.gate}: ${String(g.detail).split('\n').join('\n        ')}`); }
    console.log(r.ok ? `all gates passed for ${r.slug || themeDir}` : `gate failed for ${r.slug || themeDir}`);
    if (r.work) console.log(`work folder kept: ${r.work}`);
  },
  async tokens() { const { exportTokens } = await import('../src/export/index.js'); process.stdout.write(exportTokens(themeDirOf(flags.theme || args[0]), flags.format || 'css')); },
  async launch() {
    const { runLaunch } = await import('../src/launch/index.js');
    if (!args[0]) { console.error('kk launch <url|export-dir>'); process.exit(2); }
    const r = await runLaunch({ target: args[0], sheet: flags.sheet, pages: flags.pages ? +flags.pages : 20, only: list(flags.only), formEndpoint: flags.form, formTest: !!flags['form-test'], processors: !!flags.processors, recheck: !!flags.recheck, perf: !flags['no-perf'], a11yPages: flags['no-a11y'] ? 0 : flags['a11y-pages'] ? +flags['a11y-pages'] : 3, outDir: flags.out });
    if (r.error) { console.error(r.error); process.exit(2); }
    process.exitCode = r.code;
    if (flags.json) return out(r);
    if (flags.recheck && r.changes) {
      console.log(r.changes.note || `changes since ${r.changes.since}: ${r.changes.new_failures.length} new, ${r.changes.resolved.length} resolved, ${r.changes.new_hosts.length} new third-party host(s)`);
      for (const f of r.changes.new_failures) console.log(`  NEW  ${f.severity.toUpperCase().padEnd(5)} ${f.id}: ${f.detail}  (${f.evidence})`);
      for (const f of r.changes.resolved) console.log(`  FIXED ${f.id}: ${f.detail}`);
      for (const h of r.changes.new_hosts) console.log(`  NEW HOST ${h}`);
      return;
    }
    console.log(r.summary);
    for (const f of r.findings.filter((x) => !x.ok && x.severity !== 'info')) console.log(`  ${f.severity.toUpperCase().padEnd(5)} ${f.id}${f.key ? ' (' + f.key + ')' : ''}: ${f.detail}  (${f.evidence})`);
    if (r.processors) console.log('\n' + r.processors.md);
    if (r.files) console.log('\nreport: ' + r.files.join(', '));
    console.log('\n' + r.disclaimer);
  },
  async 'launch-sheet'() {
    const S = await import('../src/launch/sheet.js');
    const [action, site] = args; if (!action || !site) { console.error('kk launch-sheet init|get|tick <site>'); process.exit(2); }
    const path = flags.sheet ? resolve(flags.sheet) : S.sheetPath(site);
    try {
      const r = action === 'init' ? S.initSheet(site, path) : action === 'tick' ? S.tickSheet(path, { item: flags.item, by: flags.by, note: flags.note }) : S.readSheet(path);
      if (!r) { console.error('no sheet at ' + path); process.exit(1); }
      console.log(action === 'get' ? r.text : `${action === 'init' && !r.created ? 'exists (not overwritten)' : 'ok'}: ${r.path}`);
    } catch (e) { console.error(e.message); process.exit(2); }
  },
  async 'dns-plan'() { const { dnsPlan } = await import('../src/launch/plan.js'); if (!args[0]) { console.error('kk dns-plan <domain>'); process.exit(2); } console.log(dnsPlan({ domain: args[0], web_target: flags.web, mail_provider: flags.mail, ca: flags.ca }).md); },
  async spec() {
    const { runSpec } = await import('../src/fidelity/spec.js');
    if (!args[0]) { console.error('kk spec <url|file|dir>'); process.exit(2); }
    try {
      const { dir, spec } = await runSpec({ target: args[0], out: flags.out, viewports: list(flags.viewports)?.map(Number), frames: !!flags.frames, sweep: !flags['no-sweep'], log: (m) => process.stderr.write(m + '\n') });
      if (flags.json) return out(spec);
      const ws = Object.keys(spec.viewports).sort((a, b) => b - a);
      console.log(`spec written to ${dir}`); for (const w of ws) { const v = spec.viewports[w]; console.log(`  ${w}px  doc ${v.doc_h}  content ${v.container.width ?? '-'} at x ${v.container.left ?? '-'}  h1 ${v.roles.h1?.fs ?? '-'}px/${v.roles.h1?.lines ?? '-'} lines  ${v.sections.length} sections  ${v.grids.length} grids  ${v.media.length} media`); }
      if (spec.breakpoints) console.log('  breakpoints: ' + (spec.breakpoints.map((b) => b.between.join('-')).join(', ') || 'none detected'));
      console.log('  next: read SPEC.draft.md and the shots, write SPEC.md with numbers (references/fidelity.md)');
    } catch (e) { console.error(e.message); process.exit(2); }
  },
  async motion() {
    const { runMotion, translationHints } = await import('../src/fidelity/motion.js');
    if (!args[0]) { console.error('kk motion <url|file|dir>'); process.exit(2); }
    try {
      const { dir, motion: m } = await runMotion({ target: args[0], out: flags.out, width: flags.width ? +flags.width : 1440, hovers: flags.hovers ? +flags.hovers : 8, log: (x) => process.stderr.write(x + '\n') });
      if (flags.json) return out(m);
      console.log(`motion written to ${dir}`);
      console.log(`  libraries ${m.probe.libs.join(', ') || 'none'}; ${m.probe.running.length} running animation(s), ${m.probe.keyframes.length} @keyframes, ${m.probe.transitions.length} transition group(s), ${m.probe.scroll_timelines.length + m.probe.view_timelines.length} scroll/view timeline rule(s), reduced-motion blocks ${m.probe.reduced_motion_blocks}`);
      console.log(`  scroll changes ${m.sweep.length}, hover diffs ${m.hovers.length}${m.nav_hide.length ? ', nav hides on scroll' : ''}${m.cursor_follower ? ', cursor follower' : ''}`);
      for (const h of translationHints(m)) console.log('  - ' + h);
    } catch (e) { console.error(e.message); process.exit(2); }
  },
  async fidelity() {
    const { runFidelity } = await import('../src/fidelity/fidelity.js');
    if (!args[0] || !args[1]) { console.error('kk fidelity <ref url|spec dir> <build url|file|dir>'); process.exit(2); }
    try {
      const { dir, result } = await runFidelity({ ref: args[0], build: args[1], out: flags.out, widths: list(flags.widths)?.map(Number) || [1440, 390], labels: list(flags.labels) || ['reference', 'build'], round: flags.round ? +flags.round : undefined, log: (x) => process.stderr.write(x + '\n') });
      process.exitCode = result.diff.flags ? 1 : 0;
      if (flags.json) return out(result);
      console.log(`round ${result.round}: ${result.diff.flags} value(s) outside tolerance  ->  ${dir}/FIDELITY.md`);
      for (const [w, r] of Object.entries(result.diff.per)) {
        console.log(`  ${w}px  doc ${r.doc.ref} -> ${r.doc.build} (${r.doc.delta > 0 ? '+' : ''}${r.doc.delta})  content ${r.container.ref ?? '-'} -> ${r.container.build ?? '-'}`);
        for (const x of r.sections.filter((y) => y.flag).slice(0, 8)) console.log(`    CHECK section ${x.i}: h ${x.h_ref ?? '-'} -> ${x.h_build ?? '-'} (${x.dh ?? '-'})`);
        for (const x of r.roles.filter((y) => y.flag)) console.log(`    CHECK ${x.role}: ${x.fs_ref ?? '-'} -> ${x.fs_build ?? '-'} px, lines ${x.lines_ref ?? '-'} -> ${x.lines_build ?? '-'}`);
        for (const x of r.positions.filter((y) => y.flag)) console.log(`    CHECK ${x.what}: dx ${x.dx ?? '-'} dy ${x.dy ?? '-'} dw ${x.dw ?? '-'} dh ${x.dh ?? '-'}`);
      }
      console.log('  montages: ' + Object.values(result.montages).join(', '));
    } catch (e) { console.error(e.message); process.exit(2); }
  },
  async improve() {
    const { runImprove } = await import('../src/fidelity/improve.js');
    if (!args[0]) { console.error('kk improve <url|file|dir>'); process.exit(2); }
    try {
      const { dir, result } = await runImprove({ target: args[0], out: flags.out, profile: flags.profile || 'bfsg', perf: !!flags.perf, motion: !flags['no-motion'], refs: !flags['no-refs'], industry: flags.industry, mood: flags.mood, log: (x) => process.stderr.write(x + '\n') });
      if (flags.json) return out(result);
      console.log(`IMPROVE.md written to ${dir}  (suggested depth: ${result.depth})`);
      for (const [k, xs] of [['KEEP', result.keep], ['FIX', result.fix], ['REDESIGN', result.redesign]]) for (const x of xs) console.log(`  ${k.padEnd(8)} ${x.area}: ${x.text}`);
      if (result.references?.length) console.log('  references: ' + result.references.map((r) => r.id).join(', '));
    } catch (e) { console.error(e.message); process.exit(2); }
  },
  async workflow() { const { getWorkflow } = await import('../src/fidelity/workflow.js'); try { const w = getWorkflow(args[0] || 'new'); if (flags.json) return out(w); console.log(`${w.phase} (${w.version})`); w.steps.forEach((s, i) => console.log(`${i + 1}. ${s.title}: ${s.do}`)); console.log('\nChecklist:'); for (const c of w.checklist) console.log('  - ' + c.q); console.log('\nHard bans:'); for (const b of w.hard_bans) console.log('  - ' + b); } catch (e) { console.error(e.message); process.exit(2); } },
  async references() {
    const L = await import('../src/refs.js');
    try { const r = L.searchRefs({ query: args.join(' ') || undefined, industry: flags.industry, cluster: flags.cluster, tag: flags.tag, has_spec: !!flags['has-spec'], limit: flags.limit ? +flags.limit : 20 }); if (flags.json) return out(r); for (const i of r.items) console.log(`${i.id.padEnd(46)} ${(i.cluster?.id || '-').padEnd(4)} ${i.has_spec ? 'spec ' : '     '}${i.live_url || i.url}`); console.log(`(${r.total} of ${r.library})`); } catch (e) { console.error(e.message); process.exit(2); }
  },
  async reference() { const L = await import('../src/refs.js'); try { out(L.getRefSpec(args[0], { full: !!flags.full })); } catch (e) { console.error(e.message); process.exit(2); } },
  async mcp() {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { buildMcpServer } = await import('../src/mcp.js');
    const server = buildMcpServer({ baseUrl: process.env.KK_PUBLIC_URL || '', local: true });
    await server.connect(new StdioServerTransport());
  },
};
if (!cmd || !run[cmd]) { console.log(HELP); process.exit(cmd ? 1 : 0); }
await run[cmd]();
if (['spec', 'motion', 'fidelity', 'improve'].includes(cmd)) { const { closeBrowser } = await import('../src/browser.js'); const { closeLocalBrowser } = await import('../src/fidelity/targets.js'); await closeBrowser(); await closeLocalBrowser(); }
