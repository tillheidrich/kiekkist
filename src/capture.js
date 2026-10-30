import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { converter, formatHex } from 'culori';
import { db, DATA_DIR, now, row, logEvent } from './db.js';
import { getBrowser, newSafeContext, assertClean, withContextSlot, withDeadline, isPublicUrl, UA, dismissOverlays, settle } from './browser.js';

const toOklch = converter('oklch');
export function oklchString(color) {
  const c = toOklch(color);
  if (!c) return null;
  const h = Number.isFinite(c.h) ? c.h : 0;
  return `oklch(${(c.l * 100).toFixed(1)}% ${c.c.toFixed(3)} ${h.toFixed(1)})`;
}

// Runs in the page: collects rendered design facts (computed styles), weighted by visible area.
function extractInPage() {
  const vw = innerWidth, vh = innerHeight;
  const bg = new Map(), fg = new Map(), fonts = new Map(), sizes = new Map(), radii = new Map(), gaps = new Map();
  const add = (m, k, w) => { if (!k) return; m.set(k, (m.get(k) || 0) + w); };
  const els = [...document.querySelectorAll('body, body *')].slice(0, 4000);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const area = Math.min(r.width, vw) * Math.min(r.height, vh * 3);
    const b = cs.backgroundColor;
    if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) add(bg, b, area);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (hasText) {
      const len = el.textContent.trim().length;
      add(fg, cs.color, len);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      add(fonts, fam + '|' + cs.fontWeight, len);
      add(sizes, Math.round(parseFloat(cs.fontSize)), len);
    }
    const rad = parseFloat(cs.borderTopLeftRadius);
    if (rad > 0 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px')) add(radii, Math.round(rad), 1);
    for (const p of ['paddingTop', 'paddingLeft', 'gap', 'marginBottom']) { const v = Math.round(parseFloat(cs[p])); if (v >= 4 && v <= 256) add(gaps, v, 1); }
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const h1 = document.querySelector('h1');
  const h1cs = h1 ? getComputedStyle(h1) : null;
  return {
    title: document.title,
    description: document.querySelector('meta[name=description]')?.content || '',
    lang: document.documentElement.lang || '',
    backgrounds: top(bg, 6), texts: top(fg, 6), fonts: top(fonts, 8), sizes: top(sizes, 10),
    radii: top(radii, 5), spacing: top(gaps, 10),
    h1: h1 ? { text: h1.textContent.trim().slice(0, 160), size: h1cs.fontSize, family: h1cs.fontFamily, weight: h1cs.fontWeight, lineHeight: h1cs.lineHeight, letterSpacing: h1cs.letterSpacing } : null,
    sections: [...document.querySelectorAll('main > section, body > section, main > div > section, [class*=section]')].slice(0, 30).length,
    pageHeight: document.documentElement.scrollHeight,
  };
}

const num = (v) => (Number.isFinite(+v) ? +v : null);
const str = (v, n = 200) => (typeof v === 'string' ? v.slice(0, n) : null);
const list = (v, n) => (Array.isArray(v) ? v.slice(0, n).filter((e) => Array.isArray(e) && e.length === 2 && Number.isFinite(+e[1])) : []);
// The page can tamper with evaluate() results (it runs in the page's world): coerce every value to its expected type.
function sanitizeFacts(x) {
  x = x && typeof x === 'object' ? x : {};
  const strPair = (e) => [String(e[0]).slice(0, 120), +e[1]];
  const numPair = (e) => [num(e[0]), +e[1]];
  const h1 = x.h1 && typeof x.h1 === 'object' ? Object.fromEntries(['text', 'size', 'family', 'weight', 'lineHeight', 'letterSpacing'].map((k) => [k, str(x.h1[k], k === 'family' ? 200 : 160)])) : null;
  return {
    title: str(x.title), description: str(x.description, 400), lang: str(x.lang, 20),
    backgrounds: list(x.backgrounds, 6).map(strPair), texts: list(x.texts, 6).map(strPair), fonts: list(x.fonts, 8).map(strPair),
    sizes: list(x.sizes, 10).map(numPair).filter((e) => e[0] != null), radii: list(x.radii, 5).map(numPair).filter((e) => e[0] != null),
    spacing: list(x.spacing, 10).map(numPair).filter((e) => e[0] != null), h1, sections: num(x.sections), pageHeight: Math.min(num(x.pageHeight) || 900, 50000),
  };
}
function summarizeTokens(x) {
  const pct = (list) => { const t = list.reduce((s, [, w]) => s + w, 0) || 1; return list.map(([k, w]) => ({ value: k, share: +(w / t).toFixed(3) })); };
  const col = (list) => pct(list).map((c) => ({ ...c, oklch: oklchString(c.value), hex: formatHex(c.value) || null }));
  const fonts = pct(x.fonts).map((f) => { const [family, weight] = f.value.split('|'); return { family, weight, share: f.share }; });
  return {
    colors: { backgrounds: col(x.backgrounds), text: col(x.texts) },
    fonts, fontSizes: x.sizes.map(([s]) => s).sort((a, b) => a - b),
    radii: x.radii.map(([r]) => r), spacing: x.spacing.map(([s]) => s).sort((a, b) => a - b),
    h1: x.h1, pageHeight: x.pageHeight, lang: x.lang,
  };
}

const queue = [];
let running = false;
export function enqueueCapture(id) { if (!queue.includes(id)) queue.push(id); pump(); }
async function pump() {
  if (running) return; running = true;
  try { while (queue.length) { const id = queue.shift(); await captureRef(id).catch(() => {}); } }
  finally { running = false; }
}
export const queueLength = () => queue.length + (running ? 1 : 0);

export async function captureRef(id) {
  const ref = row(db.prepare('SELECT * FROM refs WHERE id=?').get(id));
  if (!ref) return;
  const set = (f) => db.prepare(`UPDATE refs SET ${Object.keys(f).map((k) => k + '=@' + k).join(',')} WHERE id=@id`).run({ ...f, id });
  set({ status: 'capturing', error: null });
  try {
    if (!(await isPublicUrl(ref.url))) throw new Error('URL is not a public http(s) address');
    const dir = join(DATA_DIR, 'refs', id); mkdirSync(dir, { recursive: true });
    const browser = await getBrowser();
    await withContextSlot(() => withDeadline(150_000, cur, () => doCapture(ref, dir, browser, set)));
    logEvent('ref.captured', id, { url: ref.url });
  } catch (e) {
    set({ status: 'error', error: String(e.message || e).slice(0, 300) });
  } finally { if (cur.ctx) await cur.ctx.close().catch(() => {}); cur.ctx = null; }
}
const cur = { ctx: null }; // the one context the serial capture queue is using (closed on deadline)

async function doCapture(ref, dir, browser, set) {
  // Desktop
  cur.ctx = await newSafeContext(browser, { viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'de-DE', deviceScaleFactor: 1 });
  let page = await cur.ctx.newPage();
  await page.goto(ref.url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissOverlays(page);
  await settle(page);
  await dismissOverlays(page);
  const facts = sanitizeFacts(await page.evaluate(extractInPage));
  await assertClean(cur.ctx);
  await page.screenshot({ path: join(dir, 'shot-desktop.jpg'), type: 'jpeg', quality: 78 });
  const h = facts.pageHeight || 900;
  for (const [i, frac] of [[2, 0.28], [3, 0.55]]) {
    const y = Math.min(Math.round(h * frac), Math.max(0, h - 900));
    if (y < 300) continue;
    await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(700);
    await assertClean(cur.ctx);
    await page.screenshot({ path: join(dir, `shot-desktop-${i}.jpg`), type: 'jpeg', quality: 76 });
  }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  await assertClean(cur.ctx);
  await page.screenshot({ path: join(dir, 'full.jpg'), type: 'jpeg', quality: 60, fullPage: true, clip: { x: 0, y: 0, width: 1440, height: Math.min(h, 7000) } }).catch(() => {});
  const finalUrl = page.url();
  await cur.ctx.close(); cur.ctx = null;
  // Mobile
  cur.ctx = await newSafeContext(browser, { viewport: { width: 390, height: 844 }, userAgent: UA.replace('Macintosh; Intel Mac OS X 10_15_7', 'iPhone; CPU iPhone OS 18_0 like Mac OS X') + ' Mobile', locale: 'de-DE', deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await cur.ctx.newPage();
  await page.goto(ref.url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await dismissOverlays(page); await settle(page, 2500); await dismissOverlays(page);
  await assertClean(cur.ctx);
  await page.screenshot({ path: join(dir, 'shot-mobile.jpg'), type: 'jpeg', quality: 74 });
  await cur.ctx.close(); cur.ctx = null;
  const tokens = summarizeTokens(facts);
  writeFileSync(join(dir, 'tokens.json'), JSON.stringify(tokens, null, 2));
  let domain = null; try { domain = new URL(finalUrl).hostname.replace(/^www\./, ''); } catch {}
  set({ status: 'ok', captured_at: now(), title: ref.title || facts.title?.slice(0, 200) || null, tokens: JSON.stringify(tokens), domain: domain || ref.domain });
}
