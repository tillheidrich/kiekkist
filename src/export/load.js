// Load a theme folder (docs/CONTRACT.md, "Theme format") into memory. Read-only.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname, basename, resolve } from 'node:path';
import { parse } from './html.js';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

export function listFiles(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir).sort()) {
    if (n.startsWith('.') || n === 'node_modules' || n === 'shots' || n === 'check.json') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base)); else out.push(relative(base, p).split('\\').join('/'));
  }
  return out;
}

/** Minimal YAML front matter reader: top-level scalars and one level of nested maps. Enough for name/description/colors/content model. */
export function frontMatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md || '');
  if (!m) return { data: {}, body: md || '' };
  const data = {}; let cur = null, curKey = null, sub = null, subKey = null;
  const scalar = (v) => { v = v.replace(/\s+#.*$/, '').trim(); if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1); if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v); if (v === 'true' || v === 'false') return v === 'true'; return v; };
  for (const line of m[1].split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const ind = line.match(/^ */)[0].length;
    const kv = /^\s*([^:]+?):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, k, v] = kv;
    if (ind === 0) { curKey = k; if (v.trim() === '') { cur = data[k] = {}; } else { data[k] = scalar(v); cur = null; } sub = null; }
    else if (ind <= 2 && cur) { if (v.trim() === '') { sub = cur[k] = {}; subKey = k; } else { cur[k] = scalar(v); sub = null; } }
    else if (sub) sub[k] = scalar(v);
  }
  return { data, body: md.slice(m[0].length) };
}

export function loadTheme(dir) {
  dir = resolve(dir);
  if (!existsSync(join(dir, 'pages', 'index.html'))) throw Object.assign(new Error(`not a theme folder (pages/index.html missing): ${dir}`), { code: 'BAD_INPUT' });
  const files = listFiles(dir);
  const meta = JSON.parse(read(join(dir, 'theme.json')) || '{}');
  const designMd = read(join(dir, 'DESIGN.md')) || '';
  const design = frontMatter(designMd);
  const tokensText = read(join(dir, 'tokens.json'));
  let tokens = null;
  if (tokensText) { try { tokens = JSON.parse(tokensText); } catch (e) { throw Object.assign(new Error('tokens.json is not valid JSON: ' + e.message), { code: 'BAD_INPUT' }); } }
  const pageFiles = files.filter((f) => /^pages\/[^/]+\.html$/.test(f));
  pageFiles.sort((a, b) => (a === 'pages/index.html' ? -1 : b === 'pages/index.html' ? 1 : a.localeCompare(b)));
  const pages = pageFiles.map((f) => {
    const source = readFileSync(join(dir, f), 'utf8');
    return { file: f, slug: basename(f, '.html'), source, tree: parse(source) };
  });
  let images = {};
  const man = read(join(dir, 'assets', 'img', 'manifest.json'));
  if (man) { try { images = JSON.parse(man); } catch { images = {}; } }
  if (meta.images && typeof meta.images === 'object') images = { ...images, ...meta.images };
  return {
    dir, files, meta, design, designMd,
    tokens, tokensText,
    tokensCss: read(join(dir, 'tokens.css')),
    siteCss: read(join(dir, 'assets', 'site.css')),
    fontsCss: read(join(dir, 'assets', 'fonts', 'fonts.css')),
    pages,
    assets: files.filter((f) => f.startsWith('assets/')),
    images,
    ext: (f) => extname(f).toLowerCase(),
  };
}
