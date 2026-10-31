#!/usr/bin/env node
// Builds the private reference-library catalogue (refs.json) that search_references / kk_search_references read.
// Inputs are the files of a reference collection run (all optional except --access):
//   --access  access.json        [{id, url, access, live, title}]                  base list, one entry per reference
//   --index   index.json         {designs:[{slug, cluster, cluster_name, references:[{id}]}]}  -> used_by, cluster names
//   --clusters clusters.json     {clusters:{Cxx:{name, members[]}}}                -> cluster per reference
//   --meta    meta.jsonl         {id, meta:{title, tags[]}}                         -> tags
//   --facts   facts.jsonl        {id, final, title, h1Size, fonts, …}               -> design facts (h1 text dropped)
//   --retry   capture-result.json {<url>: {live, title, s1440, s390}}               -> live URLs found by a browser retry
//   --resolved resolved.json      {<url>: <live url>}
//   --shots   <dir> (repeatable) screenshots named <id>-1440.jpg, <id>-390.jpg, <id>-og.jpg, <id>-gallery.png
//   --specs   <dir>              <dir>/<id>/SPEC.md|spec.json -> copied to <out dir>/specs/<id>/
//   --extra   extra.json         [{id, url, live_url, title, cluster, industry, tags, spec_dir}] additional entries
//   --out     <dir>/refs.json    thumbnails are copied (or with --link symlinked) to <dir>/shots/
// The output is private (third-party screenshots and facts): keep it out of repositories (see references/legal.md).
// Only .jpg/.png/.webp screenshots are taken over; saved page archives (.mhtml) or HTML are never copied.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, symlinkSync, readdirSync, rmSync, lstatSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';

export function parseArgs(argv) {
  const o = { shots: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = () => argv[++i];
    if (a === '--shots') o.shots.push(v()); else if (a === '--link') o.link = true; else if (a.startsWith('--')) o[a.slice(2)] = v();
  }
  return o;
}
const readJson = (f) => (f && existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
const readJsonl = (f) => (f && existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const tagOf = (t) => String(t).replace(/\s+\d+$/, '').trim().toLowerCase();
const industryOf = (name) => String(name || '').toLowerCase().split(/,|&|\band\b|\//).map((s) => s.trim()).filter((s) => s.length > 2);

export function buildCatalogue(o) {
  const access = readJson(o.access) || [];
  const index = readJson(o.index);
  const clusters = readJson(o.clusters);
  const meta = new Map(readJsonl(o.meta).map((m) => [m.id, m]));
  const facts = new Map(readJsonl(o.facts).map((f) => [f.id, f]));
  const retry = readJson(o.retry) || {};
  const resolved = readJson(o.resolved) || {};
  const clusterOf = new Map(); const clusterName = {};
  if (clusters?.clusters) for (const [cid, c] of Object.entries(clusters.clusters)) { clusterName[cid] = c.name; for (const m of c.members || []) clusterOf.set(m, cid); }
  const usedBy = new Map();
  for (const d of index?.designs || []) { if (d.cluster && d.cluster_name) clusterName[d.cluster] ||= d.cluster_name; for (const r of d.references || []) { (usedBy.get(r.id) || usedBy.set(r.id, []).get(r.id)).push(d.slug); if (d.cluster && !clusterOf.has(r.id)) clusterOf.set(r.id, d.cluster); } }
  const shotIndex = new Map(); // id -> {desktop, mobile, og}
  for (const dir of o.shots || []) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase())) continue;
      const m = /^(.*)-(1440|390|og|full|gallery)\.(jpe?g|png|webp)$/i.exec(f);
      if (!m) continue;
      const id = m[1]; const kind = { 1440: 'desktop', 390: 'mobile', og: 'og', full: 'full', gallery: 'og' }[m[2]];
      const e = shotIndex.get(id) || {}; if (!e[kind]) e[kind] = join(dir, f); shotIndex.set(id, e);
    }
  }
  const refs = [];
  const seen = new Set();
  const push = (r) => { if (!r.id || seen.has(r.id)) return; seen.add(r.id); refs.push(r); };
  for (const a of access) {
    const f = facts.get(a.id); const m = meta.get(a.id); const rt = retry[a.url] || {};
    const cid = clusterOf.get(a.id) || null;
    const { id, url, final, title, h1, mhtmlKB, error, ...rest } = f || {};
    const live = a.live || rt.live || resolved[a.url] || (f && final && final !== a.url ? final : null);
    push({ id: a.id, url: a.url, live_url: live || null, title: a.title || rt.title || m?.meta?.title || title || null, access: a.access,
      cluster: cid ? { id: cid, name: clusterName[cid] || null } : null, industry: industryOf(clusterName[cid]), tags: [...new Set((m?.meta?.tags || []).map(tagOf))].filter(Boolean).slice(0, 20),
      facts: f && !f.blocked ? rest : null, blocked: f?.blocked || undefined, used_by: usedBy.get(a.id) || [], _shots: shotIndex.get(a.id) || {} });
  }
  for (const x of readJson(o.extra) || []) push({ ...x, industry: x.industry || industryOf(x.cluster?.name), tags: x.tags || [], used_by: x.used_by || [], _shots: shotIndex.get(x.id) || {}, _spec: x.spec_dir || null });
  return refs;
}

export function writeCatalogue(refs, o) {
  const out = resolve(o.out); const dir = dirname(out);
  mkdirSync(join(dir, 'shots'), { recursive: true });
  const place = (src, name) => { const dst = join(dir, 'shots', name); if (existsSync(dst) || (() => { try { lstatSync(dst); return true; } catch { return false; } })()) rmSync(dst, { force: true }); if (o.link) symlinkSync(resolve(src), dst); else copyFileSync(src, dst); return 'shots/' + name; };
  let specs = 0;
  for (const r of refs) {
    const s = r._shots; delete r._shots;
    r.thumbnails = {};
    for (const k of ['desktop', 'mobile', 'og']) if (s[k]) r.thumbnails[k] = place(s[k], `${r.id}-${k}${extname(s[k]).toLowerCase()}`);
    const specSrc = r._spec || (o.specs && existsSync(join(o.specs, r.id)) ? join(o.specs, r.id) : null); delete r._spec;
    if (specSrc && existsSync(specSrc)) {
      const dst = join(dir, 'specs', r.id); mkdirSync(dst, { recursive: true });
      for (const f of ['SPEC.md', 'SPEC.draft.md', 'spec.json', 'MOTION.md', 'MOTION.draft.md', 'motion.json', 'LEGAL.md']) if (existsSync(join(specSrc, f))) copyFileSync(join(specSrc, f), join(dst, f));
      r.spec = 'specs/' + r.id; specs++;
    }
  }
  const data = { generated: new Date().toISOString().slice(0, 10), count: refs.length, private: true, note: 'Private reference library: third-party screenshots and measured facts. Do not publish.', refs };
  writeFileSync(out, JSON.stringify(data, null, 1));
  return { out, count: refs.length, specs, with_desktop: refs.filter((r) => r.thumbnails.desktop).length, with_mobile: refs.filter((r) => r.thumbnails.mobile).length, with_facts: refs.filter((r) => r.facts).length, live: refs.filter((r) => r.live_url).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  if (!o.access || !o.out) { console.error('usage: node scripts/refs-catalogue.mjs --access access.json --out <dir>/refs.json [--index …] [--clusters …] [--meta …] [--facts …] [--retry …] [--resolved …] [--shots dir]… [--specs dir] [--extra extra.json] [--link]'); process.exit(2); }
  console.log(JSON.stringify(writeCatalogue(buildCatalogue(o), o), null, 2));
}
