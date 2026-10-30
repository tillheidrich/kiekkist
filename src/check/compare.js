// Distance between design directions: are three "directions" really three ideas?
// Measures the first screen (desktop and mobile) of each target and compares every pair on:
//   - perceptual hash of the first screen (dHash, 64 bit; small Hamming distance = looks alike when you blink)
//   - hero arrangement (where the H1 and the largest image sit in the first screen)
//   - same H1 text, same hero image file
//   - section sequence (H2 texts) and the font roles of H1 and body
// A pair fails ("zu ähnlich") when the blink hash is very close or two or more structural signals match.
import { chromium } from 'playwright';
import { resolve as resolvePath, dirname, sep, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

export const COMPARE_VERSION = '2026-10-29.1';

function probeFirstScreen() {
  const vw = innerWidth, vh = innerHeight;
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const h1 = document.querySelector('h1');
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.top < vh && r.bottom > 0; };
  const area = (r) => Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  let img = null, best = 0;
  for (const el of document.querySelectorAll('img, picture, video, svg, canvas, [style*="background-image"]')) {
    if (!visible(el)) continue;
    const a = area(el.getBoundingClientRect());
    if (a > best && a > vw * vh * 0.04) { best = a; img = el; }
  }
  const zone = (r) => {
    if (!r) return 'none';
    const cx = (r.left + r.right) / 2 / vw, cy = (r.top + r.bottom) / 2 / vh;
    const h = cx < 0.4 ? 'left' : cx > 0.6 ? 'right' : 'center';
    const v = cy < 0.4 ? 'top' : cy > 0.66 ? 'bottom' : 'middle';
    return v + '-' + h;
  };
  const h1r = h1 && visible(h1) ? h1.getBoundingClientRect() : null;
  const imgr = img ? img.getBoundingClientRect() : null;
  const src = img ? (img.currentSrc || img.src || img.querySelector?.('img')?.currentSrc || '') : '';
  const fam = (el) => (el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase() : '');
  const bodyText = [...document.querySelectorAll('p')].find((p) => p.textContent.trim().length > 60);
  const bg = getComputedStyle(document.body).backgroundColor;
  return {
    h1: norm(h1?.textContent).slice(0, 200),
    h1Zone: zone(h1r),
    h1Size: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : 0,
    imageZone: zone(imgr),
    imageShare: Math.round((best / (vw * vh)) * 100) / 100,
    imageFile: src ? decodeURIComponent(src.split('/').pop().split('?')[0]).replace(/-\d+(w)?(?=\.)/, '').toLowerCase() : '',
    sections: [...document.querySelectorAll('h2')].map((h) => norm(h.textContent).slice(0, 80)).slice(0, 12),
    fonts: { h1: fam(h1), body: fam(bodyText) },
    background: bg,
  };
}

async function dHash(browser, png) {
  // decode the screenshot in a blank page: 9x8 grayscale, compare neighbours -> 64 bit
  const page = await browser.newPage();
  try {
    return await page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = 9; c.height = 8;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 9, 8);
      const d = x.getImageData(0, 0, 9, 8).data; let bits = '';
      for (let y = 0; y < 8; y++) for (let i = 0; i < 8; i++) {
        const p = (y * 9 + i) * 4, q = (y * 9 + i + 1) * 4;
        const a = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114, b = d[q] * 0.299 + d[q + 1] * 0.587 + d[q + 2] * 0.114;
        bits += a > b ? '1' : '0';
      }
      return bits;
    }, png.toString('base64'));
  } finally { await page.close(); }
}
const hamming = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };

/**
 * @param {{targets: Array<{name?: string, file?: string, url?: string, root?: string}>, browser?: import('playwright').Browser, timeout?: number}} o
 */
export async function compareTargets({ targets, browser, timeout = 20000, ignore = [] } = {}) {
  // ignore: signals fixed by the brief (e.g. 'h1' when the claim is locked, 'background' when the brand fixes paper)
  const skip = new Set(ignore);
  if (!Array.isArray(targets) || targets.length < 2) throw new Error('compare needs at least two targets');
  if (targets.length > 6) throw new Error('compare takes at most six targets');
  const own = !browser; const br = browser || (await chromium.launch());
  const measured = [];
  try {
    for (const [i, t] of targets.entries()) {
      const m = { name: t.name || t.file && basename(dirname(t.file)) || t.url || 'target ' + (i + 1), screens: {} };
      for (const [w, h, key] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
        const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: 'block' });
        try {
          if (t.file) {
            const root = pathToFileURL(resolvePath(t.root || dirname(t.file)) + sep).href;
            await ctx.route('**/*', (r) => { const u = r.request().url(); return u.startsWith(root) || u.startsWith('data:') ? r.continue() : r.abort(); });
          } else {
            const origin = new URL(t.url).origin;
            await ctx.route('**/*', (r) => { const u = r.request().url(); return u.startsWith(origin) || u.startsWith('data:') ? r.continue() : r.abort(); });
          }
          const page = await ctx.newPage();
          await page.goto(t.file ? pathToFileURL(resolvePath(t.file)).href : t.url, { waitUntil: 'load', timeout });
          await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
          await page.waitForTimeout(250);
          const facts = await page.evaluate(probeFirstScreen);
          const png = await page.screenshot({ type: 'png' });
          m.screens[key] = { ...facts, hash: await dHash(br, png) };
        } catch (e) {
          m.screens[key] = { error: String(e.message || e).split('\n')[0] };
        } finally { await ctx.close().catch(() => {}); }
      }
      measured.push(m);
    }
  } finally { if (own) await br.close().catch(() => {}); }

  const pairs = [];
  for (let a = 0; a < measured.length; a++) for (let b = a + 1; b < measured.length; b++) {
    const A = measured[a], B = measured[b], signals = [];
    const dA = A.screens.desktop, dB = B.screens.desktop, mA = A.screens.mobile, mB = B.screens.mobile;
    if (dA?.error || dB?.error) { pairs.push({ a: A.name, b: B.name, verdict: 'not measured', signals: [dA?.error || dB?.error] }); continue; }
    const blinkDesktop = hamming(dA.hash, dB.hash), blinkMobile = mA?.hash && mB?.hash ? hamming(mA.hash, mB.hash) : null;
    if (!skip.has('h1') && dA.h1 && dA.h1 === dB.h1) signals.push('same H1 text');
    if (!skip.has('image') && dA.imageFile && dA.imageFile === dB.imageFile) signals.push('same hero image');
    if (dA.h1Zone === dB.h1Zone && dA.imageZone === dB.imageZone) signals.push(`same first-screen arrangement (H1 ${dA.h1Zone}, image ${dA.imageZone})`);
    const sec = jaccard(dA.sections, dB.sections);
    if (sec >= 0.5) signals.push(`same section sequence (${Math.round(sec * 100)} % shared H2)`);
    if (!skip.has('fonts') && dA.fonts.h1 === dB.fonts.h1 && dA.fonts.body === dB.fonts.body) signals.push(`same type roles (${dA.fonts.h1} / ${dA.fonts.body})`);
    if (!skip.has('background') && dA.background === dB.background) signals.push('same page background');
    const blinkClose = blinkDesktop <= 10 || (blinkMobile !== null && blinkMobile <= 8);
    const structural = signals.filter((s) => !/background|type roles/.test(s)).length;
    const verdict = blinkClose || structural >= 2 ? 'too similar' : structural === 1 || signals.length >= 3 ? 'borderline' : 'distinct';
    pairs.push({ a: A.name, b: B.name, verdict, blink: { desktop: blinkDesktop, mobile: blinkMobile, note: '0-64; below 10 looks alike at a glance, above 20 clearly different' }, signals });
  }
  const failed = pairs.filter((p) => p.verdict === 'too similar').length;
  const border = pairs.filter((p) => p.verdict === 'borderline').length;
  const summary = failed ? `${failed} of ${pairs.length} pairs are too similar: rebuild one of each such pair on a different concept and topology.`
    : border ? `No pair fails; ${border} borderline. Check the listed signals.` : 'All pairs are clearly distinct.';
  const summary_de = failed ? `${failed} von ${pairs.length} Paaren sind zu ähnlich: je eine Richtung pro Paar mit anderem Konzept und anderem Seitenaufbau neu bauen.`
    : border ? `Kein Paar fällt durch, ${border} grenzwertig. Die genannten Signale prüfen.` : 'Alle Paare sind klar unterscheidbar.';
  return { version: COMPARE_VERSION, ignored: [...skip], ok: failed === 0, summary, summary_de, pairs, targets: measured.map((m) => ({ name: m.name, desktop: strip(m.screens.desktop), mobile: strip(m.screens.mobile) })) };
}
const strip = (s) => (s ? { ...s, hash: undefined } : s);

// CLI: node src/check/compare.js a/index.html b/index.html c/index.html [--json]
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2); const json = args.includes('--json');
  const ig = args.find((a) => a.startsWith('--ignore='))?.slice(9).split(',').filter(Boolean) || [];
  const targets = args.filter((a) => !a.startsWith('--')).map((t) => (/^https?:/.test(t) ? { url: t } : { file: t }));
  compareTargets({ targets, ignore: ig }).then((r) => {
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(r.summary_de);
      for (const p of r.pairs) console.log(`  ${p.verdict.padEnd(12)} ${p.a} / ${p.b}  blink ${p.blink?.desktop ?? '-'}/${p.blink?.mobile ?? '-'}  ${p.signals.join('; ')}`);
    }
    process.exitCode = r.ok ? 0 : 1;
  }).catch((e) => { console.error(e.message); process.exitCode = 2; });
}
