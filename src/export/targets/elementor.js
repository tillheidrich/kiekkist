// Elementor target (design layer): a Hello Elementor child theme that self-hosts the fonts and loads the
// tokens, plus an Elementor kit with global colours (hex fallback of the token colours) and global fonts.
// Section templates are NOT generated: Elementor's element JSON is not a documented, stable schema.
// Client-facing files carry the client's name only (no tool branding).
import JSZip from 'jszip';
import { readBin, headAssets, relocateCssUrls } from './common.js';
import { toElementorSettings, lengthAt } from '../tokens/elementor.js';
import { fontFaces } from '../tokens/theme-json.js';
import { cssProps } from '../tokens/flatten.js';

export const meta = { id: 'elementor', tier: 1, status: 'first version (design layer)', label: 'Elementor: Hello Elementor child theme + kit (global colours and fonts)', versions: 'Hello Elementor 3.x as parent, Elementor 3.x kit import (V3 globals); V4 variables not yet generated', editable: 'Everything in Elementor. Global colours and fonts come from the kit; clients can change them globally (risk of drift), section layouts are built in Elementor.' };

export async function exportTarget(ir, opts = {}) {
  const files = new Map(), notes = [];
  const slug = ir.site.slug, child = `${slug}-child`;
  const T = (rel) => `${child}/${rel}`;
  const families = [...new Set(fontFaces(ir.css.fonts).map((f) => f.family))];
  const { sheets, scripts } = headAssets(ir);
  const hasFontsCss = ir.assets.some((a) => a.path === 'assets/fonts/fonts.css');
  const extraSheets = sheets.filter((h) => !['tokens.css', 'assets/site.css', 'assets/fonts/fonts.css'].includes(h));
  // child theme
  files.set(T('style.css'), `/*\nTheme Name: ${ir.site.name}\nDescription: Child theme of Hello Elementor with the ${ir.site.name} design tokens and self-hosted fonts.\nTemplate: hello-elementor\nVersion: 0.1.0\nRequires at least: 6.6\nRequires PHP: 7.4\nText Domain: ${child}\nLicense: GPL-2.0-or-later\nLicense URI: https://www.gnu.org/licenses/gpl-2.0.html\n*/\n`);
  files.set(T('functions.php'), `<?php
/**
 * ${ir.site.name}: Hello Elementor child theme. Fonts are served from this theme; nothing is loaded from third parties.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'wp_enqueue_scripts', function () {
	$v = wp_get_theme()->get( 'Version' );
${hasFontsCss ? `	wp_enqueue_style( '${child}-fonts', get_stylesheet_directory_uri() . '/assets/fonts/fonts.css', array(), $v );\n` : '	// fonts: @font-face rules live in assets/css/site.css\n'}	wp_enqueue_style( '${child}-tokens', get_stylesheet_directory_uri() . '/assets/css/tokens.css', ${hasFontsCss ? `array( '${child}-fonts' )` : 'array()'}, $v );
	// Component styles of the design (global body type, section classes). Turn off with add_filter( '${child}/component_css', '__return_false' ).
	if ( apply_filters( '${child}/component_css', true ) ) {
		wp_enqueue_style( '${child}-site', get_stylesheet_directory_uri() . '/assets/css/site.css', array( '${child}-tokens' ), $v );
	}
${extraSheets.map((h, i) => `\twp_enqueue_style( '${child}-x${i}', get_stylesheet_directory_uri() . '/${h}', array( '${child}-tokens' ), $v );`).join('\n')}
${scripts.map((x, i) => `\twp_enqueue_script( '${child}-js${i}', get_stylesheet_directory_uri() . '/${x.path}', array(), $v, array( 'strategy' => '${x.async ? 'async' : 'defer'}', 'in_footer' => false ) );`).join('\n')}
	wp_enqueue_style( '${child}-style', get_stylesheet_uri(), array( 'hello-elementor-theme-style' ), $v );
}, 20 );

// Elementor: never load Google Fonts; offer the bundled families in the font picker.
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );
add_filter( 'elementor/fonts/groups', function ( $groups ) { $groups['${child}'] = ${JSON.stringify(ir.site.name)}; return $groups; } );
add_filter( 'elementor/fonts/additional_fonts', function ( $fonts ) {
${families.map((f) => `	$fonts[${JSON.stringify(f)}] = '${child}';`).join('\n')}
	return $fonts;
} );

// Privacy: no emoji script, no s.w.org DNS prefetch, no Gravatar.
add_action( 'init', function () {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
} );
add_filter( 'emoji_svg_url', '__return_false' );
add_filter( 'wp_resource_hints', function ( $urls, $relation ) {
	if ( 'dns-prefetch' === $relation ) {
		$urls = array_filter( $urls, function ( $u ) { return false === strpos( is_array( $u ) ? ( $u['href'] ?? '' ) : $u, 's.w.org' ); } );
	}
	return $urls;
}, 10, 2 );
add_filter( 'option_show_avatars', '__return_false' );
`);
  files.set(T('assets/css/tokens.css'), ir.tokens.css);
  for (const a of ir.assets) {
    if (a.path === 'assets/site.css') files.set(T('assets/css/site.css'), relocateCssUrls(String(readBin(opts.themeDir, a.path)).replace(/@import\s+url\(["']?(\.\/)?fonts\/fonts\.css["']?\);?\s*/g, '/* fonts: enqueued separately */\n')));
    else if (a.path.startsWith('assets/')) files.set(T(a.path), readBin(opts.themeDir, a.path));
  }
  // kit: global colours and fonts (V3 site settings)
  const el = toElementorSettings(ir.tokens.dtcg);
  const props = cssProps(ir.tokens.css);
  const maxW = props.get('--max') ? Math.round(lengthAt(props.get('--max'), 1440)) : null;
  const settings = { ...el.settings, ...(maxW ? { container_width: { unit: 'px', size: maxW, sizes: [] } } : {}), viewport_md: 768, viewport_lg: 1025, default_generic_fonts: 'sans-serif' };
  const kitSettings = { content: [], settings };
  const manifest = { name: slug, title: ir.site.name, description: `Global colours and fonts of ${ir.site.name}`, author: '', version: '3.0', elementor_version: '3.25.0', created: new Date().toISOString().slice(0, 19).replace('T', ' '), thumbnail: false, site: '', 'site-settings': { theme: false, globalColors: true, globalFonts: true, themeStyleSettings: false, generalSettings: false, experiments: false }, plugins: [], templates: {}, content: {}, 'wp-content': {} };
  files.set('elementor-kit/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  files.set('elementor-kit/site-settings.json', JSON.stringify(kitSettings, null, 2) + '\n');
  // a plain mapping table the human can type in when the kit import is not available
  files.set('GLOBALS.md', `# ${ir.site.name}: Elementor globals\n\nIf the kit import is not available, enter these in Site Settings > Global Colors / Global Fonts.\n\n## Colours (hex fallback of the design tokens)\n\n| ID | Name | Hex |\n|---|---|---|\n${[...settings.system_colors, ...settings.custom_colors].map((c) => `| ${c._id} | ${c.title} | ${c.color} |`).join('\n')}\n\n## Fonts (self-hosted by the child theme)\n\n| ID | Role | Family | Weight | Size desktop / tablet / mobile | Line height |\n|---|---|---|---|---|---|\n${[...settings.system_typography, ...settings.custom_typography].map((t) => `| ${t._id} | ${t.title} | ${t.typography_font_family || ''} | ${t.typography_font_weight || ''} | ${t.typography_font_size ? `${t.typography_font_size.size} / ${t.typography_font_size_tablet.size} / ${t.typography_font_size_mobile.size} px` : ''} | ${t.typography_line_height?.size ?? ''} |`).join('\n')}\n\nLoss of fidelity: ${el.lossy_reasons.join('; ')}.\n`);
  const zipOf = async (prefix) => { const z = new JSZip(); for (const [p, c] of files) if (p.startsWith(prefix)) z.file(p.slice(prefix === `${child}/` ? 0 : prefix.length), c); return z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }); };
  files.set(`${child}.zip`, await zipOf(`${child}/`));
  files.set(`${slug}-kit.zip`, await zipOf('elementor-kit/'));
  notes.push(`install: Hello Elementor (parent) + ${child}.zip (Appearance > Themes > Upload), then import ${slug}-kit.zip (Elementor > Tools > Import/Export Kit, or wp elementor kit import). GLOBALS.md has the same values for manual entry.`);
  notes.push('reliability: the child theme and the font picker filters use documented WordPress/Elementor hooks. The kit manifest/site-settings format is not a documented public schema: test the import on a disposable WordPress before handing over; if it fails, enter GLOBALS.md by hand.');
  notes.push(`lossy: ${el.lossy_reasons.join('; ')}`);
  notes.push('TODO(elementor-v4): Elementor V4 variables (colour, size, font variables in the Variables Manager) are not generated: the storage format is not documented yet.');
  notes.push('TODO(elementor-sections): section templates are not generated. Rebuild sections in Elementor using the global colours and fonts, or embed the section markup with an HTML widget (not editable). Templates only with an import test (kk export spec, E9).');
  return { files, notes, postCheck: { pages: [], sourcePages: ir.pages.map((p) => p.file) } };
}
