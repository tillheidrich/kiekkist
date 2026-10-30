import { t, LANG } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const J = ['love', 'like', 'meh', 'no'];

export function md(src = '') {
  // Small, safe markdown subset: headings, lists, bold, italics, code, links, paragraphs, front matter shown as code.
  let s = String(src);
  let fm = '';
  const m = s.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) { fm = `<details class="fm"><summary>Front matter</summary><pre>${esc(m[1])}</pre></details>`; s = s.slice(m[0].length); }
  const out = []; let list = null; let code = null;
  const inline = (x) => esc(x).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  for (const line of s.split('\n')) {
    if (line.startsWith('```')) { if (code) { out.push(`<pre>${esc(code.join('\n'))}</pre>`); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const li = line.match(/^\s*[-*]\s+(.*)/) || line.match(/^\s*\d+\.\s+(.*)/);
    if (!li && list) { out.push(`</${list}>`); list = null; }
    if (h) out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
    else if (li) { if (!list) { list = 'ul'; out.push('<ul>'); } out.push(`<li>${inline(li[1])}</li>`); }
    else if (line.startsWith('> ')) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else if (line.startsWith('|')) out.push(`<p class="tbl">${inline(line)}</p>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`</${list}>`);
  if (code) out.push(`<pre>${esc(code.join('\n'))}</pre>`);
  return fm + out.join('\n');
}

const NAV = [['/', 'library'], ['/boards', 'boards'], ['/themes', 'themes'], ['/sources', 'sources'], ['/profile', 'profile']];
export function layout({ title, body, active = '', stats, flash, client = false }) {
  return `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Kiekkist</title><link rel="stylesheet" href="/static/app.css"><link rel="icon" href="/static/icon.svg">
<script src="/static/app.js" defer></script></head><body>
${client ? `<header class="top"><span class="mark">Kiekkist</span></header>` : `<header class="top"><a class="mark" href="/">Kiekkist</a>
<nav>${NAV.map(([h, k]) => `<a href="${h}"${active === k ? ' aria-current="page"' : ''}>${t(k)}</a>`).join('')}</nav>
<form class="q" action="/" method="get"><label class="sr" for="q">${t('search')}</label><input id="q" name="q" type="search" placeholder="${t('search')} …" autocomplete="off"></form>
</header>`}
${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
<main>${body}</main>
${client ? '' : `<footer class="foot">${stats ? esc(t('stats_line', stats)) : ''}<span>Kiekkist · AGPL-3.0 · <a href="/llms.txt">llms.txt</a> · <a href="/api/profile?format=md">profile.md</a> · <form method="post" action="/logout" class="logout"><button class="linkish">${LANG === 'de' ? 'Abmelden' : 'Sign out'}</button></form></span></footer>`}
</body></html>`;
}

export const judgeButtons = (kind, id, current, extra = '') => `<form class="judge" data-judge="${kind}" data-id="${esc(id)}" ${extra}>
${J.map((j, i) => `<button type="button" name="judgment" value="${j}" class="j j-${j}" aria-pressed="${current === j}" title="${t(j)} (${i + 1})">${t(j)}</button>`).join('')}
</form>`;

const isAgent = (r) => !!r.judged_by && !String(r.judged_by).startsWith('till');
const chip = (s, cls = '') => `<span class="chip ${cls}">${esc(s)}</span>`;
const judgmentChip = (r) => (r.judgment ? chip(t(r.judgment) + (isAgent(r) ? ' · ' + t('judged_by_claude') : ''), 'jc-' + r.judgment + (isAgent(r) ? ' agent' : '')) : '');

export function refCard(r) {
  const img = r.shots?.desktop ? `<img src="${r.shots.desktop}" alt="" loading="lazy" width="1440" height="900">` : `<div class="noimg">${esc(t(r.status))}${r.error ? ': ' + esc(r.error) : ''}</div>`;
  return `<article class="card" data-status="${esc(r.status)}" data-id="${r.id}">
<a class="cardimg" href="/refs/${r.id}">${img}</a>
<div class="cardtxt"><div class="row"><a class="ttl" href="/refs/${r.id}">${esc(r.title || r.domain || r.url)}</a>${judgmentChip(r)}</div>
<p class="dom">${esc(r.domain || '')}${r.industry?.length ? ' · ' + esc(r.industry.join(', ')) : ''}</p>
${r.mechanism ? `<p class="mech">${esc(r.mechanism)}</p>` : r.note ? `<p class="mech muted">${esc(r.note.slice(0, 180))}</p>` : ''}
</div></article>`;
}

export function addRefForm(boards = [], preset = {}) {
  return `<details class="add" ${preset.open ? 'open' : ''}><summary>${t('add_ref')}</summary>
<form method="post" action="/ui/refs" class="grid2">
<label>${t('url')}<input name="url" type="url" required placeholder="https://…" value="${esc(preset.url || '')}"></label>
<label>${t('industry')}<input name="industry" placeholder="immobilien, beratung" value="${esc(preset.industry || '')}"></label>
<label class="wide">${t('mechanism')}<input name="mechanism" placeholder="${LANG === 'de' ? 'z. B. Exposé als Datenblatt in der ersten Ansicht' : 'e.g. listing as a data sheet above the fold'}"></label>
<label>${t('tags')}<input name="tags" placeholder="editorial, serif, foto"></label>
<label>${t('add_to_board')}<select name="board_id"><option value="">—</option>${boards.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
<div class="actions wide"><button class="primary">${t('capture')}</button></div></form></details>`;
}

export function libraryPage({ items, total, q, industry, judgment, boards, industries }) {
  const f = (name, val, opts) => `<select name="${name}" data-autosubmit><option value="">${t(name === 'judgment' ? 'verdict' : name)}: ${t('all')}</option>${opts.map(([v, l]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<section class="head"><h1>${t('library')}</h1><p class="muted">${total} ${t('references')}${q ? ` · „${esc(q)}“` : ''}</p>
<form class="filters" method="get" action="/"><input type="hidden" name="q" value="${esc(q || '')}">
${f('industry', industry, industries.map((i) => [i, i]))}${f('judgment', judgment, J.map((j) => [j, t(j)]))}</form></section>
${addRefForm(boards)}
${items.length ? `<div class="masonry">${items.map(refCard).join('')}</div>` : `<p class="empty">${t('no_refs')}</p>`}`;
}

function swatches(list = []) {
  return `<ul class="sw">${list.map((c) => `<li><span style="background:${esc(c.value)}"></span><code>${esc(c.oklch || c.value)}</code><small>${Math.round((c.share || 0) * 100)} %</small></li>`).join('')}</ul>`;
}
export function refPage(r, boards) {
  const tk = r.tokens || {};
  const shots = ['desktop', 'desktop2', 'desktop3'].filter((k) => r.shots[k]).map((k) => `<img src="${r.shots[k]}" alt="" loading="lazy">`).join('');
  return `<section class="head"><p class="crumbs"><a href="/">${t('library')}</a></p><h1>${esc(r.title || r.domain)}</h1>
<p class="muted"><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a> · ${esc(t(r.status))}${r.captured_at ? ' · ' + r.captured_at.slice(0, 10) : ''}${r.error ? ' · ' + esc(r.error) : ''}</p></section>
<div class="split"><div class="shots">${shots || '<p class="empty">…</p>'}</div>
<aside class="side">${r.shots.mobile ? `<img class="phone" src="${r.shots.mobile}" alt="" loading="lazy">` : ''}
<h2>${t('verdict')}</h2>${judgeButtons('ref', r.id, r.judged_by === 'claude' ? null : r.judgment)}
${r.judged_by === 'claude' ? `<p class="muted small">${t('judged_by_claude')}: ${t(r.judgment)}</p>` : ''}
<form method="post" action="/ui/refs/${r.id}" class="stack">
<label>${t('mechanism')}<textarea name="mechanism" rows="2">${esc(r.mechanism || '')}</textarea></label>
<label>${t('note')}<textarea name="note" rows="3">${esc(r.note || '')}</textarea></label>
<label>${t('industry')}<input name="industry" value="${esc((r.industry || []).join(', '))}"></label>
<label>${t('tags')}<input name="tags" value="${esc((r.tags || []).join(', '))}"></label>
<button class="primary">${t('save')}</button></form>
<form method="post" action="/ui/boards/add" class="inline"><input type="hidden" name="ref_id" value="${r.id}">
<select name="board_id" required><option value="">${t('add_to_board')} …</option>${boards.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select><button>${t('save')}</button></form>
<h2>${t('tokens')}</h2>
${tk.colors ? `<h3>${t('colors')}</h3>${swatches(tk.colors.backgrounds)}${swatches(tk.colors.text)}` : ''}
${tk.fonts ? `<h3>${t('fonts')}</h3><ul class="plain">${tk.fonts.slice(0, 5).map((f) => `<li>${esc(f.family)} <small>${esc(f.weight)} · ${Math.round(f.share * 100)} %</small></li>`).join('')}</ul>` : ''}
${tk.fontSizes ? `<p class="small"><b>${t('sizes')}:</b> ${esc(tk.fontSizes.join(' · '))} px</p>` : ''}
${tk.h1 ? `<p class="small"><b>H1:</b> ${esc(tk.h1.family?.split(',')[0])} ${esc(tk.h1.size)} / ${esc(tk.h1.lineHeight)}</p>` : ''}
${tk.radii?.length ? `<p class="small"><b>${t('radii')}:</b> ${esc(tk.radii.join(' · '))} px</p>` : ''}
${tk.spacing?.length ? `<p class="small"><b>${t('spacing')}:</b> ${esc(tk.spacing.join(' · '))} px</p>` : ''}
<div class="actions"><form method="post" action="/ui/refs/${r.id}/recapture"><button>${t('recapture')}</button></form>
<form method="post" action="/ui/refs/${r.id}/delete" data-confirm><button class="danger">${t('delete')}</button></form></div>
</aside></div>`;
}

export function boardsPage(boards) {
  return `<section class="head"><h1>${t('boards')}</h1></section>
<details class="add"><summary>${t('new_board')}</summary><form method="post" action="/ui/boards" class="grid2">
<label>${t('name')}<input name="name" required></label><label>${t('client')}<input name="client"></label>
<label class="wide">${t('brief')}<textarea name="brief" rows="4"></textarea></label><div class="actions wide"><button class="primary">${t('save')}</button></div></form></details>
${boards.length ? `<ul class="boards">${boards.map((b) => `<li><a href="/boards/${b.id}"><strong>${esc(b.name)}</strong></a> <span class="muted">${esc(b.client || '')} · ${b.ref_count} ${t('references')} · ${b.direction_count} ${t('directions')} · ${esc(t(b.status))}</span></li>`).join('')}</ul>` : `<p class="empty">${t('empty_boards')}</p>`}`;
}

export function directionCard(d, board, { client = false } = {}) {
  const chosen = board.decision?.direction_id === d.id;
  return `<article class="dir${chosen ? ' chosen' : ''}">
<header><p class="lab">${d.label ? esc(t('label_' + d.label)) : ''}${chosen ? ' · ' + t('decided') : ''}</p><h3>${esc(d.name)}</h3>${d.thesis ? `<p>${esc(d.thesis)}</p>` : ''}</header>
<div class="dirshots"><a href="${d.preview_url}" target="_blank" rel="noopener">${d.shots.desktop ? `<img src="${d.shots.desktop}" alt="${t('preview')} ${esc(d.name)}" loading="lazy">` : `<iframe src="${d.preview_url}" loading="lazy" title="${esc(d.name)}" sandbox="allow-scripts"></iframe>`}</a>
${d.shots.mobile ? `<img class="phone" src="${d.shots.mobile}" alt="" loading="lazy">` : ''}</div>
<p class="small"><a href="${d.preview_url}" target="_blank" rel="noopener">${t('open')} ↗</a>${d.html_files.length > 1 ? ' · ' + d.html_files.filter((f) => f !== 'index.html').map((f) => `<a href="${esc(d.file_urls?.[f] || '#')}" target="_blank" rel="noopener">${esc(f.replace('.html', ''))}</a>`).join(' · ') : ''}</p>
${client ? '' : judgeButtons('direction', d.id, d.judgment)}
<form method="post" action="${client ? `/s/${board.share_token}/decide` : `/ui/boards/${board.id}/decide`}" class="stack decide">
<input type="hidden" name="direction_id" value="${d.id}">
<label>${t('reason')}<input name="reason" required></label><label>${t('combine')}<input name="combine_note"></label>
<button class="primary">${t('choose')}</button></form></article>`;
}

const VERDICT_DE = { 'too similar': 'zu ähnlich', borderline: 'grenzwertig', distinct: 'klar verschieden', 'not measured': 'nicht gemessen' };
function compareBlock(b) {
  const r = b.compare; const de = LANG === 'de';
  const rows = r ? r.pairs.map((p) => `<tr class="v-${esc(p.verdict.replace(/\s+/g, '-'))}"><td>${esc(p.a)}<br>${esc(p.b)}</td><td><strong>${esc(de ? VERDICT_DE[p.verdict] || p.verdict : p.verdict)}</strong></td><td>${p.blink ? `${p.blink.desktop} / ${p.blink.mobile ?? '-'}` : '-'}</td><td>${esc(p.signals.join('; '))}</td></tr>`).join('') : '';
  return `<section class="compare"><h2>${de ? 'Abstand der Richtungen' : 'Distance between directions'}</h2>
${r ? `<p>${esc(de ? r.summary_de : r.summary)} <small class="muted">${esc((r.at || '').slice(0, 16).replace('T', ' '))}${r.ignored?.length ? ' · ' + (de ? 'ignoriert: ' : 'ignored: ') + esc(r.ignored.join(', ')) : ''}</small></p>
<table><thead><tr><th>${de ? 'Paar' : 'Pair'}</th><th>${de ? 'Urteil' : 'Verdict'}</th><th title="0–64, unter 10 wirkt auf einen Blick gleich">Blink D/M</th><th>${de ? 'Gemeinsam' : 'Shared'}</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="muted">${de ? 'Noch nicht gemessen.' : 'Not measured yet.'}</p>`}
<form method="post" action="/ui/boards/${esc(b.id)}/compare" class="inline"><label><input type="checkbox" name="ignore_h1" value="1"> ${de ? 'H1 ist vorgegeben (Claim)' : 'H1 is fixed (claim)'}</label> <label><input type="checkbox" name="ignore_bg" value="1"> ${de ? 'Hintergrund ist vorgegeben' : 'Background is fixed'}</label> <button>${de ? 'Abstand messen' : 'Measure distance'}</button></form></section>`;
}
// Bookmarklet: opens the add-reference form of this instance in a small window, prefilled with the current page.
export function bookmarklet(origin, boardId) {
  const base = JSON.stringify(`${origin}/ui/refs/new?board=${encodeURIComponent(boardId)}&url=`);
  return `javascript:(function(){window.open(${base}+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title.slice(0,200)),'kiekkist','width=560,height=720,noopener=no')})()`;
}

// Board references as a dense grid: tiles keep the capture's aspect (desktop 16:10, phone 390:844), loved refs
// take a double tile, grid-auto-flow: dense fills the holes. Order by move buttons (no drag), filter by tag.
function boardRefs(b, { origin, tag = '', view = 'desktop' }) {
  const de = LANG === 'de';
  const tags = [...new Map(b.refs.flatMap((r) => r.tags || []).map((x) => [x.toLowerCase(), x])).values()].sort((a, c) => a.localeCompare(c));
  const active = tag && tags.includes(tag) ? tag : '';
  const list = active ? b.refs.filter((r) => (r.tags || []).includes(active)) : b.refs;
  const phone = view === 'mobile';
  const q = (o) => { const p = new URLSearchParams(); if (o.tag) p.set('tag', o.tag); if (o.view && o.view !== 'desktop') p.set('view', o.view); const s = p.toString(); return `/boards/${esc(b.id)}${s ? '?' + esc(s) : ''}`; };
  const filterBar = `<nav class="bfilter" aria-label="${de ? 'Filter und Ansicht' : 'Filter and view'}">
<ul class="tagfilter"><li><a href="${q({ view })}"${!active ? ' aria-current="true"' : ''}>${t('all')} <small>${b.refs.length}</small></a></li>${tags.map((x) => `<li><a href="${q({ tag: x, view })}"${x === active ? ' aria-current="true"' : ''}>${esc(x)} <small>${b.refs.filter((r) => (r.tags || []).includes(x)).length}</small></a></li>`).join('')}</ul>
<p class="viewswitch"><a href="${q({ tag: active })}"${!phone ? ' aria-current="true"' : ''}>${t('desktop')}</a> <a href="${q({ tag: active, view: 'mobile' })}"${phone ? ' aria-current="true"' : ''}>${t('mobile')}</a></p></nav>`;
  const tile = (r, i) => {
    const src = phone ? r.shots?.mobile : r.shots?.desktop;
    const big = r.judgment === 'love' && !isAgent(r);
    const img = src ? `<img src="${src}" alt="" loading="lazy" width="${phone ? 390 : 1440}" height="${phone ? 844 : 900}">` : `<div class="noimg">${esc(t(r.status))}</div>`;
    const name = esc(r.title || r.domain || r.url);
    const mv = (dir, label, disabled) => `<button name="dir" value="${dir}" id="mv-${esc(r.id)}-${dir}" title="${label}" aria-label="${label}: ${name}"${disabled ? ' disabled' : ''}>${dir === 'up' ? '↑' : '↓'}</button>`;
    return `<li class="tile${big ? ' big' : ''}" data-status="${esc(r.status)}" id="ref-${esc(r.id)}">
<a class="tileimg" href="/refs/${esc(r.id)}">${img}<span class="sr">${name}</span></a>
<div class="tiletxt"><p class="row"><a class="ttl" href="/refs/${esc(r.id)}">${name}</a>${judgmentChip(r)}</p>
${r.board_note || r.mechanism ? `<p class="mech">${esc(r.board_note || r.mechanism)}</p>` : ''}
${r.tags?.length ? `<p class="dom">${r.tags.map(esc).join(' · ')}</p>` : ''}
<form method="post" action="/ui/boards/${esc(b.id)}/refs/${esc(r.id)}/move" class="mover">${active ? `<input type="hidden" name="tag" value="${esc(active)}">` : ''}<input type="hidden" name="view" value="${esc(view)}">
<label class="posfield"><span class="sr">${de ? 'Platz für' : 'Position of'} ${name}</span><input name="position" type="number" min="1" max="${b.refs.length}" inputmode="numeric" placeholder="${b.refs.indexOf(r) + 1}" aria-describedby="pos-${esc(r.id)}"></label><button name="dir" value="" class="go">${de ? 'Platz setzen' : 'Set position'}</button>
<span class="pos" id="pos-${esc(r.id)}">${de ? 'Platz' : 'Position'} ${b.refs.indexOf(r) + 1}/${b.refs.length}</span>${mv('up', de ? 'Nach vorn' : 'Move up', i === 0)}${mv('down', de ? 'Nach hinten' : 'Move down', i === list.length - 1)}
<button formaction="/ui/boards/${esc(b.id)}/refs/${esc(r.id)}/remove" class="linkish danger">${de ? 'Vom Board nehmen' : 'Remove from board'}</button></form></div></li>`;
  };
  const bm = bookmarklet(origin, b.id);
  return `<section class="boardrefs"><h2>${t('references')} <small class="muted">${b.refs.length}</small></h2>
${addRefForm([], {}).replace('action="/ui/refs"', `action="/ui/refs?board=${esc(b.id)}"`)}
<details class="add bm"><summary>${de ? 'Lesezeichen „In Kiekkist sichern“' : 'Bookmarklet “Save to Kiekkist”'}</summary>
<p class="small">${de ? 'Zieh den Knopf in die Lesezeichenleiste. Auf einer fremden Seite angeklickt, öffnet er ein kleines Fenster mit dem Formular für dieses Board, die Adresse ist schon eingetragen. Kiekkist lädt dabei nichts von der fremden Seite.' : 'Drag the button to your bookmarks bar. Clicked on any page, it opens a small window with the form for this board, the address already filled in. Kiekkist loads nothing from that page.'}</p>
<p><a class="button bookmarklet" href="${esc(bm)}" draggable="true">${de ? 'In Kiekkist sichern' : 'Save to Kiekkist'}</a></p>
<p class="small muted">${de ? 'Ohne Ziehen: Lesezeichen anlegen und als Adresse einfügen:' : 'Without dragging: create a bookmark and paste this as its address:'}</p><code class="copy small">${esc(bm)}</code></details>
${b.refs.length ? filterBar : ''}
${list.length ? `<ol class="bgrid${phone ? ' phones' : ''}" aria-label="${t('references')}">${list.map(tile).join('')}</ol>` : `<p class="empty">${t('no_refs')}</p>`}</section>`;
}

// Small window from the bookmarklet: the existing add-reference flow, prefilled.
export function newRefPopup({ url, title, board, boards, saved }) {
  const de = LANG === 'de';
  if (saved) return `<section class="head"><h1>${de ? 'Gesichert' : 'Saved'}</h1><p>${esc(saved.url)}</p><p class="muted small">${de ? 'Screenshots und Tokens werden im Hintergrund erfasst.' : 'Screenshots and tokens are captured in the background.'}</p>
<p class="actions"><button type="button" class="primary" data-close>${de ? 'Fenster schließen' : 'Close window'}</button>${saved.board ? ` <a class="button" href="/boards/${esc(saved.board)}" target="_blank" rel="noopener">${de ? 'Board öffnen' : 'Open board'}</a>` : ''}</p></section>`;
  return `<section class="head"><h1>${t('add_ref')}</h1>${title ? `<p class="muted small">${esc(title)}</p>` : ''}</section>
<form method="post" action="/ui/refs" class="stack"><input type="hidden" name="popup" value="1">
<label>${t('url')}<input name="url" type="url" required value="${esc(url || '')}"></label>
<label>${t('add_to_board')}<select name="board_id"><option value="">—</option>${boards.map((x) => `<option value="${esc(x.id)}"${x.id === board ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
<label>${t('mechanism')}<input name="mechanism" autofocus placeholder="${de ? 'z. B. Exposé als Datenblatt in der ersten Ansicht' : 'e.g. listing as a data sheet above the fold'}"></label>
<label>${t('tags')}<input name="tags" placeholder="editorial, serif, foto"></label>
<label>${t('industry')}<input name="industry"></label>
<div class="actions"><button class="primary">${t('capture')}</button></div></form>`;
}

export function boardPage(b, { client = false, origin = '', tag = '', view = 'desktop' } = {}) {
  const dec = b.decision;
  const decided = dec ? b.directions.find((d) => d.id === dec.direction_id) : null;
  return `<section class="head">${client ? '' : `<p class="crumbs"><a href="/boards">${t('boards')}</a></p>`}<h1>${esc(b.name)}</h1>
<p class="muted">${esc(b.client || '')} · ${esc(t(b.status))}${client ? '' : ` · ${t('share_link')}: <code class="copy">${esc(origin)}/s/${esc(b.share_token)}</code>`}</p>
${b.brief && !client ? `<details class="brief"${b.directions.length ? '' : ' open'}><summary>${LANG === 'de' ? 'Briefing' : 'Brief'}</summary>${md(b.brief)}</details>` : ''}</section>
${dec ? `<section class="decision"><h2>${t('decision')}</h2><p><strong>${esc(decided?.name || '?')}</strong> · ${esc(dec.decided_at.slice(0, 10))} · ${esc(dec.decided_by || '')}</p>${dec.reason ? `<p>${esc(dec.reason)}</p>` : ''}${dec.combine_note ? `<p class="muted">${t('combine')} ${esc(dec.combine_note)}</p>` : ''}</section>` : ''}
${b.directions.length ? `<section><h2>${t('directions')}</h2><div class="dirs">${b.directions.map((d) => directionCard(d, b, { client })).join('')}</div></section>` : ''}
${!client && b.directions.length >= 2 ? compareBlock(b) : ''}
${client ? '' : boardRefs(b, { origin, tag, view })}
${client ? '' : `<form method="post" action="/ui/boards/${b.id}/delete" data-confirm class="actions"><button class="danger">${t('delete')}</button></form>`}`;
}

const medium = (f) => f.split('/')[0];
export function themesPage(list) {
  return `<section class="head"><h1>${t('themes')}</h1><p class="muted">${list.length}</p></section>
${list.length ? `<div class="tgrid">${list.map((th) => `<article class="tcard"><a href="/themes/${th.slug}">${th.cover ? `<img src="${th.cover}" alt="" loading="lazy">` : '<div class="noimg">…</div>'}</a>
<div class="cardtxt"><div class="row"><a class="ttl" href="/themes/${th.slug}">${esc(th.name)}</a>${th.check_grade ? `<span class="grade g-${esc(th.check_grade)}" title="${t('check')}">${esc(th.check_grade)}</span>` : ''}</div>
<p class="dom">${esc((th.industry || []).join(', '))} · ${esc((th.media || []).join(' · '))}${th.origin === 'example' ? ' · example' : ''}</p>
${th.summary ? `<p class="mech">${esc(th.summary)}</p>` : ''}${th.judgment ? `<span class="chip jc-${th.judgment}">${t(th.judgment)}</span>` : ''}</div></article>`).join('')}</div>` : `<p class="empty">${t('empty_themes')}</p>`}`;
}

export function themePage(th) {
  const byMedium = {};
  for (const p of th.pages) (byMedium[medium(p)] ||= []).push(p);
  const shotFor = (p) => th.shots.filter((s) => s.includes('/shots/' + p.replace(/\//g, '-').replace('.html', '') + '-'));
  let report = null; try { report = th.check_json ? JSON.parse(th.check_json) : null; } catch {}
  const label = { pages: t('pages'), slides: t('slides'), social: t('social'), app: t('app') };
  return `<section class="head"><p class="crumbs"><a href="/themes">${t('themes')}</a></p><h1>${esc(th.name)}</h1>
<p class="muted">${esc((th.industry || []).join(', '))} · ${esc((th.media || []).join(' · '))} · ${esc(th.updated_at?.slice(0, 10))}${th.source_direction ? ' · ' + t('made_from') + ' ' + esc(th.source_direction) : ''}</p>
${th.summary ? `<p class="lead">${esc(th.summary)}</p>` : ''}</section>
<div class="split"><div>
${['pages', 'slides', 'social', 'app'].filter((m) => byMedium[m]).map((m) => [m, byMedium[m]]).map(([m, ps]) => `<section><h2>${label[m] || m}</h2><div class="media media-${m}">${ps.map((p) => `<figure>${shotFor(p).map((s) => `<a href="${th.base_url}${esc(p)}" target="_blank" rel="noopener"><img src="${s}" alt="${esc(p)}" loading="lazy" class="${/mobile/.test(s) ? 'phone' : ''}"></a>`).join('')}<figcaption><a href="${th.base_url}${esc(p)}" target="_blank" rel="noopener">${esc(p)} ↗</a></figcaption></figure>`).join('')}</div></section>`).join('')}
${th.DESIGN_md ? `<section class="design"><h2>DESIGN.md</h2>${md(th.DESIGN_md)}</section>` : ''}
</div><aside class="side"><h2>${t('verdict')}</h2>${judgeButtons('theme', th.slug, th.judgment)}
<form method="post" action="/ui/themes/${th.slug}" class="stack"><label>${t('why')}<textarea name="note" rows="3">${esc(th.note || '')}</textarea></label><button class="primary">${t('save')}</button></form>
<p><a class="button" href="/api/themes/${th.slug}/zip">${t('download_zip')}</a></p>
<h2>${t('check')}</h2>${report ? checkBlock(report) : `<p class="muted small">…</p>`}
<form method="post" action="/ui/themes/${th.slug}/check"><button>${t('check')}</button></form>
<form method="post" action="/ui/themes/${th.slug}/delete" data-confirm class="actions"><button class="danger">${t('delete')}</button></form></aside></div>`;
}

export function checkBlock(r) {
  const summary = LANG === 'de' ? r.summary_de || r.summary : r.summary;
  const over = (r.counts || []).filter((c) => c.over);
  const all = [...new Map([...(r.hard || []), ...(r.findings || [])].map((f) => [f.rule + f.viewport + f.detail, f])).values()];
  const errs = all.filter((f) => f.severity === 'error');
  const warns = all.filter((f) => f.severity === 'warn');
  const li = (f) => `<li><b>${esc(f.rule)}</b> ${f.viewport ? `@${f.viewport}` : ''}: ${esc(f.detail)}</li>`;
  return `<p class="score"><span class="grade g-${esc(r.grade)}">${esc(r.grade)}</span> ${esc(r.score)} / 100</p>${summary ? `<p class="small">${esc(summary)}</p>` : ''}
<h3>${t('hard')} <small>${errs.length}</small></h3>${errs.length ? `<ul class="plain small">${errs.slice(0, 12).map(li).join('')}</ul>` : `<p class="small muted">${t('none')}</p>`}
${warns.length ? `<details class="small"><summary>${LANG === 'de' ? 'Warnungen' : 'Warnings'} (${warns.length})</summary><ul class="plain">${warns.slice(0, 20).map(li).join('')}</ul></details>` : ''}
<h3>${t('signals')} <small>${over.length} ${t('over')}</small></h3><ul class="plain small">${(r.counts || []).filter((c) => c.count > 0).map((c) => `<li class="${c.over ? 'over' : ''}">${esc(c.label || c.rule)}: ${esc(c.count)} / ${esc(c.threshold)}</li>`).join('') || `<li class="muted">${t('none')}</li>`}</ul>`;
}

// Results of the built-in Kiekkist Gallery search (links only; designs are fetched through its remote MCP)
function galleryBlock(src, r, gq) {
  const de = LANG === 'de';
  const form = `<form class="gform" method="get" action="/sources"><label class="sr" for="gq">Kiekkist Gallery</label><input id="gq" name="gq" value="${esc(gq)}" placeholder="${de ? 'In der Kiekkist Gallery suchen, z. B. bakery' : 'Search the Kiekkist Gallery, e.g. bakery'}"><button>${t('search')}</button></form>`;
  let body = '';
  if (r && !r.ok) body = `<p class="flash">${esc(r.error)}</p>`;
  else if (r) body = r.items.length ? `<ul class="plain gal">${r.items.map((d) => `<li><a href="${esc(d.page_url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(d.name)}</strong></a> <span class="chip">${d.free ? (de ? 'frei' : 'free') : (de ? 'Kauf' : 'paid')}</span> <small class="muted">${esc(d.industry.join(', '))}${d.scores?.check != null ? ' · check ' + esc(d.scores.check) : ''}</small>${d.summary ? `<br><small>${esc(d.summary)}</small>` : ''}</li>`).join('')}</ul><p class="small muted">${esc(r.total)} · ${esc(r.source)}${r.cached ? (de ? ' · aus dem Zwischenspeicher' : ' · cached') : ''}. ${de ? 'Holen: Remote-MCP' : 'Get them: remote MCP'} <code>${esc(src.url)}/mcp-gallery</code> (get_free_design, get_design ${de ? 'mit Lizenzschlüssel' : 'with a licence key'}).</p>` : `<p class="muted">${de ? 'Keine Treffer.' : 'No results.'}</p>`;
  return `<section class="galsearch"><h2>Kiekkist Gallery</h2><p class="small muted">${esc(de ? src.good_for : src.good_for_en)}</p>${form}${body}</section>`;
}
export function sourcesPage(list, { gallery = null, gq = '' } = {}) {
  const groups = {};
  const builtin = list.find((s) => s.builtin);
  for (const s of list) (groups[s.kind || 'other'] ||= []).push(s);
  return `<section class="head"><h1>${t('sources')}</h1><p class="muted">${t('sources_intro')}</p>
<form class="srcq"><input name="q" placeholder="${LANG === 'de' ? 'Suchbegriff, z. B. real estate' : 'Query, e.g. real estate'}"><button>${t('search')}</button></form></section>
${builtin ? galleryBlock(builtin, gallery, gq) : ''}
${Object.entries(groups).map(([k, ss]) => `<section><h2>${esc(k)}</h2><table class="src"><tbody>${ss.map((s) => `<tr><td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.name)}</strong></a>${s.search_url_template ? ` <a class="small" data-tpl="${esc(s.search_url_template)}" href="${esc(s.search_url_template.replace('{q}', ''))}" target="_blank" rel="noopener">${t('search')} ↗</a>` : ''}</td><td>${esc((LANG === 'de' ? s.good_for : s.good_for_en || s.good_for) || '')}${(LANG === 'de' ? s.note : s.note_en || s.note) ? `<br><small class="muted">${esc(LANG === 'de' ? s.note : s.note_en || s.note)}</small>` : ''}</td><td class="small muted">${esc(((LANG === 'de' ? s.industries : s.industries_en?.length ? s.industries_en : s.industries) || []).join(', '))}</td></tr>`).join('')}</tbody></table></section>`).join('')}`;
}

export function profilePage(mdText) {
  return `<section class="head"><h1>${t('profile')}</h1><p class="muted">${t('profile_intro')}</p></section><div class="prose">${md(mdText)}</div>`;
}

export function loginPage(err, next = '/') {
  return `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kiekkist</title><link rel="stylesheet" href="/static/app.css"></head>
<body class="login"><form method="post" action="/login" class="stack"><p class="mark">Kiekkist</p>${err ? `<p class="flash">${esc(err)}</p>` : ''}${next && next !== '/' ? `<input type="hidden" name="next" value="${esc(next)}">` : ''}<label>${t('password')}<input type="password" name="password" autofocus required></label><button class="primary">${t('login')}</button></form></body></html>`;
}
