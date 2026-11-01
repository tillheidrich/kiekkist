// Builds dist/web-design-studio-skill.zip for upload on claude.ai (Settings, Capabilities, Skills).
// The ZIP holds one folder, web-design-studio/, with SKILL.md at its top. Checks the SKILL.md front matter first.
// Usage: node scripts/skill-zip.mjs [--out dist/web-design-studio-skill.zip]
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = join(ROOT, 'skill', 'web-design-studio');
const i = process.argv.indexOf('--out');
const OUT = i > 0 ? process.argv[i + 1] : join(ROOT, 'dist', 'web-design-studio-skill.zip');

export function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) throw new Error('SKILL.md has no YAML front matter');
  const fm = {};
  for (const line of m[1].split('\n')) { const k = /^([a-z_-]+):\s*(.*)$/.exec(line); if (k) fm[k[1]] = k[2].trim(); }
  if (!/^[a-z0-9-]{1,64}$/.test(fm.name || '')) throw new Error('front matter: name must be lower-case letters, digits and hyphens, at most 64 characters');
  if (!fm.description || fm.description.length > 1024) throw new Error('front matter: description is required, at most 1024 characters');
  if (/[<>]/.test(fm.description)) throw new Error('front matter: description must not contain angle brackets');
  return fm;
}

const fm = frontMatter(readFileSync(join(SKILL, 'SKILL.md'), 'utf8'));
const zip = new JSZip();
const walk = (d) => {
  for (const n of readdirSync(d).sort()) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else zip.file(['web-design-studio', ...relative(SKILL, p).split(sep)].join('/'), readFileSync(p), { date: new Date('2026-10-30T00:00:00Z') });
  }
};
walk(SKILL);
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, buf);
console.log(`${relative(process.cwd(), OUT)}: ${Object.keys(zip.files).filter((f) => !zip.files[f].dir).length} files, ${(buf.length / 1024).toFixed(0)} KB; name=${fm.name}, description ${fm.description.length} chars, license=${fm.license || '-'}`);
