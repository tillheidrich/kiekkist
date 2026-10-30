// Kiekkist check module: hard accessibility/layout errors, counted slop
// signals, token drift, score 0-100 and grade A-E.
// Contract: docs/CONTRACT.md, section "Check module interface".
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdir, stat } from 'node:fs/promises';
import { resolve as resolvePath, join, basename, dirname, sep } from 'node:path';
import { isPublicUrl } from '../browser.js';
import { pathToFileURL } from 'node:url';
import { captureRest, scrollThrough, settle, movedSinceSettle, resumeMotion, probe, textPresence, motionMark, motionCompare, focusPrepare } from './probe.js';
import { clickRecorder, clipScan } from './a11y-probe.js';
import {
  runAxe, keyboardWalk, textSpacingPass, textResizePass, reflowPass, motionPass, forcedColorsPass, hoverPass, mobileMenuOpen,
  staticPass, statementPass, pdfPass, siteFindings, a11ySection, annotate, PROFILES,
} from './a11y.js';
import { mobileScan } from './mobile-probe.js';
import { perfPass, serveLocal, mobileFindings, mobileSection, imageBytes } from './mobile.js';
import { buildCounters, tokenDrift, score, summarize, loadConfig, probeConfig, textFindings } from './rules.js';
import { loadPalette } from './tokens.js';
import { oklchOf } from './color.js';

export { similarity, SIMILAR_THRESHOLD } from './similarity.js';

const require = createRequire(import.meta.url);
export const RULES_VERSION = '2026-10-30.4';
function axePath() {
  try { return require.resolve('axe-core/axe.min.js'); } catch { return null; }
}

// axe rules this module measures itself (avoid double counting)
const AXE_SKIP = ['color-contrast', 'image-alt', 'input-image-alt', 'role-img-alt', 'link-name', 'button-name', 'target-size', 'meta-viewport'];

/**
 * @param {object} o
 * @param {string} [o.url]   http(s) URL
 * @param {string} [o.html]  HTML string
 * @param {string} [o.file]  local HTML file
 * @param {string|object} [o.tokens] tokens.json (DTCG) or CSS with custom properties, path or object
 * @param {number[]} [o.viewports]
 * @param {import('playwright').Browser} [o.browser]
 * @param {string} [o.shots] directory for full-page screenshots per viewport
 * @param {boolean} [o.axe=true] run axe-core if installed
 * @param {string[]} [o.allowHosts] extra hosts subresources may come from (default: none)
 * @param {number} [o.timeout=15000] navigation timeout per viewport
 * @param {string[]} [o.brandFonts] families fixed by the client's brand (exempt from the reflex-font signal)
 * @param {string[]} [o.banned] house rules (skill references/house-rules.md, "Counted becomes banned"): ids of counted
 *   slop signals that are hard errors for this project as soon as they occur once (rule `house-banned`)
 * @param {boolean} [o.noJs=true] second load without JavaScript (content and counters without JS)
 * @param {boolean} [o.interaction=true] keyboard focus and reduced-motion tests at the widest viewport
 * @param {boolean} [o.a11y=true] accessibility passes (WCAG 2.2 AA / EN 301 549): reflow 320, text spacing, keyboard walk,
 *   forced colours, motion, forms, statement page; adds the report section `a11y`
 * @param {'none'|'bfsg'|'public'} [o.profile='none'] legal profile: changes only the severity of the statement checks and the scope wording
 * @param {string[]} [o.pages] site mode: several files or same-origin URLs, checked one by one and compared (3.2.3, 3.2.6, 2.4.2)
 * @param {boolean} [o.mobile=true] mobile evidence (report section `mobile`): runs when a viewport under 600 px is checked;
 *   DOM checks at 390x844 and 360x780 plus one throttled lab load with Lighthouse's Moto G Power profile
 * @param {boolean} [o.perf=false] thorough lab run: 3 loads (median), font-swap run, CLS after scrolling
 * @param {number} [o.perfRuns] number of throttled loads (default 1, or 3 with perf)
 * @param {boolean} [o.fontSwap] extra run with delayed fonts to measure font-swap layout shift (default: perf)
 */
export async function checkTarget(opts = {}) {
  if (Array.isArray(opts.pages)) return checkSite(opts);
  return checkPage(opts);
}

async function checkPage({ url, html, file, fileRoot, tokens, viewports = [390, 768, 1440], browser, shots, axe = true, allowHosts = [], timeout = 15000, brandFonts = [], banned = [], noJs = true, interaction = true, a11y = true, profile = 'none', keepFacts = false, mobile = true, perf = false, perfRuns, fontSwap } = {}) {
  const t0 = Date.now();
  if (!PROFILES.includes(profile)) throw new Error('profile must be one of ' + PROFILES.join(', '));
  let target, gotoUrl = null, origin = null, mode;
  if (url) {
    let u;
    try { u = new URL(url); } catch { throw new Error('Invalid URL: ' + url); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http/https URLs are allowed: ' + url);
    gotoUrl = u.href; origin = u.origin; target = u.href; mode = 'url';
  } else if (file) {
    const p = resolvePath(file);
    const s = await stat(p).catch(() => null);
    if (!s || !s.isFile()) throw new Error('File not found: ' + p);
    gotoUrl = pathToFileURL(p).href; target = p; mode = 'file';
    var fileRootPath = resolvePath(fileRoot || dirname(p));
    var fileRootUrl = pathToFileURL(fileRootPath + sep).href;
  } else if (typeof html === 'string') {
    target = 'html:' + html.length + ' chars'; mode = 'html';
  } else throw new Error('checkTarget needs url, html or file');

  viewports = [...new Set(viewports.map(Number))].filter((v) => v > 0).sort((a, b) => a - b);
  if (!viewports.length) viewports = [390, 768, 1440];
  const mobileOn = mobile !== false && viewports.some((v) => v < 600);
  const runs = Math.max(1, Math.min(9, Number(perfRuns) || (perf ? 3 : 1)));
  const palette = await loadPalette(tokens);
  const cfg = loadConfig();
  const ban = bannedSignals(banned, cfg);
  const pcfg = probeConfig(cfg);
  const fontHosts = cfg.rules['font-cdn']?.patterns || [];
  const isFontHost = (u) => fontHosts.some((p) => (p.includes('/') ? (u.host + u.pathname).startsWith(p) : u.host === p || u.host.endsWith('.' + p)));
  const ownBrowser = !browser;
  const br = browser || await chromium.launch();
  const blocked = new Set();
  const fontCdn = new Set();
  const jsErrors = new Set();
  const hard = [];
  let slop = null, usage = null, fingerprint = null;
  const stats = {};
  const shotFiles = [];
  const axeFile = axe ? axePath() : null;
  if (shots) await mkdir(shots, { recursive: true });

  const a11yOn = a11y !== false;
  let facts = null, statementInfo = null, pdfInfo = null;
  const axeStats = { ran: false, viewports: [], violations: 0, incomplete: {} };
  const kbStats = {};
  const pushAll = (list) => { for (const f of list) hard.push(f); };
  const guardRedirects = mode === 'url' && (await isPublicUrl(gotoUrl));
  let jsText = null;
  const mobileScanRes = {}, mobileStats = {};
  let mobileImages = [], perfRes = null;
  const perfBlocked = new Set();

  // network policy: only the target itself (same origin) plus local data; extraOrigin = loopback server of the lab run
  async function installPolicy(ctx, extraOrigin = null, seen = null) {
    await ctx.route('**/*', (route) => {
      const rurl = route.request().url();
      let ok = false;
      try {
        const u = new URL(rurl);
        if (['data:', 'blob:', 'about:'].includes(u.protocol)) ok = true;
        else if (u.protocol === 'file:') ok = mode === 'file' && rurl.startsWith(fileRootUrl);
        else if (u.protocol === 'http:' || u.protocol === 'https:') {
          if (isFontHost(u)) fontCdn.add(u.host);
          ok = (origin && u.origin === origin) || (extraOrigin && u.origin === extraOrigin) || allowHosts.includes(u.host);
        }
        if (!ok) { const h = u.protocol === 'file:' ? 'file:' : u.host || u.protocol; blocked.add(h); if (seen) seen.add(h); }
      } catch { /* malformed */ }
      return ok ? route.continue() : route.abort('blockedbyclient');
    });
    // redirects bypass route(): watch every request and refuse to report on pages that touched private addresses
    let tainted = null;
    if (guardRedirects) ctx.on('request', async (r) => { const ru = r.url(); if (/^https?:/.test(ru) && !(await isPublicUrl(ru))) tainted = ru; });
    return () => !!tainted;
  }

  // one browser context per measurement, with the network policy
  async function openPage(vw, js) {
    const ctx = await br.newContext({
      viewport: { width: vw, height: vw < 600 ? 844 : 900 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      reducedMotion: 'no-preference',
      javaScriptEnabled: js,
    });
    const isTaintedP = await installPolicy(ctx);
    if (js && a11yOn) await ctx.addInitScript(clickRecorder);
    const page = await ctx.newPage();
    if (js) {
      page.on('pageerror', (e) => { if (jsErrors.size < 20) jsErrors.add(String(e.message || e).split('\n')[0].slice(0, 160)); });
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        if (/Failed to load resource|ERR_BLOCKED|net::ERR|blockedbyclient/i.test(t)) return; // requests the check blocked or missing files
        if (jsErrors.size < 20) jsErrors.add(t.split('\n')[0].slice(0, 160));
      });
    }
    try {
      if (mode === 'html') await page.setContent(html, { waitUntil: 'load', timeout });
      else await page.goto(gotoUrl, { waitUntil: 'load', timeout });
      await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
      await page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => true) : true)).catch(() => {});
    } catch (e) { await ctx.close().catch(() => {}); throw e; }
    return { ctx, page, isTainted: isTaintedP };
  }

  // keyboard focus and reduced motion at the widest viewport
  async function interactionTests(page, vw) {
    if (a11yOn) {
      try { const mp = await motionPass(page, vw, false); pushAll(mp.findings); stats.motionA11y = mp.stats; } catch (e) { stats.motionA11y = { ran: false, error: String(e.message || e).slice(0, 200) }; }
    }
    try {
      const minMs = cfg.rules['reduced-motion']?.threshold?.min_transition_ms ?? 200;
      const m = await page.evaluate(motionMark, minMs);
      let changed = 0;
      if (m.n || (a11yOn && stats.motionA11y && stats.motionA11y.moving)) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        if (m.n) changed = await page.evaluate(motionCompare);
        if (a11yOn) { await page.waitForTimeout(50); const r = await motionPass(page, vw, true); pushAll(r.findings); }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        if (m.n && !changed) hard.push({ rule: 'reduced-motion', severity: 'error', viewport: vw, detail: `${m.n} element(s) animate or transition (e.g. ${m.ex.join('; ')}) and none changes under prefers-reduced-motion: reduce` + (m.mediaQuery ? ' (a reduced-motion media query exists but does not reach them)' : ''), value: m.n });
      }
      stats.motion = { elements: m.n, changedUnderReduce: changed, mediaQuery: m.mediaQuery };
    } catch (e) { stats.motion = { ran: false, error: String(e.message || e).slice(0, 200) }; }
    try {
      const tabs = cfg.rules['focus-visible']?.threshold?.tabs ?? 15;
      const n = await page.evaluate(focusPrepare);
      const max = a11yOn ? Math.max(tabs, cfg.rules['keyboard-trap']?.threshold?.tabs ?? 40) : tabs;
      const w = await keyboardWalk(page, vw, { visualTabs: Math.min(tabs, n), maxTabs: Math.min(max, n + 2) });
      pushAll(a11yOn ? w.findings : w.findings.filter((f) => f.rule === 'focus-visible'));
      stats.focus = { focusable: n, tested: w.stats.tested, missing: w.stats.missing };
      kbStats[vw] = w.stats;
    } catch (e) { stats.focus = { ran: false, error: String(e.message || e).slice(0, 200) }; }
  }
  async function axeAt(page, vw, label) {
    try {
      await page.evaluate(settle, { cap: 1500, quiet: 150 }).catch(() => {});
      const r = await runAxe(page, axeFile, AXE_SKIP, label);
      // without the a11y passes keep the old behaviour: serious/critical WCAG violations only
      let keep = a11yOn ? r.findings : r.findings.filter((f) => f.rule === 'axe-serious' || f.rule === 'axe-critical');
      if (label) { const had = new Set(hard.filter((f) => f.viewport === vw).map((f) => f.rule + '|' + f.selector)); keep = keep.filter((f) => !had.has(f.rule + '|' + f.selector)); }
      for (const f of keep) hard.push({ ...f, viewport: vw });
      axeStats.ran = true; axeStats.viewports.push(label ? vw + ' ' + label : vw); axeStats.violations += keep.length;
      for (const x of r.incomplete) axeStats.incomplete[x.id] = (axeStats.incomplete[x.id] || 0) + x.nodes;
    } catch (e) { axeStats.error = String(e.message || e).slice(0, 200); }
  }
  try {
    for (let i = 0; i < viewports.length; i++) {
      const vw = viewports[i];
      const last = i === viewports.length - 1;
      let opened;
      try { opened = await openPage(vw, true); } catch (e) {
        hard.push({ rule: 'load-failed', severity: 'error', viewport: vw, detail: 'Could not load/measure at ' + vw + 'px: ' + String(e.message || e).split('\n')[0] });
        continue;
      }
      const { ctx, page, isTainted } = opened;
      try {
        await page.evaluate(captureRest);
        await page.evaluate(scrollThrough);
        if (isTainted()) throw new Error('blocked: request to a non-public address');
        // measure a still page: running fades and typing effects gave false contrast errors (effective opacity 0.46)
        const st = await page.evaluate(settle, { cap: 3000, quiet: 350 }).catch(() => null);
        let res = await page.evaluate(probe, { slop: last, once: i === 0, cfg: pcfg });
        let remeasured = false;
        if (await page.evaluate(movedSinceSettle).catch(() => false)) {
          // something started during the measurement (a timer-triggered reveal): wait again and measure once more
          await page.evaluate(settle, { cap: 3000, quiet: 350 }).catch(() => null);
          res = await page.evaluate(probe, { slop: last, once: i === 0, cfg: pcfg });
          remeasured = true;
        }
        (stats.settle ||= {})[vw] = st ? { ...st, remeasured } : { ran: false };
        for (const f of res.hard) hard.push({ ...f, viewport: vw });
        stats[vw] = res.stats;
        if (mobileOn && i === 0 && vw < 600) {
          // mobile DOM checks at the phone width, then the first screen and overflow at 360x780 (same page, resized)
          try {
            const m = await page.evaluate(mobileScan, { t: pcfg.t, part: 'full', dpr: cfg.rules['img-oversized']?.threshold?.dpr_mobile ?? 3 });
            for (const f of m.findings) hard.push({ ...f, viewport: vw });
            mobileScanRes[vw] = m.stats.firstScreen; mobileStats.scan = m.stats; mobileImages = m.images;
            await page.setViewportSize({ width: 360, height: 780 });
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            const m3 = await page.evaluate(mobileScan, { t: pcfg.t, part: 'first' });
            for (const f of m3.findings) hard.push({ ...f, viewport: 360 });
            mobileScanRes[360] = m3.stats.firstScreen;
            await page.setViewportSize({ width: vw, height: 844 });
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          } catch (e) { mobileStats.scanError = String(e.message || e).slice(0, 200); }
        }
        if (last) { slop = res.slop; usage = res.usage; fingerprint = res.fingerprint; }
        if (shots) {
          const name = (mode === 'html' ? 'page' : basename(target).replace(/\.[a-z]+$/i, '').replace(/[^\w.-]+/g, '-') || 'page') + '-' + vw + '.jpg';
          const p = join(shots, name);
          await page.screenshot({ path: p, fullPage: true, type: 'jpeg', quality: 78 }).catch(() => {});
          shotFiles.push(p);
        }
        if (axeFile && (last || a11yOn)) await axeAt(page, vw);
        else if (last && !axeFile && axe) axeStats.error = 'axe-core not installed';
        let base = null;
        if (a11yOn && (i === 0 || last)) {
          try { base = await page.evaluate(clipScan); pushAll(await textSpacingPass(page, vw, base)); } catch (e) { stats.textSpacing = { ran: false, error: String(e.message || e).slice(0, 200) }; }
        }
        if (last) {
          jsText = await page.evaluate(textPresence).catch(() => null);
          if (a11yOn) {
            try {
              const sp = await staticPass(page, vw, { origin, profile });
              pushAll(sp.findings); facts = sp.facts;
              const sm = await statementPass({ facts, profile, scope: facts.scope, mode, origin, fileRootUrl: typeof fileRootUrl === 'string' ? fileRootUrl : null, ctx, pageHtml: await page.content(), vw });
              pushAll(sm.findings); statementInfo = sm.info;
              if (profile === 'public') {
                if (!facts.publicLinks.leichteSprache) hard.push({ rule: 'public-sector-links', severity: 'error', viewport: vw, detail: 'No link to information in Leichte Sprache on the start page (§ 4 BITV 2.0).', pack_item: 'law-bitv-leichte-sprache' });
                if (!facts.publicLinks.gebaerden) hard.push({ rule: 'public-sector-links', severity: 'error', viewport: vw, detail: 'No link to information in Deutsche Gebärdensprache on the start page (§ 4 BITV 2.0).', pack_item: 'law-bitv-leichte-sprache' });
              }
              if (facts.pdfs.length) { const pp = await pdfPass({ urls: facts.pdfs, mode, origin, fileRootUrl: typeof fileRootUrl === 'string' ? fileRootUrl : null, ctx, vw }); pushAll(pp.findings); pdfInfo = pp.checked; }
            } catch (e) { stats.a11yStatic = { ran: false, error: String(e.message || e).slice(0, 200) }; }
          }
          await page.evaluate(resumeMotion).catch(() => {});
          if (interaction) await interactionTests(page, vw);
          if (a11yOn) {
            try { pushAll(await forcedColorsPass(page, vw)); } catch (e) { stats.forcedColors = { ran: false, error: String(e.message || e).slice(0, 200) }; }
            try { const hp = await hoverPass(page, vw); pushAll(hp.findings); stats.hover = hp.stats; } catch (e) { stats.hover = { ran: false, error: String(e.message || e).slice(0, 200) }; }
            try { pushAll(await textResizePass(page, vw, base)); } catch (e) { stats.textResize = { ran: false, error: String(e.message || e).slice(0, 200) }; }
          }
        }
        if (a11yOn && i === 0) {
          // narrowest viewport: keyboard walk for sticky bars, the opened mobile menu, then 320 px reflow and landscape (changes the viewport, so last)
          try {
            if (!last && interaction) { await page.evaluate(resumeMotion).catch(() => {}); await page.evaluate(() => window.scrollTo(0, 0)); const w = await keyboardWalk(page, vw, { maxTabs: 30 }); pushAll(w.findings.filter((f) => f.rule !== 'consent-banner' || f.severity === 'error')); kbStats[vw] = w.stats; }
            if (axeFile && await mobileMenuOpen(page)) await axeAt(page, vw, 'menu open');
            pushAll(await reflowPass(page, base));
          } catch (e) { stats.reflow = { ran: false, error: String(e.message || e).slice(0, 200) }; }
        }
      } catch (e) {
        hard.push({ rule: 'load-failed', severity: 'error', viewport: vw, detail: 'Could not load/measure at ' + vw + 'px: ' + String(e.message || e).split('\n')[0] });
      } finally {
        await ctx.close().catch(() => {});
      }
    }
    // second load without JavaScript at the widest viewport
    const lastVw = viewports[viewports.length - 1];
    if (noJs && stats[lastVw] && jsText && jsText.chars > 0) {
      const { ctx, page, isTainted } = await openPage(lastVw, false).catch((e) => ({ err: e }));
      if (ctx) {
        try {
          const t = await page.evaluate(textPresence);
          if (!isTainted()) {
            const ratio = t.chars / jsText.chars;
            const min = cfg.rules['no-js-content']?.threshold?.min_ratio ?? 0.6;
            stats.noJs = { ratio: +ratio.toFixed(2), chars: t.chars, charsWithJs: jsText.chars, zeros: t.zeros };
            if (ratio < min) hard.push({ rule: 'no-js-content', severity: 'error', viewport: lastVw, detail: `Without JavaScript only ${Math.round(ratio * 100)} % of the visible text is there (${t.chars} of ${jsText.chars} characters); content is injected or revealed by script. Crawlers, reader mode and AI agents see the rest missing.`, value: +ratio.toFixed(2) });
            if (slop) slop.counterZero = t.zeros;
          }
        } catch (e) { stats.noJs = { ran: false, error: String(e.message || e).slice(0, 200) }; } finally { await ctx.close().catch(() => {}); }
      }
    }
    // mobile lab run: own contexts with the phone profile, throttled via CDP (file and HTML targets through a loopback server)
    if (mobileOn && viewports.some((v) => stats[v])) {
      const tp = Date.now();
      let server = null;
      try {
        let perfUrl = gotoUrl;
        if (mode !== 'url') {
          server = await serveLocal(mode === 'file' ? { root: fileRootPath } : { html });
          perfUrl = mode === 'file' ? server.urlFor(target) : server.origin + '/';
        }
        perfRes = await perfPass({ br, url: perfUrl, policy: (ctx) => installPolicy(ctx, server ? server.origin : null, perfBlocked), runs, fontSwap: fontSwap ?? !!perf, cfg });
        if (mobileImages.length) await imageBytes(mobileImages, { perf: perfRes, root: mode === 'file' ? fileRootPath : null, localOrigin: server ? server.origin : null });
      } catch (e) { perfRes = { runs: [], errors: [String(e.message || e).split('\n')[0].slice(0, 200)] }; } finally { if (server) await server.close().catch(() => {}); }
      mobileStats.perfMs = Date.now() - tp;
      for (const f of mobileFindings({ perf: perfRes, images: mobileImages, cfg, vw: viewports.find((v) => v < 600) })) hard.push(f);
    }
  } finally {
    if (ownBrowser) await br.close().catch(() => {});
  }

  if (axe) stats.axe = axeStats.ran ? { ran: true, violations: axeStats.violations, viewports: axeStats.viewports, incomplete: axeStats.incomplete } : { ran: false, error: axeStats.error || 'not run' };
  if (slop) slop.jsErrors = [...jsErrors];
  for (const f of textFindings(slop, cfg)) hard.push({ ...f, viewport: viewports[viewports.length - 1] });
  for (const h of fontCdn) hard.push({ rule: 'font-cdn', severity: 'error', detail: `Font loaded from a third-party CDN: ${h} (blocked by the check). Self-host the files; in the EU this sends the visitor's IP address without consent (see legal.md).`, value: h });
  const thirdParty = [...blocked].filter((h) => h !== 'file:' && !fontCdn.has(h) && !/^[a-z-]+:$/.test(h));
  for (const h of thirdParty.slice(0, 8)) hard.push({ rule: 'third-party', severity: 'warn', detail: `Request to a third-party host: ${h} (blocked by the check). Only load what the brief needs, with consent where required.`, value: h });
  const counts = buildCounters(slop, cfg, { brandFonts });
  // house rules: a banned signal is a hard error at its first occurrence, whatever the general threshold allows
  for (const c of counts) {
    if (!ban.has(c.rule) || !(c.count > 0)) continue;
    c.banned = true;
    hard.push({ rule: 'house-banned', severity: 'error', viewport: viewports[viewports.length - 1], detail: `House rules ban "${c.label}": ${c.count}${c.unit || ''} found (the general threshold ${c.threshold}${c.unit || ''} does not apply to this project)` + (c.examples && c.examples.length ? ', e.g. ' + c.examples.slice(0, 3).join(', ') : ''), value: c.rule });
  }
  const drift = palette ? tokenDrift(usage, slop ? slop.fonts : [], palette) : null;
  const findings = [...hard];
  for (const c of counts.filter((x) => x.over)) {
    findings.push({ rule: 'slop:' + c.rule, severity: 'info', detail: `${c.label}: ${c.count}${c.unit || ''} (threshold ${c.threshold}${c.unit || ''})` + (c.examples && c.examples.length ? ' e.g. ' + c.examples.join(', ') : ''), value: c.count });
  }
  if (drift) {
    if (drift.colorShare > 0.1) findings.push({ rule: 'token-drift-color', severity: 'warn', detail: `${Math.round(drift.colorShare * 100)}% of colour weight outside the palette; top: ` + drift.offPalette.slice(0, 4).map((o) => `${o.color} (${o.kinds.join('/')}, nearest ${o.nearest} dE ${o.deltaE})`).join(', '), value: drift.colorShare });
    for (const f of drift.fontsOutside) findings.push({ rule: 'token-drift-font', severity: 'warn', detail: `Font "${f}" is not in the tokens`, value: f });
  }
  if (blocked.size) findings.push({ rule: 'blocked-requests', severity: 'info', detail: 'Blocked requests to (no network beyond the target): ' + [...blocked].slice(0, 8).join(', ') });

  const sc = score({ hard, counts, drift }, cfg);
  const measured = viewports.filter((v) => stats[v]).length;
  const incomplete = measured < viewports.length;
  if (!measured) { sc.score = 0; sc.grade = 'E'; } // nothing measured is never a pass
  else if (incomplete) { sc.grade = sc.grade === 'A' ? 'B' : sc.grade; }
  const sum = summarize({ ...sc, hard, counts, drift, viewports }, cfg);
  let a11yRep = null;
  const at = new Date();
  if (a11yOn) {
    a11yRep = a11ySection({ hard, stats: { axe: stats.axe, keyboard: kbStats }, profile, scope: facts ? facts.scope : null, statement: statementInfo, pdfs: pdfInfo, at });
    sum.summary += ' Accessibility: ' + a11yRep.errors + ' error(s), ' + a11yRep.warnings + ' warning(s); ' + a11yRep.summary_en + '. ' + 'Automated checks cover only part of WCAG 2.2; the manual protocol in references/accessibility-eu.md is still required.';
    sum.summary_de += ' Barrierefreiheit: ' + a11yRep.errors + ' Fehler, ' + a11yRep.warnings + ' Warnung(en); ' + a11yRep.summary + '. Automatische Prüfungen decken nur einen Teil von WCAG 2.2 ab; das manuelle Protokoll in references/accessibility-eu.md bleibt nötig.';
  } else for (const f of hard) annotate(f);
  let mobileRep = null;
  if (mobileOn) {
    mobileRep = mobileSection({ hard, perf: perfRes, scan: mobileScanRes, blocked: [...perfBlocked], cfg, perfMode: !!perf || runs > 1 });
    sum.summary += ' ' + mobileRep.summary_en + '.';
    sum.summary_de += ' ' + mobileRep.summary + '.';
    stats.mobile = { ...mobileStats, perfRuns: perfRes ? perfRes.runs.length : 0 };
  }
  if (!measured) { sum.summary = 'Not measured: the page could not be loaded at any viewport. ' + sum.summary; sum.summary_de = 'Nicht gemessen: Die Seite ließ sich bei keiner Breite laden. ' + sum.summary_de; }
  return {
    score: sc.score,
    grade: sc.grade,
    incomplete,
    rules_version: RULES_VERSION,
    knowledge: cfg.versions,
    at: at.toISOString(),
    target,
    viewports,
    hard,
    counts,
    findings,
    summary: sum.summary,
    summary_de: sum.summary_de,
    deductions: sc.deductions,
    drift,
    fingerprint: fingerprint && slop ? { ...fingerprint, accent: accentOf(slop), surface: slop.surfaceBg, radius: modalRadius(slop.boxRadii) } : fingerprint,
    stats: { ...stats, ms: Date.now() - t0, blocked: [...blocked] },
    shots: shotFiles,
    ...(a11yRep ? { a11y: a11yRep } : {}),
    ...(mobileRep ? { mobile: mobileRep } : {}),
    ...(keepFacts && facts ? { facts } : {}),
  };
}

/**
 * Site mode: check several pages (files or same-origin URLs) with one browser and compare them
 * (consistent navigation 3.2.3, identification 3.2.4, help 3.2.6, titles 2.4.2, multiple ways 2.4.5).
 */
/** Validate house-rule ids against the counted signals of the tells pack (unknown ids fail loudly, never silently). */
export function bannedSignals(banned = [], cfg = loadConfig()) {
  const ids = [...new Set((Array.isArray(banned) ? banned : [banned]).map((x) => String(x).trim()).filter(Boolean))];
  const known = new Set(Object.keys(cfg.rules));
  const bad = ids.filter((x) => !known.has(x));
  if (bad.length) throw new Error('banned: unknown signal id(s) ' + bad.join(', ') + ' (see references/tells.md or kk_knowledge pack=tells)');
  return new Set(ids);
}

async function checkSite(opts) {
  const { pages, browser, ...rest } = opts;
  if (!pages.length) throw new Error('pages needs at least one file or URL');
  const t0 = Date.now();
  const isUrl = (p) => /^https?:\/\//i.test(p);
  let origin = null;
  if (pages.some(isUrl)) {
    if (!pages.every(isUrl)) throw new Error('pages: mix of URLs and files');
    origin = new URL(pages[0]).origin;
    for (const p of pages) if (new URL(p).origin !== origin) throw new Error('pages must share one origin: ' + p);
  }
  const files = origin ? null : pages.map((p) => resolvePath(p));
  let root = rest.fileRoot;
  if (files && !root) {
    const parts = files.map((f) => dirname(f).split(sep));
    const common = [];
    for (let k = 0; k < parts[0].length && parts.every((x) => x[k] === parts[0][k]); k++) common.push(parts[0][k]);
    root = common.join(sep) || sep;
  }
  const own = !browser;
  const br = browser || await chromium.launch();
  const reports = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      const o = { ...rest, browser: br, keepFacts: true, url: undefined, file: undefined, html: undefined };
      if (origin) o.url = pages[i]; else { o.file = files[i]; o.fileRoot = root; }
      try { reports.push(await checkPage(o)); } catch (e) { reports.push({ target: pages[i], error: String(e.message || e).split('\n')[0], score: 0, grade: 'E', hard: [{ rule: 'load-failed', severity: 'error', detail: 'Could not check: ' + String(e.message || e).split('\n')[0] }], counts: [], findings: [] }); }
    }
  } finally { if (own) await br.close().catch(() => {}); }
  const name = (r) => (origin ? new URL(r.target).pathname : r.target.slice(root.length + 1)) || r.target;
  const site = siteFindings(reports.map((r) => ({ target: name(r), facts: r.facts })));
  const cfg = loadConfig();
  const costs = cfg.rules;
  let deduction = 0;
  const per = {};
  for (const f of site) {
    if (f.severity !== 'error') { deduction += 0.5; continue; }
    const c = costs[f.rule]?.cost || { per: 3, cap: 9 };
    per[f.rule] = Math.min(c.cap, (per[f.rule] || 0) + c.per);
  }
  deduction = Math.min(4, deduction) + Object.values(per).reduce((a, b) => a + b, 0);
  const avg = reports.reduce((a, r) => a + (r.score || 0), 0) / reports.length;
  const worst = Math.min(...reports.map((r) => r.score || 0));
  const scoreV = Math.max(0, Math.round(Math.min(avg, worst + 15) - deduction));
  const gradeV = scoreV >= 90 ? 'A' : scoreV >= 75 ? 'B' : scoreV >= 60 ? 'C' : scoreV >= 40 ? 'D' : 'E';
  const at = new Date();
  const hardAll = [];
  for (const r of reports) for (const f of r.hard || []) hardAll.push({ ...f, page: name(r) });
  for (const f of site) hardAll.push({ ...f, page: 'site' });
  const a11yRep = rest.a11y === false ? null : a11ySection({ hard: hardAll.map((f) => ({ ...f })), profile: rest.profile || 'none', at });
  if (a11yRep) a11yRep.site = { pages: reports.length, findings: site.length };
  const errs = site.filter((f) => f.severity === 'error').length;
  for (const r of reports) delete r.facts;
  return {
    mode: 'site',
    score: scoreV,
    grade: gradeV,
    incomplete: reports.some((r) => r.incomplete || r.error),
    rules_version: RULES_VERSION,
    knowledge: reports[0] && reports[0].knowledge,
    at: at.toISOString(),
    target: 'site: ' + reports.length + ' page(s)',
    viewports: reports[0] && reports[0].viewports,
    pages: reports,
    site: { findings: site },
    hard: hardAll,
    counts: [],
    findings: hardAll,
    summary: `Site of ${reports.length} page(s): score ${scoreV}/100, grade ${gradeV} (page scores ${reports.map((r) => r.score).join('/')}); ${errs} cross-page error(s), ${site.length - errs} warning(s).` + (a11yRep ? ' ' + a11yRep.summary_en + '. Automated checks cover only part of WCAG 2.2; the manual protocol in references/accessibility-eu.md is still required.' : ''),
    summary_de: `Website mit ${reports.length} Seite(n): ${scoreV}/100, Note ${gradeV} (Seiten ${reports.map((r) => r.score).join('/')}); ${errs} seitenübergreifende(r) Fehler, ${site.length - errs} Warnung(en).` + (a11yRep ? ' ' + a11yRep.summary + '.' : ''),
    stats: { ms: Date.now() - t0 },
    ...(a11yRep ? { a11y: a11yRep } : {}),
  };
}

function modalRadius(radii) {
  if (!radii || !radii.length) return 0;
  const f = {}; for (const r of radii) { const k = Math.round(r / 2) * 2; f[k] = (f[k] || 0) + 1; }
  return +Object.entries(f).sort((a, b) => b[1] - a[1])[0][0];
}

function accentOf(S) {
  // most prominent chromatic colour among buttons, links, heading accents, gradients
  const w = {};
  for (const a of S.accents) {
    if (a.kind === 'text') continue;
    const o = oklchOf(a.rgb);
    if (o.c < 0.06) continue;
    const k = a.rgb.join(',');
    w[k] = (w[k] || 0) + a.w * (a.kind === 'button' ? 3 : 1);
  }
  const top = Object.entries(w).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const rgb = top[0].split(',').map(Number);
  const o = oklchOf(rgb);
  return { rgb, l: +o.l.toFixed(3), c: +o.c.toFixed(3), h: Number.isNaN(o.h) ? null : +o.h.toFixed(1) };
}
