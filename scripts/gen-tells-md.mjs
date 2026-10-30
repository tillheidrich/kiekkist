#!/usr/bin/env node
// Renders the knowledge packs `tells` and `reflex-fonts` into everything derived from them:
//   skill/kiekkist-agency/references/tells.md       tables between <!-- tells:start --> and <!-- tells:end -->
//   skill/kiekkist-agency/references/typography.md  table between <!-- reflex:start --> and <!-- reflex:end -->
//   src/check/fallback.js                           built-in copy the checker uses when a pack is missing
// Prose outside the markers is kept. Usage: node scripts/gen-tells-md.mjs [--check]
// --check writes nothing and exits 1 when a derived file is out of date (used by the tests).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...p) => join(ROOT, ...p);
const tells = JSON.parse(readFileSync(P('knowledge', 'packs', 'tells.json'), 'utf8'));
const reflex = JSON.parse(readFileSync(P('knowledge', 'packs', 'reflex-fonts.json'), 'utf8'));
const check = process.argv.includes('--check');

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const de = (d) => { const [y, m, dd] = String(d).split('-'); return dd ? `${dd}.${m}.${y}` : d; };
const cls = (it) => `${it.evidence}${it.source?.length ? ' · ' + it.source.join(', ') : ''}`;
const chk = (it) => (it.checker === 'auto' ? '`' + it.id + '`' : 'manual');
const how = (it) => esc(it.detect) + (it.note ? '. *' + esc(it.note) + '*' : '');
const row = (cells) => '| ' + cells.join(' | ') + ' |';

export function renderTells(pack) {
  const L = [];
  const items = pack.items;
  const n = (f) => items.filter(f).length;
  L.push(`<!-- Generated from knowledge/packs/tells.json (version ${pack.version}) by scripts/gen-tells-md.mjs. Edit the pack, not this block. -->`);
  L.push('');
  L.push(`Pack \`tells\` ${pack.version}: ${n((i) => i.kind === 'hard')} hard failures, ${n((i) => i.kind === 'counted' || i.kind === 'info')} counted signals, ${n((i) => i.kind === 'process')} process rules; ${n((i) => i.checker === 'auto')} measured by \`kk_check\`, the rest are critique checklist items (column *Checker*: rule id or "manual"). Class column: evidence class · source ids (list at the end).`);
  L.push('');
  L.push('## Hard failures (fix, do not justify)');
  L.push('');
  L.push(row(['Failure', 'How to detect', 'Fails when', 'Severity', 'Class', 'Checker']));
  L.push(row(['---', '---', '---', '---', '---', '---']));
  for (const it of items.filter((i) => i.kind === 'hard' && i.group !== 'mobile')) L.push(row([esc(it.name), how(it), esc(it.flag), it.severity || 'error', cls(it), chk(it)]));
  const mob = items.filter((i) => i.group === 'mobile');
  if (mob.length) {
    L.push('');
    L.push('## Mobile evidence (report section `mobile`)');
    L.push('');
    L.push('Measured at 390x844 and 360x780 and in a throttled lab load with Lighthouse\'s Moto G Power profile (412x823, DPR 1.75, 562.5 ms latency, 188,743 B/s down, 86,400 B/s up, CPU 4x). Only class S items may be errors. Lab numbers are first-party only: the check blocks third-party hosts. Column *Evidence* names the items in `knowledge/packs/evidence.json`.');
    L.push('');
    L.push(row(['Check', 'How it is measured', 'Flags when', 'Severity', 'Class', 'Evidence', 'Checker']));
    L.push(row(['---', '---', '---', '---', '---', '---', '---']));
    for (const it of mob) L.push(row([esc(it.name), how(it), esc(it.flag), it.kind === 'info' ? 'info' : it.severity, cls(it), (it.evidence_items || []).map((e) => '`' + e + '`').join(', ') || '-', chk(it)]));
  }
  L.push('');
  L.push('## Counted signals');
  const GROUPS = [['typography', 'Typography and labels'], ['structure', 'Structure and components'], ['quality', 'General quality'], ['colour', 'Colour and surface'], ['motion', 'Motion'], ['copy', 'Copy'], ['imagery', 'Imagery'], ['memory', 'Memory']];
  for (const [g, title] of GROUPS) {
    const gi = items.filter((i) => i.group === g && i.kind !== 'hard' && i.kind !== 'process');
    if (!gi.length) continue;
    L.push('');
    L.push('### ' + title);
    L.push('');
    L.push(row(['Signal', 'How to count', 'Flag when', 'Class', 'Checker']));
    L.push(row(['---', '---', '---', '---', '---']));
    for (const it of gi) L.push(row([esc(it.name) + (it.kind === 'info' ? ' (info)' : ''), how(it), esc(it.flag), cls(it), chk(it)]));
  }
  const data = items.filter((i) => i.data);
  if (data.length) {
    L.push('');
    L.push('### Measured frequencies (class D)');
    L.push('');
    L.push('From the Taste study (248 gallery sites, 05.10.2026, scored by models, not by people). They show what is common on stronger or weaker gallery sites; they say nothing about effect on customers. Two of them point the other way, so those signals are counted only in their non-data or non-sequence use.');
    L.push('');
    L.push(row(['Signal', 'Finding']));
    L.push(row(['---', '---']));
    for (const it of data) L.push(row([esc(it.name), esc(it.data)]));
  }
  L.push('');
  L.push('## Process rules (not measured)');
  L.push('');
  L.push(row(['Rule', 'What to do', 'Missed when', 'Class']));
  L.push(row(['---', '---', '---', '---']));
  for (const it of items.filter((i) => i.kind === 'process')) L.push(row([esc(it.name), how(it), esc(it.flag), cls(it)]));
  L.push('');
  L.push('### Sources');
  L.push('');
  for (const s of pack.sources) L.push(`- \`${s.id}\`: ${s.title}${s.url ? ', ' + s.url : ''}${s.license ? ' (' + s.license + ')' : ''}`);
  return L.join('\n');
}

export function renderReflex(pack) {
  const L = [];
  L.push(`<!-- Generated from knowledge/packs/reflex-fonts.json (version ${pack.version}) by scripts/gen-tells-md.mjs. Edit the pack, not this block. -->`);
  L.push('');
  L.push(`Pack \`reflex-fonts\` ${pack.version}, reviewed ${de(pack.reviewed)}. Role "display" means the face counts only when it sets headings; "any" counts wherever it sets text. The check reports matches as info (\`reflex-font\`).`);
  L.push('');
  L.push(row(['Face', 'Role', 'Sector default in', 'Why it is on the list', 'Class · source', 'Added']));
  L.push(row(['---', '---', '---', '---', '---', '---']));
  for (const it of pack.items.filter((i) => !i.retired)) {
    L.push(row([esc(it.name) + (it.match === 'prefix' ? ' (all styles)' : ''), it.role, esc((it.sectors || []).join(', ')) || '', esc(it.reason) + (it.data ? '; ' + esc(it.data) : ''), `${it.evidence} · ${it.source.join(', ')}`, de(it.added)]));
  }
  if (pack.retired?.length) {
    L.push('');
    L.push('Retired: ' + pack.retired.map((r) => `${r.name} (${de(r.retired)}: ${r.reason})`).join('; '));
  }
  return L.join('\n');
}

export function renderFallback(t, r) {
  const keep = (it) => {
    const o = { id: it.id, kind: it.kind, checker: it.checker, name: it.name, name_de: it.name_de };
    if (it.severity) o.severity = it.severity;
    if (it.threshold) o.threshold = it.threshold;
    if (it.cost) o.cost = it.cost;
    if (it.patterns) o.patterns = it.patterns;
    return o;
  };
  const tells = { id: t.id, version: t.version, items: t.items.filter((i) => i.checker === 'auto').map(keep) };
  const rf = { id: r.id, version: r.version, items: r.items.filter((i) => !i.retired).map((i) => ({ name: i.name, match: i.match, role: i.role })) };
  return '// Generated by scripts/gen-tells-md.mjs from knowledge/packs/tells.json and reflex-fonts.json. Do not edit.\n' +
    '// The checker uses this copy only when the packs cannot be loaded.\n' +
    'export const FALLBACK = ' + JSON.stringify({ tells, reflexFonts: rf }, null, 1) + ';\n';
}

function splice(file, start, end, body) {
  const src = readFileSync(file, 'utf8');
  const a = src.indexOf(start), b = src.indexOf(end);
  if (a < 0 || b < a) throw new Error(`markers ${start} / ${end} missing in ${file}`);
  return src.slice(0, a + start.length) + '\n' + body + '\n' + src.slice(b);
}

const jobs = [
  [P('skill', 'kiekkist-agency', 'references', 'tells.md'), (f) => splice(f, '<!-- tells:start -->', '<!-- tells:end -->', renderTells(tells))],
  [P('skill', 'kiekkist-agency', 'references', 'typography.md'), (f) => splice(f, '<!-- reflex:start -->', '<!-- reflex:end -->', renderReflex(reflex))],
  [P('src', 'check', 'fallback.js'), () => renderFallback(tells, reflex)],
];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let stale = 0;
  for (const [file, make] of jobs) {
    const next = make(file);
    let cur = null; try { cur = readFileSync(file, 'utf8'); } catch { /* new */ }
    if (cur === next) continue;
    if (check) { console.error('out of date: ' + file.slice(ROOT.length + 1)); stale++; } else { writeFileSync(file, next); console.log('wrote ' + file.slice(ROOT.length + 1)); }
  }
  if (check) { if (stale) { console.error('run: node scripts/gen-tells-md.mjs'); process.exit(1); } console.log('derived files are up to date'); }
}
