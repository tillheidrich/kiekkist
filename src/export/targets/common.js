// Shared helpers for export adapters: URL mapping, head, legal stubs, robots/sitemap/404, security headers.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { escapeAttr, escapeText, serialize } from '../html.js';
import { renderHtml, mapUrlsInHtml } from '../template.js';
import { sectionData } from '../ir.js';
import { flatten } from '../tokens/flatten.js';
import { hexOf } from '../tokens/elementor.js';

/** Legal pages the theme already has (slug matches), so no stubs are written and links are left alone. */
export function themeLegal(ir) {
  const has = (re) => ir.pages.some((p) => re.test(p.slug));
  return { impressum: has(/^(impressum|imprint|legal|rechtliches|legal-notice)$/i), datenschutz: has(/^(datenschutz|privacy|legal|rechtliches|privacy-policy)$/i) };
}
/** Routes for legal links: stub routes only for what the theme does not have. */
export function legalRoutes(ir, impressum, datenschutz) {
  const t = themeLegal(ir);
  return { impressum: t.impressum ? null : impressum, datenschutz: t.datenschutz ? null : datenschutz };
}
export const LEGAL = { impressum: /^(impressum|imprint|legal notice)$/i, datenschutz: /^(datenschutz(erklärung)?|privacy( policy)?)$/i };

/**
 * URL mapper. mode 'files': pages at the output root keep .html names (plain HTML).
 * mode 'routes': index.html -> /, x.html -> /x/, ../assets/… -> /assets/… (Astro, React, WordPress).
 */
export function urlMapper(ir, mode, { assetBase = mode === 'files' ? '' : '/' } = {}) {
  const slugs = new Set(ir.pages.map((p) => p.slug));
  const one = (u) => {
    if (!u || /^(#|mailto:|tel:|data:|blob:|https?:|\/\/|javascript:)/i.test(u)) return u;
    const m = /^(?:\.\/)?([\w-]+)\.html(#.*)?$/.exec(u);
    if (m && slugs.has(m[1])) return mode === 'files' ? u : (m[1] === 'index' ? '/' : `/${m[1]}/`) + (m[2] || '');
    if (/^\.\.\//.test(u)) { const rest = u.replace(/^(\.\.\/)+/, ''); return mode === 'files' ? (assetBase === '/' ? '/' + rest : rest) : assetBase + rest; }
    return u;
  };
  return (v, name) => (name === 'srcset' ? String(v).split(',').map((s) => { const [url, ...d] = s.trim().split(/\s+/); return [one(url), ...d].join(' '); }).join(', ') : one(v));
}

/** Footer/nav links whose text is "Impressum"/"Datenschutz" point to the legal pages. */
export function legalLinks(html, routes) {
  return String(html).replace(/<a\b([^>]*)>([^<]{3,40})<\/a>/g, (m, attrs, text) => {
    const t = text.trim();
    const key = LEGAL.impressum.test(t) ? 'impressum' : LEGAL.datenschutz.test(t) ? 'datenschutz' : null;
    if (!key) return m;
    if (!routes[key]) return m;
    const href = /\bhref=("([^"]*)"|'([^']*)')/.exec(attrs);
    const cur = href ? (href[2] ?? href[3]) : '';
    if (cur && !cur.startsWith('#')) return m; // already points to a page: keep the theme's own legal page
    const a = href ? attrs.replace(/\bhref=("[^"]*"|'[^']*')/, `href="${routes[key]}"`) : `${attrs} href="${routes[key]}"`;
    return `<a${a}>${text}</a>`;
  });
}

/** Data of a section/collection with URLs mapped (href/src/srcset values and URLs inside rich HTML) and legal links fixed. */
export function mappedData(obj, fields, mapUrl, routes) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const f = fields.find((x) => x.key === k);
    if (v === null || v === undefined || !f) { out[k] = v; continue; }
    if (f.attr && ['href', 'src', 'srcset', 'poster', 'action'].includes(f.attr)) out[k] = mapUrl(v, f.attr);
    else if (f.kind === 'rich') out[k] = legalLinks(mapUrlsInHtml(v, mapUrl), routes);
    else out[k] = v;
  }
  // a plain-text link "Impressum" whose href is a separate field
  for (const f of fields) if (f.kind === 'text' && !f.attr && typeof out[f.key] === 'string') {
    const key = LEGAL.impressum.test(out[f.key].trim()) ? 'impressum' : LEGAL.datenschutz.test(out[f.key].trim()) ? 'datenschutz' : null;
    const hrefField = key && fields.find((x) => x.attr === 'href' && x.key === f.key + 'Href');
    if (hrefField && routes[key] && (!out[hrefField.key] || String(out[hrefField.key]).startsWith('#'))) out[hrefField.key] = routes[key];
  }
  return out;
}

export function mapIR(ir, mapUrl, routes) {
  const sections = {}, collections = {};
  for (const [n, s] of Object.entries(ir.sections)) sections[n] = mappedData(sectionData(s), s.props, mapUrl, routes);
  for (const [n, c] of Object.entries(ir.collections)) collections[n] = { ...c, items: c.items.map((it) => mappedData(it, c.fields, mapUrl, routes)) };
  return { sections, collections };
}

/** Body HTML of a page, sections rendered from data (proves the template round-trips). */
export function renderBody(ir, page, mapUrl, routes, data = mapIR(ir, mapUrl, routes)) {
  const ctx = { collections: data.collections, mapUrl: (v) => v };
  const fix = (h) => legalLinks(mapUrlsInHtml(h, mapUrl), routes);
  return page.parts.map((p) => (p.kind === 'raw' ? fix(p.html) : renderHtml(ir.sections[p.name].node, data.sections[p.name], ctx))).join('');
}

export function pageTitle(ir, page) { return page.title || ir.site.name; }

/** <head> content for a page. Stylesheets, scripts and other head elements come from the theme page (URLs mapped). */
export function headHtml(ir, page, { mapUrl = (v) => v, css = null, icon = '/favicon.svg', canonicalPath = page.path } = {}) {
  const url = ir.site.url ? ir.site.url + canonicalPath : '';
  const t = escapeText(pageTitle(ir, page)), d = escapeAttr(page.description || ir.site.description || '');
  const sheets = css || (page.stylesheets || []).map((h) => mapUrl(h, 'href'));
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${t}</title>`,
    d ? `<meta name="description" content="${d}">` : '',
    url ? `<link rel="canonical" href="${escapeAttr(url)}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeAttr(page.og.title || pageTitle(ir, page))}">`,
    d ? `<meta property="og:description" content="${escapeAttr(page.og.description || page.description)}">` : '',
    url ? `<meta property="og:url" content="${escapeAttr(url)}">` : '',
    page.og.image ? `<meta property="og:image" content="${escapeAttr(page.og.image)}">` : '',
    `<meta property="og:locale" content="${ogLocale(page.lang)}">`,
    page.hasIcon ? '' : `<link rel="icon" href="${icon}" type="image/svg+xml">`,
    ...headExtraBefore(page, mapUrl),
    ...sheets.map((h) => `<link rel="stylesheet" href="${h}">`),
    ...headExtraAfter(page, mapUrl),
  ].filter(Boolean).join('\n');
}
// head elements keep their place relative to the stylesheets (preloads before, scripts after)
const isPre = (h) => /^<(meta|link)\b/i.test(h);
export const headExtraBefore = (page, mapUrl) => (page.headExtra || []).filter(isPre).map((h) => mapUrlsInHtml(h, mapUrl));
export const headExtraAfter = (page, mapUrl) => (page.headExtra || []).filter((h) => !isPre(h)).map((h) => mapUrlsInHtml(h, mapUrl));

/** Theme-relative paths of the stylesheets and scripts the theme's pages load (index page order, then others). */
export function headAssets(ir) {
  const rel = (u) => (/^(https?:|\/\/|data:)/.test(u) ? null : u.replace(/^(\.\.\/)+/, '').replace(/^\.\//, ''));
  const sheets = [], scripts = [];
  for (const p of ir.pages) {
    for (const h of p.stylesheets || []) { const r = rel(h); if (r && !sheets.includes(r)) sheets.push(r); }
    for (const s of p.scripts || []) { const r = rel(s.src); if (r && !scripts.some((x) => x.path === r)) scripts.push({ ...s, path: r }); }
  }
  return { sheets, scripts };
}

/** Does the theme need inline styles or scripts (style attributes, <style>, inline <script>)? Then a hash-based CSP would break it. */
export function needsInline(ir) {
  const re = /\sstyle=|<style\b|<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/i;
  return Object.values(ir.sections).some((s) => re.test(s.html)) || ir.pages.some((p) => p.parts.some((x) => x.kind === 'raw' && re.test(x.html)) || (p.headExtra || []).some((h) => /<style\b|<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)/i.test(h)));
}

/** Two token colours for a monogram favicon: page background and text. */
export function brandColors(ir) {
  const flat = flatten(ir.tokens.dtcg || {}).filter((t) => t.type === 'color');
  const pick = (re) => flat.find((t) => re.test(t.path));
  const fg = pick(/\.(ink|text|night|steel)$/) || flat[0];
  const bg = pick(/\.(paper|bone|white|sheet|ground|panel)$/) || flat[1] || flat[0];
  return { fg: fg ? hexOf(fg.value) : '#000', bg: bg ? hexOf(bg.value) : '#fff' };
}
export function faviconSvg(ir) {
  const { fg, bg } = brandColors(ir);
  const letter = escapeText((ir.site.name || 'K').trim()[0].toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${bg}"/><text x="32" y="44" font-family="Georgia, serif" font-size="38" text-anchor="middle" fill="${fg}">${letter}</text></svg>\n`;
}

export function robotsTxt(ir, sitemapPath = '/sitemap.xml') {
  return `User-agent: *\nAllow: /\n${ir.site.url ? `Sitemap: ${ir.site.url}${sitemapPath}\n` : `# TODO(owner): add "Sitemap: https://<your-domain>${sitemapPath}" once the domain is known (kk export --site-url)\n`}`;
}
export function sitemapXml(ir, paths) {
  const base = ir.site.url || 'https://example.invalid';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${escapeText(base + p)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

/** Hashes of inline scripts (not JSON-LD) in the theme, for script-src. */
export function inlineScriptHashes(ir) {
  const blobs = [...Object.values(ir.sections).map((x) => x.html), ...ir.pages.flatMap((p) => [...(p.headExtra || []), ...p.parts.filter((x) => x.kind === 'raw').map((x) => x.html)])];
  const out = new Set();
  for (const b of blobs) for (const m of b.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/i.test(m[1]) || /application\/(ld\+)?json/i.test(m[1]) || !m[2].trim()) continue;
    out.add(`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`);
  }
  return [...out];
}
/** Security headers from launch.md L10 as Apache .htaccess and Netlify/Cloudflare-style _headers. */
export function securityHeaders(ir) {
  const hashes = ir ? inlineScriptHashes(ir) : [];
  return {
    'Strict-Transport-Security': 'max-age=31536000',
    'Content-Security-Policy': `default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'${hashes.length ? ' ' + hashes.join(' ') : ''}; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  };
}
export const SECURITY_HEADERS = securityHeaders();
export function htaccess(ir) {
  return `# Generated by kk export (launch.md L10). Check each value against the live site with kk launch.\nErrorDocument 404 /404.html\n<IfModule mod_headers.c>\n${Object.entries(securityHeaders(ir)).map(([k, v]) => `  Header always set ${k} "${v}"`).join('\n')}\n  <FilesMatch "\\.(woff2|jpg|jpeg|png|webp|avif|svg|css)$">\n    Header set Cache-Control "public, max-age=2592000"\n  </FilesMatch>\n</IfModule>\n<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteCond %{HTTPS} off\n  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n</IfModule>\n`;
}
export function headersFile(ir) { return `/*\n${Object.entries(securityHeaders(ir)).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`; }

export const LEGAL_TEXT = {
  impressum: { title: 'Impressum', body: `<p><strong>TODO(owner):</strong> Angaben nach § 5 DDG eintragen und vom Inhaber bestätigen lassen. Nichts davon wird erfunden.</p>
<ul>
<li>TODO(owner): Name bzw. Firma mit Rechtsform, ladungsfähige Anschrift (kein Postfach)</li>
<li>TODO(owner): Vertretungsberechtigte Person(en)</li>
<li>TODO(owner): E-Mail-Adresse und ein zweiter direkter Kontaktweg (Telefon oder Kontaktformular)</li>
<li>TODO(owner): Registergericht und Registernummer, falls eingetragen</li>
<li>TODO(owner): USt-IdNr. oder W-IdNr., falls vorhanden</li>
<li>TODO(owner): Aufsichtsbehörde, Kammer und Berufsbezeichnung, falls erforderlich</li>
<li>TODO(owner): Verantwortlich nach § 18 Abs. 2 MStV, falls redaktionelle Inhalte</li>
<li>TODO(owner): Angabe zur Verbraucherstreitbeilegung (§ 36 VSBG), falls erforderlich. Keinen Link zur eingestellten EU-OS-Plattform setzen.</li>
</ul>` },
  datenschutz: { title: 'Datenschutz', body: `<p><strong>TODO(owner):</strong> Datenschutzerklärung aus den Eingaben unten erstellen (eigener Anwalt, Generator oder Datenschutzbeauftragter) und vom Inhaber freigeben lassen.</p>
<ol>
<li>TODO(owner): Verantwortlicher (Name, Anschrift, Kontakt), ggf. Datenschutzbeauftragter</li>
<li>TODO(owner): Hosting-Anbieter, Server-Logs (Felder, Speicherdauer, Rechtsgrundlage)</li>
<li>TODO(owner): Auftragsverarbeiter und Empfänger (kk launch --processors)</li>
<li>TODO(owner): Kontaktformular und E-Mail (Felder, Zweck, Rechtsgrundlage, Speicherdauer)</li>
<li>TODO(owner): Reichweitenmessung, falls eingesetzt</li>
<li>Schriften: lokal eingebunden, keine Verbindung zu Dritten.</li>
<li>TODO(owner): Einbettungen und Karten (Zwei-Klick-Lösung), falls vorhanden</li>
<li>TODO(owner): Newsletter, Shop, Zahlungsanbieter, KI-Funktionen, falls vorhanden</li>
<li>TODO(owner): Rechte der betroffenen Personen, Beschwerderecht bei der Aufsichtsbehörde</li>
</ol>` },
};
export const notFoundBody = (home) => `<h1>Seite nicht gefunden</h1>\n<p>Diese Adresse gibt es nicht (mehr). <a href="${home}">Zur Startseite</a></p>`;
/** Simple content section in the theme's frame, for legal stubs and 404. */
export const plainSection = (name, inner) => `<section data-section="${name}" style="max-width: 44rem; margin-inline: auto; padding: clamp(3rem, 8vw, 6rem) 1.5rem;">\n${inner}\n</section>`;

/** A full stub page (legal or 404) with the index page's header and footer. */
export function stubBody(ir, mapUrl, routes, data, name, inner) {
  const index = ir.pages[0];
  const ctx = { collections: data.collections, mapUrl: (v) => v };
  const sec = (kind) => { const n = index.sections.find((s) => ir.sections[s].kind === kind); return n ? renderHtml(ir.sections[n].node, data.sections[n], ctx) : ''; };
  return `${sec('header')}\n<main id="inhalt">\n${plainSection(name, inner)}\n</main>\n${sec('footer')}`;
}

export const readBin = (dir, rel) => readFileSync(join(dir, rel));
export const bodyClass = (page) => /\bclass="([^"]*)"/.exec(page.bodyOpen || '')?.[1] || '';
export const serializeNode = serialize;

export const ogLocale = (lang) => ({ de: 'de_DE', en: 'en_US', nl: 'nl_NL', fr: 'fr_FR', es: 'es_ES', it: 'it_IT', da: 'da_DK', pl: 'pl_PL' }[String(lang).toLowerCase()] || String(lang).replace('-', '_'));
