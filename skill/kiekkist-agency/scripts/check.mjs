#!/usr/bin/env node
// Thin wrapper around the Kiekkist check.
//
// Usage:
//   node check.mjs <theme-dir | file.html | https://url> [--tokens tokens.json] [--theme <slug>] [--json]
//
// Order of attempts:
//   1. Kiekkist API, if KK_URL is set (KK_TOKEN as bearer token): POST $KK_URL/api/check
//   2. Local checkout, if KIEKKIST_HOME is set: node $KIEKKIST_HOME/src/check/cli.js
//   3. `kk check` on PATH
//   4. `npx --no-install kiekkist check` (never installs anything)
//   5. Otherwise: explain that the tool is missing and point to the manual checklist.
//
// Exit codes:
//   0 = check ran, no hard failures
//   1 = check ran, hard failures found
//   2 = tool missing or usage error

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(here, '..');

function parseArgs(argv) {
  const out = { target: null, tokens: null, theme: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--tokens') out.tokens = argv[++i];
    else if (a === '--theme') out.theme = argv[++i];
    else if (a === '-h' || a === '--help') out.help = true;
    else if (!out.target) out.target = a;
  }
  return out;
}

function usage() {
  console.log('Usage: node check.mjs <theme-dir | file.html | https://url> [--tokens tokens.json] [--theme <slug>] [--json]');
}

const isUrl = (s) => /^https?:\/\//i.test(s || '');

// A theme folder is checked through its home page and its tokens.
function resolveTarget(opts) {
  if (!opts.target || isUrl(opts.target)) return opts;
  const p = resolve(opts.target);
  if (!existsSync(p)) {
    console.error(`Target not found: ${p}`);
    process.exit(2);
  }
  if (statSync(p).isDirectory()) {
    const page = join(p, 'pages', 'index.html');
    const fallback = join(p, 'index.html');
    const file = existsSync(page) ? page : existsSync(fallback) ? fallback : null;
    if (!file) {
      console.error(`No pages/index.html or index.html in ${p}`);
      process.exit(2);
    }
    const tokens = join(p, 'tokens.json');
    return { ...opts, target: file, tokens: opts.tokens || (existsSync(tokens) ? tokens : null), themeDir: p };
  }
  return { ...opts, target: p };
}

// Inline local stylesheets so the API sees the tokens a page links to.
function inlineLocalCss(html, fileDir) {
  return html.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, (tag) => {
    const m = tag.match(/href=["']([^"']+)["']/i);
    if (!m || isUrl(m[1]) || m[1].startsWith('//')) return tag;
    const cssPath = resolve(fileDir, m[1]);
    if (!existsSync(cssPath)) return tag;
    return `<style>/* inlined from ${m[1]} */\n${readFileSync(cssPath, 'utf8')}\n</style>`;
  });
}

function printReport(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const hard = (Array.isArray(report.hard) ? report.hard : []).filter((f) => f.severity === 'error');
  const over = (Array.isArray(report.counts) ? report.counts : []).filter((c) => c.over);
  console.log(`Kiekkist check: score ${report.score ?? '?'} grade ${report.grade ?? '?'}${report.incomplete ? ' (INCOMPLETE: not every viewport could be measured)' : ''}`);
  console.log(`Hard failures: ${hard.length}`);
  for (const f of hard) console.log(`  [${f.rule}]${f.viewport ? ` @${f.viewport}` : ''} ${f.detail}${f.selector ? ` (${f.selector})` : ''}`);
  console.log(`Counted signals over threshold: ${over.length}`);
  for (const c of over) console.log(`  ${c.label || c.rule}: ${c.count} (threshold ${c.threshold})`);
  if (report.summary) console.log(`\n${report.summary}`);
  console.log('\nA passing check means nothing is measurably broken. It does not mean the design is good. Run the critique next (references/critique.md).');
}

async function viaApi(opts) {
  const base = process.env.KK_URL.replace(/\/+$/, '');
  let body;
  if (opts.theme) body = { theme: opts.theme };
  else if (isUrl(opts.target)) body = { url: opts.target };
  else body = { html: inlineLocalCss(readFileSync(opts.target, 'utf8'), dirname(opts.target)) };
  // tokens: explicit --tokens, else tokens.json / tokens.css next to the target or in its theme folder
  const tokPath = opts.tokens || [join(dirname(opts.target || '.'), 'tokens.json'), join(dirname(opts.target || '.'), '..', 'tokens.json'), join(dirname(opts.target || '.'), 'tokens.css'), join(dirname(opts.target || '.'), '..', 'tokens.css')].find((p) => !opts.theme && !isUrl(opts.target) && existsSync(p));
  if (tokPath && !opts.theme) { const t = readFileSync(tokPath, 'utf8'); body.tokens = /\.json$/i.test(tokPath) ? JSON.parse(t) : t; }
  const headers = { 'content-type': 'application/json' };
  if (process.env.KK_TOKEN) headers.authorization = `Bearer ${process.env.KK_TOKEN}`;
  const res = await fetch(`${base}/api/check`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function cliArgs(opts) {
  const args = [opts.target];
  if (opts.tokens) args.push('--tokens', resolve(opts.tokens));
  if (opts.json) args.push('--json');
  return args;
}

// Returns the exit code, or null if this runner is not available.
function tryRun(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (r.error && r.error.code === 'ENOENT') return null;
  if (r.error) return null;
  return r.status ?? 1;
}

function available(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'ignore', shell: false, timeout: 60000 });
  return !r.error && r.status === 0;
}

function missingTool() {
  const tells = join(skillRoot, 'references', 'tells.md');
  const critique = join(skillRoot, 'references', 'critique.md');
  console.error([
    'Kiekkist check is not available in this environment.',
    'Tried: KK_URL (API), KIEKKIST_HOME (local checkout), `kk` on PATH, `npx --no-install kiekkist`.',
    '',
    'Options:',
    '  - Set KK_URL and KK_TOKEN to use a running Kiekkist server.',
    '  - Set KIEKKIST_HOME to a local Kiekkist checkout (needs `npm install` there).',
    '',
    'Until then, run the manual checklist:',
    `  - Hard failures and counted signals: ${tells}`,
    `  - Manual checklist and critique: ${critique} (section "Manual checklist when no tool is available")`,
    '',
    'Record the results in the same shape as the tool report: hard failures, counters with count and threshold, findings.',
  ].join('\n'));
  process.exit(2);
}

async function main() {
  let opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.target && !opts.theme)) {
    usage();
    process.exit(opts.help ? 0 : 2);
  }
  opts = resolveTarget(opts);

  // 1. API
  if (process.env.KK_URL) {
    try {
      const report = await viaApi(opts);
      printReport(report, opts.json);
      process.exit(report.incomplete || (Array.isArray(report.hard) && report.hard.some((f) => f.severity === 'error')) ? 1 : 0);
    } catch (err) {
      console.error(`Kiekkist API failed (${err.message}). Trying local tools.`);
    }
  }

  if (!opts.target) {
    console.error('--theme without KK_URL needs a local target path as well.');
    process.exit(2);
  }

  // 2. Local checkout
  const home = process.env.KIEKKIST_HOME;
  if (home) {
    const cli = join(resolve(home), 'src', 'check', 'cli.js');
    if (existsSync(cli)) {
      const code = tryRun(process.execPath, [cli, ...cliArgs(opts)]);
      if (code !== null) process.exit(code);
    } else {
      console.error(`KIEKKIST_HOME is set, but ${cli} does not exist.`);
    }
  }

  // 3. kk on PATH
  if (available('kk', ['--help'])) {
    const code = tryRun('kk', ['check', ...cliArgs(opts)]);
    if (code !== null) process.exit(code);
  }

  // 4. npx without installing
  if (available('npx', ['--no-install', 'kiekkist', '--help'])) {
    const code = tryRun('npx', ['--no-install', 'kiekkist', 'check', ...cliArgs(opts)]);
    if (code !== null) process.exit(code);
  }

  missingTool();
}

main();
