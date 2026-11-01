// kk verify-exports: release gate for a design. Exports it to the targets and runs the official tools on the result:
//   astro      astro check (0 errors) + astro build
//   react      scratch Vite + React + TypeScript + Tailwind v4 app around the package: tsc --noEmit + vite build
//   wordpress  php -l on every PHP file, required files, screenshot 1200x900, Theme Check (WordPress Playground CLI,
//              php-wasm) without REQUIRED or ERROR results
//   elementor  php -l on the child theme, kit ZIP with manifest.json and site-settings.json in Elementor's import shape
//   html       export with its own post-export check (checker on the pages, no third-party request)
// Exit code: 0 every gate passed, 1 a gate failed, 2 bad input. Network: npm (or KK_VERIFY_NODE_MODULES, a folder with
// the tools installed), the Playground CLI downloads WordPress and Theme Check unless KK_THEME_CHECK_DIR is set.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync, symlinkSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import JSZip from 'jszip';
import { exportTheme } from './index.js';

export const GATE_TARGETS = ['astro', 'react', 'wordpress', 'elementor', 'html'];
const TOOL_DEPS = {
  astro: { astro: '^7.0.0', '@astrojs/sitemap': '^3.6.0', '@astrojs/check': '^0.9.0', typescript: '^5.9.0' },
  react: { react: '^19.2.0', 'react-dom': '^19.2.0', '@types/react': '^19.2.0', '@types/react-dom': '^19.2.0', typescript: '^5.9.0', vite: '^7.0.0', '@vitejs/plugin-react': '^5.0.0', tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0' },
};

function run(cmd, args, cwd, ms = 10 * 60_000, env = {}) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', ...env } });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    const t = setTimeout(() => { p.kill('SIGKILL'); out += `\n(timeout after ${ms / 1000} s)`; }, ms);
    p.on('error', (e) => { clearTimeout(t); res({ code: 127, out: String(e.message) }); });
    p.on('close', (code) => { clearTimeout(t); res({ code: code ?? 1, out }); });
  });
}
const tail = (s, n = 12) => String(s).replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-n).join('\n');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : walk(p)) : [p]; });

/** node_modules for a tool set: KK_VERIFY_NODE_MODULES/<set> (or the folder itself) when given, else npm install once per run. */
async function toolModules(set, work, cache) {
  if (cache[set]) return cache[set];
  const given = process.env.KK_VERIFY_NODE_MODULES;
  if (given) { const d = existsSync(join(given, set, 'node_modules')) ? join(given, set, 'node_modules') : given; cache[set] = d; return d; }
  const dir = join(work, `tools-${set}`); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: `kk-verify-${set}`, private: true, type: 'module', dependencies: TOOL_DEPS[set] }));
  const r = await run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], dir, 15 * 60_000);
  if (r.code !== 0) throw new Error(`npm install for the ${set} tools failed: ${tail(r.out, 5)}`);
  return (cache[set] = join(dir, 'node_modules'));
}

async function phpLint(dir) {
  const files = walk(dir).filter((f) => f.endsWith('.php'));
  const errors = [];
  for (const f of files) { const r = await run('php', ['-l', f], dir, 60_000); if (r.code !== 0) errors.push(`${f.slice(dir.length + 1)}: ${r.code === 127 ? 'php not installed' : tail(r.out, 2)}`); }
  return { files: files.length, errors };
}

const gate = (name, ok, detail, extra = {}) => ({ gate: name, ok, detail, ...extra });

async function verifyAstro(out, work, cache) {
  const nm = await toolModules('astro', work, cache);
  if (!existsSync(join(out, 'node_modules'))) symlinkSync(nm, join(out, 'node_modules'));
  const bin = join(out, 'node_modules', '.bin', 'astro');
  const c = await run(bin, ['check'], out);
  const m = /(\d+) errors?/.exec(c.out.replace(/\x1b\[[0-9;]*m/g, ''));
  const b = await run(bin, ['build'], out);
  const pages = existsSync(join(out, 'dist')) ? walk(join(out, 'dist')).filter((f) => f.endsWith('.html')).length : 0;
  return [gate('astro check', c.code === 0, c.code === 0 ? `0 errors (${m ? m[0] : 'ok'})` : tail(c.out)), gate('astro build', b.code === 0 && pages > 0, b.code === 0 ? `${pages} HTML files in dist/` : tail(b.out))];
}

async function verifyReact(out, work, cache) {
  const nm = await toolModules('react', work, cache);
  const app = join(work, 'react-app'); rmSync(app, { recursive: true, force: true }); mkdirSync(join(app, 'src'), { recursive: true });
  for (const d of ['styles', 'components', 'pages']) cpSync(join(out, d), join(app, 'src', d), { recursive: true });
  if (existsSync(join(out, 'public'))) cpSync(join(out, 'public'), join(app, 'public'), { recursive: true });
  symlinkSync(nm, join(app, 'node_modules'));
  writeFileSync(join(app, 'src/global.css'), '@import "tailwindcss";\n@import "./styles/tokens.css";\n@import "./styles/theme.css";\n@import "./styles/site.css";\n');
  writeFileSync(join(app, 'src/main.tsx'), "import { createRoot } from 'react-dom/client';\nimport './global.css';\nimport * as pages from './pages';\nconst Page = Object.values(pages).find((x) => typeof x === 'function') as () => any;\ncreateRoot(document.getElementById('root')!).render(<Page />);\n");
  writeFileSync(join(app, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>verify</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n');
  writeFileSync(join(app, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, resolveJsonModule: true, esModuleInterop: true, skipLibCheck: true, noEmit: true, types: [] }, include: ['src'] }));
  writeFileSync(join(app, 'vite.config.mjs'), "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({ plugins: [react(), tailwindcss()], logLevel: 'warn' });\n");
  writeFileSync(join(app, 'package.json'), '{"name":"kk-verify-app","private":true,"type":"module"}\n');
  const t = await run(join(app, 'node_modules', '.bin', 'tsc'), ['-p', '.'], app);
  const n = (t.out.match(/error TS\d+/g) || []).length;
  const v = await run(join(app, 'node_modules', '.bin', 'vite'), ['build'], app);
  return [gate('tsc --noEmit', t.code === 0, t.code === 0 ? '0 errors (strict, React 19 types)' : `${n} error(s)\n${tail(t.out, 8)}`), gate('vite build', v.code === 0, v.code === 0 ? 'Vite + Tailwind v4 build ok' : tail(v.out))];
}

const THEME_CHECK_PHP = (slug) => `<?php
require_once '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/theme.php';
wp_set_current_user( 1 );
require_once WP_PLUGIN_DIR . '/theme-check/checkbase.php';
require_once WP_PLUGIN_DIR . '/theme-check/main.php';
$theme = wp_get_theme( '${slug}' );
$res = array( 'exists' => $theme->exists(), 'errors' => $theme->errors() ? $theme->errors()->get_error_messages() : array(), 'messages' => array() );
if ( $theme->exists() ) {
	$res['pass'] = (bool) run_themechecks_against_theme( $theme, '${slug}' );
	global $themechecks;
	foreach ( $themechecks as $c ) { if ( $c instanceof themecheck ) { foreach ( (array) $c->getError() as $e ) {
		$type = preg_match( '/<span[^>]*>(.*?)<\\/span>/', $e, $m ) ? trim( rtrim( wp_strip_all_tags( $m[1] ), ':' ) ) : '';
		$res['messages'][] = array( 'type' => $type, 'check' => get_class( $c ), 'msg' => trim( html_entity_decode( wp_strip_all_tags( preg_replace( '/<span[^>]*>.*?<\\/span>/', '', $e, 1 ) ), ENT_QUOTES ) ) );
	} } }
}
file_put_contents( '/kk-out/theme-check.json', wp_json_encode( $res ) );
`;

async function themeCheck(themeDir, slug, work) {
  const outDir = join(work, 'tc-out'); mkdirSync(outDir, { recursive: true });
  const local = process.env.KK_THEME_CHECK_DIR;
  const steps = [...(local ? [] : [{ step: 'installPlugin', pluginData: { resource: 'wordpress.org/plugins', slug: 'theme-check' }, options: { activate: false } }]), { step: 'runPHP', code: THEME_CHECK_PHP(slug) }];
  writeFileSync(join(work, 'tc-blueprint.json'), JSON.stringify({ preferredVersions: { php: '8.3', wp: process.env.KK_VERIFY_WP || 'latest' }, steps }));
  const cli = process.env.KK_PLAYGROUND_CLI ? [process.env.KK_PLAYGROUND_CLI] : ['npx', '--yes', '@wp-playground/cli@latest'];
  const args = [...cli.slice(1), 'run-blueprint', `--blueprint=${join(work, 'tc-blueprint.json')}`, `--mount=${themeDir}:/wordpress/wp-content/themes/${slug}`, `--mount=${outDir}:/kk-out`, ...(local ? [`--mount=${local}:/wordpress/wp-content/plugins/theme-check`] : [])];
  const r = await run(cli[0], args, work, 20 * 60_000);
  const f = join(outDir, 'theme-check.json');
  if (!existsSync(f)) return gate('Theme Check', false, `Playground run gave no result (exit ${r.code}): ${tail(r.out, 6)}`);
  const res = JSON.parse(readFileSync(f, 'utf8'));
  const blocking = res.messages.filter((m) => /REQUIRED|ERROR/i.test(m.type));
  const warn = res.messages.filter((m) => /WARNING/i.test(m.type));
  return gate('Theme Check', res.exists && !res.errors.length && blocking.length === 0, blocking.length || !res.exists ? [...res.errors, ...blocking.map((m) => `${m.type} ${m.check}: ${m.msg.slice(0, 160)}`)].join('\n') || 'theme not found' : `0 REQUIRED, ${warn.length} WARNING${warn.length ? ': ' + [...new Set(warn.map((m) => m.check))].join(', ') : ''}`, { warnings: warn.map((m) => `${m.check}: ${m.msg.slice(0, 160)}`) });
}

async function verifyWordpress(out, slug, work) {
  const dir = join(out, slug);
  const lint = await phpLint(dir);
  const need = ['style.css', 'theme.json', 'templates/index.html', 'readme.txt', 'functions.php', 'screenshot.png'];
  const missing = need.filter((f) => !existsSync(join(dir, f)));
  let shot = 'missing';
  if (existsSync(join(dir, 'screenshot.png'))) { const b = readFileSync(join(dir, 'screenshot.png')); shot = `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; }
  const css = readFileSync(join(dir, 'style.css'), 'utf8');
  const hdr = ['Theme Name', 'License', 'License URI', 'Text Domain', 'Requires at least'].filter((k) => !new RegExp(`^${k}:\\s*\\S`, 'm').test(css));
  const tj = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8'));
  return [
    gate('php -l', lint.errors.length === 0, lint.errors.length ? lint.errors.join('\n') : `${lint.files} PHP files without syntax errors`),
    gate('required files', !missing.length && shot === '1200x900' && !hdr.length && tj.version === 3, [missing.length ? 'missing: ' + missing.join(', ') : '', shot !== '1200x900' ? `screenshot.png ${shot} (needs 1200x900)` : '', hdr.length ? 'style.css header without: ' + hdr.join(', ') : '', tj.version !== 3 ? `theme.json version ${tj.version}` : ''].filter(Boolean).join('; ') || 'style.css header, theme.json v3, templates/index.html, readme.txt, screenshot.png 1200x900'),
    await themeCheck(dir, slug, work),
  ];
}

async function verifyElementor(out, slug) {
  const lint = await phpLint(join(out, `${slug}-child`));
  const zip = await JSZip.loadAsync(readFileSync(join(out, `${slug}-kit.zip`)));
  const manifest = JSON.parse(await zip.file('manifest.json')?.async('string') || '{}');
  const site = JSON.parse(await zip.file('site-settings.json')?.async('string') || '{}');
  const problems = [];
  if (!manifest.title || !manifest['site-settings']) problems.push('manifest.json without title or site-settings');
  const s = site.settings || {};
  for (const k of ['system_colors', 'system_typography']) if (!Array.isArray(s[k]) || !s[k].length) problems.push(`site-settings.json without ${k}`);
  if ((s.system_colors || []).some((c) => !/^#[0-9a-f]{6}$/i.test(c.color || '') || !c._id)) problems.push('colour without _id or hex');
  return [gate('php -l (child theme)', lint.errors.length === 0, lint.errors.join('\n') || `${lint.files} PHP files without syntax errors`), gate('kit shape', !problems.length, problems.join('; ') || 'manifest.json + site-settings.json (system/custom colours and fonts) as Elementor exports them; import itself is not run here')];
}

/**
 * @param {object} o { themeDir, targets?: string[], work?: string, keep?: boolean }
 * @returns {Promise<{ ok, slug, results: { target, ok, gates }[] }>}
 */
export async function verifyExports(o) {
  const themeDir = resolve(o.themeDir);
  const targets = o.targets?.length ? o.targets : GATE_TARGETS;
  for (const t of targets) if (!GATE_TARGETS.includes(t)) throw Object.assign(new Error(`unknown gate target ${t} (${GATE_TARGETS.join(', ')})`), { code: 'BAD_INPUT' });
  const work = o.work ? resolve(o.work) : mkdtempSync(join(tmpdir(), 'kk-verify-'));
  mkdirSync(work, { recursive: true });
  const cache = {}; const results = []; let slug = null;
  try {
    for (const target of targets) {
      const out = join(work, target);
      let gates;
      try {
        const r = await exportTheme({ themeDir, target, out, force: true, check: target === 'html' });
        if (r.code === 2) { gates = [gate('export', false, 'theme refused: ' + r.validation.errors.join('; '))]; results.push({ target, ok: false, gates }); continue; }
        slug = slug || JSON.parse(readFileSync(join(themeDir, 'theme.json'), 'utf8')).slug || null;
        const s = readdirSync(out).find((n) => n.endsWith('-kit.zip'))?.replace(/-kit\.zip$/, '') || readdirSync(out).find((n) => n.endsWith('.zip'))?.replace(/\.zip$/, '') || slug;
        gates = [gate('export', true, `${r.files} files`)];
        if (target === 'html') gates.push(gate('post-export check', r.code === 0, r.code === 0 ? 'checker: no new hard errors, no third-party request, first screen identical' : (r.check?.regressions || []).concat(r.check?.blocked || []).join('; ') || 'failed'));
        if (target === 'astro') gates.push(...await verifyAstro(out, work, cache));
        if (target === 'react') gates.push(...await verifyReact(out, work, cache));
        if (target === 'wordpress') gates.push(...await verifyWordpress(out, s, work));
        if (target === 'elementor') gates.push(...await verifyElementor(out, s));
      } catch (e) { gates = [...(gates || []), gate('run', false, String(e.message || e).split('\n').slice(0, 4).join(' '))]; }
      results.push({ target, ok: gates.every((g) => g.ok), gates });
    }
  } finally { if (!o.keep && !o.work) rmSync(work, { recursive: true, force: true }); }
  return { ok: results.every((r) => r.ok), slug, work: o.keep || o.work ? work : null, results };
}
