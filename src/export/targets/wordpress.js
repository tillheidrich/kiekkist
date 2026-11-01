// WordPress block theme target (first version): theme.json v3 from tokens (palette, fonts, sizes locked),
// one pattern per section in core blocks, header/footer template parts, templates per page, a bridge
// stylesheet so site.css keeps reading the theme's variables, a ZIP and a WordPress Playground blueprint.
// Elements the converter cannot express as core blocks become core/html and are listed in the notes.
import JSZip from 'jszip';
import { parse, elements, attr, classes, inner, serialize, textContent, cleanText } from '../html.js';
import { renderHtml } from '../template.js';
import { INLINE, isTextBlock } from '../ir.js';
import { urlMapper, mapIR, readBin, LEGAL_TEXT, pageTitle, legalRoutes, headAssets, relocateCssUrls } from './common.js';
import { toThemeJson } from '../tokens/theme-json.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { serveDir } from '../serve.js';

// SPDX id -> licence URI (Theme Check requires "License URI" next to "License" in style.css)
const LICENSE_URIS = [
  [/GPL-2\.0|GPLv2|GPL v2|GNU General Public License v2/i, 'https://www.gnu.org/licenses/gpl-2.0.html'],
  [/GPL-3\.0|GPLv3|GPL v3|GNU General Public License v3/i, 'https://www.gnu.org/licenses/gpl-3.0.html'],
  [/^\s*MIT\b/i, 'https://opensource.org/license/mit'],
];
/** License URI for style.css: explicit meta.licenseUri, a known SPDX licence, else the bundled LICENSE.md. */
export function licenseUri(license, meta = {}, hasLicenseFile = false) {
  if (meta.licenseUri || meta.license_uri) return meta.licenseUri || meta.license_uri;
  if (hasLicenseFile && /[;,(]/.test(String(license))) return 'LICENSE.md'; // compound licence: the bundled file explains all parts
  for (const [re, uri] of LICENSE_URIS) if (re.test(license)) return uri;
  return hasLicenseFile ? 'LICENSE.md' : 'https://www.gnu.org/licenses/gpl-2.0.html';
}
/** True when the licence string is one WordPress.org accepts for a whole theme (GPL or GPL-compatible). */
export const gplCompatible = (license) => /\bGPL|GNU General Public|^\s*MIT\b|^\s*(Apache-2\.0|BSD|ISC)\b/i.test(String(license || '')) && !/design licence|paid|proprietary|all rights reserved/i.test(String(license || ''));

/** screenshot.png 1200x900 (what Theme Check and Appearance > Themes expect) from the theme's own index page. */
export async function themeScreenshot(themeDir) {
  const { chromium } = await import('playwright');
  const srv = await serveDir(themeDir);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await page.goto(srv.url + '/pages/index.html', { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(500);
    return await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 900 } });
  } finally { await browser.close(); await srv.close(); }
}

export const meta = { id: 'wordpress', tier: 1, status: 'first version', label: 'WordPress block theme (theme.json v3, patterns)', versions: 'WordPress >= 6.6 (tested schema: theme.json v3), PHP >= 7.4', editable: 'Texts, images, menus and pages in the Site Editor; colours and type only from the locked palette and scale; section layouts are locked (contentOnly).' };

const GROUP_TAGS = new Set(['div', 'section', 'header', 'footer', 'article', 'aside', 'main']);
const json = (o) => (Object.keys(o).length ? ' ' + JSON.stringify(o) : '');
const onlyAttrs = (el, allowed) => el.attrs.every((a) => allowed.includes(a.name) || (a.name === 'style' && spacingStyle(a.value)));
/** Inline style with only margin/padding declarations -> block style attribute + saved style string. */
export function spacingStyle(css) {
  const decl = String(css || '').split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; });
  if (!decl.length || !decl.every(([k]) => /^(margin|padding)-(top|right|bottom|left)$/.test(k))) return null;
  const spacing = {};
  for (const [k, v] of decl) { const [box, side] = k.split('-'); (spacing[box] ||= {})[side] = v; }
  return { attr: { style: { spacing } }, css: decl.map(([k, v]) => `${k}:${v}`).join(';') };
}
const styleOf = (el) => spacingStyle(attr(el, 'style'));

/** HTML (string) -> block markup. stats: { blocks, html, htmlTags: Map } */
export function htmlToBlocks(html, stats = { blocks: 0, html: 0, htmlTags: new Map() }, depth = 0) {
  const root = parse(html);
  return mergeHtml(root.children.map((n) => nodeToBlock(n, stats, depth)).filter(Boolean), stats).join('\n');
}
/** Adjacent core/html blocks become one (fewer blocks for the client to wade through). */
function mergeHtml(blocks, stats) {
  const out = [];
  const isHtml = (b) => b.startsWith('<!-- wp:html -->');
  for (const b of blocks) {
    if (isHtml(b) && out.length && isHtml(out[out.length - 1])) {
      out[out.length - 1] = out[out.length - 1].replace(/\n<!-- \/wp:html -->$/, '') + '\n' + b.replace(/^<!-- wp:html -->\n/, '');
      stats.blocks--; stats.html--;
    } else out.push(b);
  }
  return out;
}
function htmlBlock(n, stats) {
  stats.blocks++; stats.html++;
  const k = n.tag || 'text'; stats.htmlTags.set(k, (stats.htmlTags.get(k) || 0) + 1);
  return `<!-- wp:html -->\n${n.type === 'el' ? serialize(n) : n.raw.trim()}\n<!-- /wp:html -->`;
}
function nodeToBlock(n, stats, depth) {
  if (n.type === 'comment' || n.type === 'doctype') return '';
  if (n.type === 'text') return n.raw.trim() ? htmlBlock(n, stats) : '';
  const cls = classes(n).join(' '), id = attr(n, 'id');
  const common = { ...(id ? { anchor: id } : {}), ...(cls ? { className: cls } : {}) };
  const tagAttrs = (extraClass) => `${id ? ` id="${id}"` : ''}${extraClass || cls ? ` class="${[extraClass, cls].filter(Boolean).join(' ')}"` : ''}`;
  if (/^h[1-6]$/.test(n.tag) && isTextBlock(n) && onlyAttrs(n, ['id', 'class'])) {
    stats.blocks++;
    const level = +n.tag[1];
    return `<!-- wp:heading${json({ ...(level !== 2 ? { level } : {}), ...common })} -->\n<${n.tag} class="${['wp-block-heading', cls].filter(Boolean).join(' ')}"${id ? ` id="${id}"` : ''}>${inner(n)}</${n.tag}>\n<!-- /wp:heading -->`;
  }
  if (n.tag === 'p' && isTextBlock(n) && onlyAttrs(n, ['id', 'class'])) {
    stats.blocks++;
    const st = styleOf(n);
    return `<!-- wp:paragraph${json({ ...common, ...(st ? st.attr : {}) })} -->\n<p${tagAttrs()}${st ? ` style="${st.css}"` : ''}>${inner(n)}</p>\n<!-- /wp:paragraph -->`;
  }
  if ((n.tag === 'ul' || n.tag === 'ol') && onlyAttrs(n, ['class']) && elements(n).every((li) => li.tag === 'li' && li.attrs.length === 0 && (isTextBlock(li) || elements(li).every((c) => INLINE.has(c.tag))))) {
    stats.blocks += 1 + elements(n).length;
    const items = elements(n).map((li) => `<!-- wp:list-item -->\n<li>${inner(li)}</li>\n<!-- /wp:list-item -->`).join('\n');
    return `<!-- wp:list${json({ ...(n.tag === 'ol' ? { ordered: true } : {}), ...(cls ? { className: cls } : {}) })} -->\n<${n.tag} class="${['wp-block-list', cls].filter(Boolean).join(' ')}">${items}</${n.tag}>\n<!-- /wp:list -->`;
  }
  const img = n.tag === 'img' ? n : n.tag === 'figure' ? elements(n).find((c) => c.tag === 'img') : null;
  if (img && (n.tag === 'img' || elements(n).every((c) => c.tag === 'img' || c.tag === 'figcaption')) && onlyAttrs(n, n.tag === 'img' ? ['src', 'alt', 'width', 'height', 'srcset', 'sizes', 'loading', 'decoding', 'class', 'fetchpriority'] : ['class', 'id'])) {
    stats.blocks++;
    const cap = n.tag === 'figure' ? elements(n).find((c) => c.tag === 'figcaption') : null;
    if (attr(img, 'srcset')) stats.srcsetDropped = (stats.srcsetDropped || 0) + 1;
    return `<!-- wp:image${json({ sizeSlug: 'full', linkDestination: 'none', ...(n.tag === 'figure' && cls ? { className: cls } : {}) })} -->\n<figure class="${['wp-block-image size-full', n.tag === 'figure' ? cls : ''].filter(Boolean).join(' ')}"><img src="${attr(img, 'src')}" alt="${(attr(img, 'alt') || '').replace(/"/g, '&quot;')}"/>${cap ? `<figcaption class="wp-element-caption">${inner(cap)}</figcaption>` : ''}</figure>\n<!-- /wp:image -->`;
  }
  if (n.tag === 'hr' && onlyAttrs(n, ['class'])) { stats.blocks++; return `<!-- wp:separator${json(cls ? { className: cls } : {})} -->\n<hr class="${['wp-block-separator has-alpha-channel-opacity', cls].filter(Boolean).join(' ')}"/>\n<!-- /wp:separator -->`; }
  if (n.tag === 'details' && onlyAttrs(n, ['class', 'open'])) {
    const sum = elements(n).find((c) => c.tag === 'summary');
    if (sum && isTextBlock(sum)) {
      stats.blocks++;
      const rest = n.children.filter((c) => c !== sum).map((c) => nodeToBlock(c, stats, depth + 1)).filter(Boolean).join('\n');
      return `<!-- wp:details${json({ ...(cls ? { className: cls } : {}), ...(attr(n, 'open') !== undefined ? { showContent: true } : {}) })} -->\n<details class="${['wp-block-details', cls].filter(Boolean).join(' ')}"${attr(n, 'open') !== undefined ? ' open' : ''}><summary>${inner(sum)}</summary>${rest}</details>\n<!-- /wp:details -->`;
    }
  }
  if (GROUP_TAGS.has(n.tag) && onlyAttrs(n, ['class', 'id', 'aria-labelledby', 'aria-label', 'data-section']) && !n.children.some((c) => c.type === 'text' && c.raw.trim()) && elements(n).length) {
    stats.blocks++;
    if (attr(n, 'aria-labelledby') || attr(n, 'aria-label')) stats.ariaDropped = (stats.ariaDropped || 0) + 1;
    const kids = mergeHtml(n.children.map((c) => nodeToBlock(c, stats, depth + 1)).filter(Boolean), stats).join('\n');
    const lock = depth === 0 && n.tag === 'section' ? { templateLock: 'contentOnly' } : {};
    const st = styleOf(n);
    return `<!-- wp:group${json({ ...(n.tag !== 'div' ? { tagName: n.tag } : {}), ...common, ...lock, ...(st ? st.attr : {}), layout: { type: 'default' } })} -->\n<${n.tag}${tagAttrs('wp-block-group')}${st ? ` style="${st.css}"` : ''}>${kids}</${n.tag}>\n<!-- /wp:group -->`;
  }
  return htmlBlock(n, stats);
}

export async function exportTarget(ir, opts = {}) {
  const files = new Map(), notes = [];
  const slug = ir.site.slug;
  const base = urlMapper(ir, 'routes');
  const routes = { ...legalRoutes(ir, '/impressum/', '/datenschutz/'), home: '/' };
  const withPrefix = (prefix) => (v, name) => { const m = base(v, name); return name === 'srcset' ? m.split(', ').map((s) => s.replace(/^\/assets\//, prefix + 'assets/')).join(', ') : String(m).replace(/^\/assets\//, prefix + 'assets/'); };
  // get_theme_file_uri( '/' ) has no trailing slash ("…/themes/slug"), so "assets/…" must not be glued onto it directly
  const phpAsset = "<?php echo esc_url( trailingslashit( get_theme_file_uri() ) ); ?>";
  const T = (rel) => `${slug}/${rel}`;
  const stats = { blocks: 0, html: 0, htmlTags: new Map() };
  const renderSection = (sec, mapUrl) => { const data = mapIR(ir, mapUrl, routes); return renderHtml(sec.node, data.sections[sec.name], { collections: data.collections, mapUrl: (v) => v }); };
  // patterns (PHP: asset URLs through get_theme_file_uri)
  for (const sec of Object.values(ir.sections)) {
    const html = renderSection(sec, withPrefix(phpAsset));
    const blocks = htmlToBlocks(html, stats);
    if (sec.kind === 'section') files.set(T(`patterns/${sec.name}.php`), `<?php\n/**\n * Title: ${pascalTitle(sec.name)}\n * Slug: ${slug}/${sec.name}\n * Categories: ${slug}\n * Inserter: yes\n * Description: Section "${sec.name}" from the design (${sec.pages.join(', ')}).\n */\n?>\n${blocks}\n`);
    else files.set(T(`parts/${sec.kind}${sec.name.startsWith('site-') ? '' : '-' + sec.name.replace(/-site-(header|footer)$/, '')}.html`), htmlToBlocks(renderSection(sec, withPrefix(`/wp-content/themes/${slug}/`)), stats) + '\n');
  }
  // templates
  const partSlug = (s) => `${s.kind}${s.name.startsWith('site-') ? '' : '-' + s.name.replace(/-site-(header|footer)$/, '')}`;
  const tpl = (page) => {
    const out = [];
    for (const n of page.sections) {
      const s = ir.sections[n];
      if (s.kind === 'header' || s.kind === 'footer') out.push(`<!-- wp:template-part {"slug":"${partSlug(s)}","theme":"${slug}"} /-->`);
      else out.push(`<!-- wp:pattern {"slug":"${slug}/${n}"} /-->`);
    }
    // wrap the non-part blocks in <main>
    const first = out.findIndex((l) => l.includes('wp:pattern')), last = out.map((l) => l.includes('wp:pattern')).lastIndexOf(true);
    if (first >= 0) { out.splice(last + 1, 0, '</main>\n<!-- /wp:group -->'); out.splice(first, 0, '<!-- wp:group {"tagName":"main","anchor":"inhalt","layout":{"type":"default"}} -->\n<main id="inhalt" class="wp-block-group">'); }
    return out.join('\n') + '\n';
  };
  const index = ir.pages[0];
  files.set(T('templates/front-page.html'), tpl(index));
  for (const p of ir.pages.slice(1)) files.set(T(`templates/page-${p.slug}.html`), tpl(p));
  const header = index.sections.map((n) => ir.sections[n]).find((s) => s.kind === 'header');
  const footer = index.sections.map((n) => ir.sections[n]).find((s) => s.kind === 'footer');
  const frame = (innerBlocks) => `${header ? `<!-- wp:template-part {"slug":"${partSlug(header)}","theme":"${slug}"} /-->\n` : ''}<!-- wp:group {"tagName":"main","anchor":"inhalt","style":{"spacing":{"padding":{"top":"clamp(3rem, 8vw, 6rem)","bottom":"clamp(3rem, 8vw, 6rem)","left":"1.5rem","right":"1.5rem"}}},"layout":{"type":"constrained","contentSize":"44rem"}} -->\n<main id="inhalt" class="wp-block-group" style="padding-top:clamp(3rem, 8vw, 6rem);padding-right:1.5rem;padding-bottom:clamp(3rem, 8vw, 6rem);padding-left:1.5rem">${innerBlocks}</main>\n<!-- /wp:group -->\n${footer ? `<!-- wp:template-part {"slug":"${partSlug(footer)}","theme":"${slug}"} /-->\n` : ''}`;
  files.set(T('templates/page.html'), frame('<!-- wp:post-title {"level":1} /-->\n<!-- wp:post-content {"layout":{"type":"constrained"}} /-->'));
  files.set(T('templates/index.html'), frame('<!-- wp:query {"queryId":1,"query":{"perPage":10,"postType":"post","inherit":true}} -->\n<div class="wp-block-query"><!-- wp:post-template -->\n<!-- wp:post-title {"isLink":true} /-->\n<!-- wp:post-excerpt /-->\n<!-- /wp:post-template --></div>\n<!-- /wp:query -->'));
  files.set(T('templates/404.html'), frame('<!-- wp:heading {"level":1} -->\n<h1 class="wp-block-heading">Seite nicht gefunden</h1>\n<!-- /wp:heading -->\n<!-- wp:paragraph -->\n<p>Diese Adresse gibt es nicht (mehr). <a href="/">Zur Startseite</a></p>\n<!-- /wp:paragraph -->'));
  // theme.json, styles, fonts
  const tj = toThemeJson(ir.tokens.dtcg, { fontsCss: ir.css.fonts, tokensCss: ir.tokens.css, siteCss: ir.css.site });
  tj.json.settings.spacing.blockGap = false;
  tj.json.styles.spacing = { blockGap: '0px', padding: { top: '0px', right: '0px', bottom: '0px', left: '0px' } };
  tj.json.templateParts = [...new Set(Object.values(ir.sections).filter((s) => s.kind !== 'section').map((s) => s))].map((s) => ({ name: partSlug(s), title: pascalTitle(partSlug(s)), area: s.kind }));
  tj.json.customTemplates = ir.pages.slice(1).map((p) => ({ name: `page-${p.slug}`, title: pageTitle(ir, p), postTypes: ['page'] }));
  files.set(T('theme.json'), JSON.stringify(tj.json, null, 2) + '\n');
  notes.push(...tj.notes);
  files.set(T('assets/css/tokens-bridge.css'), tj.bridgeCss);
  // the theme's own tokens.css stays the base (semantic layer, dark/light media queries); the bridge maps token names onto the presets
  files.set(T('assets/css/tokens.css'), ir.tokens.css);
  for (const a of ir.assets) {
    if (a.path === 'assets/site.css') files.set(T('assets/css/site.css'), relocateCssUrls(String(readBin(opts.themeDir, a.path)).replace(/@import\s+url\(["']?(\.\/)?fonts\/fonts\.css["']?\);?\s*/g, '/* fonts: registered in theme.json (fontFace) */\n')));
    else if (a.path === 'assets/fonts/fonts.css') continue;
    else files.set(T(a.path), readBin(opts.themeDir, a.path));
  }
  const { sheets, scripts } = headAssets(ir);
  const wpPath = (rel) => (rel === 'tokens.css' ? 'assets/css/tokens.css' : rel === 'assets/site.css' ? 'assets/css/site.css' : rel);
  const order = sheets.filter((h) => h !== 'assets/fonts/fonts.css');
  if (!order.includes('tokens.css')) order.unshift('tokens.css');
  if (!order.includes('assets/site.css') && files.has(T('assets/css/site.css'))) order.push('assets/site.css');
  const enq = [];
  let prev = 'global-styles';
  order.forEach((h, i) => {
    const handle = `${slug}-${i}-${h.replace(/[^a-z0-9]+/gi, '-').replace(/-css$/, '')}`;
    enq.push(`\twp_enqueue_style( '${handle}', get_theme_file_uri( '${wpPath(h)}' ), array( '${prev}' ), $v );`); prev = handle;
    if (h === 'tokens.css') { enq.push(`\twp_enqueue_style( '${slug}-bridge', get_theme_file_uri( 'assets/css/tokens-bridge.css' ), array( '${handle}' ), $v );`); prev = `${slug}-bridge`; }
  });
  scripts.forEach((x, i) => enq.push(`\twp_enqueue_script( '${slug}-js-${i}', get_theme_file_uri( '${x.path}' ), array(), $v, array( 'strategy' => '${x.async ? 'async' : 'defer'}', 'in_footer' => false ) );`));
  const editorCss = order.map((h) => `'${wpPath(h)}'`).concat(["'assets/css/tokens-bridge.css'"]);
  const license = ir.meta.license || 'GPL-2.0-or-later';
  const hasLicenseFile = !!opts.themeDir && existsSync(join(opts.themeDir, 'LICENSE.md'));
  if (hasLicenseFile) files.set(T('LICENSE.md'), readBin(opts.themeDir, 'LICENSE.md'));
  const licUri = licenseUri(license, ir.meta, hasLicenseFile);
  const author = opts.author || ir.meta.author || '';
  const year = new Date().getFullYear();
  files.set(T('style.css'), `/*\nTheme Name: ${ir.site.name}\nDescription: ${ir.site.description.replace(/\*\//g, '')}\nVersion: 0.1.0\nRequires at least: 6.6\nTested up to: 7.1\nRequires PHP: 7.4\nText Domain: ${slug}\nLicense: ${license}\nLicense URI: ${licUri}\n${author ? `Author: ${author}\n` : ''}*/\n`);
  if (!gplCompatible(license)) notes.push(`licence: style.css says "${license}". WordPress.org only lists themes whose code is GPL-compatible; outside the directory the theme works the same, but PHP, block markup and theme.json are usually licensed GPL-2.0-or-later (split licence: design assets under the design licence)`);
  files.set(T('functions.php'), `<?php
/**
 * ${ir.site.name}: block theme functions. Generated by kk export. No external requests.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'wp_enqueue_scripts', function () {
	$v = wp_get_theme()->get( 'Version' );
${enq.join('\n')}
} );

add_action( 'after_setup_theme', function () {
	add_theme_support( 'editor-styles' );
	add_editor_style( array( ${editorCss.join(', ')} ) );
	remove_theme_support( 'core-block-patterns' );
} );

add_action( 'init', function () {
	register_block_pattern_category( '${slug}', array( 'label' => ${JSON.stringify(ir.site.name)} ) );
	// privacy: no emoji script, no s.w.org DNS prefetch
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
} );
add_filter( 'emoji_svg_url', '__return_false' );
add_filter( 'wp_resource_hints', function ( $urls, $relation ) {
	if ( 'dns-prefetch' === $relation ) {
		$urls = array_filter( $urls, function ( $u ) { return false === strpos( is_array( $u ) ? ( $u['href'] ?? '' ) : $u, 's.w.org' ); } );
	}
	return $urls;
}, 10, 2 );
// no Gravatar requests
add_filter( 'option_show_avatars', '__return_false' );
`);
  files.set(T('readme.txt'), `=== ${ir.site.name} ===\nRequires at least: 6.6\nTested up to: 7.1\nRequires PHP: 7.4\nLicense: ${license}\nLicense URI: ${licUri}\n\nBlock theme generated from a design system. Patterns: ${Object.values(ir.sections).filter((s) => s.kind === 'section').map((s) => s.name).join(', ')}.\nFonts are bundled (see assets/fonts/LICENSE-*.txt). No external requests.\n\n== Copyright ==\n\n${ir.site.name}, Copyright ${year}${author ? ' ' + author : ''}.\nLicence: ${license}${hasLicenseFile ? ' (details in LICENSE.md)' : ''}.\nBundled fonts: see assets/fonts/LICENSE-*.txt.\n`);
  // screenshot.png 1200x900 (Theme Check: required)
  if (opts.screenshotImage?.data) files.set(T(`screenshot.${opts.screenshotImage.ext || 'png'}`), opts.screenshotImage.data); // ready image (servers without a browser)
  else if (opts.screenshot !== false && opts.themeDir) {
    try { files.set(T('screenshot.png'), await themeScreenshot(opts.themeDir)); }
    catch (e) { notes.push(`screenshot.png not generated (${String(e.message || e).split('\n')[0]}): add a 1200x900 PNG, Theme Check requires it`); }
  } else if (opts.screenshot === false) notes.push('screenshot.png skipped (--no-screenshot): add a 1200x900 PNG, Theme Check requires it');
  // ZIP + Playground blueprint
  const zip = new JSZip();
  for (const [p, c] of files) zip.file(p, c);
  files.set(`${slug}.zip`, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const pagesToCreate = [...ir.pages.slice(1).map((p) => ({ slug: p.slug, title: pageTitle(ir, p).split(' · ')[0] })), ...['impressum', 'datenschutz'].filter((k) => routes[k]).map((k) => ({ slug: k, title: LEGAL_TEXT[k].title, content: LEGAL_TEXT[k].body }))].filter((p) => p.slug !== '404');
  const php = `<?php require_once '/wordpress/wp-load.php';\n${pagesToCreate.map((p) => `wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => ${JSON.stringify(p.slug)}, 'post_title' => ${JSON.stringify(p.title)}, 'post_content' => ${JSON.stringify(p.content ? `<!-- wp:html -->${p.content.replace(/\n/g, '')}<!-- /wp:html -->` : '')} ) );`).join('\n')}\nupdate_option( 'permalink_structure', '/%postname%/' );`;
  files.set('blueprint.json', JSON.stringify({ $schema: 'https://playground.wordpress.net/blueprint-schema.json', landingPage: '/', preferredVersions: { php: '8.3', wp: 'latest' }, steps: [{ step: 'installTheme', themeData: { resource: 'url', url: `TODO(owner): public URL of ${slug}.zip` }, options: { activate: true } }, { step: 'runPHP', code: php }] }, null, 2) + '\n');
  const share = stats.blocks ? Math.round((stats.html / stats.blocks) * 100) : 0;
  notes.push(`block conversion: ${stats.blocks} blocks, ${stats.html} core/html (${share} %)${stats.htmlTags.size ? ': ' + [...stats.htmlTags].map(([t, n]) => `${n}x <${t}>`).join(', ') : ''}. core/html blocks are not comfortable to edit for the client; the spec target is < 10 %.`);
  if (stats.srcsetDropped) notes.push(`${stats.srcsetDropped} image(s) lost their srcset in the image block (WordPress builds srcset only for media-library images): upload the images to the media library for responsive sizes`);
  if (stats.ariaDropped) notes.push(`${stats.ariaDropped} group(s) lost aria-labelledby/aria-label (the Group block cannot store it); headings still label the content`);
  notes.push(`preview without a server: host ${slug}.zip and blueprint.json at public URLs, put the ZIP URL into blueprint.json and open https://playground.wordpress.net/?blueprint-url=<blueprint URL>. kk export itself does not render WordPress; kk verify-exports <theme> --targets wordpress runs php -l and Theme Check in WordPress Playground.`);
  notes.push('first version: validate the patterns in the editor ("This block contains unexpected content" means the converter needs a fix) and compare screenshots with kk compare before handing over');
  return { files, notes, postCheck: { pages: [], sourcePages: ir.pages.map((p) => p.file) }, stats: { blocks: stats.blocks, html: stats.html, share } };
}
const pascalTitle = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
