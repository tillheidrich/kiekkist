import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright';
import { checkTarget } from '../../src/check/index.js';
import { clsOf, tbtOf, mobileSection, mobileFindings, PROFILE } from '../../src/check/mobile.js';
import { loadConfig } from '../../src/check/rules.js';
import { getPack } from '../../src/knowledge.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIX = join(ROOT, 'test', 'fixtures');

let browser, bad, good;
before(async () => {
  browser = await chromium.launch();
  // fixtures load images and fonts from examples/, so the file root is the repository
  bad = await checkTarget({ file: join(FIX, 'mobile-bad.html'), fileRoot: ROOT, browser, perfRuns: 1, fontSwap: true });
  good = await checkTarget({ file: join(FIX, 'mobile-clean.html'), fileRoot: ROOT, browser });
});
after(async () => { await browser.close(); });

const has = (r, rule, sev, vp) => r.hard.some((f) => f.rule === rule && (!sev || f.severity === sev) && (!vp || f.viewport === vp));

test('bad mobile page: every mobile check fires with its severity', () => {
  for (const rule of ['lab-lcp', 'lcp-image-lazy', 'overflow-360', 'hover-only']) assert.ok(has(bad, rule, 'error'), 'expected error ' + rule);
  for (const rule of ['transfer-total', 'transfer-critical', 'font-files', 'font-format', 'lcp-image-priority', 'lcp-image-bytes', 'img-oversized',
    'font-swap-shift', 'hscroll-container', 'sticky-share', 'cta-first-screen', 'h1-first-screen', 'body-size-mobile', 'line-length-mobile', 'vh-hero',
    'phone-not-tappable', 'input-type']) assert.ok(has(bad, rule, 'warn'), 'expected warning ' + rule);
  assert.ok(has(bad, 'cta-first-screen', 'warn', 360) && has(bad, 'h1-first-screen', 'warn', 360), 'first screen checked at 360x780 too');
  assert.ok(!has(bad, 'page-overflow', null, 390), 'overflow only below 390');
  assert.ok(bad.hard.find((f) => f.rule === 'hscroll-container' && /keyboard/.test(f.detail) && /prices/.test(f.detail)));
  assert.ok(bad.hard.find((f) => f.rule === 'font-format' && /font-display/.test(f.detail) && /Text/.test(f.detail)));
  assert.ok(bad.hard.find((f) => f.rule === 'img-oversized' && /1200x1601 shown at 120x160/.test(f.detail)));
  assert.equal(bad.mobile.lab.lcp_element.kind, 'img');
});

test('clean mobile pages: no mobile error or warning', () => {
  for (const r of [good]) {
    const f = r.mobile.findings.filter((x) => x.severity !== 'info');
    assert.deepEqual(f.map((x) => x.rule + ': ' + x.detail), []);
    assert.ok(r.mobile.lab.lcp_ms < 2500, 'lab LCP ' + r.mobile.lab.lcp_ms);
    assert.equal(r.mobile.lab.lcp_element.kind, 'img');
    assert.ok(r.mobile.transfer.total_kb > 100 && r.mobile.transfer.by_type_kb.img > 100, 'image bytes counted through the loopback server');
    assert.equal(r.score, 100);
  }
  assert.equal(good.stats.mobile.scan.hscroll.containers, 1, 'side scroller with peek and tabindex passes');
  assert.equal(good.stats.mobile.scan.hoverOnly.hits, 0, 'hover with a :focus-within twin passes');
});

test('report section mobile: summary line, profile, classes, blocked hosts', () => {
  const m = bad.mobile;
  assert.match(m.summary, /^Handy-Nachweis: LCP \d+,\d s, CLS \d,\d\d, TBT \d+ ms, Transfer \d+ KB, Profil Moto G Power, gedrosselt/);
  assert.match(bad.summary_de, /Handy-Nachweis: LCP/);
  assert.match(bad.summary, /Mobile evidence: LCP/);
  assert.match(m.profile, /412x823 @1\.75x.*562\.5 ms latency.*CPU 4x/);
  assert.match(m.note, /first-party only/);
  assert.equal(m.lab.runs.length, 1);
  assert.equal(typeof m.fonts.swap_shift, 'number');
  for (const f of m.findings) assert.ok(['S', 'M', 'D', 'P', 'H'].includes(f.class), f.rule + ' class ' + f.class);
  assert.ok(m.findings.some((f) => f.rule === 'focus-obscured' && f.reused), 'reuses the a11y focus check instead of duplicating it');
  assert.ok(m.findings.some((f) => f.rule === 'input-font-size' && f.reused));
  assert.deepEqual(m.blocked_hosts, []);
});

test('severity policy: only class S items in group mobile may be errors', () => {
  const items = getPack('tells').items.filter((i) => i.group === 'mobile');
  assert.ok(items.length >= 25);
  for (const it of items) {
    if (it.severity === 'error') assert.equal(it.evidence, 'S', it.id + ' is an error but class ' + it.evidence);
    assert.ok(Array.isArray(it.evidence_items), it.id + ' lacks evidence_items');
  }
  const ev = new Set(getPack('evidence').items.map((i) => i.id));
  for (const it of items) for (const e of it.evidence_items) assert.ok(ev.has(e), it.id + ': unknown evidence item ' + e);
  for (const f of bad.hard.filter((x) => x.severity === 'error')) {
    const it = items.find((i) => i.id === f.rule);
    if (it) assert.equal(it.evidence, 'S', f.rule);
  }
});

test('third-party hosts are blocked in the lab run and listed', async () => {
  const html = '<!doctype html><html lang="de"><head><title>t</title><link rel="stylesheet" href="https://cdn.example.com/x.css"></head><body><main><h1>Fliesen Meyer</h1><p>Bäder und Küchen in Tostedt. <a href="tel:+49418100000">04181 00000</a></p></main></body></html>';
  const r = await checkTarget({ html, viewports: [390], browser, axe: false, a11y: false, noJs: false });
  assert.ok(r.mobile.blocked_hosts.includes('cdn.example.com'));
  assert.match(r.mobile.summary, /1 Drittanbieter-Host\(s\) blockiert: cdn\.example\.com/);
  assert.match(r.mobile.summary_en, /measured without 1 blocked third-party host/);
});

test('LCP background image is reported as not discoverable', async () => {
  const r = await checkTarget({ file: join(FIX, 'mobile-bg.html'), fileRoot: ROOT, viewports: [390], browser, axe: false, a11y: false, noJs: false });
  assert.equal(r.mobile.lab.lcp_element.kind, 'background');
  assert.ok(has(r, 'lcp-image-discoverable', 'warn'), JSON.stringify(r.mobile.lab.lcp_element));
});

test('no mobile pass without a phone viewport; --perf style runs take the median', async () => {
  const html = '<!doctype html><html lang="de"><head><title>t</title></head><body><main><h1>Test</h1><p>Text.</p></main></body></html>';
  const r = await checkTarget({ html, viewports: [1280], browser, axe: false, a11y: false, noJs: false });
  assert.equal(r.mobile, undefined);
  const p = await checkTarget({ html, viewports: [390], browser, axe: false, a11y: false, noJs: false, perfRuns: 3 });
  assert.equal(p.mobile.lab.runs.length, 3);
  assert.equal(p.mobile.mode, 'perf');
  assert.match(p.mobile.summary, /Median aus 3 Läufen/);
});

test('mobile pass stays within the time budget (no --perf)', async () => {
  const CLEAN = join(FIX, 'clean.html');
  await checkTarget({ file: CLEAN, browser, mobile: false });
  let t = Date.now();
  await checkTarget({ file: CLEAN, browser, mobile: false });
  const off = Date.now() - t;
  t = Date.now();
  const on = await checkTarget({ file: CLEAN, browser });
  const ms = Date.now() - t;
  console.log(`clean without mobile ${off} ms, with ${ms} ms (+${ms - off} ms, lab run ${on.stats.mobile.perfMs} ms)`);
  assert.ok(ms - off < 4500, 'extra time ' + (ms - off) + ' ms');
});

test('lab maths: CLS session windows, TBT after FCP, findings from plain data', () => {
  assert.equal(clsOf([{ t: 0, v: 0.05 }, { t: 500, v: 0.05 }, { t: 3000, v: 0.02 }]), 0.1);
  assert.equal(+clsOf([{ t: 0, v: 0.05 }, { t: 1200, v: 0.04 }]).toFixed(2), 0.05, 'gap of 1 s starts a new window');
  assert.equal(tbtOf([{ t: 100, d: 120 }, { t: 900, d: 40 }, { t: 1000, d: 250 }], 500), 200);
  assert.equal(tbtOf([{ t: 100, d: 500 }], 400), 150, 'only the part after FCP counts');
  const cfg = loadConfig();
  const perf = { runs: [{}], lcp: 4500, cls: 0.12, tbt: 700, transfer: { total: 3e6, by: { html: 2e4, css: 1e4, js: 4e5, font: 0, img: 0, media: 0, other: 0 }, critical: 3e4 }, fonts: { files: 0, bytes: 0, nonWoff2: [], noDisplay: [] }, lcpEl: null };
  const f = mobileFindings({ perf, cfg });
  const sev = Object.fromEntries(f.map((x) => [x.rule, x.severity]));
  assert.deepEqual(sev, { 'lab-lcp': 'error', 'lab-cls': 'warn', 'lab-tbt': 'error', 'transfer-total': 'warn', 'transfer-js': 'warn' });
  const s = mobileSection({ hard: f, perf: { ...perf, fcp: 1000, errors: [] }, blocked: ['fonts.googleapis.com', 'file:'], cfg });
  assert.match(s.summary, /LCP 4,5 s, CLS 0,12, TBT 700 ms, Transfer 3000 KB/);
  assert.deepEqual(s.blocked_hosts, ['fonts.googleapis.com']);
  assert.equal(PROFILE.download, 188743);
  assert.equal(PROFILE.upload, 86400);
  assert.equal(PROFILE.latency, 562.5);
});
