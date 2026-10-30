import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

process.env.KK_DATA_DIR = mkdtempSync(join(tmpdir(), 'kk-mcp-'));
process.chdir(process.env.KK_DATA_DIR); // launch sheets of the local server go to cwd/.kiekkist
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
const { buildMcpServer } = await import('../../src/mcp.js');

async function client(local) {
  const s = buildMcpServer({ local });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await s.connect(a); const c = new Client({ name: 't', version: '1' }); await c.connect(b); return c;
}
const call = async (c, name, args) => { const r = await c.callTool({ name, arguments: args }); return { err: !!r.isError, text: r.content[0].text }; };

test('MCP: export and launch tools are registered and say they never change DNS', async () => {
  const c = await client(true);
  const { tools } = await c.listTools();
  for (const n of ['kk_export', 'kk_export_tokens', 'kk_launch_check', 'kk_launch_sheet', 'kk_processors', 'kk_dns_plan', 'kk_legal_inputs']) {
    const t = tools.find((x) => x.name === n); assert.ok(t, n);
    if (n !== 'kk_export_tokens') assert.match(t.description, /never registers, pays, signs or changes DNS/);
  }
});

test('MCP: tokens, DNS plan, planned target, sheet rules', async () => {
  const c = await client(true);
  const tj = await call(c, 'kk_export_tokens', { theme: 'nordlicht-immobilien', format: 'theme.json' });
  assert.equal(JSON.parse(tj.text).version, 3);
  const plan = JSON.parse((await call(c, 'kk_dns_plan', { domain: 'example.de', web_target: '203.0.113.7', mail_provider: 'brevo' })).text);
  assert.ok(plan.rows.some((r) => r.type === 'TXT' && /spf\.brevo\.com/.test(r.value)));
  assert.ok(plan.rows.some((r) => r.name === '_dmarc'));
  const sh = await call(c, 'kk_export', { theme: 'nordlicht-immobilien', target: 'shopify' });
  assert.equal(sh.err, true); assert.match(sh.text, /TODO\(shopify\)/);
  assert.equal((await call(c, 'kk_launch_sheet', { site: 'https://example.de', action: 'init' })).err, false);
  const noRelay = await call(c, 'kk_launch_sheet', { site: 'https://example.de', action: 'tick', item: 'legal.impressum-facts', by: 'Herr X' });
  assert.equal(noRelay.err, true);
  const secret = await call(c, 'kk_launch_sheet', { site: 'https://example.de', action: 'tick', item: 'hosting', by: 'X', note: 'password=hunter2hunter2', relayed_from_owner: true });
  assert.equal(secret.err, true); assert.match(secret.text, /secret/);
});

test('MCP over HTTP (not local): no arbitrary folders', async () => {
  const c = await client(false);
  const r = await call(c, 'kk_export', { theme_dir: '/etc', target: 'html' });
  assert.equal(r.err, true); assert.match(r.text, /only available on the local MCP server/);
});
