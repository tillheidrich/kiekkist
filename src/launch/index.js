// kk launch: automatic launch checks against a live URL or a local export folder (launch.md, "Checklist runner").
// Read-only: one optional form POST with --form-test, nothing else is sent anywhere but the site and DNS resolvers.
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { isPublicUrl } from '../browser.js';
import { serveDir } from '../export/serve.js';
import { dnsChecks } from './dns.js';
import { tlsChecks, headerChecks, siteFileChecks, safeFetch } from './http.js';
import { crawl } from './crawl.js';
import { pageChecks } from './checks.js';
import { processorsTable } from './plan.js';
import { readSheet, initSheet, sheetPath } from './sheet.js';

export const LAUNCH_RULES_VERSION = '2026-10-30.1';
export const AREAS = ['dns', 'tls', 'privacy', 'legal', 'search', 'perf', 'forms', 'a11y', 'ops', 'handover'];
const AREA_OF = (id) => ({ dns: 'dns', tls: 'tls', http: 'tls', privacy: 'privacy', legal: 'legal', copy: 'legal', ai: 'legal', seo: 'search', links: 'search', perf: 'perf', forms: 'forms', a11y: 'a11y', ops: 'ops', handover: 'handover', crawl: 'ops' }[id.split('.')[0]] || 'ops');
export const DISCLAIMER = 'Passing these checks means nothing mechanical is missing. It does not mean the site is legally compliant.';
const MANUAL = ['legal.impressum-facts', 'legal.privacy-text', 'domain.holder-is-client', 'forms.test-message-arrived', 'perf.real-phone', 'a11y.keyboard-walkthrough', 'a11y.screen-reader', 'search.console-verified', 'backup.restore-test', 'monitor.alert-recipient', 'handover.signed-off'];

function handoverChecks(sheet) {
  const F = [];
  for (const a of sheet.accounts || []) {
    const agency = !a?.owner || /agency|agentur|freelancer/i.test(String(a.owner)) && !/client|kunde/i.test(String(a.owner));
    F.push({ id: 'handover.owners', severity: agency ? 'error' : 'pass', ok: !agency, detail: `${a?.service || '?'} at ${a?.provider || '?'}: owner ${a?.owner || 'missing'}${a?.dpa ? '' : '; DPA date missing'}`, evidence: 'launch sheet' });
    if (!a?.dpa) F.push({ id: 'handover.owners', severity: 'error', ok: false, detail: `${a?.service || '?'} at ${a?.provider || '?'}: DPA column empty`, evidence: 'launch sheet' });
  }
  const required = ['site', 'accounts', 'bfsg'];
  const missing = required.filter((k) => sheet[k] === undefined || sheet[k] === null || (Array.isArray(sheet[k]) && !sheet[k].length));
  F.push({ id: 'handover.complete', severity: missing.length ? 'warn' : 'pass', ok: !missing.length, detail: missing.length ? `sheet fields still empty: ${missing.join(', ')}` : 'required sheet fields filled', evidence: 'launch sheet' });
  return F;
}

async function redirectChecks(base, sheet, sheetDir, allowLocal) {
  const F = [];
  if (!sheet.redirects_file) return F;
  const p = resolve(sheetDir || '.', sheet.redirects_file);
  if (!existsSync(p)) { F.push({ id: 'seo.redirects', severity: 'warn', ok: false, detail: `redirects file not found: ${sheet.redirects_file}`, evidence: 'launch sheet' }); return F; }
  const rows = readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/[,;\t]/).map((x) => x.trim()));
  for (const [from, to] of rows.slice(0, 200)) {
    try {
      const r = await safeFetch(new URL(from, base).href, { follow: false, allowLocal });
      const loc = r.headers.get('location'); const ok301 = [301, 308].includes(r.status);
      let final = 0; if (loc) { const f = await safeFetch(new URL(loc, base).href, { allowLocal }); final = f.status; }
      const ok = ok301 && final === 200 && (!to || new URL(loc, base).pathname === new URL(to, base).pathname);
      F.push({ id: 'seo.redirects', severity: ok ? 'pass' : 'error', ok, detail: `${from} → ${r.status}${loc ? ' ' + loc : ''} → ${final || '-'}${to ? ` (expected ${to})` : ''}`, evidence: from });
    } catch (e) { F.push({ id: 'seo.redirects', severity: 'error', ok: false, detail: `${from}: ${e.message}`, evidence: from }); }
  }
  return F;
}

async function formTest(endpoint, siteOrigin, sheet) {
  const u = new URL(endpoint, siteOrigin);
  const allowed = u.origin === siteOrigin || (sheet.form_endpoint && new URL(sheet.form_endpoint).origin === u.origin);
  if (!allowed) return { id: 'forms.endpoint', severity: 'error', ok: false, detail: `refused: ${u.host} is neither the site nor the form endpoint named in the sheet`, evidence: u.href };
  const marker = `kk-launch-test-${new Date().toISOString().slice(0, 10)}`;
  const body = new URLSearchParams({ name: marker, email: 'launch-test@example.invalid', message: `${marker}: automatic launch check, please ignore.`, website: '' });
  try {
    const r = await safeFetch(u.href, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' }, follow: false });
    const ok = r.status >= 200 && r.status < 400;
    return { id: 'forms.endpoint', severity: ok ? 'pass' : 'error', ok, detail: `one test POST (${marker}) answered ${r.status}; confirm that it arrived in the inbox (manual)`, evidence: u.href };
  } catch (e) { return { id: 'forms.endpoint', severity: 'error', ok: false, detail: 'test POST failed: ' + e.message, evidence: u.href }; }
}

async function a11yChecks(urls) {
  const F = [];
  const { checkTarget } = await import('../check/index.js');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    for (const url of urls) {
      try {
        // mobile: false: the crawl already measures lab LCP/CLS/bytes at 390 px throttled for every page (area perf);
        // a second throttled lab run per page here would double the time and report the same numbers twice
        const r = await checkTarget({ url, browser, viewports: [390, 1440], noJs: false, interaction: true, mobile: false });
        const errs = r.hard.filter((h) => h.severity === 'error');
        F.push({ id: 'a11y.check', severity: errs.length ? 'error' : 'pass', ok: !errs.length, detail: errs.length ? errs.slice(0, 6).map((h) => `${h.rule}${h.viewport ? '@' + h.viewport : ''}: ${h.detail}`).join(' | ') : `no hard failures (grade ${r.grade})`, evidence: url });
      } catch (e) { F.push({ id: 'a11y.check', severity: 'info', ok: false, detail: 'checker could not run: ' + e.message, evidence: url }); }
    }
  } finally { await browser.close(); }
  return F;
}

/**
 * @param {object} o { target, only, pages=20, sheet, initSheet, formEndpoint, formTest, processors, recheck, a11yPages=3, perf=true, aiImages=[], outDir }
 */
export async function runLaunch(o) {
  const only = new Set(o.only?.length ? o.only : AREAS);
  const want = (a) => only.has(a);
  let base, local = false, srv = null;
  if (o.target && !/^https?:\/\//i.test(o.target) && existsSync(o.target) && statSync(o.target).isDirectory()) {
    let dir = resolve(o.target);
    if (existsSync(join(dir, 'dist', 'index.html'))) dir = join(dir, 'dist'); else if (existsSync(join(dir, 'preview', 'index.html'))) dir = join(dir, 'preview');
    srv = await serveDir(dir); base = srv.url; local = true;
  } else {
    let u; try { u = new URL(o.target); } catch { return { code: 2, error: 'not a URL or folder: ' + o.target }; }
    if (!(await isPublicUrl(u.href))) return { code: 2, error: 'target is not a public address (launch checks run only against public sites; use a folder for local exports)' };
    base = u.origin; o.target = u.href;
  }
  const sheetFile = o.sheet ? resolve(o.sheet) : !local ? sheetPath(o.target) : null;
  let sheetRec = sheetFile && existsSync(sheetFile) ? readSheet(sheetFile) : null;
  if (!sheetRec && o.sheet) sheetRec = initSheet(o.target, sheetFile);
  const sheet = sheetRec?.data || {};
  const findings = [];
  let mx = [], spf = { includes: [] }, foreignHosts = [];
  try {
    // reachability
    let home;
    try { home = await safeFetch(local ? base + '/' : o.target, { allowLocal: local }); } catch (e) { return { code: 2, error: 'unreachable: ' + e.message }; }
    if (!home || home.status >= 500 || home.status === 0) return { code: 2, error: `unreachable: status ${home?.status}` };
    if (!local && want('dns')) { const d = await dnsChecks(o.target, sheet); findings.push(...d.findings); mx = d.mx; spf = d.spf; }
    if (!local && want('tls')) { findings.push(...(await tlsChecks(o.target))); findings.push(...headerChecks(home.headers, home.finalUrl)); }
    if (local) findings.push({ id: 'ops.local', severity: 'info', ok: true, detail: 'local folder: DNS, TLS and response headers are checked only against the live URL', evidence: base });
    let files = { findings: [], sitemapUrls: [] };
    if (want('search') || want('ops')) files = await siteFileChecks(base, { allowLocal: local, sheet, origin: base });
    findings.push(...files.findings.filter((f) => want(AREA_OF(f.id))));
    if (['privacy', 'legal', 'search', 'perf', 'forms'].some(want)) {
      const c = await crawl({ start: local ? base + '/' : o.target, pages: o.pages || 20, local, sitemapUrls: files.sitemapUrls.map((u) => (local ? u.replace(/^https?:\/\/[^/]+/, base) : u)), extraPaths: [], perf: want('perf') && o.perf !== false });
      const pc = pageChecks(c, sheet, { aiImages: o.aiImages || [] });
      foreignHosts = pc.foreignHosts;
      findings.push(...pc.findings.filter((f) => want(AREA_OF(f.id))));
      const icons = c.pages.find((p) => p.dom)?.dom.icons || [];
      const fav = findings.find((f) => f.id === 'seo.favicon');
      if (fav) { const hasIcon = icons.some((i) => /(^|\s)icon/.test(i.rel)), hasApple = icons.some((i) => /apple-touch-icon/.test(i.rel)); fav.ok = hasApple && (hasIcon || /favicon\.ico/.test(fav.detail)); fav.severity = fav.ok ? 'pass' : 'info'; fav.detail = `icon: ${hasIcon ? 'linked' : /\/favicon\.ico/.test(fav.detail) ? '/favicon.ico' : 'missing'}; apple-touch-icon: ${hasApple ? 'linked' : 'missing'}`; }
      if (want('a11y')) findings.push(...(await a11yChecks(c.pages.filter((p) => p.dom && p.status === 200).slice(0, o.a11yPages ?? 3).map((p) => p.url))));
      o._crawl = { pages: c.pages.length, ms: c.ms, truncated: c.truncated, perf: c.perf };
    }
    if (want('search')) findings.push(...(await redirectChecks(base, sheet, sheetFile ? dirname(sheetFile) : null, local)));
    if (want('forms') && o.formTest) {
      if (!o.formEndpoint) findings.push({ id: 'forms.endpoint', severity: 'warn', ok: false, detail: '--form-test needs --form <endpoint>', evidence: base });
      else if (local) findings.push({ id: 'forms.endpoint', severity: 'info', ok: false, detail: 'form test skipped for a local folder', evidence: base });
      else findings.push(await formTest(o.formEndpoint, base, sheet));
    }
    if (want('handover') && sheetRec) findings.push(...handoverChecks(sheet));
  } finally { if (srv) await srv.close(); }
  const processors = o.processors ? processorsTable({ sheet, foreignHosts, mx, spfIncludes: spf.includes || [] }) : null;
  const done = new Set((sheet.manual || []).map((m) => m?.id));
  const manualOpen = MANUAL.filter((m) => !done.has(m));
  const errors = findings.filter((f) => f.severity === 'error').length, warns = findings.filter((f) => f.severity === 'warn').length;
  const report = { rules_version: LAUNCH_RULES_VERSION, at: new Date().toISOString(), target: o.target, local, sheet: sheetFile && existsSync(sheetFile) ? sheetFile : null, summary: `${errors} automatic error(s), ${warns} warning(s), ${manualOpen.length} manual item(s) open`, counts: { errors, warnings: warns, passed: findings.filter((f) => f.ok).length, manual_open: manualOpen.length }, findings, foreignHosts, manual_open: manualOpen, crawl: o._crawl || null, processors, disclaimer: DISCLAIMER };
  // write report next to the sheet (or into the given folder)
  const outDir = o.outDir || (report.sheet ? dirname(report.sheet) : null);
  let previous = null;
  if (outDir) {
    const jp = join(outDir, 'launch-report.json');
    if (existsSync(jp)) { try { previous = JSON.parse(readFileSync(jp, 'utf8')); } catch {} }
    mkdirSync(outDir, { recursive: true });
    writeFileSync(jp, JSON.stringify(report, null, 2));
    writeFileSync(join(outDir, 'launch-report.md'), reportMd(report));
    report.files = [jp, join(outDir, 'launch-report.md')];
  }
  if (o.recheck) report.changes = diffReports(previous, report);
  report.code = errors ? 1 : 0;
  return report;
}

const key = (f) => `${f.id}|${f.key || ''}|${f.evidence || ''}`;
export function diffReports(prev, cur) {
  if (!prev) return { note: 'no previous report: nothing to compare', new_failures: [], resolved: [], new_hosts: [] };
  const was = new Map(prev.findings.filter((f) => !f.ok && f.severity !== 'info').map((f) => [key(f), f]));
  const now = new Map(cur.findings.filter((f) => !f.ok && f.severity !== 'info').map((f) => [key(f), f]));
  return {
    since: prev.at,
    new_failures: [...now].filter(([k]) => !was.has(k)).map(([, f]) => f),
    resolved: [...was].filter(([k]) => !now.has(k)).map(([, f]) => f),
    new_hosts: (cur.foreignHosts || []).filter((h) => !(prev.foreignHosts || []).includes(h)),
  };
}

export function reportMd(r) {
  const L = [`# Launch report: ${r.target}`, '', `${r.at.slice(0, 16).replace('T', ' ')} UTC · rules ${r.rules_version}`, '', `**${r.summary}.**`, ''];
  for (const area of AREAS) {
    const fs = r.findings.filter((f) => AREA_OF(f.id) === area);
    if (!fs.length) continue;
    L.push(`## ${area}`, '', '| Check | Result | Evidence |', '|---|---|---|');
    for (const f of fs.sort((a, b) => ['error', 'warn', 'info', 'pass'].indexOf(a.severity) - ['error', 'warn', 'info', 'pass'].indexOf(b.severity))) L.push(`| ${f.id}${f.key ? ' (' + f.key + ')' : ''} | ${f.severity === 'pass' ? 'ok' : f.severity.toUpperCase()}: ${String(f.detail).replace(/\|/g, '\\|')} | ${String(f.evidence || '').replace(/\|/g, '\\|')} |`);
    L.push('');
  }
  if (r.processors) L.push('## Processors', '', r.processors.md, '');
  if (r.manual_open.length) L.push('## Manual items open', '', ...r.manual_open.map((m) => `- ${m}`), '');
  L.push('---', '', r.disclaimer, '');
  return L.join('\n');
}
