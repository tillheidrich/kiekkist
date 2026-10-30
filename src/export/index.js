// kk export: theme folder -> target scaffold. Pipeline: load -> validate -> IR -> adapter -> write -> post-export check.
// Runs locally; the only network use is the optional `--build` (npm install in the output folder).
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { loadTheme } from './load.js';
import { buildIR } from './ir.js';
import { validateTheme } from './validate.js';
import { loadAdapter, listTargets } from './targets/index.js';
import { serveDir } from './serve.js';
import { toCss } from './tokens/css.js';
import { toThemeJson } from './tokens/theme-json.js';
import { toTailwindTheme } from './tokens/tailwind.js';
import { toElementorSettings } from './tokens/elementor.js';

export { listTargets };
export const EXPORT_VERSION = '2026-10-30.1';

/** Token file for agents working inside an existing project (kk_export_tokens). */
export function exportTokens(themeDir, format = 'css') {
  const t = loadTheme(themeDir);
  if (!t.tokens) throw Object.assign(new Error('tokens.json missing'), { code: 'BAD_INPUT' });
  if (format === 'css') return toCss(t.tokens);
  if (format === 'theme.json') { const r = toThemeJson(t.tokens, { fontsCss: t.fontsCss, tokensCss: t.tokensCss, siteCss: t.siteCss }); return JSON.stringify(r.json, null, 2) + '\n'; }
  if (format === 'tailwind') return toTailwindTheme(t.tokens);
  if (format === 'elementor') return JSON.stringify(toElementorSettings(t.tokens), null, 2) + '\n';
  throw Object.assign(new Error('format must be css, theme.json, tailwind or elementor'), { code: 'BAD_INPUT' });
}

function run(cmd, args, cwd, ms) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    const t = setTimeout(() => { p.kill('SIGKILL'); out += `\n(timeout after ${ms / 1000} s)`; }, ms);
    p.on('close', (code) => { clearTimeout(t); res({ code, out: out.slice(-4000) }); });
  });
}

/** Run the checker on exported pages (and on the theme pages as baseline) and compare first screens. */
export async function postExportCheck({ serveRoot, pages, themeDir, sourcePages, tokens, viewports = [390, 768, 1440] }) {
  const { checkTarget } = await import('../check/index.js');
  const { compareTargets } = await import('../check/compare.js');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const srv = await serveDir(serveRoot);
  const themeSrv = await serveDir(themeDir); // the theme is measured the same way as the export (served over http, not file://)
  try {
    const result = { pages: [], compare: null, regressions: [], blocked: [], hard_failures: 0 };
    const baselineRules = new Set();
    // Baseline without the mobile evidence (its throttled lab load would double the time per theme page); the exported
    // pages keep it. Mobile findings of the export are therefore reported per page but never counted as regressions.
    const { MOBILE_RULES } = await import('../check/mobile.js');
    for (const f of sourcePages) {
      try { const r = await checkTarget({ url: `${themeSrv.url}/${f}`, tokens, viewports, browser, noJs: false, mobile: false }); r.hard.filter((h) => h.severity === 'error').forEach((h) => baselineRules.add(h.rule)); } catch { /* baseline is best effort */ }
    }
    for (const p of pages) {
      const r = await checkTarget({ url: srv.url + p, tokens, viewports, browser, noJs: false, mobile: true });
      const errs = r.hard.filter((h) => h.severity === 'error');
      const blocked = (r.stats?.blocked || []).filter((h) => !/^(file:|data:|blob:)$/.test(h));
      const thirdParty = r.hard.filter((h) => h.rule === 'third-party' || h.rule === 'font-cdn');
      result.pages.push({ page: p, grade: r.grade, score: r.score, incomplete: !!r.incomplete, hard_failures: errs.map((h) => `${h.rule}${h.viewport ? '@' + h.viewport : ''}: ${h.detail}`), blocked_requests: blocked });
      result.hard_failures += errs.length;
      result.blocked.push(...blocked, ...thirdParty.map((h) => h.value));
      for (const h of errs) if (!baselineRules.has(h.rule) && !MOBILE_RULES.includes(h.rule)) result.regressions.push(`${p}: ${h.rule} (not in the theme itself)`);
      if (r.mobile) result.mobile = [...(result.mobile || []), { page: p, errors: r.mobile.errors_count, warnings: r.mobile.warnings_count, summary: r.mobile.summary_en }];
    }
    result.baseline_rules = [...baselineRules];
    const index = pages[0];
    const cmp = await compareTargets({ browser, targets: [{ name: 'theme', url: `${themeSrv.url}/${sourcePages[0]}` }, { name: 'export', url: srv.url + index }] });
    const pair = cmp.pairs[0];
    result.compare = { verdict: pair.verdict, similar: pair.verdict === 'too similar', blink: pair.blink, signals: pair.signals };
    result.ok = result.regressions.length === 0 && result.blocked.length === 0 && result.compare.similar && !result.pages.some((p) => p.incomplete);
    result.regressions = [...new Set(result.regressions)];
    result.blocked = [...new Set(result.blocked)];
    return result;
  } finally { await srv.close(); await themeSrv.close(); await browser.close(); }
}

function writeFiles(out, files) {
  let n = 0;
  for (const [rel, content] of files) {
    const p = join(out, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content); n++;
  }
  return n;
}

function exportMd({ ir, target, adapter, notes, validation, check, out, opts }) {
  const L = [`# Export: ${ir.site.name} → ${target}`, '', `Generated by \`kk export\` ${EXPORT_VERSION} on ${new Date().toISOString().slice(0, 10)} from \`${ir.site.slug}\`.`, ''];
  L.push('## Target', '', `- Target: **${adapter.meta.label}** (${adapter.meta.status})`, ...(adapter.meta.versions ? [`- Versions: ${adapter.meta.versions}`] : []), `- What the client can edit: ${adapter.meta.editable}`, '');
  L.push('## Content model', '', '| Section | Component | Props | Collections | Pages |', '|---|---|---|---|---|');
  for (const s of Object.values(ir.sections)) L.push(`| ${s.name} | ${s.component} | ${s.props.length} | ${s.collections.join(', ') || '–'} | ${s.pages.map((p) => p.replace('pages/', '')).join(', ')} |`);
  L.push('');
  if (notes.length) L.push('## Notes', '', ...notes.map((n) => `- ${n}`), '');
  const v = [...validation.warnings.map((w) => `- warn: ${w}`), ...validation.info.map((w) => `- info: ${w}`)];
  if (v.length) L.push('## Validation', '', ...v, '');
  if (check) {
    L.push('## Post-export check', '', `- Result: **${check.ok ? 'passed' : 'failed'}**`, `- Compare theme vs. export (first screen): ${check.compare.verdict} (blink desktop ${check.compare.blink?.desktop}, mobile ${check.compare.blink?.mobile}; "too similar" is the goal here)`);
    for (const p of check.pages) L.push(`- ${p.page}: grade ${p.grade} (${p.score}/100), ${p.hard_failures.length} hard error(s)${p.blocked_requests.length ? ', blocked requests: ' + p.blocked_requests.join(', ') : ''}`);
    if (check.regressions.length) L.push('', 'Hard errors the theme itself does not have:', ...check.regressions.map((r) => `- ${r}`));
    if (check.baseline_rules.length) L.push('', `Hard errors already present in the theme (fix them in the theme, then re-export): ${check.baseline_rules.join(', ')}`);
    if (check.mobile?.length) L.push('', 'Mobile evidence (export pages only; the theme baseline skips it, so these are not compared):', ...check.mobile.map((m) => `- ${m.page}: ${m.errors} error(s), ${m.warnings} warning(s). ${m.summary}`));
    L.push('');
  } else L.push('## Post-export check', '', '- not run (`--no-check`)', '');
  L.push('---', '', 'The export prepares and verifies files. It does not register, pay, sign or change DNS. Run `kk launch <url>` once the site is live.', '');
  return L.join('\n');
}

/**
 * @param {object} o { themeDir, target, out, siteUrl, lang, name, cms, tailwind, force, check=true, build=false }
 * @returns {Promise<{ ok, code, out_dir, files, notes, validation, check }>}
 */
export async function exportTheme(o) {
  const themeDir = resolve(o.themeDir);
  const adapter = await loadAdapter(o.target);
  const theme = loadTheme(themeDir);
  const { ir, issues } = buildIR(theme, { siteUrl: o.siteUrl || '', lang: o.lang, name: o.name });
  const validation = validateTheme(theme, { irIssues: issues });
  if (!validation.ok) return { ok: false, code: 2, out_dir: null, files: 0, notes: [], validation, check: null };
  const out = resolve(o.out || join(process.cwd(), `${ir.site.slug}-${o.target}`));
  if (existsSync(out) && readdirSync(out).length && !o.force) throw Object.assign(new Error(`output folder is not empty: ${out} (use --force to overwrite)`), { code: 'BAD_INPUT' });
  if (existsSync(out) && o.force) for (const n of readdirSync(out)) if (n !== 'node_modules') rmSync(join(out, n), { recursive: true, force: true });
  const res = await adapter.exportTarget(ir, { ...o, themeDir });
  const notes = [...res.notes];
  const count = writeFiles(out, res.files);
  let check = null, build = null;
  if (o.check !== false) {
    let serveRoot = null, pages = res.postCheck.pages;
    if (o.build && res.postCheck.buildCmd) {
      build = await run('sh', ['-c', res.postCheck.buildCmd], out, 10 * 60_000);
      if (build.code !== 0) notes.push('build failed: ' + build.out.split('\n').slice(-8).join(' / '));
      else serveRoot = join(out, res.postCheck.buildDir);
    }
    if (!serveRoot && res.postCheck.serveDir) serveRoot = join(out, res.postCheck.serveDir);
    let tmp = null;
    if (!serveRoot && res.postCheck.preview) { // static preview rendered from the same templates and data
      tmp = mkdtempSync(join(tmpdir(), 'kk-preview-'));
      writeFiles(tmp, res.postCheck.preview.files); serveRoot = tmp; pages = res.postCheck.preview.pages;
      notes.push(`post-export check ran on a static preview rendered from the exported templates and data${res.postCheck.buildCmd ? ' (pass --build to check the real build)' : ''}`);
    }
    if (serveRoot) {
      try { check = await postExportCheck({ serveRoot, pages, themeDir, sourcePages: res.postCheck.sourcePages, tokens: join(themeDir, 'tokens.json') }); }
      finally { if (tmp) rmSync(tmp, { recursive: true, force: true }); }
    } else notes.push('post-export check skipped: this target has no static preview');
  }
  writeFileSync(join(out, 'EXPORT.md'), exportMd({ ir, target: o.target, adapter, notes, validation, check, out, opts: o }));
  const ok = !check || check.ok;
  return { ok, code: ok && (!build || build.code === 0) ? 0 : 1, out_dir: out, files: count + 1, notes, validation, check, build: build ? { code: build.code } : null };
}
