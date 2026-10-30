// Checker options through services (REST /api/check, MCP kk_check, CLI kk check share runCheck):
// profile, site mode over a theme's pages, perf/mobile, brand fonts and house-rule bans.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

process.env.KK_DATA_DIR = mkdtempSync(join(tmpdir(), 'kk-checkopt-'));
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const S = await import('../../src/services.js');
const { checkTarget, bannedSignals } = await import('../../src/check/index.js');
const { closeBrowser } = await import('../../src/browser.js').catch(() => ({}));
after(async () => { if (closeBrowser) await closeBrowser().catch(() => {}); });

const FIX = join(REPO, 'test', 'fixtures');
S.saveThemeInternal({ name: 'Nordlicht', slug: 'nordlicht', fromDir: join(REPO, 'examples', 'themes', 'nordlicht-immobilien'), process: false, origin: 'example' });

const rejects = async (p, status, re) => { await assert.rejects(p, (e) => { assert.equal(e.status, status, e.message); if (re) assert.match(e.message, re); return true; }); };

test('runCheck: bad options are refused before a browser starts', async () => {
  await rejects(S.runCheck({ html: '<p>x</p>', profile: 'strict' }), 400, /profile must be one of none, bfsg, public/);
  await rejects(S.runCheck({ html: '<p>x</p>', pages: ['a.html'] }), 400, /pages needs theme or url/);
  await rejects(S.runCheck({ html: '<p>x</p>', banned: ['no-such-signal'] }), 400, /unknown signal id/);
  await rejects(S.runCheck({ theme: 'nordlicht', pages: ['../../etc/passwd'] }), 400, /bad path/);
  await rejects(S.runCheck({ theme: 'nordlicht', pages: ['missing.html'] }), 404, /page not found/);
  await rejects(S.runCheck({ theme: 'nordlicht', pages: Array.from({ length: 9 }, (_, i) => `p${i}.html`) }), 400, /at most 8/);
  await rejects(S.runCheck({ url: 'https://example.com/', pages: ['https://other.example/'] }), 400, /share the origin/);
  await rejects(S.runCheck({ url: 'https://example.com/', pages: true }), 400, /list of same-origin URLs/);
  assert.equal(S.checkDeadline({}), 90_000);
  assert.equal(S.checkDeadline({ perf: true }), 180_000, 'perf raises the deadline, never above 180 s');
  assert.throws(() => bannedSignals(['eyebrow', 'nope']), /nope/);
  assert.deepEqual([...bannedSignals(['eyebrow', ' eyebrow '])], ['eyebrow']);
});

test('checker: a banned signal is a hard error at its first occurrence; brand fonts are exempt', async () => {
  const plain = await checkTarget({ file: join(FIX, 'slop.html'), viewports: [1440], axe: false, a11y: false, mobile: false, noJs: false, interaction: false });
  const present = plain.counts.find((c) => c.count > 0 && !c.info);
  assert.ok(present, 'slop fixture counts at least one signal');
  const r = await checkTarget({ file: join(FIX, 'slop.html'), viewports: [1440], axe: false, a11y: false, mobile: false, noJs: false, interaction: false, banned: [present.rule] });
  const hb = r.hard.filter((f) => f.rule === 'house-banned');
  assert.equal(hb.length, 1);
  assert.equal(hb[0].severity, 'error');
  assert.equal(hb[0].value, present.rule);
  assert.ok(r.counts.find((c) => c.rule === present.rule).banned);
  assert.ok(r.deductions.some((d) => d.kind === 'hard' && d.rule === 'house-banned' && d.cost > 0), 'the ban costs points');
  const reflex = plain.counts.find((c) => c.rule === 'reflex-font');
  if (reflex && reflex.count) {
    const b = await checkTarget({ file: join(FIX, 'slop.html'), viewports: [1440], axe: false, a11y: false, mobile: false, noJs: false, interaction: false, brandFonts: reflex.examples });
    assert.equal(b.counts.find((c) => c.rule === 'reflex-font').count, 0);
  }
});

test('runCheck: theme site mode over every pages/*.html with profile and without mobile; options keep the stored report', async () => {
  const r = await S.runCheck({ theme: 'nordlicht', pages: true, profile: 'bfsg', mobile: false });
  assert.equal(r.mode, 'site');
  assert.equal(r.pages.length, 5, 'index, verkaufen and the three legal pages');
  assert.match(r.pages[0].target, /pages[\\/]index\.html$/);
  assert.equal(r.a11y.profile, 'bfsg');
  assert.ok(r.pages.every((p) => !p.mobile), 'mobile=false skips the mobile section');
  assert.equal(S.getTheme('nordlicht').check_json, undefined, 'a check with options does not replace check.json');
  const one = await S.runCheck({ theme: 'nordlicht', pages: ['verkaufen'], mobile: false });
  assert.equal(one.pages.length, 1);
});
