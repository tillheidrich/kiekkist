import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseYaml } from '../../src/launch/yaml.js';
import { initSheet, tickSheet, readSheet, looksSecret } from '../../src/launch/sheet.js';
import { spfLookups, providerOf } from '../../src/launch/dns.js';
import { pageChecks, siteOf } from '../../src/launch/checks.js';
import { headerChecks } from '../../src/launch/http.js';
import { processorsTable, dnsPlan, legalInputs } from '../../src/launch/plan.js';
import { runLaunch, diffReports } from '../../src/launch/index.js';

test('launch sheet YAML: flow maps, lists, comments', () => {
  const d = parseYaml('site: https://example.de\nmail: { used: true, dkim_selectors: [kas202410] }\nbfsg: false  # decided by X\nallow_third_party:\n  - host: www.youtube-nocookie.com\n    reason: consent\naccounts:\n  - { service: hosting, provider: All-Inkl, owner: client, dpa: 2026-11-03, creds: "Vault: Kunde X / Hosting" }\nbudget: { lcp_ms: 2500, cls: 0.1 }\n');
  assert.equal(d.site, 'https://example.de');
  assert.deepEqual(d.mail, { used: true, dkim_selectors: ['kas202410'] });
  assert.equal(d.bfsg, false);
  assert.deepEqual(d.allow_third_party, [{ host: 'www.youtube-nocookie.com', reason: 'consent' }]);
  assert.equal(d.accounts[0].creds, 'Vault: Kunde X / Hosting');
  assert.equal(d.budget.cls, 0.1);
});

test('sheet: init never overwrites, tick appends, secrets are refused', () => {
  const p = join(mkdtempSync(join(tmpdir(), 'kk-sheet-')), 'site.md');
  assert.equal(initSheet('https://example.de', p).created, true);
  tickSheet(p, { item: 'legal.impressum-facts', by: 'Herr X', date: '2026-11-03' });
  tickSheet(p, { item: 'perf.real-phone', by: 'Owner' });
  const s = readSheet(p);
  assert.deepEqual(s.data.manual.map((m) => m.id), ['legal.impressum-facts', 'perf.real-phone']);
  assert.equal(initSheet('https://example.de', p).created, false);
  assert.equal(readSheet(p).data.manual.length, 2);
  assert.throws(() => tickSheet(p, { item: 'x', by: 'y', note: 'api_key=abc123' }), /secret/);
  assert.ok(looksSecret('ghp_0123456789abcdefghijABCDEFGHIJ'));
  assert.ok(looksSecret('K8s9dF2qLz7PwX4vR1nM6tY3bH0jG5cA'));
  assert.ok(!looksSecret('Vault: Kunde X / Hosting'));
});

test('SPF lookups are counted recursively; mail providers are named', async () => {
  const zone = { 'example.de': ['v=spf1 mx a include:spf.kasserver.com include:spf.brevo.com ~all'], 'spf.kasserver.com': ['v=spf1 ip4:1.2.3.4 include:spf2.kasserver.com ~all'], 'spf2.kasserver.com': ['v=spf1 a ~all'], 'spf.brevo.com': ['v=spf1 ip4:5.6.7.8 ~all'], 'two.de': ['v=spf1 -all', 'v=spf1 mx -all'] };
  const r = { resolveTxt: async (n) => { if (!zone[n]) throw Object.assign(new Error('x'), { code: 'ENODATA' }); return zone[n].map((t) => [t]); } };
  const s = await spfLookups(r, 'example.de');
  assert.equal(s.lookups, 6); // mx, a, include x2, nested include, nested a
  assert.deepEqual(s.includes.sort(), ['spf.brevo.com', 'spf.kasserver.com', 'spf2.kasserver.com']);
  assert.match((await spfLookups(r, 'two.de')).error, /2 SPF records/);
  assert.equal(providerOf('spf.kasserver.com'), 'All-Inkl');
});

const page = (url, over = {}) => ({ url, status: 200, finalUrl: url, requests: [], cookies: [], storage: { localStorage: [], sessionStorage: [], indexedDB: [] }, dom: { title: 'Nordlicht Immobilien · Häuser in den Elbvororten', description: 'Nordlicht vermittelt Häuser und Wohnungen zwischen Övelgönne und Rissen, höchstens zwölf im Jahr.', canonical: url, og: { title: 't', description: 'd', image: url + 'og.jpg' }, jsonld: [], h1: 1, links: [{ href: 'https://example.de/impressum/', raw: '/impressum/', text: 'Impressum', area: 'footer' }, { href: 'https://example.de/datenschutz/', raw: '/datenschutz/', text: 'Datenschutz', area: 'footer' }], forms: [], imgs: [], chat: [], icons: [], iframes: [], text: 'Text' }, ...over });

test('page checks: third parties, fonts, storage, iframes, trackers, legal, claims, SEO', () => {
  const crawl = { origin: 'https://example.de', pages: [
    page('https://example.de/', { requests: [{ url: 'https://fonts.gstatic.com/s/x.woff2', type: 'font', host: 'fonts.gstatic.com' }, { url: 'https://www.googletagmanager.com/gtag/js', type: 'script', host: 'www.googletagmanager.com' }, { url: 'https://cdn.example.de/a.css', type: 'stylesheet', host: 'cdn.example.de' }], cookies: [{ name: '_ga', domain: '.example.de' }], dom: { ...page('https://example.de/').dom, iframes: ['https://www.youtube.com/embed/x'], text: 'Unsere Websites sind 100 % rechtssicher und abmahnsicher.', links: [{ href: 'https://example.de/#kontakt', raw: '#kontakt', text: 'Impressum', area: 'footer' }, { href: 'https://example.de/datenschutz/', raw: '/datenschutz/', text: 'Datenschutz', area: 'footer' }] } }),
    page('https://example.de/impressum/', { dom: { ...page('x').dom, text: 'Impressum TODO(owner): Anschrift', links: [] } }),
    page('https://example.de/datenschutz/', { dom: { ...page('x').dom, text: 'Datenschutz: Hosting bei All-Inkl.' } }),
  ] };
  const { findings } = pageChecks(crawl, { processors: ['All-Inkl', 'Brevo'] });
  const bad = (id) => findings.filter((f) => f.id === id && !f.ok);
  assert.match(bad('privacy.third-party-requests')[0].detail, /fonts\.gstatic\.com.*googletagmanager/);
  assert.ok(!bad('privacy.third-party-requests')[0].detail.includes('cdn.example.de'), 'subdomain of the client is the same site');
  assert.equal(bad('privacy.fonts-self-hosted').length, 1);
  assert.match(bad('privacy.storage-before-interaction')[0].detail, /_ga/);
  assert.equal(bad('privacy.iframe-before-click').length, 1);
  assert.equal(bad('privacy.analytics-first-party').length, 1);
  assert.match(bad('copy.compliance-claims')[0].detail, /100 % rechtssicher.*abmahnsicher/);
  assert.ok(bad('legal.links').some((f) => /anchor/.test(f.detail)));
  assert.ok(bad('legal.placeholders').some((f) => /TODO\(owner\)/.test(f.detail)));
  assert.match(bad('legal.processors-in-policy')[0].detail, /Brevo/);
  assert.equal(siteOf('www.example.co.uk'), 'example.co.uk');
});

test('security headers and processors/DNS/legal helpers', () => {
  const h = new Headers({ 'strict-transport-security': 'max-age=300', 'content-security-policy': "default-src 'self'; script-src 'unsafe-eval'" });
  const f = headerChecks(h, 'https://x.de/');
  assert.equal(f.find((x) => x.key === 'hsts').severity, 'error');
  assert.equal(f.find((x) => x.key === 'csp').severity, 'warn');
  const t = processorsTable({ sheet: { accounts: [{ service: 'hosting', provider: 'All-Inkl', dpa: '2026-11-03' }] }, foreignHosts: ['www.youtube-nocookie.com', 'weird.example'], mx: [{ exchange: 'mx.example.de', priority: 10 }], spfIncludes: ['spf.brevo.com'] });
  assert.ok(t.rows.some((r) => r.provider === 'Brevo'));
  assert.ok(t.rows.some((r) => /unidentified: ask \(weird\.example\)/.test(r.provider)));
  assert.match(dnsPlan({ domain: 'www.x.de', web_target: 'host.example.net' }).md, /CNAME \| host\.example\.net\./);
  assert.equal(legalInputs({ report: { findings: [] } }).items.length, 12);
});

test('recheck reports only changes', () => {
  const a = { at: '2026-10-01', findings: [{ id: 'http.headers', key: 'hsts', severity: 'error', ok: false, evidence: 'x' }], foreignHosts: [] };
  const b = { findings: [{ id: 'privacy.third-party-requests', severity: 'error', ok: false, evidence: '/' }], foreignHosts: ['www.google-analytics.com'] };
  const d = diffReports(a, b);
  assert.equal(d.new_failures.length, 1); assert.equal(d.resolved.length, 1); assert.deepEqual(d.new_hosts, ['www.google-analytics.com']);
});

test('kk launch on a local folder: crawl finds the third-party script, the claim, the missing legal pages', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kk-site-'));
  const shell = (title, body) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="Eine Testseite für den Launch-Check mit genug Text für die Beschreibung, damit die Länge passt."><link rel="icon" href="/favicon.svg"></head><body><main><h1>${title}</h1>${body}</main><footer><a href="/impressum/">Impressum</a> <a href="/datenschutz/">Datenschutz</a></footer></body></html>`;
  writeFileSync(join(dir, 'index.html'), shell('Startseite der Testfirma in Tostedt', '<p>Wir sind DSGVO-zertifiziert.</p><script src="https://www.googletagmanager.com/gtag/js?id=G-X"></script><script>localStorage.setItem("seen","1")</script><a href="/leistungen/">Leistungen</a>'));
  mkdirSync(join(dir, 'leistungen')); writeFileSync(join(dir, 'leistungen', 'index.html'), shell('Leistungen der Testfirma in Tostedt', '<p>Text</p>'));
  mkdirSync(join(dir, 'impressum')); writeFileSync(join(dir, 'impressum', 'index.html'), shell('Impressum der Testfirma in Tostedt', '<p>Testfirma, Musterstraße 1, 21255 Tostedt, info@example.de</p>'));
  writeFileSync(join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  writeFileSync(join(dir, '404.html'), shell('Nicht gefunden', ''));
  const r = await runLaunch({ target: dir, pages: 5, a11yPages: 0, perf: false, outDir: join(dir, '.report') });
  const bad = (id) => r.findings.filter((f) => f.id === id && !f.ok);
  assert.equal(r.code, 1);
  assert.ok(bad('privacy.third-party-requests').some((f) => /googletagmanager/.test(f.detail)));
  assert.ok(bad('privacy.storage-before-interaction').some((f) => /localStorage seen/.test(f.detail)));
  assert.ok(bad('copy.compliance-claims').some((f) => /DSGVO-zertifiziert/.test(f.detail)));
  assert.ok(bad('legal.placeholders').some((f) => /Musterstra/.test(f.detail)));
  assert.ok(bad('legal.links').some((f) => /datenschutz page answers 404/.test(f.detail)) || bad('links.broken').length);
  assert.equal(bad('seo.robots')[0].severity, 'error');
  assert.ok(existsSync(join(dir, '.report', 'launch-report.md')));
  assert.match(readFileSync(join(dir, '.report', 'launch-report.md'), 'utf8'), /does not mean the site is legally compliant/);
});

test('kk launch refuses private addresses (exit 2)', async () => {
  const r = await runLaunch({ target: 'http://127.0.0.1:9/' });
  assert.equal(r.code, 2);
});
