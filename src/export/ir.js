// Theme -> intermediate representation (IR) shared by all export adapters.
// Sections are named (data-section | id | aria-labelledby target), their wording is lifted into props
// without rewriting, repeated sibling structures become collections. The section node trees are
// annotated in place (kkInner, kkAttrs, kkEach) so every adapter serialises the same template.
import { createHash } from 'node:crypto';
import { decodeEntities, attr, classes, elements, find, findAll, getById, textContent, cleanText, serialize, walk, inner } from './html.js';

export const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr']);
const OPAQUE = new Set(['svg', 'script', 'style', 'template', 'noscript', 'iframe', 'video', 'audio', 'canvas', 'math', 'select', 'textarea']);
const URL_ATTRS = ['href', 'src', 'srcset', 'poster', 'action'];

export const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
export const pascal = (s) => { const p = String(s).split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(''); return /^[0-9]/.test(p) ? 'S' + p : p || 'Section'; };
export const camel = (s) => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };

const hasText = (n) => n.children.some((c) => c.type === 'text' && !c.rawText && c.raw.trim());
function inlineOnly(el) { let ok = true; walk(el, (n) => { if (n !== el && n.type === 'el' && !INLINE.has(n.tag)) { ok = false; return false; } }); return ok; }
/** A text block: has own text, and only inline elements below it. */
export const isTextBlock = (el) => el.type === 'el' && !OPAQUE.has(el.tag) && !INLINE.has(el.tag) && inlineOnly(el) && cleanText(textContent(el)) !== '' && (hasText(el) || elements(el).length <= 1);
const isInlineText = (el) => el.type === 'el' && INLINE.has(el.tag) && el.tag !== 'br' && inlineOnly(el) && cleanText(textContent(el)) !== '';
/** Tag-tree hash (ignores attributes and text): equal for repeated cards, rows, list items. */
export function shapeOf(el) { const parts = []; walk(el, (n) => { if (n.type === 'el') parts.push(n.tag + '(' + elements(n).length); }); return sha(parts.join(',')); }

/** Section name from data-section | id | aria-labelledby (suffix -title/-t/-heading dropped; short ids fall back to the heading text). */
export function sectionName(el, root) {
  const ds = attr(el, 'data-section'); if (ds) return { name: slugify(ds), from: 'data-section' };
  const id = attr(el, 'id'); if (id) return { name: slugify(id), from: 'id' };
  const lb = attr(el, 'aria-labelledby');
  if (lb) {
    const first = lb.split(/\s+/)[0];
    let n = slugify(first.replace(/[-_](title|t|heading|head|h)$/i, ''));
    if (n.length < 3) { const h = getById(root, first); const words = h ? cleanText(textContent(h)).split(' ').slice(0, 4).join(' ') : ''; n = slugify(words) || n; return { name: n, from: 'aria-labelledby+heading' }; }
    return { name: n, from: 'aria-labelledby' };
  }
  const al = attr(el, 'aria-label'); if (al) return { name: slugify(al), from: 'aria-label' };
  return null;
}

/** Keys for props: readable names from class/tag, unique per scope. */
function keyMaker() {
  const used = new Map();
  return (el, suffix = '') => {
    const cls = classes(el).find((c) => !/^(wrap|grid|row|col|is-|has-)/.test(c));
    let base = camel((el.tag === 'h1' ? 'title' : cls || el.tag) + (suffix ? '-' + suffix : ''));
    const n = (used.get(base) || 0) + 1; used.set(base, n);
    return n === 1 ? base : base + n;
  };
}

function propOf(el, key) {
  const raw = inner(el);
  const rich = elements(el).length > 0 || /&/.test(raw);
  return { key, kind: rich ? 'rich' : 'text', value: rich ? raw : raw };
}

/** Collection candidates: parents with >= 2 element children of the same shape that carry content. */
function collectionParent(el) {
  if (OPAQUE.has(el.tag) || /^(tr|thead|tbody|tfoot|table|colgroup|select|picture)$/.test(el.tag)) return false;
  const kids = elements(el);
  if (kids.length < 2) return false;
  if (kids.length === 2 && (attr(kids[0], 'class') ?? '') !== (attr(kids[1], 'class') ?? '')) return false;
  if (el.children.some((c) => c.type === 'text' && !c.rawText && c.raw.trim())) return false;
  const s = shapeOf(kids[0]);
  if (!kids.every((k) => shapeOf(k) === s)) return false;
  return kids.some((k) => cleanText(textContent(k)) !== '' || find(k, (n) => n.tag === 'img'));
}

/** Annotate a subtree. Returns props list. Within items, parallel nodes of all items are compared. */
function extract(rootEl, { onCollection, inItem = false, peers = null }) {
  const props = [];
  const key = keyMaker();
  const visit = (el, peerEls) => {
    if (el.type !== 'el') return;
    if (OPAQUE.has(el.tag)) return;
    // attribute props: urls, alt, and (inside items) every attribute that differs between items
    const attrNames = new Set();
    for (const a of el.attrs) if (URL_ATTRS.includes(a.name) || a.name === 'alt') attrNames.add(a.name);
    if (peerEls) for (const p of peerEls) { const names = new Set([...el.attrs, ...p.attrs].map((a) => a.name)); for (const n of names) if (attr(el, n) !== attr(p, n)) attrNames.add(n); }
    if (el.tag === 'a' && attr(el, 'href')?.startsWith('#') && !peerEls) attrNames.delete('href'); // in-page anchors stay literal
    if (attrNames.size) {
      el.kkAttrs = el.kkAttrs || {};
      for (const n of attrNames) { const k = key(el, n); el.kkAttrs[n] = k; props.push({ key: k, kind: n === 'alt' ? 'text' : URL_ATTRS.includes(n) ? (el.tag === 'img' || el.tag === 'source' ? 'image' : 'link') : 'attr', attr: n, value: attr(el, n) ?? null, peers: peerEls ? peerEls.map((p) => attr(p, n) ?? null) : undefined }); }
    }
    if (!inItem && collectionParent(el) && onCollection) { onCollection(el); return; }
    if (isTextBlock(el) || isInlineText(el)) {
      const k = key(el); const p = propOf(el, k);
      if (peerEls) { p.peers = peerEls.map((x) => inner(x)); if (peerEls.some((x) => elements(x).length || /&/.test(inner(x)))) p.kind = 'rich'; }
      el.kkInner = { key: k, kind: p.kind }; props.push(p);
      // links inside rich text keep their href inside the rich value
      return;
    }
    const kids = elements(el);
    kids.forEach((c, i) => visit(c, peerEls ? peerEls.map((p) => elements(p)[i]).filter(Boolean) : null));
  };
  if (peers) visit(rootEl, peers); else elements(rootEl).forEach((c) => visit(c, null));
  if (!peers) { // the section element's own url/alt attributes are rare; ignore
  }
  return props;
}

/**
 * Build the IR from a loaded theme (load.js). Mutates the page trees (annotations).
 * @returns {{ ir, issues: {errors: string[], warnings: string[], info: string[]} }}
 */
export function buildIR(theme, { siteUrl = '', lang, name } = {}) {
  const errors = [], warnings = [], info = [];
  const sections = {}; // name -> { name, component, html, hash, props, collections:[names], node, kind:'section'|'header'|'footer', pages:[] }
  const collections = {}; // name -> { name, section, fields:[{key, kind, attr?}], items:[{...}] }
  const pages = [];
  const usedColl = new Set();

  const addSection = (node, nm, kind, page, root) => {
    const html = serialize(node);
    const hash = sha(html);
    let name = nm;
    if (sections[name] && sections[name].hash !== hash) {
      name = `${page.slug}-${nm}`;
      info.push(`section "${nm}" on ${page.file} differs from the one on ${sections[nm].pages[0]}: exported as "${name}"`);
    }
    if (sections[name]) { if (sections[name].hash === hash) { sections[name].pages.push(page.file); node.kkSection = name; return name; } }
    node.kkSection = name;
    const sec = { name, component: pascal(name), kind, hash, html, node, props: [], collections: [], pages: [page.file], tag: node.tag };
    sec.props = extract(node, {
      onCollection: (parent) => {
        const kids = elements(parent);
        let cname = slugify(classes(parent)[0] || attr(parent, 'id') || `${name}-${parent.tag}`);
        if (usedColl.has(cname)) { let i = 2; while (usedColl.has(`${cname}-${i}`)) i++; cname = `${cname}-${i}`; }
        usedColl.add(cname);
        const fields = extract(kids[0], { inItem: true, peers: kids.slice(1) });
        const items = kids.map((k, i) => {
          const it = { id: `${cname}-${String(i + 1).padStart(2, '0')}`, order: i + 1 };
          for (const f of fields) it[f.key] = i === 0 ? f.value : f.kind === 'rich' || f.kind === 'text' ? (f.attr ? f.peers[i - 1] : f.peers[i - 1]) : f.peers[i - 1];
          return it;
        });
        const lead = parent.children[0]?.type === 'text' ? parent.children[0].raw : '';
        const tail = parent.children.at(-1)?.type === 'text' ? parent.children.at(-1).raw : '';
        const sepNode = parent.children[parent.children.indexOf(kids[0]) + 1];
        const sep = sepNode && sepNode.type === 'text' ? sepNode.raw : '';
        parent.kkEach = { collection: cname, item: kids[0], lead, tail, sep };
        collections[cname] = { name: cname, component: pascal(cname), section: name, tag: kids[0].tag, fields: fields.map(({ key, kind, attr: a }) => ({ key, kind, ...(a ? { attr: a } : {}) })), items };
        sec.collections.push(cname);
      },
    });
    for (const p of sec.props) delete p.peers;
    sections[name] = sec;
    return name;
  };

  for (const page of theme.pages) {
    const root = page.tree;
    const htmlEl = find(root, (n) => n.tag === 'html');
    const head = find(root, (n) => n.tag === 'head');
    const body = find(root, (n) => n.tag === 'body');
    if (!body) { errors.push(`${page.file}: no <body>`); continue; }
    const titleEl = head && find(head, (n) => n.tag === 'title');
    const title = titleEl ? cleanText(decodeEntities(titleEl.children.map((c) => c.raw).join(''))) : '';
    const meta = (n) => head && attr(find(head, (e) => e.tag === 'meta' && (attr(e, 'name') === n || attr(e, 'property') === n)), 'content');
    const parts = [];
    const visitBody = (container, depth) => {
      for (const c of container.children) {
        if (c.type !== 'el') { parts.push({ kind: 'raw', html: c.raw }); continue; }
        if (c.tag === 'header' && depth === 0) { parts.push({ kind: 'section', name: addSection(c, 'site-header', 'header', page, root) }); continue; }
        if (c.tag === 'footer' && depth === 0) { parts.push({ kind: 'section', name: addSection(c, 'site-footer', 'footer', page, root) }); continue; }
        if (c.tag === 'main' && depth === 0) { parts.push({ kind: 'raw', html: c.openRaw }); visitBody(c, 1); parts.push({ kind: 'raw', html: c.closeRaw }); continue; }
        if (depth === 0 && !['header', 'footer', 'main', 'section'].includes(c.tag) && find(c, (n) => ['header', 'main', 'section', 'footer'].includes(n.tag))) { parts.push({ kind: 'raw', html: c.openRaw }); visitBody(c, 0); parts.push({ kind: 'raw', html: c.closeRaw }); continue; }
        if (c.tag === 'section') {
          const nm = sectionName(c, root);
          if (!nm) { errors.push(`${page.file}: <section> without a name (add data-section, id or aria-labelledby): ${c.openRaw.slice(0, 80)}`); parts.push({ kind: 'raw', html: serialize(c) }); continue; }
          if (nm.from === 'aria-labelledby+heading') info.push(`${page.file}: section named "${nm.name}" from its heading (aria-labelledby id "${attr(c, 'aria-labelledby')}" is too short); add data-section to fix the name`);
          parts.push({ kind: 'section', name: addSection(c, nm.name, 'section', page, root) });
          continue;
        }
        if (c.tag === 'script' || c.tag === 'style') warnings.push(`${page.file}: inline <${c.tag}> in the body is kept as-is`);
        else if (cleanText(textContent(c))) info.push(`${page.file}: <${c.tag}${attr(c, 'class') ? '.' + classes(c)[0] : ''}> outside a section is kept as fixed markup (not editable)`);
        parts.push({ kind: 'raw', html: serialize(c) });
      }
    };
    visitBody(body, 0);
    pages.push({
      slug: page.slug, file: page.file, path: page.slug === 'index' ? '/' : `/${page.slug}/`,
      title, description: meta('description') || '', og: { title: meta('og:title') || title, description: meta('og:description') || meta('description') || '', image: meta('og:image') || '' },
      lang: attr(htmlEl, 'lang') || lang || theme.meta.lang || 'de', bodyOpen: body.openRaw, htmlOpen: htmlEl?.openRaw || '<html lang="de">',
      stylesheets: head ? elements(head).filter((e) => e.tag === 'link' && /(^|\s)stylesheet(\s|$)/i.test(attr(e, 'rel') || '') && attr(e, 'href')).map((e) => attr(e, 'href')) : [],
      scripts: head ? elements(head).filter((e) => e.tag === 'script' && attr(e, 'src')).map((e) => ({ src: attr(e, 'src'), defer: attr(e, 'defer') !== undefined, module: attr(e, 'type') === 'module', async: attr(e, 'async') !== undefined })) : [],
      hasIcon: !!(head && elements(head).some((e) => e.tag === 'link' && /(^|\s)icon(\s|$)/i.test(attr(e, 'rel') || ''))),
      headExtra: head ? elements(head).filter((e) => !['title', 'meta', 'link'].includes(e.tag) || (e.tag === 'link' && !/stylesheet/.test(attr(e, 'rel') || '')) || (e.tag === 'meta' && !/^(viewport|description)$/.test(attr(e, 'name') || '') && !attr(e, 'charset') && !attr(e, 'property'))).map(serialize) : [],
      body, parts, sections: parts.filter((p) => p.kind === 'section').map((p) => p.name),
    });
  }

  const fontFiles = theme.assets.filter((f) => /^assets\/fonts\/.+\.(woff2?|ttf|otf)$/.test(f));
  const imgs = theme.assets.filter((f) => /^assets\/img\/.+\.(jpe?g|png|webp|avif|gif|svg)$/i.test(f));
  const altOf = (f) => { for (const s of Object.values(sections)) { let a = null; walk(s.node, (n) => { if (!a && n.tag === 'img' && (attr(n, 'src') || '').endsWith(f.split('/').pop())) a = attr(n, 'alt'); }); if (a !== null) return a; } return null; };
  const assets = [
    ...imgs.map((p) => { const m = theme.images[p.split('/').pop()] || theme.images[p] || {}; return { path: p, kind: 'image', alt: m.alt ?? altOf(p), credit: m.credit || null, license: m.license || null, ai: m.ai === true }; }),
    ...fontFiles.map((p) => ({ path: p, kind: 'font' })),
    ...theme.assets.filter((f) => !imgs.includes(f) && !fontFiles.includes(f)).map((p) => ({ path: p, kind: /\.css$/.test(p) ? 'css' : /LICENSE/i.test(p) ? 'license' : 'file' })),
  ];
  const ir = {
    version: 1,
    site: { name: name || theme.meta.name || theme.design.data.name || theme.meta.slug, slug: theme.meta.slug || slugify(theme.meta.name || 'theme'), lang: pages[0]?.lang || lang || 'de', url: siteUrl.replace(/\/$/, ''), description: theme.meta.summary || theme.design.data.description || '' },
    tokens: { css: theme.tokensCss, dtcg: theme.tokens },
    fonts: fontFiles,
    pages, sections, collections, assets,
    css: { site: theme.siteCss, fonts: theme.fontsCss },
    design: theme.designMd,
    meta: theme.meta,
  };
  return { ir, issues: { errors, warnings, info } };
}

/** Plain data of a section instance (props by key). */
export const sectionData = (sec) => Object.fromEntries(sec.props.map((p) => [p.key, p.value]));
