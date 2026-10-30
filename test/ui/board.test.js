// Board UI: dense grid, tag filter, drag-free ordering (buttons, position field, REST), bookmarklet window
// in local/insecure mode and in token mode (one same-site bounce, then login with next).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.KK_DATA_DIR = mkdtempSync(join(tmpdir(), 'kk-ui-'));
const S = await import('../../src/services.js');

const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
async function startServer(env) {
  const port = await freePort();
  const p = spawn(process.execPath, [join(REPO, 'src', 'server.js')], { env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), KK_SOURCES_SYNC: 'off', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/health')).ok) return { base, stop: () => p.kill(), log: () => log }; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  p.kill(); throw new Error('server did not start: ' + log);
}

let A, T, board, refs;
before(async () => {
  refs = [
    S.addRef({ url: 'https://one.example/', title: 'One', tags: ['serif', 'editorial'], capture: false }),
    S.addRef({ url: 'https://two.example/', title: 'Two', tags: ['grid'], judgment: 'love', capture: false }),
    S.addRef({ url: 'https://three.example/', title: 'Three', tags: ['serif'], capture: false }),
  ];
  board = S.createBoard({ name: 'Makler' });
  for (const r of refs) S.addToBoard(board.id, { ref_id: r.id });
  A = await startServer({ KK_INSECURE_LOCAL: '1', KK_PASSWORD: '', KK_TOKEN: '', KIEKKIST_GALLERY_URL: 'http://127.0.0.1:9' });
  T = await startServer({ KK_PASSWORD: 'correct-horse-battery', KK_TOKEN: 'x'.repeat(32) });
});
after(() => { A?.stop(); T?.stop(); });

const order = () => S.getBoard(board.id).refs.map((r) => r.title);
const post = (base, path, data, headers = {}) => fetch(base + path, { method: 'POST', redirect: 'manual', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(data) });

test('board page: dense grid, loved ref as a double tile, tag filter, bookmarklet, nothing from other hosts', async () => {
  const html = await (await fetch(`${A.base}/boards/${board.id}`)).text();
  assert.match(html, /<ol class="bgrid"/);
  assert.equal((html.match(/<li class="tile/g) || []).length, 3);
  assert.equal((html.match(/<li class="tile big"/g) || []).length, 1, 'love = double tile');
  assert.match(html, /href="\/boards\/[^"?]+\?tag=serif"/);
  const bm = html.match(/class="button bookmarklet" href="([^"]+)"/)[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  assert.ok(bm.startsWith('javascript:'));
  assert.ok(bm.includes(`${A.base}/ui/refs/new?board=${board.id}&url=`), bm);
  for (const [, u] of html.matchAll(/(?:src|href|action)="(https?:[^"]+)"/g)) assert.ok(u.startsWith(A.base), 'third-party reference: ' + u);
  const f = await (await fetch(`${A.base}/boards/${board.id}?tag=serif`)).text();
  assert.equal((f.match(/<li class="tile/g) || []).length, 2);
  assert.match(f, /aria-current="true">serif/);
  const m = await (await fetch(`${A.base}/boards/${board.id}?view=mobile`)).text();
  assert.match(m, /class="bgrid phones"/);
});

test('ordering without drag: move buttons (also inside a tag filter), position field, REST', async () => {
  assert.deepEqual(order(), ['One', 'Two', 'Three']);
  let r = await post(A.base, `/ui/boards/${board.id}/refs/${refs[0].id}/move`, { dir: 'down', position: '', view: 'desktop' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), new RegExp(`#mv-${refs[0].id}-down$`), 'focus returns to the button');
  assert.deepEqual(order(), ['Two', 'One', 'Three']);
  // filtered by "serif" the visible neighbours are One and Three: moving Three up passes One, not Two
  await post(A.base, `/ui/boards/${board.id}/refs/${refs[2].id}/move`, { dir: 'up', tag: 'serif', position: '' });
  assert.deepEqual(order(), ['Two', 'Three', 'One']);
  await post(A.base, `/ui/boards/${board.id}/refs/${refs[0].id}/move`, { dir: '', position: '1' });
  assert.deepEqual(order(), ['One', 'Two', 'Three']);
  const p = await fetch(`${A.base}/api/boards/${board.id}/refs/${refs[0].id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ position: 3, note: 'calm grid' }) });
  assert.equal(p.status, 200);
  const b = await p.json();
  assert.deepEqual(b.refs.map((x) => x.title), ['Two', 'Three', 'One']);
  assert.equal(b.refs[2].board_note, 'calm grid');
  assert.equal((await fetch(`${A.base}/api/boards/${board.id}/refs/rnope1234`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{"position":1}' })).status, 404);
  const html = await (await fetch(`${A.base}/boards/${board.id}`)).text();
  assert.match(html, new RegExp(`id="mv-${refs[1].id}-up" [^>]*disabled`), 'first tile cannot move up');
});

test('bookmarklet window (local mode): prefilled form, saves through the existing flow onto the board', async () => {
  const html = await (await fetch(`${A.base}/ui/refs/new?board=${board.id}&url=${encodeURIComponent('https://four.example/page?x=1')}&title=Four`)).text();
  assert.match(html, /value="https:\/\/four\.example\/page\?x=1"/);
  assert.match(html, new RegExp(`<option value="${board.id}" selected>`));
  assert.match(html, /name="popup" value="1"/);
  assert.ok(!/<nav>/.test(html), 'small window without the app navigation');
  const bad = await (await fetch(`${A.base}/ui/refs/new?url=javascript:alert(1)`)).text();
  assert.ok(!bad.includes('javascript:alert'), 'only http(s) URLs are prefilled');
  // existing URL: no capture needed, the ref goes onto the board
  const r = await post(A.base, '/ui/refs', { url: 'https://one.example/', board_id: board.id, popup: '1', mechanism: '' });
  assert.equal(r.status, 200);
  assert.match(await r.text(), /data-close/);
});

test('bookmarklet window (token mode): one same-site bounce, then login that returns to the form', async () => {
  const path = `/ui/refs/new?board=${board.id}&url=${encodeURIComponent('https://five.example/')}`;
  const first = await fetch(T.base + path, { redirect: 'manual', headers: { 'sec-fetch-site': 'cross-site' } });
  assert.equal(first.status, 200);
  const bounce = await first.text();
  assert.match(bounce, /http-equiv="refresh" content="0;url=\/ui\/refs\/new\?[^"]*b=1/);
  const second = await fetch(T.base + path + '&b=1', { redirect: 'manual' });
  assert.equal(second.status, 302);
  const loc = second.headers.get('location');
  assert.match(loc, /^\/login\?next=%2Fui%2Frefs%2Fnew/);
  const login = await (await fetch(T.base + loc)).text();
  const next = login.match(/name="next" value="([^"]+)"/)[1].replace(/&amp;/g, '&');
  assert.ok(next.startsWith('/ui/refs/new?'));
  const ok = await post(T.base, '/login', { password: 'correct-horse-battery', next });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), next);
  const cookie = ok.headers.get('set-cookie').split(';')[0];
  const form = await (await fetch(T.base + next, { headers: { cookie } })).text();
  assert.match(form, /value="https:\/\/five\.example\/"/);
  const evil = await post(T.base, '/login', { password: 'correct-horse-battery', next: '//evil.example/' });
  assert.equal(evil.headers.get('location'), '/', 'no open redirect');
  // API with the bearer token works as before
  assert.equal((await fetch(`${T.base}/api/boards/${board.id}`, { headers: { authorization: 'Bearer ' + 'x'.repeat(32) } })).status, 200);
});

test('sources page lists the Kiekkist Gallery; gallery search fails soft offline (REST and UI)', async () => {
  const html = await (await fetch(`${A.base}/sources`)).text();
  assert.match(html, /Kiekkist Gallery/);
  assert.match(html, /<form class="gform" method="get" action="\/sources">/);
  const proxy = await (await fetch(`${A.base}/api/gallery-proxy?q=bakery`)).json();
  assert.equal(proxy.ok, false);
  assert.match(proxy.error, /not reachable/);
  const res = await (await fetch(`${A.base}/sources?gq=bakery`)).text();
  assert.match(res, /class="flash">Kiekkist Gallery not reachable/);
});
