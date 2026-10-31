// In-page measuring for kk spec and kk fidelity. Both functions run inside the page (page.evaluate) and must stay
// self-contained. They return numbers, computed style values and short element labels (tag#id.firstClass), never
// the page's text or markup: line breaks are reported as line counts and line widths, not as words.

export function measureInPage(vhIn) {
  const vw = innerWidth, vh = vhIn || innerHeight;
  const de = document.documentElement;
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const shown = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (e) => { const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : (e.className && e.className.baseVal || '').split(/\s+/)[0]; return e.tagName.toLowerCase() + (e.id ? '#' + e.id.slice(0, 24) : '') + (c ? '.' + c.slice(0, 32) : ''); };
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const ownText = (e) => { let n = 0; for (const c of e.childNodes) if (c.nodeType === 3) n += c.textContent.trim().length; return n; };
  const lineInfo = (e) => {
    const rg = document.createRange(); rg.selectNodeContents(e);
    const rects = [...rg.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    const fs = parseFloat(getComputedStyle(e).fontSize) || 16;
    const lines = [];
    for (const r of rects.sort((a, b) => a.top - b.top)) {
      const l = lines.find((x) => Math.abs(x.top - r.top) < fs * 0.45);
      if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); } else lines.push({ top: r.top, left: r.left, right: r.right });
    }
    return { lines: lines.length, widths: lines.slice(0, 12).map((l) => Math.round(l.right - l.left)) };
  };
  const typeOf = (e) => { const s = getComputedStyle(e); return { ff: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), fs: px(s.fontSize), lh: s.lineHeight === 'normal' ? 'normal' : px(s.lineHeight), fw: s.fontWeight, ls: s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing), tt: s.textTransform, it: s.fontStyle === 'italic', color: s.color, align: s.textAlign, maxw: s.maxWidth }; };

  const all = [...document.body.querySelectorAll('*')].slice(0, 8000).filter(shown);
  const main = document.querySelector('main');

  // ---- text styles, colours
  const styles = {}, textCol = {}, bgCol = {}, radii = {}, gradients = [];
  let textChars = 0;
  for (const e of all) {
    const s = getComputedStyle(e);
    const n = ownText(e);
    if (n >= 2) {
      const t = typeOf(e);
      const k = [t.ff, t.fs, t.fw, t.lh, t.ls, t.tt, t.it].join('|');
      (styles[k] ||= { ...t, chars: 0, count: 0, tags: {}, sample: label(e) });
      styles[k].chars += n; styles[k].count++; styles[k].tags[e.tagName.toLowerCase()] = (styles[k].tags[e.tagName.toLowerCase()] || 0) + 1;
      textCol[s.color] = (textCol[s.color] || 0) + n; textChars += n;
    }
    const r = e.getBoundingClientRect();
    if (s.backgroundColor && !/rgba\([^)]*,\s*0\)$|transparent/.test(s.backgroundColor)) bgCol[s.backgroundColor] = (bgCol[s.backgroundColor] || 0) + r.width * Math.min(r.height, 20000);
    if (s.backgroundImage.includes('gradient') && r.width * r.height > 20000 && gradients.length < 6) gradients.push({ el: label(e), box: R(e), value: s.backgroundImage.slice(0, 240) });
    const hasSurface = s.backgroundColor && !/rgba\([^)]*,\s*0\)$/.test(s.backgroundColor) || s.borderStyle !== 'none' && parseFloat(s.borderWidth) > 0 || e.tagName === 'IMG';
    if (hasSurface && r.width > 24 && r.height > 24) radii[s.borderRadius] = (radii[s.borderRadius] || 0) + 1;
  }
  const typeScale = Object.values(styles).sort((a, b) => b.fs - a.fs || b.chars - a.chars);
  const body = typeScale.slice().sort((a, b) => b.chars - a.chars)[0] || null;

  // ---- roles (one sample element per role)
  const firstShown = (sel) => [...document.querySelectorAll(sel)].find(shown) || null;
  const pBody = [...document.querySelectorAll('main p, p, li')].filter(shown).sort((a, b) => b.textContent.length - a.textContent.length)[0] || null;
  const navEl = firstShown('header nav, nav, header');
  const button = [...document.querySelectorAll('button, a')].filter(shown).find((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.y + scrollY < vh * 1.2 && (parseFloat(s.paddingLeft) >= 8 && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderWidth) > 0)) && r.height >= 28 && r.width < vw * 0.6; }) || null;
  const roleOf = (e) => (e ? { el: label(e), box: R(e), ...typeOf(e), ...lineInfo(e), chars: e.textContent.trim().length } : null);
  const biggestFirst = all.filter((e) => ownText(e) >= 2 && e.getBoundingClientRect().top + scrollY < vh).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0] || null;
  const roles = {
    h1: roleOf(firstShown('h1') || biggestFirst), h2: roleOf(firstShown('h2')), h3: roleOf(firstShown('h3')),
    body: roleOf(pBody), nav_link: roleOf(navEl ? [...navEl.querySelectorAll('a')].find(shown) || null : null), button: roleOf(button),
    small: (() => { const sm = typeScale.filter((t) => t.chars >= 30).sort((a, b) => a.fs - b.fs)[0]; return sm ? { el: sm.sample, ff: sm.ff, fs: sm.fs, lh: sm.lh, fw: sm.fw, ls: sm.ls, tt: sm.tt } : null; })(),
  };

  // ---- line breaks of display text
  const bodyFs = body ? body.fs : 16;
  const breaks = [];
  const seen = new Set();
  for (const e of [...document.querySelectorAll('h1, h2, h3')].filter(shown).slice(0, 14).concat(all.filter((e) => ownText(e) >= 8 && parseFloat(getComputedStyle(e).fontSize) >= bodyFs * 2).slice(0, 10))) {
    if (seen.has(e)) continue; seen.add(e);
    const t = typeOf(e), li = lineInfo(e), b = R(e), chars = e.textContent.trim().length;
    breaks.push({ el: label(e), tag: e.tagName.toLowerCase(), fs: t.fs, lh: t.lh, ff: t.ff, box: b, lines: li.lines, line_widths: li.widths, measure_em: Math.round((b.w / t.fs) * 10) / 10, chars_per_line: li.lines ? Math.round(chars / li.lines) : null, maxw: t.maxw });
    if (breaks.length >= 18) break;
  }

  // ---- container (most frequent left and right edges of non-full-width blocks with text)
  const lefts = {}, rights = {}, maxws = {};
  for (const e of all) {
    const r = e.getBoundingClientRect();
    if (r.width < vw * 0.35 || r.width > vw - 2 || r.height < 16) continue;
    if (!e.querySelector('h1,h2,h3,p,li,a,img') && ownText(e) < 2) continue;
    const cs = getComputedStyle(e); const surface = !/rgba\([^)]*,\s*0\)$/.test(cs.backgroundColor) || parseFloat(cs.borderLeftWidth) > 0; const l = Math.round(r.left + (surface ? 0 : parseFloat(cs.paddingLeft))), rt = Math.round(r.right - (surface ? 0 : parseFloat(cs.paddingRight)));
    lefts[l] = (lefts[l] || 0) + 1; rights[rt] = (rights[rt] || 0) + 1;
    const mw = getComputedStyle(e).maxWidth; if (mw !== 'none' && /px$/.test(mw)) maxws[mw] = (maxws[mw] || 0) + 1;
  }
  const mode = (o) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1])[0]; return e ? +e[0] : null; };
  const cl = mode(lefts), cr = mode(rights);
  const container = { left: cl, right: cr, width: cl !== null && cr !== null ? cr - cl : null, gutter_left: cl, gutter_right: cr !== null ? vw - cr : null, max_widths: Object.entries(maxws).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, n]) => ({ value: v, count: n })) };

  // ---- grids and multi-column rows
  const grids = [];
  for (const e of all) {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    const kids = [...e.children].filter(shown);
    if (kids.length < 2 || r.width < vw * 0.3) continue;
    if (s.display.includes('grid')) {
      const cols = s.gridTemplateColumns.split(/\s+/).filter((v) => /px$/.test(v)).map(px);
      if (cols.length < 1) continue;
      grids.push({ el: label(e), kind: 'grid', box: R(e), columns: cols.length, col_widths: cols.map(Math.round), col_gap: s.columnGap === 'normal' ? 0 : px(s.columnGap), row_gap: s.rowGap === 'normal' ? 0 : px(s.rowGap), items: kids.length });
    } else if (s.display.includes('flex') && !s.flexDirection.startsWith('column')) {
      const top = Math.min(...kids.map((k) => k.getBoundingClientRect().top));
      const row = kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 4 && k.getBoundingClientRect().width >= r.width * 0.12);
      if (row.length < 2) continue;
      grids.push({ el: label(e), kind: 'flex', box: R(e), columns: row.length, col_widths: row.map((k) => Math.round(k.getBoundingClientRect().width)), col_gap: s.columnGap === 'normal' ? 0 : px(s.columnGap), row_gap: s.rowGap === 'normal' ? 0 : px(s.rowGap), items: kids.length, wrap: s.flexWrap !== 'nowrap' });
    }
  }
  grids.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h);
  const gridsOut = grids.slice(0, 16).map((g) => { const m = Math.min(...g.col_widths); return { ...g, ratio: g.col_widths.map((w) => Math.round((w / m) * 100) / 100).join(' : ') }; }).sort((a, b) => a.box.y - b.box.y);

  // ---- sections (top-level blocks, wrappers unwrapped, main expanded)
  const unwrap = (el) => { let cur = el; for (let i = 0; i < 6; i++) { const ch = cur.getBoundingClientRect().height; const kids = [...cur.children].filter((k) => shown(k) && k.getBoundingClientRect().height >= 40); if (kids.length === 1 && kids[0].getBoundingClientRect().height >= ch * 0.9 && !['MAIN', 'SECTION', 'HEADER', 'FOOTER'].includes(cur.tagName)) cur = kids[0]; else break; } return cur; };
  const expand = (el, depth = 0) => {
    const kids = [...unwrap(el).children].filter((k) => shown(k) && k.getBoundingClientRect().height >= 40 && !['SCRIPT', 'STYLE'].includes(k.tagName));
    const out = [];
    for (const k of kids) { if (depth < 3 && main && k !== main && k.contains(main)) out.push(...expand(k, depth + 1)); else if (k === main) out.push(...expand(main, depth + 1)); else out.push(k); }
    return out;
  };
  const secEls = expand(document.body).filter((e) => { const p = getComputedStyle(e).position; return p !== 'fixed'; }).slice(0, 40);
  const sections = secEls.map((e, i) => {
    const s = getComputedStyle(e), b = R(e);
    const sticky = [e, ...e.querySelectorAll('*')].slice(0, 300).some((x) => getComputedStyle(x).position === 'sticky');
    const head = e.querySelector('h1,h2,h3');
    const media = [...e.querySelectorAll('img,video,canvas,picture,svg')].filter((m) => shown(m) && m.getBoundingClientRect().width >= 80).length;
    return { i, el: label(e), tag: e.tagName.toLowerCase(), y: b.y, h: b.h, h_vh: Math.round((b.h / vh) * 100) / 100, w: b.w, bg: s.backgroundColor, bg_image: s.backgroundImage === 'none' ? null : s.backgroundImage.includes('gradient') ? 'gradient' : 'image', pad_top: px(s.paddingTop), pad_bottom: px(s.paddingBottom), sticky, media, heading: head ? { tag: head.tagName.toLowerCase(), fs: px(getComputedStyle(head).fontSize), y_in: Math.round(head.getBoundingClientRect().top - e.getBoundingClientRect().top) } : null };
  });

  // ---- media formats
  const NAMED = [['21:9', 21 / 9], ['2:1', 2], ['16:9', 16 / 9], ['3:2', 1.5], ['4:3', 4 / 3], ['5:4', 1.25], ['1:1', 1], ['4:5', 0.8], ['3:4', 0.75], ['2:3', 2 / 3], ['9:16', 9 / 16]];
  const named = (r) => { const n = NAMED.map(([k, v]) => [k, Math.abs(Math.log(r / v))]).sort((a, b) => a[1] - b[1])[0]; return n[1] < 0.04 ? n[0] : 'custom'; };
  const media = [];
  for (const e of all) {
    const tag = e.tagName.toLowerCase();
    const r = e.getBoundingClientRect();
    if (r.width < 80 || r.height < 60) continue;
    const s = getComputedStyle(e);
    let kind = null;
    if (['img', 'video', 'canvas'].includes(tag)) kind = tag;
    else if (tag === 'svg' && !e.closest('a,button') && r.width >= 120) kind = 'svg';
    else if (s.backgroundImage.includes('url(') && r.width >= 120) kind = 'bg-image';
    if (!kind) continue;
    const ratio = r.width / r.height;
    const nat = tag === 'img' && e.naturalWidth ? e.naturalWidth / e.naturalHeight : tag === 'video' && e.videoWidth ? e.videoWidth / e.videoHeight : null;
    media.push({ kind, el: label(e), box: R(e), ratio: Math.round(ratio * 1000) / 1000, named: named(ratio), natural_ratio: nat ? Math.round(nat * 1000) / 1000 : null, cropped: nat ? Math.abs(Math.log(ratio / nat)) > 0.03 : null, fit: s.objectFit, position: s.objectPosition, radius: s.borderRadius, bleed: r.width >= vw * 0.98, first_screen: r.top + scrollY < vh });
    if (media.length >= 60) break;
  }

  // ---- fixed and sticky layers, nav
  const layers = all.filter((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position)).slice(0, 16).map((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { el: label(e), position: s.position, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, z: s.zIndex, bg: s.backgroundColor, backdrop: s.backdropFilter !== 'none' ? s.backdropFilter : null, mask: s.maskImage && s.maskImage !== 'none' ? true : null }; });
  const nav = navEl ? { el: label(navEl), box: R(navEl), links_visible: [...navEl.querySelectorAll('a')].filter(shown).length, position: getComputedStyle(navEl.closest('header') || navEl).position } : null;

  // ---- breakpoints declared in CSS (numbers only)
  const mq = {};
  const walk = (rules) => { for (const r of rules) { const c = r.conditionText || (r.media && r.media.mediaText) || ''; if (c) for (const m of c.matchAll(/(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g)) { const v = Math.round(+m[2] * (m[3] === 'px' ? 1 : 16)); const k = m[1] + ' ' + v; mq[k] = (mq[k] || 0) + 1; } if (r.cssRules) walk(r.cssRules); } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }

  return {
    vw, vh, doc_h: de.scrollHeight, overflow_x: de.scrollWidth > vw + 1, root_fs: px(getComputedStyle(de).fontSize), body_fs: bodyFs,
    container, roles, type_scale: typeScale.slice(0, 18).map((t) => ({ ff: t.ff, fs: t.fs, fw: t.fw, lh: t.lh, ls: t.ls, tt: t.tt, it: t.it, chars: t.chars, count: t.count, tags: Object.keys(t.tags).slice(0, 4).join(','), sample: t.sample, ratio_to_body: Math.round((t.fs / bodyFs) * 100) / 100 })),
    breaks, grids: gridsOut, sections, media, layers, nav,
    colors: { text: Object.entries(textCol).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => ({ c, share: Math.round((n / Math.max(1, textChars)) * 1000) / 1000 })), bg: Object.entries(bgCol).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, a]) => ({ c, area: Math.round(a) })), gradients },
    radii: Object.entries(radii).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => ({ value: v, count: n })),
    media_queries: Object.entries(mq).sort((a, b) => +a[0].split(' ')[1] - +b[0].split(' ')[1]).map(([k, n]) => ({ query: k, count: n })),
  };
}

// Cheap per-width probe for the breakpoint sweep (relayout only, no reload).
export function sweepInPage() {
  const vw = innerWidth;
  const shown = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
  const h1 = [...document.querySelectorAll('h1')].find(shown);
  const lines = (e) => { if (!e) return null; const rg = document.createRange(); rg.selectNodeContents(e); const fs = parseFloat(getComputedStyle(e).fontSize); const tops = []; for (const r of rg.getClientRects()) if (r.width > 0.5 && !tops.some((t) => Math.abs(t - r.top) < fs * 0.45)) tops.push(r.top); return tops.length; };
  const nav = [...document.querySelectorAll('header nav, nav, header')].find(shown);
  const grids = [...document.body.querySelectorAll('*')].slice(0, 6000).filter((e) => shown(e) && getComputedStyle(e).display.includes('grid') && e.children.length >= 2 && e.getBoundingClientRect().width >= vw * 0.3)
    .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height).slice(0, 4)
    .map((e) => getComputedStyle(e).gridTemplateColumns.split(/\s+/).filter((v) => /px$/.test(v)).length);
  const p = [...document.querySelectorAll('p')].find(shown);
  return { w: vw, doc_h: document.documentElement.scrollHeight, overflow_x: document.documentElement.scrollWidth > vw + 1, h1_fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null, h1_lines: lines(h1), body_fs: p ? parseFloat(getComputedStyle(p).fontSize) : null, nav_links: nav ? [...nav.querySelectorAll('a')].filter(shown).length : null, grid_cols: grids };
}

export const SWEEP_WIDTHS = [320, 360, 390, 480, 600, 720, 768, 834, 960, 1024, 1180, 1280, 1366, 1440, 1600, 1920];

// Where something discrete changes between two neighbouring widths of the sweep.
export function detectBreakpoints(sweep) {
  const out = [];
  for (let i = 1; i < sweep.length; i++) {
    const a = sweep[i - 1], b = sweep[i], ch = [];
    if (a.nav_links !== b.nav_links) ch.push(`nav links ${a.nav_links} -> ${b.nav_links}`);
    if (String(a.grid_cols) !== String(b.grid_cols)) ch.push(`grid columns ${a.grid_cols.join('/') || '-'} -> ${b.grid_cols.join('/') || '-'}`);
    if (a.h1_fs && b.h1_fs && Math.abs(a.h1_fs - b.h1_fs) >= 2 && (i < 2 || Math.abs((sweep[i - 2].h1_fs || 0) - a.h1_fs) < 0.5)) ch.push(`h1 ${a.h1_fs} -> ${b.h1_fs} px`);
    if (a.body_fs && b.body_fs && a.body_fs !== b.body_fs) ch.push(`body ${a.body_fs} -> ${b.body_fs} px`);
    if (a.overflow_x !== b.overflow_x) ch.push(`horizontal overflow ${a.overflow_x} -> ${b.overflow_x}`);
    if (ch.length) out.push({ between: [a.w, b.w], changes: ch });
  }
  return out;
}
