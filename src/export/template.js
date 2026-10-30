// Serialise an annotated section tree (see ir.js) into HTML (with data), Astro or JSX templates.
// Untouched nodes are written from their raw source, so render(html, props) reproduces the page.
import { escapeText, escapeAttr, openTag, elements, VOID } from './html.js';

const valueOf = (data, key) => (data && key in data ? data[key] : undefined);

/** HTML with data. mapUrl(value, attrName) rewrites URLs for the target. */
export function renderHtml(node, data, ctx = {}) {
  const { collections = {}, mapUrl = (v) => v } = ctx;
  if (node.type === 'text' || node.type === 'comment' || node.type === 'doctype') return node.raw;
  if (node.type === 'root') return node.children.map((c) => renderHtml(c, data, ctx)).join('');
  let open = node.openRaw;
  if (node.kkAttrs) {
    const ov = {};
    for (const [name, key] of Object.entries(node.kkAttrs)) { const v = valueOf(data, key); ov[name] = v === null || v === undefined ? null : ['href', 'src', 'srcset', 'poster', 'action'].includes(name) ? mapUrl(v, name) : v; }
    open = openTag(node, ov);
  }
  let body;
  if (node.kkInner) { const v = valueOf(data, node.kkInner.key) ?? ''; body = node.kkInner.kind === 'rich' ? ctx.mapRich ? ctx.mapRich(v) : v : escapeText(v); }
  else if (node.kkEach) {
    const items = collections[node.kkEach.collection]?.items || [];
    body = node.kkEach.lead + items.map((it) => renderHtml(node.kkEach.item, it, ctx)).join(node.kkEach.sep) + node.kkEach.tail;
  } else body = node.children.map((c) => renderHtml(c, data, ctx)).join('');
  return open + body + node.closeRaw;
}

/** Rewrite href/src/srcset URLs inside a raw HTML string (rich props, fixed markup). */
export function mapUrlsInHtml(html, mapUrl) {
  return String(html).replace(/\b(href|src|srcset|poster|action)=("([^"]*)"|'([^']*)')/g, (m, name, q, a, b) => `${name}="${escapeAttr(mapUrl(a ?? b, name))}"`);
}

const braceSafe = (s) => s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

/** Astro template: props object `p`, collection items `item`. */
export function renderAstro(node, ctx = {}) {
  const { scope = 'p', mapUrl = (v) => v } = ctx;
  if (node.type === 'text') return node.rawText ? node.raw : braceSafe(mapLiteral(node.raw, mapUrl));
  if (node.type === 'comment' || node.type === 'doctype') return '';
  const raw = (s) => braceSafe(mapLiteral(s, mapUrl));
  let open;
  if (node.kkAttrs || /^(script|style)$/.test(node.tag)) {
    const parts = [];
    for (const a of node.attrs) {
      if (node.kkAttrs && a.name in node.kkAttrs) parts.push(`${a.orig || a.name}={${scope}.${node.kkAttrs[a.name]}}`);
      else parts.push(braceSafe(mapLiteral(a.raw, mapUrl)));
    }
    if (node.kkAttrs) for (const [n, k] of Object.entries(node.kkAttrs)) if (!node.attrs.some((a) => a.name === n)) parts.push(`${n}={${scope}.${k}}`);
    if (/^(script|style)$/.test(node.tag)) parts.push('is:inline');
    open = `<${node.tag}${parts.length ? ' ' + parts.join(' ') : ''}${node.selfClosing ? ' />' : '>'}`;
  } else open = raw(node.openRaw);
  let body;
  if (node.kkInner) body = node.kkInner.kind === 'rich' ? `<Fragment set:html={${scope}.${node.kkInner.key}} />` : `{${scope}.${node.kkInner.key}}`;
  else if (node.kkEach) {
    const c = node.kkEach;
    body = `${c.lead}{${camelItems(c.collection)}.map((item) => (\n${renderAstro(c.item, { ...ctx, scope: 'item' })}\n))}${c.tail}`;
  } else if (/^(script|style)$/.test(node.tag)) body = node.children.map((c) => c.raw).join('');
  else body = node.children.map((c) => renderAstro(c, ctx)).join('');
  return open + body + node.closeRaw;
}
export const camelItems = (name) => String(name).replace(/[^a-zA-Z0-9]+(.)/g, (m, c) => c.toUpperCase()).replace(/^[0-9]/, (d) => '_' + d) + 'Items';

// literal URLs in fixed markup (header nav links etc.) go through the same mapping
function mapLiteral(s, mapUrl) { return /\b(href|src|srcset)=/.test(s) ? mapUrlsInHtml(s, mapUrl) : s; }

// ---------- JSX (React) ----------
const JSX_ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', datetime: 'dateTime', autocomplete: 'autoComplete', enctype: 'encType', 'xlink:href': 'xlinkHref', 'xml:lang': 'xmlLang', 'xml:space': 'xmlSpace', fetchpriority: 'fetchPriority', referrerpolicy: 'referrerPolicy', allowfullscreen: 'allowFullScreen', novalidate: 'noValidate', contenteditable: 'contentEditable', spellcheck: 'spellCheck', accesskey: 'accessKey', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', 'accept-charset': 'acceptCharset', 'http-equiv': 'httpEquiv', itemprop: 'itemProp', itemscope: 'itemScope', itemtype: 'itemType' };
export function jsxAttrName(a) {
  const n = a.name;
  if (JSX_ATTR[n]) return JSX_ATTR[n];
  if (/^(aria|data)-/.test(n)) return n;
  if (n.includes('-') || n.includes(':')) return n.replace(/[-:]([a-z])/g, (m, c) => c.toUpperCase());
  return a.orig || n; // keeps SVG camelCase like viewBox
}
export function styleObject(css) {
  const out = [];
  for (const decl of String(css).split(';')) {
    const i = decl.indexOf(':'); if (i < 0) continue;
    const prop = decl.slice(0, i).trim(), val = decl.slice(i + 1).trim(); if (!prop) continue;
    const key = prop.startsWith('--') ? JSON.stringify(prop) : prop.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    out.push(`${key}: ${JSON.stringify(val)}`);
  }
  return `{{ ${out.join(', ')} }}`;
}
const jsxText = (s) => s.replace(/[{}]/g, (c) => `{'${c}'}`);
export function renderJsx(node, ctx = {}) {
  const { scope = 'p', mapUrl = (v) => v } = ctx;
  if (node.type === 'text') return jsxText(node.raw);
  if (node.type === 'comment' || node.type === 'doctype') return '';
  if (/^(script|style)$/.test(node.tag)) return node.tag === 'style' ? `<style dangerouslySetInnerHTML={{ __html: ${JSON.stringify(node.children.map((c) => c.raw).join(''))} }} />` : '';
  const parts = [];
  const seen = new Set();
  for (const a of node.attrs) {
    seen.add(a.name);
    const nm = jsxAttrName(a);
    if (node.kkAttrs && a.name in node.kkAttrs) { parts.push(a.name === 'style' ? `style={kkStyle(${scope}.${node.kkAttrs[a.name]})}` : `${nm}={${scope}.${node.kkAttrs[a.name]} ?? undefined}`); continue; }
    if (!a.hasValue) { parts.push(nm); continue; }
    if (a.name === 'style') { parts.push(`style=${styleObject(a.value)}`); continue; }
    const v = ['href', 'src', 'srcset', 'poster', 'action'].includes(a.name) ? mapUrl(a.value, a.name) : a.value;
    parts.push(/["\\&{}]/.test(v) || /\n/.test(v) ? `${nm}={${JSON.stringify(v)}}` : `${nm}="${v}"`);
  }
  if (node.kkAttrs) for (const [n, k] of Object.entries(node.kkAttrs)) if (!seen.has(n)) parts.push(n === 'style' ? `style={kkStyle(${scope}.${k})}` : `${jsxAttrName({ name: n })}={${scope}.${k} ?? undefined}`);
  if (node.kkInner?.kind === 'rich') parts.push(`dangerouslySetInnerHTML={{ __html: ${scope}.${node.kkInner.key} }}`);
  if (ctx.keyAttr) parts.unshift(`key={${ctx.keyAttr}}`);
  const open = `<${node.tag}${parts.length ? ' ' + parts.join(' ') : ''}`;
  if (VOID.has(node.tag) || node.kkInner?.kind === 'rich' || (node.selfClosing && !node.children.length)) return open + ' />';
  let body;
  if (node.kkInner) body = `{${scope}.${node.kkInner.key}}`;
  else if (node.kkEach) { const c = node.kkEach; body = `{${camelItems(c.collection)}.map((item) => (\n${renderJsx(c.item, { ...ctx, scope: 'item', keyAttr: 'item.id' })}\n))}`; }
  else body = node.children.map((c) => renderJsx(c, { ...ctx, keyAttr: undefined })).join('');
  return `${open}>${body}</${node.tag}>`;
}

/** Runtime helper for style values that are props (inserted into TSX components that need it). */
export const KK_STYLE_HELPER = `function kkStyle(css?: string | null): Record<string, string> | undefined {
  if (!css) return undefined;
  const o: Record<string, string> = {};
  for (const d of css.split(';')) { const i = d.indexOf(':'); if (i < 0) continue; const k = d.slice(0, i).trim(); if (!k) continue; o[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = d.slice(i + 1).trim(); }
  return o;
}
`;
