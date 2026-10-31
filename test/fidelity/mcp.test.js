import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

process.env.KK_DATA_DIR ||= mkdtempSync(join(tmpdir(), 'kk-fmcp-'));
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
const { buildMcpServer } = await import('../../src/mcp.js');
async function client(local) {
  const s = buildMcpServer({ local });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await s.connect(a); const c = new Client({ name: 't', version: '1' }); await c.connect(b); return c;
}
const call = async (c, name, args) => { const r = await c.callTool({ name, arguments: args }); return { err: !!r.isError, text: r.content[0].text, content: r.content }; };

test('MCP schemas: measuring tools only on the local server; workflow, references and improve_site on both', async () => {
  const local = (await (await client(true)).listTools()).tools;
  const hosted = (await (await client(false)).listTools()).tools;
  for (const n of ['kk_spec', 'kk_motion', 'kk_fidelity', 'improve_site', 'kk_get_workflow', 'kk_search_references', 'kk_get_reference_spec']) assert.ok(local.find((t) => t.name === n), n);
  for (const n of ['kk_spec', 'kk_motion', 'kk_fidelity']) assert.ok(!hosted.find((t) => t.name === n), n + ' must not be on a hosted instance');
  for (const n of ['improve_site', 'kk_get_workflow', 'kk_search_references', 'kk_get_reference_spec']) assert.ok(hosted.find((t) => t.name === n), n);
  const wf = local.find((t) => t.name === 'kk_get_workflow');
  assert.deepEqual(wf.inputSchema.properties.mode.enum, ['new', 'polish', 'redesign']);
  const fid = local.find((t) => t.name === 'kk_fidelity');
  assert.deepEqual(fid.inputSchema.required.sort(), ['build', 'ref']);
  assert.match(local.find((t) => t.name === 'kk_spec').description, /Never stores the page HTML/);
});

test('MCP workflow modes and improve_site target policy on a hosted instance', async () => {
  const c = await client(false);
  const w = JSON.parse((await call(c, 'kk_get_workflow', { mode: 'redesign' })).text);
  assert.equal(w.mode, 'redesign'); assert.ok(w.checklist.length === 8 && w.hard_bans.length === 6);
  assert.ok(w.steps.some((s) => /SEO|URLs/.test(s.do)));
  assert.equal(JSON.parse((await call(c, 'kk_get_workflow', {})).text).mode, 'new');
  const r = await call(c, 'improve_site', { url: 'http://localhost:4410/' });
  assert.equal(r.err, true); assert.match(r.text, /loopback/);
  const f = await call(c, 'improve_site', { url: '/etc/hosts' });
  assert.equal(f.err, true); assert.match(f.text, /only allowed from the CLI/);
  assert.equal((await call(c, 'improve_site', { url: 'http://10.0.0.8/' })).err, true);
  assert.match((await call(c, 'improve_site', { url: 'https://example.org/', out: '/tmp/x' })).text, /only available on the local MCP server/);
});

test('MCP reference library: refused without KK_REFS_FILE, served with it', async () => {
  delete process.env.KK_REFS_FILE;
  const c = await client(false);
  const no = await call(c, 'kk_search_references', { query: 'bakery' });
  assert.equal(no.err, true); assert.match(no.text, /not configured/);
  assert.equal((await call(c, 'kk_get_reference_spec', { id: 'r1' })).err, true);
  const d = mkdtempSync(join(tmpdir(), 'kk-lib-'));
  writeFileSync(join(d, 'refs.json'), JSON.stringify({ generated: '2026-10-31', count: 1, refs: [{ id: 'r1', url: 'https://g.example/r1', live_url: 'https://r1.example/', title: 'Bakery one', cluster: { id: 'C05', name: 'Bakeries' }, industry: ['bakeries'], tags: ['warm'], facts: { h1Size: 80, fonts: ['Fraunces 400'] }, thumbnails: {} }] }));
  process.env.KK_REFS_FILE = join(d, 'refs.json');
  const yes = JSON.parse((await call(c, 'kk_search_references', { industry: 'bakeries' })).text);
  assert.equal(yes.items[0].id, 'r1'); assert.equal(yes.items[0].has_spec, false);
  const spec = JSON.parse((await call(c, 'kk_get_reference_spec', { id: 'r1' })).text);
  assert.equal(spec.spec, null); assert.match(spec.note, /kk spec/);
  delete process.env.KK_REFS_FILE;
});
