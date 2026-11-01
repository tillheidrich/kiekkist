#!/usr/bin/env node
// Draws an axis assignment for three (or four) directions so they differ on enough axes, avoiding
// structures spent in the last builds. The draw is a starting constraint for the builders, not taste:
// a builder may swap a value for a better one on the same axis if it keeps the distance rule.
//
//   node scripts/axes.mjs [--seed round-3] [--locked type,colour] [--n 3] [--log .kiekkist/log.json] [--json]
//
// --locked  axes fixed by the brand (e.g. type,colour); they are not drawn and the distance rule
//           then requires >= 3 differing axes among the remaining ones.
import { readFileSync, existsSync } from 'node:fs';

const AXES = {
  topology: ['T02 full-bleed statement', 'T03 broadsheet', 'T04 index', 'T05 timetable', 'T06 annotated document', 'T07 single column essay',
    'T08 ledger', 'T09 catalogue + specimen', 'T10 asymmetric poster', 'T11 question-led', 'T12 map / place', 'T13 pegboard',
    'T14 transcript', 'T15 two worlds', 'T16 dossier sheets', 'T18 exhibition wall', 'T19 letter', 'T20 programme'],
  type: ['grotesk + text serif', 'one serif family only', 'mono-led with sans', 'condensed display + neutral text', 'humanist sans only', 'slab or typewriter accent', 'handwriting accent on neutral'],
  density: ['airy (few words per screen)', 'balanced', 'dense (reference work, many entry points)'],
  imagery: ['documentary photo of real people/places', 'type only', 'diagrams / drawn schematics', 'scanned artefacts (paper, objects)', 'product or detail close-ups', 'one recurring photo motif'],
  colour: ['paper + ink + one accent', 'monochrome tint', 'saturated colour field', 'dark ground', 'duotone', 'brand colours in a new ratio'],
  rhythm: ['symmetric 12-col', 'asymmetric 7/5 with wide margin', 'single measure column', 'modular baseline grid with rules', 'full-bleed bands alternating', 'free poster composition'],
};

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const n = Math.min(4, Math.max(2, Number(flag('n', 3))));
const locked = new Set((flag('locked', '') || '').split(',').map((s) => s.trim()).filter(Boolean));
for (const l of locked) if (!AXES[l]) { console.error('unknown axis: ' + l); process.exit(2); }
const free = Object.keys(AXES).filter((a) => !locked.has(a));
const needDiff = locked.size ? Math.min(3, free.length) : 3;

// seeded PRNG (mulberry32) so a round can be reproduced
let h = 1779033703; for (const ch of String(flag('seed', Date.now()))) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), h = (h << 13) | (h >>> 19);
let s = h >>> 0; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

// spent structures from the log (last 3 builds)
const logPath = flag('log', '.kiekkist/log.json');
let spent = { topology: new Set(), type: new Set(), colour: new Set() };
if (existsSync(logPath)) {
  try {
    const log = JSON.parse(readFileSync(logPath, 'utf8'));
    for (const e of (Array.isArray(log) ? log : log.builds || []).slice(-3)) {
      if (e.topology) spent.topology.add(String(e.topology).slice(0, 3));
      if (e.type_pair) spent.type.add(e.type_pair);
      if (e.colour_strategy) spent.colour.add(e.colour_strategy);
    }
  } catch { /* unreadable log: draw without rotation */ }
}

const diffCount = (a, b) => free.filter((ax) => a[ax] !== b[ax]).length;
let best = null;
for (let attempt = 0; attempt < 4000; attempt++) {
  const set = [];
  for (let i = 0; i < n; i++) {
    const d = {};
    for (const ax of free) {
      let opts = AXES[ax];
      if (ax === 'topology') opts = opts.filter((t) => !spent.topology.has(t.slice(0, 3)));
      d[ax] = pick(opts);
    }
    set.push(d);
  }
  // all topologies distinct; every pair differs on needDiff axes
  const topoOk = !free.includes('topology') || new Set(set.map((d) => d.topology)).size === n;
  let minDiff = Infinity;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) minDiff = Math.min(minDiff, diffCount(set[a], set[b]));
  if (topoOk && minDiff >= needDiff) {
    const score = minDiff + rnd() * 0.5;
    if (!best || score > best.score) best = { set, minDiff, score };
    if (minDiff >= Math.min(free.length, needDiff + 2)) break;
  }
}
if (!best) { console.error('no assignment found; loosen --locked'); process.exit(1); }
const labels = n === 4 ? ['safe', 'middle', 'bold', 'wildcard'] : n === 3 ? ['safe', 'middle', 'bold'] : ['a', 'b'];
const out = {
  seed: flag('seed', null), locked: [...locked], min_axes_different: best.minDiff, rule: `every pair differs on >= ${needDiff} of: ${free.join(', ')}`,
  directions: best.set.map((d, i) => ({ label: labels[i], ...d })),
  note: 'Labels are provisional: after the concept cards are matched to these rows, the row closest to the category convention becomes safe.',
};
if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
else {
  console.log(`${out.rule}  (min ${out.min_axes_different})${locked.size ? '  locked: ' + out.locked.join(', ') : ''}`);
  for (const d of out.directions) { console.log(`\n${d.label}`); for (const ax of free) console.log(`  ${ax.padEnd(9)} ${d[ax]}`); }
}
