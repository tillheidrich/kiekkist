// Kiekkist Gallery as a source: search through a stub of GET /api/gallery, 10-minute cache, fail soft when
// offline, built-in entry in the sources, MCP tool kk_gallery_search.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

process.env.KK_DATA_DIR = mkdtempSync(join(tmpdir(), 'kk-gallery-'));
let hits = 0, mode = 'ok', base;
const DESIGNS = [
  { slug: 'harbour-bakery', name: 'Harbour Bakery', summary: 'A bakery design', industry: ['gastro', 'bakery'], media: ['web', 'social'], free: false, version: '1.0.0', updated: '2026-10-20', released: '2026-10-01', previewUrl: '/preview/harbour-bakery/', mobilePreviewUrl: '/shots/harbour-bakery/01.webp', scores: { check: 98 }, thirdPartyRequests: 0 },
  { slug: 'roofline', name: 'Roofline', summary: { en: 'A roofer design', de: 'Ein Dachdecker-Design' }, industry: ['handwerk'], media: ['web'], free: false, version: '1.0.0', updated: '2026-10-20', previewUrl: '/preview/roofline/' },
  { slug: 'free-studio', name: 'Free Studio', summary: 'A consulting design', industry: ['beratung'], media: ['web', 'slides'], free: true, version: '1.0.0', updated: '2026-10-20', previewUrl: null },
];
const stub = http.createServer((req, res) => {
  if (req.url !== '/api/gallery') { res.statusCode = 404; return res.end(); }
  hits++;
  if (mode === 'broken') { res.setHeader('content-type', 'application/json'); return res.end('{"nope":1}'); }
  if (mode === 'error') { res.statusCode = 500; return res.end('x'); }
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ designs: DESIGNS }));
});
before(async () => { await new Promise((r) => stub.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${stub.address().port}`; process.env.KIEKKIST_GALLERY_URL = base + '/'; });
after(() => stub.close());

const G = await import('../src/gallery.js');
const S = await import('../src/services.js');

test('default URL and built-in source entry', () => {
  const keep = process.env.KIEKKIST_GALLERY_URL;
  delete process.env.KIEKKIST_GALLERY_URL;
  assert.equal(G.galleryUrl(), 'https://kiekkist.heidrich-digital.de');
  process.env.KIEKKIST_GALLERY_URL = 'javascript:alert(1)';
  assert.equal(G.galleryUrl(), 'https://kiekkist.heidrich-digital.de', 'only http(s)');
  process.env.KIEKKIST_GALLERY_URL = keep;
  const list = S.listSources({});
  assert.equal(list[0].name, 'Kiekkist Gallery');
  assert.equal(list[0].kind, 'gallery');
  assert.equal(list[0].url, base);
  assert.ok(S.listSources({ kind: 'gallery' }).some((s) => s.id === 'kiekkist-gallery'));
  assert.ok(!S.listSources({ kind: 'marketplace' }).some((s) => s.id === 'kiekkist-gallery'));
});

test('search: filters, absolute links, how to get it; cached for 10 minutes', async () => {
  G.clearGalleryCache(); hits = 0;
  const all = await G.searchGallery({});
  assert.equal(all.ok, true);
  assert.equal(all.total, 3);
  assert.equal(all.cached, false);
  const b = (await G.searchGallery({ q: 'bakery' })).items;
  assert.deepEqual(b.map((x) => x.slug), ['harbour-bakery']);
  assert.equal(b[0].page_url, `${base}/gallery/harbour-bakery/`);
  assert.equal(b[0].preview_url, `${base}/preview/harbour-bakery/`);
  assert.equal(b[0].released, '2026-10-01');
  assert.match(b[0].get, /get_design/);
  assert.match(b[0].get, /mcp-gallery/);
  assert.deepEqual((await G.searchGallery({ industry: 'handwerk' })).items.map((x) => x.slug), ['roofline']);
  assert.equal((await G.searchGallery({ q: 'roofer' })).items[0].summary, 'A roofer design');
  assert.deepEqual((await G.searchGallery({ medium: 'slides' })).items.map((x) => x.slug), ['free-studio']);
  const free = await G.searchGallery({ free: true });
  assert.deepEqual(free.items.map((x) => x.slug), ['free-studio']);
  assert.match(free.items[0].get, /get_free_design/);
  assert.equal((await G.searchGallery({ free: 'false' })).items.length, 2);
  assert.equal(hits, 1, 'one request, then the cache');
  assert.equal((await G.searchGallery({})).cached, true);
});

test('fail soft: offline, server error, unexpected body', async () => {
  for (const m of ['error', 'broken']) {
    G.clearGalleryCache(); mode = m;
    const r = await G.searchGallery({ q: 'x' });
    assert.equal(r.ok, false, m);
    assert.match(r.error, /Kiekkist Gallery not reachable/);
    assert.deepEqual(r.items, []);
  }
  mode = 'ok';
  const keep = process.env.KIEKKIST_GALLERY_URL;
  process.env.KIEKKIST_GALLERY_URL = 'http://127.0.0.1:9';   // nothing listens on the discard port
  G.clearGalleryCache();
  const off = await G.searchGallery({});
  assert.equal(off.ok, false);
  assert.match(off.error, /KIEKKIST_GALLERY_URL/);
  process.env.KIEKKIST_GALLERY_URL = keep;
});

test('MCP: kk_gallery_search is registered, describes the licence flow, returns results', async () => {
  G.clearGalleryCache();
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const { buildMcpServer } = await import('../src/mcp.js');
  const s = buildMcpServer({});
  const [a, b] = InMemoryTransport.createLinkedPair();
  await s.connect(a); const c = new Client({ name: 't', version: '1' }); await c.connect(b);
  const { tools } = await c.listTools();
  const t = tools.find((x) => x.name === 'kk_gallery_search');
  assert.ok(t);
  assert.match(t.description, /get_free_design/);
  assert.match(t.description, /licence key/);
  assert.match(tools.find((x) => x.name === 'kk_list_sources').description, /Kiekkist Gallery/);
  const r = await c.callTool({ name: 'kk_gallery_search', arguments: { q: 'bakery' } });
  const j = JSON.parse(r.content[0].text);
  assert.equal(j.ok, true);
  assert.equal(j.items[0].slug, 'harbour-bakery');
  const src = JSON.parse((await c.callTool({ name: 'kk_list_sources', arguments: { kind: 'gallery' } })).content[0].text);
  assert.ok(src.some((x) => x.id === 'kiekkist-gallery'));
});
