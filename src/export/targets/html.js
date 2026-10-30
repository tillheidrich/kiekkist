// Plain HTML target: pages at the root, assets unchanged, per-page meta, sitemap, robots, 404,
// legal stubs, .htaccess and _headers with the security headers from launch.md L10.
import { urlMapper, mapIR, renderBody, headHtml, faviconSvg, robotsTxt, sitemapXml, htaccess, headersFile, stubBody, LEGAL_TEXT, notFoundBody, readBin, legalRoutes } from './common.js';
import { escapeText } from '../html.js';

export const meta = { id: 'html', tier: 1, status: 'ready', label: 'Plain HTML', editable: 'Only by someone who edits HTML, or by an agent.' };

export function pageHtml(ir, page, body, opts = {}) {
  return `<!doctype html>\n${page.htmlOpen}\n<head>\n${headHtml(ir, page, opts)}\n</head>\n${page.bodyOpen}\n${body}\n</body>\n</html>\n`;
}

export async function exportTarget(ir, opts = {}) {
  const files = new Map(), notes = [];
  const mapUrl = urlMapper(ir, 'files');
  const routes = { ...legalRoutes(ir, 'impressum.html', 'datenschutz.html'), home: 'index.html' };
  const data = mapIR(ir, mapUrl, routes);
  const abs = urlMapper(ir, 'files', { assetBase: '/' });
  for (const page of ir.pages) {
    // the theme's own 404 page is served at any path: absolute asset URLs
    const m = page.slug === '404' ? abs : mapUrl;
    files.set(`${page.slug}.html`, pageHtml(ir, page, renderBody(ir, page, m, routes, page.slug === '404' ? mapIR(ir, abs, routes) : data), { mapUrl: m, icon: 'favicon.svg', canonicalPath: page.slug === 'index' ? '/' : `/${page.slug}.html` }));
  }
  const stub = (slug, title, inner) => {
    const page = { ...ir.pages[0], slug, path: `/${slug}.html`, title: `${title} · ${ir.site.name}`, description: '', og: { title, description: '', image: '' } };
    return pageHtml(ir, page, stubBody(ir, abs, routes, mapIR(ir, abs, routes), slug, inner), { mapUrl: abs, icon: '/favicon.svg', canonicalPath: `/${slug}.html` });
  };
  for (const key of ['impressum', 'datenschutz']) if (routes[key] && !ir.pages.some((p) => p.slug === key)) { files.set(`${key}.html`, stub(key, LEGAL_TEXT[key].title, `<h1>${LEGAL_TEXT[key].title}</h1>\n${LEGAL_TEXT[key].body}`)); notes.push(`${key}.html is a stub with TODO(owner) markers; kk launch reports it until it is filled`); }
  if (!ir.pages.some((p) => p.slug === '404')) files.set('404.html', stub('404', 'Seite nicht gefunden', notFoundBody('/')));
  files.set('tokens.css', ir.tokens.css);
  for (const a of ir.assets) files.set(a.path, readBin(opts.themeDir, a.path));
  files.set('favicon.svg', faviconSvg(ir));
  files.set('robots.txt', robotsTxt(ir));
  files.set('sitemap.xml', sitemapXml(ir, [...ir.pages.filter((p) => p.slug !== '404').map((p) => (p.slug === 'index' ? '/' : `/${p.slug}.html`)), ...['impressum', 'datenschutz'].filter((k) => routes[k]).map((k) => `/${k}.html`)]));
  files.set('.htaccess', htaccess(ir));
  files.set('_headers', headersFile(ir));
  if (!ir.site.url) notes.push('no --site-url: canonical, og:url and the sitemap line in robots.txt are left out (sitemap.xml uses example.invalid)');
  notes.push('og:image is not set: add a 1200x630 image from the social roll-out (seo.og)');
  return { files, notes, postCheck: { serveDir: '.', pages: ir.pages.filter((p) => p.slug !== '404').map((p) => `/${p.slug}.html`), sourcePages: ir.pages.filter((p) => p.slug !== '404').map((p) => p.file) } };
}

