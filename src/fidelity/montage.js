// Montages without an image library: the images are laid out on an offline page (data URIs only, network blocked)
// and screenshotted. Used for side-by-side pairs (kk fidelity) and frame strips (kk motion).
import { readFileSync, existsSync } from 'node:fs';
import { getBrowser, withContextSlot } from '../browser.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const dataUri = (f) => `data:image/${/\.png$/i.test(f) ? 'png' : 'jpeg'};base64,${readFileSync(f).toString('base64')}`;

/**
 * @param {{file:string,label?:string}[]} items
 * @param {string} outFile  .jpg
 * @param {{columns?:number, scale?:number, maxHeight?:number, title?:string}} o
 */
export async function montage(items, outFile, { columns = 2, scale = 0.5, maxHeight = 15000, title = '' } = {}) {
  const list = items.filter((i) => i.file && existsSync(i.file));
  if (!list.length) return null;
  const browser = await getBrowser();
  return withContextSlot(async () => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1, javaScriptEnabled: true });
    await ctx.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    try {
      const page = await ctx.newPage();
      const cells = list.map((i) => `<figure><figcaption>${esc(i.label || '')}</figcaption><img src="${dataUri(i.file)}"></figure>`).join('');
      await page.setContent(`<!doctype html><style>body{margin:0;background:#fff;font:600 14px/1.2 system-ui,sans-serif;color:#b00020}h1{font-size:15px;margin:8px 10px;color:#111}
        .g{display:grid;grid-template-columns:repeat(${columns},max-content);gap:12px;padding:10px;align-items:start}figure{margin:0}figcaption{padding:0 0 4px}img{display:block;outline:1px solid #ddd}</style>
        ${title ? `<h1>${esc(title)}</h1>` : ''}<div class="g">${cells}</div>`, { waitUntil: 'load' });
      // scale every image so the whole sheet fits the height cap
      const dims = await page.evaluate(() => [...document.images].map((i) => [i.naturalWidth, i.naturalHeight]));
      const rows = []; for (let k = 0; k < dims.length; k += columns) rows.push(Math.max(...dims.slice(k, k + columns).map((d) => d[1])));
      const total = rows.reduce((a, b) => a + b, 0) * scale + rows.length * 40 + 60;
      const s = total > maxHeight ? scale * (maxHeight / total) : scale;
      const width = await page.evaluate((sc) => { for (const i of document.images) i.style.width = Math.round(i.naturalWidth * sc) + 'px'; return document.querySelector('.g').scrollWidth; }, s);
      await page.setViewportSize({ width: Math.max(200, width), height: 300 });
      await page.screenshot({ path: outFile, type: 'jpeg', quality: 72, fullPage: true });
      return outFile;
    } finally { await ctx.close().catch(() => {}); }
  });
}
