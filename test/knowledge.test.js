import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, manifest, getPack, EVIDENCE_CLASSES } from '../src/knowledge.js';
import { MEASURED_RULES, configFrom, loadConfig, reflexMatch } from '../src/check/rules.js';
import { FALLBACK } from '../src/check/fallback.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('lists shipped packs', () => {
  const m = manifest();
  assert.ok(m.find((p) => p.id === 'topologies' && p.items >= 20));
  assert.ok(m.find((p) => p.id === 'tells' && p.items >= 100));
  assert.ok(m.find((p) => p.id === 'reflex-fonts' && p.items >= 25));
  assert.ok(query({}).evidence_classes.S);
});
test('searches and fetches items', () => {
  const r = query({ pack: 'topologies', q: 'timetable' });
  assert.equal(r.items[0].id, 'T05');
  assert.equal(query({ pack: 'topologies', id: 'T01' }).item.name, 'split-hero');
  assert.throws(() => query({ pack: 'nope' }), /unknown pack/);
  assert.equal(query({ pack: 'tells', id: 'font-cdn' }).item.kind, 'hard');
});

test('tells pack: every item is complete and consistent', () => {
  const p = getPack('tells');
  assert.ok(p.version && p.license && p.sources.length);
  const src = new Set(p.sources.map((s) => s.id));
  const ids = new Set();
  for (const it of p.items) {
    const at = 'item ' + it.id;
    assert.match(it.id, /^[a-z0-9-]+$/, at);
    assert.ok(!ids.has(it.id), 'duplicate ' + it.id); ids.add(it.id);
    for (const k of ['name', 'name_de', 'kind', 'group', 'detect', 'flag', 'evidence', 'source', 'applies_to', 'checker']) assert.ok(it[k] !== undefined && it[k] !== '', at + ' lacks ' + k);
    assert.ok(['hard', 'counted', 'info', 'process'].includes(it.kind), at);
    assert.ok(['auto', 'manual'].includes(it.checker), at);
    assert.ok(it.evidence in EVIDENCE_CLASSES, at + ' evidence ' + it.evidence);
    for (const s of it.source) assert.ok(src.has(s), at + ' unknown source ' + s);
    for (const a of it.applies_to) assert.ok(['web', 'slides', 'social', 'app'].includes(a), at);
    if (it.kind === 'hard') assert.ok(['error', 'warn'].includes(it.severity), at + ' severity');
    if (it.checker === 'auto' && (it.kind === 'counted' || it.kind === 'info')) assert.ok(it.threshold && (typeof it.threshold.max === 'number' || typeof it.threshold.max_share === 'number'), at + ' needs a numeric threshold');
    if (it.kind === 'hard' && it.severity === 'error' && it.checker === 'auto' && !['load-failed', 'contrast-gradient'].includes(it.id)) assert.ok(it.cost, at + ' needs a cost');
    if (it.kind === 'process') assert.equal(it.checker, 'manual', at);
  }
  // the em-dash rule must not count the German spaced en dash
  assert.match(p.items.find((i) => i.id === 'dashes').detect, /not counted/);
});

test('checker and pack agree on which rules are measured', () => {
  const auto = getPack('tells').items.filter((i) => i.checker === 'auto').map((i) => i.id).sort();
  assert.deepEqual([...MEASURED_RULES].sort(), auto);
});

test('derived files (tells.md, typography.md, fallback.js) are generated from the current packs', () => {
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'gen-tells-md.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /up to date/);
});

test('fallback equals the shipped packs and is used when a pack is missing', () => {
  const p = getPack('tells');
  for (const it of FALLBACK.tells.items) {
    const src = p.items.find((i) => i.id === it.id);
    assert.deepEqual(it.threshold ?? null, src.threshold ?? null, it.id);
    assert.deepEqual(it.cost ?? null, src.cost ?? null, it.id);
    assert.deepEqual(it.patterns ?? null, src.patterns ?? null, it.id);
  }
  const cfg = configFrom(null, null);
  assert.match(cfg.versions.tells, /^builtin /);
  assert.match(cfg.versions['reflex-fonts'], /^builtin /);
  assert.equal(cfg.rules['font-families'].threshold.max, 3);
  assert.ok(cfg.reflex.some((e) => e.name === 'inter'));
  assert.equal(loadConfig().versions.tells, p.version);
});

test('a local pack in DATA_DIR overrides a shipped threshold', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kk-'));
  const prev = process.env.KK_DATA_DIR;
  try {
    mkdirSync(join(dir, 'knowledge'));
    const p = structuredClone(getPack('tells'));
    p.version = '9999-01-01.1';
    p.items.find((i) => i.id === 'font-families').threshold = { max: 9 };
    writeFileSync(join(dir, 'knowledge', 'tells.json'), JSON.stringify(p));
    process.env.KK_DATA_DIR = dir;
    const cfg = loadConfig();
    assert.equal(cfg.versions.tells, '9999-01-01.1');
    assert.equal(cfg.rules['font-families'].threshold.max, 9);
  } finally {
    if (prev === undefined) delete process.env.KK_DATA_DIR; else process.env.KK_DATA_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(loadConfig().rules['font-families'].threshold.max, 3);
});

test('reflex-fonts pack: complete, dated, and matched by the checker', () => {
  const p = getPack('reflex-fonts');
  const names = new Set();
  for (const it of p.items) {
    assert.ok(!names.has(it.name.toLowerCase()), 'duplicate ' + it.name); names.add(it.name.toLowerCase());
    assert.ok(['any', 'display'].includes(it.role), it.name);
    assert.ok(['exact', 'prefix'].includes(it.match), it.name);
    assert.match(it.added, /^\d{4}-\d{2}-\d{2}$/, it.name);
    assert.ok(it.reason && it.source.length && it.evidence in EVIDENCE_CLASSES, it.name);
  }
  // both former lists are in (typography.md and the old rules.js constants)
  for (const n of ['inter', 'fraunces', 'cormorant', 'canela', 'barlow condensed', 'space grotesk', 'sora', 'poppins', 'playfair display', 'lora', 'crimson', 'newsreader', 'syne', 'space mono', 'ibm plex', 'dm sans', 'dm serif', 'outfit', 'plus jakarta sans', 'instrument sans', 'instrument serif', 'manrope', 'geist', 'satoshi']) assert.ok(names.has(n), 'missing ' + n);
  const e = loadConfig().reflex.find((x) => x.name === 'ibm plex');
  assert.ok(reflexMatch('ibm plex sans', e) && !reflexMatch('ibm plexiglas', e));
});
