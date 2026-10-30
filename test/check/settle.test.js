import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright';
import { checkTarget } from '../../src/check/index.js';

// Regression: contrast and axe ran mid-animation (gallery specimen: 7 false contrast errors at effective opacity 0.46
// in about one of four runs). The checker now waits for finite animations and a quiet DOM, cancels infinite ones for
// the measurement and restarts them for the motion checks.
const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const FADE = join(FIX, 'fade-hero.html');

let browser;
const runs = [];
before(async () => {
  browser = await chromium.launch();
  for (let i = 0; i < 3; i++) runs.push(await checkTarget({ file: FADE, browser, mobile: false }));
});
after(async () => { await browser.close(); });

test('fade-in hero, timer typing and reveal: no contrast finding in any run', () => {
  for (const r of runs) {
    const c = r.hard.filter((f) => /^contrast/.test(f.rule));
    assert.deepEqual(c.map((f) => f.detail), [], 'contrast measured mid-animation');
  }
});

test('fade-in hero: the result is the same in every run', () => {
  const sig = (r) => r.hard.filter((f) => f.severity === 'error').map((f) => f.rule + '|' + f.viewport + '|' + (f.selector || '')).sort().join('\n');
  assert.equal(sig(runs[1]), sig(runs[0]));
  assert.equal(sig(runs[2]), sig(runs[0]));
});

test('settle: waits, freezes the infinite pulse for measuring and restarts it for the motion check', () => {
  const r = runs[0];
  for (const vw of [390, 768, 1440]) {
    const s = r.stats.settle[vw];
    assert.ok(s && s.ms >= 0 && s.frozen >= 1, 'settle stats at ' + vw);
    assert.ok(s.ms <= 3500, 'settle stays under its cap at ' + vw);
  }
  assert.ok(r.hard.some((f) => f.rule === 'pause-control-missing' && /pulse/.test(f.detail)), 'infinite animation still found by WCAG 2.2.2 check');
});
