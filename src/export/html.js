// Small, forgiving HTML parser for theme pages (no dependency). It keeps the raw source of every
// tag and text node, so serialising an untouched tree gives the input back byte for byte.
// Not a full HTML5 tree builder: it handles void elements, raw-text elements, comments, doctype,
// self-closing tags (SVG) and implied end tags for p/li/dt/dd/option/tr/td/th. Theme pages are
// well-formed by contract; anything odd is kept as raw text rather than repaired.

export const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const IMPLIED = { p: /^(address|article|aside|blockquote|details|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|main|nav|ol|p|pre|section|table|ul)$/, li: /^li$/, dt: /^(dt|dd)$/, dd: /^(dt|dd)$/, option: /^option$/, tr: /^tr$/, td: /^(td|th|tr)$/, th: /^(td|th|tr)$/ };

const ATTR_RE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(src) {
  const attrs = [];
  for (const m of src.matchAll(ATTR_RE)) attrs.push({ name: m[1].toLowerCase(), orig: m[1], value: decodeEntities(m[2] ?? m[3] ?? m[4] ?? ''), raw: m[0], hasValue: m[2] !== undefined || m[3] !== undefined || m[4] !== undefined });
  return attrs;
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­', ndash: '–', mdash: '—', hellip: '…', euro: '€', copy: '©', reg: '®', middot: '·', times: '×', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚', thinsp: ' ', zwnj: '‌', zwj: '‍', para: '¶', sect: '§', deg: '°' };
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return NAMED[e] ?? m;
  });
}
export const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Parse into { type:'root', children } with nodes { type:'el'|'text'|'comment'|'doctype', ... }. */
export function parse(html) {
  const root = { type: 'root', children: [], start: 0, end: html.length };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;
  const pushText = (from, to) => { if (to > from) top().children.push({ type: 'text', raw: html.slice(from, to), start: from, end: to, parent: top() }); };
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { pushText(i, html.length); break; }
    pushText(i, lt);
    if (html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt + 4); const end = e < 0 ? html.length : e + 3;
      top().children.push({ type: 'comment', raw: html.slice(lt, end), start: lt, end, parent: top() }); i = end; continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const e = html.indexOf('>', lt); const end = e < 0 ? html.length : e + 1;
      top().children.push({ type: 'doctype', raw: html.slice(lt, end), start: lt, end, parent: top() }); i = end; continue;
    }
    const close = html[lt + 1] === '/';
    const m = /^<\/?([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 64));
    if (!m) { pushText(lt, lt + 1); i = lt + 1; continue; }
    // find end of tag, respecting quotes
    let j = lt + m[0].length, q = null;
    for (; j < html.length; j++) { const ch = html[j]; if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '>') break; }
    const tagEnd = Math.min(j + 1, html.length);
    const name = m[1].toLowerCase();
    if (close) {
      // pop to the matching element; ignore stray end tags
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag === name) {
          for (let n = stack.length - 1; n > k; n--) { stack[n].end = lt; stack[n].innerEnd = lt; stack[n].closeRaw = ''; }
          const el = stack[k]; el.innerEnd = lt; el.closeRaw = html.slice(lt, tagEnd); el.end = tagEnd; stack.length = k; break;
        }
      }
      i = tagEnd; continue;
    }
    const openRaw = html.slice(lt, tagEnd);
    const selfClosing = /\/\s*>$/.test(openRaw);
    const attrSrc = openRaw.slice(m[0].length, openRaw.length - (selfClosing ? 2 : 1));
    // implied end tags
    for (;;) { const t = top(); const rule = t.tag && IMPLIED[t.tag]; if (rule && rule.test(name)) { t.end = lt; t.innerEnd = lt; t.closeRaw = ''; stack.pop(); } else break; }
    const el = { type: 'el', tag: name, attrs: parseAttrs(attrSrc), openRaw, closeRaw: '', children: [], start: lt, innerStart: tagEnd, innerEnd: tagEnd, end: tagEnd, selfClosing, parent: top() };
    top().children.push(el);
    i = tagEnd;
    if (VOID.has(name) || selfClosing) continue;
    if (RAW.has(name)) {
      const ce = html.toLowerCase().indexOf('</' + name, tagEnd);
      const cEnd = ce < 0 ? html.length : html.indexOf('>', ce) + 1 || html.length;
      if (ce > tagEnd) el.children.push({ type: 'text', raw: html.slice(tagEnd, ce), start: tagEnd, end: ce, parent: el, rawText: true });
      el.innerEnd = ce < 0 ? html.length : ce; el.closeRaw = ce < 0 ? '' : html.slice(ce, cEnd); el.end = cEnd; i = cEnd; continue;
    }
    stack.push(el);
  }
  for (let k = stack.length - 1; k > 0; k--) { stack[k].end = html.length; stack[k].innerEnd = html.length; }
  return root;
}

export function serialize(node) {
  if (node.type === 'root') return node.children.map(serialize).join('');
  if (node.type !== 'el') return node.raw;
  return node.openRaw + node.children.map(serialize).join('') + node.closeRaw;
}
export const inner = (node) => node.children.map(serialize).join('');

export const attr = (el, name) => el?.attrs?.find((a) => a.name === name)?.value;
export const hasAttr = (el, name) => !!el?.attrs?.some((a) => a.name === name);
export const classes = (el) => (attr(el, 'class') || '').split(/\s+/).filter(Boolean);
export const elements = (node) => (node.children || []).filter((c) => c.type === 'el');

export function walk(node, fn, depth = 0) {
  if (fn(node, depth) === false) return;
  for (const c of node.children || []) walk(c, fn, depth + 1);
}
export function findAll(node, pred) { const out = []; walk(node, (n) => { if (n !== node && n.type === 'el' && pred(n)) out.push(n); }); return out; }
export function find(node, pred) { let hit = null; walk(node, (n) => { if (hit) return false; if (n !== node && n.type === 'el' && pred(n)) { hit = n; return false; } }); return hit; }
export const byTag = (tag) => (n) => n.tag === tag;
export function textContent(node) {
  if (node.type === 'text') return node.rawText ? '' : decodeEntities(node.raw);
  if (node.type !== 'el' && node.type !== 'root') return '';
  if (node.tag === 'script' || node.tag === 'style') return '';
  return node.children.map(textContent).join('');
}
export const cleanText = (s) => String(s).replace(/\s+/g, ' ').trim();
export function getById(root, id) { return find(root, (n) => attr(n, 'id') === id); }

/** Rebuild an open tag after attribute edits, keeping untouched attribute source as written. */
export function openTag(el, overrides = {}) {
  const parts = [];
  const seen = new Set();
  for (const a of el.attrs) {
    seen.add(a.name);
    if (a.name in overrides) { const v = overrides[a.name]; if (v === null || v === undefined) continue; parts.push(`${a.name}="${escapeAttr(v)}"`); }
    else parts.push(a.raw);
  }
  for (const [k, v] of Object.entries(overrides)) if (!seen.has(k) && v !== null && v !== undefined) parts.push(`${k}="${escapeAttr(v)}"`);
  return `<${el.openRaw.slice(1, 1 + el.tag.length)}${parts.length ? ' ' + parts.join(' ') : ''}${el.selfClosing ? ' />' : '>'}`;
}
