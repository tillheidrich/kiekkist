import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as S from './services.js';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { DATA_DIR } from './db.js';
import { fileURLToPath } from 'node:url';
const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'skill', 'kiekkist-agency');

const INSTRUCTIONS = `Kiekkist is a design studio memory for agents. Before ANY design work call kk_profile (the owner's taste) and kk_list_themes.
Work like an agency: research real references (kk_list_sources, then kk_add_ref with a one-line mechanism each), cluster them on a board (kk_create_board, kk_add_to_board),
build exactly three clearly different directions as REAL HTML pages with real content (kk_add_direction), let the human choose (kk_decide), then build the theme (kk_save_theme) and measure it (kk_check).
Never save someone else's design as a theme; themes are own work.
Visual fidelity (mandatory before building): kk_get_workflow (mode new | polish | redesign), pick a reference (kk_search_references when the owner's library is configured), measure it (kk_spec, kk_motion), write SPEC.md with numbers, build, then kk_fidelity for at least two correction rounds. Existing sites: improve_site first. Ask the owner for a verdict (kk_judge: love/like/meh/no + why) and store the note verbatim.`;

const text = (v) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }] });
const slimTokens = (tk) => (tk ? { bg: tk.colors?.backgrounds?.slice(0, 3).map((c) => c.oklch), text: tk.colors?.text?.slice(0, 2).map((c) => c.oklch), fonts: tk.fonts?.slice(0, 3).map((f) => f.family + ' ' + f.weight), sizes: tk.fontSizes, h1: tk.h1 ? { family: tk.h1.family?.split(',')[0], size: tk.h1.size } : null } : null);
const slimRef = (r, full = true) => ({ id: r.id, url: r.url, title: r.title, status: r.status, industry: r.industry, mechanism: r.mechanism, note: r.note, judgment: r.judgment, judged_by: r.judged_by,
  ...(full ? { domain: r.domain, tags: r.tags, error: r.error || undefined, shots: r.shots, tokens: slimTokens(r.tokens) } : { shot: r.shots?.desktop || null }) });
const safe = (fn) => async (args) => { try { return text(await fn(args || {})); } catch (e) { return { isError: true, content: [{ type: 'text', text: String(e.message || e) }] }; } };

export function buildMcpServer({ baseUrl = '', local = false } = {}) {
  const server = new McpServer({ name: 'kiekkist', version: '0.2.0' }, { instructions: INSTRUCTIONS });
  const abs = (o) => JSON.parse(JSON.stringify(o).replace(/"\/(v|s)\//g, `"${baseUrl}/$1/`));

  server.registerTool('kk_profile', { description: "The owner's taste profile (markdown) built from verdicts, notes and decided directions. Read before any design work.", inputSchema: {} },
    safe(() => S.profileMarkdown()));
  server.registerTool('kk_search_refs', { description: 'Search collected references (screenshots + extracted tokens + verdicts).', inputSchema: { query: z.string().optional(), industry: z.string().optional(), tag: z.string().optional(), judgment: z.enum(['love', 'like', 'meh', 'no']).optional(), limit: z.number().int().max(100).optional() } },
    safe(({ query, industry, tag, judgment, limit }) => { const r = S.listRefs({ q: query, industry, tag, judgment, limit: limit || 20 }); return abs({ total: r.total, items: r.items.map((x) => slimRef(x, false)) }); }));
  server.registerTool('kk_add_ref', { description: 'Collect an external page. Screenshots (desktop, mobile) and design tokens are captured in the background (15-25 s per page, one at a time); poll kk_get_ref for status. Always give the mechanism: what exactly is good about it.', inputSchema: { url: z.string().url(), industry: z.array(z.string()).optional(), tags: z.array(z.string()).optional(), mechanism: z.string().optional(), note: z.string().optional(), board_id: z.string().optional() } },
    safe(({ url, industry, tags, mechanism, note, board_id }) => { const r = S.addRef({ url, industry, tags, mechanism, note, origin: 'agent' }); if (board_id) S.addToBoard(board_id, { ref_id: r.id, note: mechanism }); return abs(slimRef(r)); }));
  server.registerTool('kk_get_ref', { description: 'One reference with screenshots and tokens.', inputSchema: { id: z.string() } }, safe(({ id }) => abs(slimRef(S.getRef(id)))));
  server.registerTool('kk_judge', { description: "Record a verdict on a ref, theme or direction. relayed_from_owner=true only when the human gave this verdict in the conversation (store their words verbatim in note); otherwise it is stored as an agent assessment, which never counts as the owner's taste. Themes and directions accept owner verdicts only.", inputSchema: { kind: z.enum(['ref', 'theme', 'direction']), id: z.string(), judgment: z.enum(['love', 'like', 'meh', 'no']), note: z.string().optional(), relayed_from_owner: z.boolean().optional() } },
    safe((a) => {
      if (a.kind !== 'ref' && !a.relayed_from_owner) throw new Error('themes and directions take only verdicts the owner gave; set relayed_from_owner=true with their words in note');
      S.judge({ ...a, by: a.relayed_from_owner ? 'till (via agent)' : 'agent' }); return { ok: true };
    }));
  server.registerTool('kk_gallery_search', { description: 'Search the Kiekkist Gallery (KIEKKIST_GALLERY_URL, default https://kiekkist.heidrich-digital.de): finished, checked designs packaged for agents. Filters: q (free text), industry, medium (web|social|slides|print|email), free (true = free designs only, false = paid only). Returns slug, name, summary, scores, page and preview links. This tool only searches and links. To get a design use the remote MCP server <gallery>/mcp-gallery: get_free_design {slug} for free designs (no key), get_design {slug, licence_key, project_name} after a one-time purchase on the website (licence key from the order email, keep it in KIEKKIST_LICENCE). Cached 10 minutes; if the gallery is offline the result says so (ok=false) and the local tool keeps working.', inputSchema: { q: z.string().max(200).optional(), industry: z.string().max(40).optional(), medium: z.enum(['web', 'social', 'slides', 'print', 'email']).optional(), free: z.boolean().optional(), limit: z.number().int().min(1).max(50).optional() } },
    safe(async (a) => (await import('./gallery.js')).searchGallery(a)));
  server.registerTool('kk_list_sources', { description: 'Curated inspiration galleries, marketplaces and non-web sources (print, editorial, archives: kind print/archive, use them for concept cards), with what each is good for and search URL templates ({q}). Includes the Kiekkist Gallery (kind gallery; search it with kk_gallery_search).', inputSchema: { industry: z.string().optional(), kind: z.enum(['gallery', 'marketplace', 'directory', 'agency', 'print', 'archive']).optional() } },
    safe((a) => S.listSources(a)));
  server.registerTool('kk_create_board', { description: 'Create a moodboard for a project with the brief.', inputSchema: { name: z.string(), client: z.string().optional(), brief: z.string().optional() } },
    safe((a) => { const b = S.createBoard(a); return { id: b.id, name: b.name, share_url: `${baseUrl}/s/${b.share_token}` }; }));
  server.registerTool('kk_list_boards', { description: 'List boards.', inputSchema: {} }, safe(() => S.listBoards().map((b) => ({ id: b.id, name: b.name, client: b.client, status: b.status, refs: b.ref_count, directions: b.direction_count }))));
  server.registerTool('kk_get_board', { description: 'A board with its references (slim: one screenshot each; full=true for tokens and all shots), directions and decision. Screenshot URLs are capability links that open without login.', inputSchema: { id: z.string(), full: z.boolean().optional() } },
    safe(({ id, full }) => { const b = S.getBoard(id); return abs({ ...b, brief: full ? b.brief : (b.brief || '').slice(0, 1200), refs: b.refs.map((r) => ({ ...slimRef(r, !!full), board_note: r.board_note })), share_url: `/s/${b.share_token}` }); }));
  server.registerTool('kk_add_to_board', { description: 'Put a reference (existing id or new url) on a board with a note on why.', inputSchema: { board_id: z.string(), ref_id: z.string().optional(), url: z.string().url().optional(), note: z.string().optional() } },
    safe(({ board_id, ...r }) => { const b = S.addToBoard(board_id, r); return { ok: true, refs: b.refs.length }; }));
  server.registerTool('kk_add_direction', { description: 'Add one design direction to a board. It MUST be a real, self-contained HTML page with the real content (no lorem ipsum). Add exactly three per board: safe, middle, bold; they must differ in at least three of: layout topology, type, density, imagery, colour.', inputSchema: { board_id: z.string(), name: z.string(), label: z.enum(['safe', 'middle', 'bold']).optional(), thesis: z.string(), html: z.string(), files: z.record(z.string(), z.string()).optional(), tokens: z.any().optional(), ref_ids: z.array(z.string()).optional() } },
    safe(({ board_id, ...d }) => abs(S.addDirection(board_id, d))));
  server.registerTool('kk_decide', { description: "Record the human's choice of direction (with reason; combinations allowed). Never decide on the human's behalf unless told 'you decide'; then set decided_by='agent (provisional)'.", inputSchema: { board_id: z.string(), direction_id: z.string(), reason: z.string(), combine_note: z.string().optional(), decided_by: z.string().optional() } },
    safe(({ board_id, ...d }) => { const b = S.decide(board_id, d); return { ok: true, decision: b.decision }; }));
  server.registerTool('kk_list_themes', { description: 'Finished own themes (web, slides, social, app) with check grade and verdict.', inputSchema: { industry: z.string().optional(), medium: z.string().optional(), query: z.string().optional() } },
    safe(({ industry, medium, query }) => abs(S.listThemes({ industry, medium, q: query }).map((t) => ({ slug: t.slug, name: t.name, summary: t.summary, industry: t.industry, media: t.media, fonts: t.fonts, judgment: t.judgment, note: t.note, check: t.check_grade, cover: t.cover, pages: t.pages })))));
  server.registerTool('kk_get_theme', { description: 'A theme with DESIGN.md and tokens; with_files=true adds all text files, with_check=true the full check report.', inputSchema: { slug: z.string(), with_files: z.boolean().optional(), with_check: z.boolean().optional() } },
    safe(({ slug, with_files, with_check }) => { const t = S.getTheme(slug, { withContent: !!with_files }); if (!with_check) { const c = t.check_json ? JSON.parse(t.check_json) : null; delete t.check_json; t.check = c ? { score: c.score, grade: c.grade, summary: c.summary } : null; } return abs(t); }));
  server.registerTool('kk_save_theme', { description: 'Save an own finished design as a theme. files maps paths to contents: DESIGN.md, tokens.json, tokens.css, pages/index.html (required), slides/*.html, social/*.html, app/*.html, assets/*. Screenshots and a check run automatically.', inputSchema: { name: z.string(), slug: z.string().optional(), summary: z.string().optional(), industry: z.array(z.string()).optional(), media: z.array(z.string()).optional(), mood: z.array(z.string()).optional(), fonts: z.array(z.string()).optional(), files: z.record(z.string(), z.any()).optional(), from_direction: z.string().optional(), overwrite: z.boolean().optional() } },
    safe((a) => abs(S.saveTheme(a))));
  server.registerTool('kk_check', { description: 'Measure a theme, URL or HTML in a real browser: hard errors (overflow, contrast, targets, accessibility passes), counted AI-slop signals with thresholds, token drift, mobile evidence (390/360 px first screen, one throttled lab load on the Moto G Power profile). Returns score 0-100 and grade (incomplete=true if a viewport could not be measured). profile: legal profile from the brief (none | bfsg = private provider in BFSG scope | public = BITV); changes the severity of the accessibility-statement checks. pages: site mode, compares navigation, help and titles across pages: true = every pages/*.html of the theme, or a list (theme: page names like "kontakt.html"; url: same-origin URLs); at most 8. perf=true: thorough lab run (3 throttled loads, median, font-swap run, CLS after scrolling), takes longer (deadline 180 s instead of 90 s). mobile=false skips the mobile evidence. Brand-locked work (references/house-rules.md): brand_fonts exempts the client\'s fixed families from the reflex-font signal; banned lists counted signal ids (tells pack, e.g. gradient-text, eyebrow) that are hard errors at their first occurrence. A theme check with options does not replace the stored check.json. detail="full" returns the whole report.', inputSchema: { theme: z.string().optional(), url: z.string().url().optional(), html: z.string().optional(), profile: z.enum(['none', 'bfsg', 'public']).optional(), pages: z.union([z.boolean(), z.array(z.string()).max(8)]).optional(), perf: z.boolean().optional(), mobile: z.boolean().optional(), brand_fonts: z.array(z.string()).max(12).optional(), banned: z.array(z.string()).max(40).optional(), detail: z.enum(['summary', 'full']).optional() } },
    safe(async ({ detail, ...a }) => {
      const r = await S.runCheck(a);
      if (detail === 'full') return r;
      return { score: r.score, grade: r.grade, incomplete: r.incomplete, rules_version: r.rules_version, mode: r.mode || 'page', summary: r.summary,
        ...(r.mode === 'site' ? { pages: r.pages.map((p) => ({ target: p.target, score: p.score, grade: p.grade, errors: (p.hard || []).filter((h) => h.severity === 'error').length, over_threshold: (p.counts || []).filter((x) => x.over || x.banned).map((x) => x.rule) })) } : {}),
        errors: r.hard.filter((h) => h.severity === 'error'), over_threshold: (r.counts || []).filter((x) => x.over || x.banned).map((x) => ({ rule: x.rule, label: x.label, count: x.count, threshold: x.threshold, ...(x.banned ? { banned: true } : {}), examples: x.examples?.slice(0, 2) })),
        drift: r.drift ? { colorShare: r.drift.colorShare, fontsOutside: r.drift.fontsOutside } : null,
        ...(r.a11y ? { a11y: { profile: r.a11y.profile, errors: r.a11y.errors, warnings: r.a11y.warnings } } : {}),
        ...(r.mobile ? { mobile: { errors: r.mobile.errors_count, warnings: r.mobile.warnings_count, lab: r.mobile.lab ? { lcp_ms: r.mobile.lab.lcp_ms, cls: r.mobile.lab.cls, tbt_ms: r.mobile.lab.tbt_ms, runs: r.mobile.lab.runs?.length } : null, summary: r.mobile.summary_en || r.mobile.summary } } : {}) };
    }));
  server.registerTool('kk_compare', { description: "Measure whether a board's directions (or themes) are really different ideas: first-screen blink hash (desktop/mobile), hero arrangement, H1, hero image, section sequence, type roles. A pair is 'too similar' if it looks alike at a glance or shares two structural signals; rebuild one of each such pair on another concept and topology. ignore lists signals the brief fixes (h1 when the claim is locked, background/fonts when the brand fixes them). Run after the three directions exist and before showing them.", inputSchema: { board_id: z.string().optional(), direction_ids: z.array(z.string()).optional(), themes: z.array(z.string()).optional(), ignore: z.array(z.enum(['h1', 'image', 'fonts', 'background'])).optional() } },
    safe(async (a) => { const r = await S.runCompare(a); return { ok: r.ok, summary: r.summary, ignored: r.ignored, pairs: r.pairs }; }));
  server.registerTool('kk_knowledge', { description: 'Design knowledge as versioned data packs (topologies, concept forms, slop tells, styles, palettes, font pairings, motion values, UX rules …). Call without pack to list packs and versions; then query a pack by text, tag, industry or evidence class, or fetch one item by id. Prefer this over remembered defaults: packs are updated centrally.', inputSchema: { pack: z.string().optional(), query: z.string().optional(), tag: z.string().optional(), industry: z.string().optional(), evidence: z.string().optional(), id: z.string().optional(), limit: z.number().int().max(200).optional() } },
    safe(async ({ query: q, ...a }) => (await import('./knowledge.js')).query({ ...a, q })));
  server.registerTool('kk_skill_file', { description: 'Read a file of the kiekkist-agency skill (references/*.md, templates/*). Use when the skill is installed without its reference folder. Call without name to list files.', inputSchema: { name: z.string().optional() } },
    safe(({ name }) => {
      const list = ['SKILL.md', ...['references', 'templates', 'scripts'].flatMap((d) => existsSync(join(SKILL_DIR, d)) ? readdirSync(join(SKILL_DIR, d)).map((f) => `${d}/${f}`) : [])];
      if (!name) return list;
      const n = name.replace(/^\/+/, '');
      if (!list.includes(n)) throw new Error('unknown file. Available: ' + list.join(', '));
      return readFileSync(join(SKILL_DIR, n), 'utf8');
    }));
  // ---- visual fidelity: reference library (private; only when KK_REFS_FILE is set), workflow, measuring tools
  const R = () => import('./refs.js');
  const W = () => import('./fidelity/workflow.js');
  const img = (file) => { try { const st = statSync(file); if (st.size > 900_000) return null; return { type: 'image', data: readFileSync(file).toString('base64'), mimeType: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg' }; } catch { return null; } };
  server.registerTool('kk_get_workflow', { description: "The visual-fidelity workflow as steps plus the owner's checklist, hard bans, distance rules, media rules and motion translation. mode: new (reference to spec before building, default), polish (existing site, same structure) or redesign (existing site, new composition from a reference spec, brand and content kept). Read it before building or changing any page.", inputSchema: { mode: z.enum(['new', 'polish', 'redesign']).optional() }, annotations: { readOnlyHint: true } },
    safe(async ({ mode }) => (await W()).getWorkflow(mode || 'new')));
  server.registerTool('kk_search_references', { description: "Search the owner's private reference library (curated inspiration sites with desktop/phone screenshots and measured facts: fonts, h1 size, colours, page height). Filters: query (free text: industry, mood, font, domain), industry, cluster (id like C07 or name), tag, has_spec (only references with a measured SPEC). Returns ids, live URLs, facts and whether a spec exists; with_images adds up to 4 desktop thumbnails. Available only when the instance has KK_REFS_FILE configured. Screenshots are private research material: never publish them.", inputSchema: { query: z.string().max(200).optional(), industry: z.string().max(60).optional(), cluster: z.string().max(80).optional(), tag: z.string().max(40).optional(), has_spec: z.boolean().optional(), limit: z.number().int().min(1).max(30).optional(), with_images: z.number().int().min(0).max(4).optional() }, annotations: { readOnlyHint: true } },
    async (a) => {
      try {
        const L = await R(); if (!L.refsConfigured()) throw new Error('reference library not configured on this instance (KK_REFS_FILE)');
        const r = L.searchRefs({ ...a, limit: a.limit || 10 });
        const content = [{ type: 'text', text: JSON.stringify(r) }];
        for (const it of r.items.slice(0, a.with_images || 0)) { const p = L.thumbPath(L.getRefEntry(it.id), 'desktop'); const im = p && img(p); if (im) content.push({ type: 'text', text: it.id + ' (desktop first screen):' }, im); }
        return { content };
      } catch (e) { return { isError: true, content: [{ type: 'text', text: String(e.message || e) }] }; }
    });
  server.registerTool('kk_get_reference_spec', { description: 'One reference from the private library: facts and, if measured, its SPEC.md, spec.json summary, MOTION.md and LEGAL.md (full=true returns the whole spec.json). with_images adds the desktop and phone screenshots. Available only with KK_REFS_FILE.', inputSchema: { id: z.string().max(100), full: z.boolean().optional(), with_images: z.boolean().optional() }, annotations: { readOnlyHint: true } },
    async ({ id, full, with_images }) => {
      try {
        const L = await R(); if (!L.refsConfigured()) throw new Error('reference library not configured on this instance (KK_REFS_FILE)');
        const content = [{ type: 'text', text: JSON.stringify(L.getRefSpec(id, { full: !!full })) }];
        if (with_images) for (const v of ['desktop', 'mobile']) { const p = L.thumbPath(L.getRefEntry(id), v); const im = p && img(p); if (im) content.push({ type: 'text', text: v + ':' }, im); }
        return { content };
      } catch (e) { return { isError: true, content: [{ type: 'text', text: String(e.message || e) }] }; }
    });
  const fidOut = (kind, label, out) => { if (out) { if (!local) throw new Error('out is only available on the local MCP server'); return out; } return local ? undefined : join(DATA_DIR, 'fidelity', kind, String(label).replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60) + '-' + Date.now().toString(36)); };
  server.registerTool('improve_site', { description: "Audit an EXISTING website before polishing or redesigning it (kk improve): measures it at 1440 and 390 (geometry, type scale, colours, sections), motion, runs kk check (accessibility profile, privacy and third parties, mobile lab) and writes IMPROVE.md with keep / fix / redesign lists with numbers, a target spec draft that keeps the brand and content, a suggested depth (polish or redesign) and, with the reference library, 2-3 matching references (industry, mood). Then follow kk_get_workflow mode=polish|redesign. On the local server url may also be a file, folder or localhost URL; on a hosted instance public URLs only. Measures only; changes nothing on the site.", inputSchema: { url: z.string().max(2000), profile: z.enum(['none', 'bfsg', 'public']).optional(), perf: z.boolean().optional(), motion: z.boolean().optional(), industry: z.string().max(60).optional(), mood: z.string().max(60).optional(), out: z.string().optional() } },
    safe(async (a) => {
      const { runImprove } = await import('./fidelity/improve.js');
      const { dir, result } = await runImprove({ target: a.url, out: fidOut('improve', a.url, a.out), profile: a.profile || 'bfsg', perf: !!a.perf, motion: a.motion !== false, industry: a.industry, mood: a.mood, allowLoopback: local, allowFiles: local });
      return { dir, report: join(dir, 'IMPROVE.md'), depth: result.depth, keep: result.keep, fix: result.fix, redesign: result.redesign, target_spec: result.target_spec, references: result.references, check: result.check, next: `kk_get_workflow mode=${result.depth}` };
    }));
  if (local) {
    server.registerTool('kk_spec', { description: 'Measure a reference or build at several viewports (default 1440, 1024, 768, 390) plus a breakpoint sweep (320-1920): container, grid columns and gaps, type scale table with ratios, line breaks (counts and widths), section geometry, image formats and crops, colours, fixed/sticky layers, declared media queries. Writes spec.json, SPEC.draft.md and screenshots (first screen, full page, frames=true for viewport frames) to out (default .kiekkist/fidelity/<slug>/spec). Never stores the page HTML. target: public URL, localhost URL, HTML file or folder.', inputSchema: { target: z.string().max(2000), out: z.string().optional(), viewports: z.array(z.number().int().min(320).max(2560)).max(6).optional(), frames: z.boolean().optional(), sweep: z.boolean().optional() } },
      safe(async (a) => { const { runSpec, renderSpecMd } = await import('./fidelity/spec.js'); const { dir, spec } = await runSpec({ target: a.target, out: a.out, viewports: a.viewports, frames: !!a.frames, sweep: a.sweep !== false }); return { dir, files: ['spec.json', 'SPEC.draft.md', 'shots/'], draft: renderSpecMd(spec) }; }));
    server.registerTool('kk_motion', { description: 'Analyse motion at one width (default 1440): document.getAnimations() with keyframes and timing, @keyframes, computed transitions, scroll/view timelines, libraries named in scripts, load frames (100-4000 ms), a scroll sweep (what changes opacity/transform/colour with scroll; scrubbed vs triggered), hover diffs via page.hover(), cursor followers. Rows marked OBSERVED vs INFERRED plus translation hints (effect, not technique). Writes motion.json, MOTION.draft.md, frame strips.', inputSchema: { target: z.string().max(2000), out: z.string().optional(), width: z.number().int().min(320).max(2560).optional(), hovers: z.number().int().min(0).max(20).optional() } },
      safe(async (a) => { const { runMotion, renderMotionMd } = await import('./fidelity/motion.js'); const { dir, motion } = await runMotion({ target: a.target, out: a.out, width: a.width || 1440, hovers: a.hovers ?? 8 }); return { dir, files: ['motion.json', 'MOTION.draft.md', 'strip-load.jpg', 'shots/'], draft: renderMotionMd(motion) }; }));
    server.registerTool('kk_fidelity', { description: 'Compare a build with its reference (or after with before): side-by-side montages at 1440 and 390 (first screen + full page), section geometry diff with px deltas, type role deltas (size, line height, line count), position deltas (h1, navigation, button, first-screen media). ref: URL or a kk spec folder (no new request to the reference); build: URL, localhost URL, file or folder. Writes FIDELITY.md (with the checklist), fidelity.json, FIDELITY-log.md (one line per round). Run at least two correction rounds. labels: ["before","after"] for existing sites. with_image=true adds the 1440 first-screen montage.', inputSchema: { ref: z.string().max(2000), build: z.string().max(2000), out: z.string().optional(), widths: z.array(z.number().int().min(320).max(2560)).max(4).optional(), labels: z.array(z.string().max(20)).length(2).optional(), round: z.number().int().min(1).max(99).optional(), with_image: z.boolean().optional() } },
      async (a) => {
        try {
          const { runFidelity } = await import('./fidelity/fidelity.js');
          const { dir, result } = await runFidelity({ ref: a.ref, build: a.build, out: a.out, widths: a.widths || [1440, 390], labels: a.labels || ['reference', 'build'], round: a.round });
          const per = Object.fromEntries(Object.entries(result.diff.per).map(([w, r]) => [w, { doc: r.doc, container: r.container, flags: r.flags, sections_off: r.sections.filter((x) => x.flag).map((x) => ({ i: x.i, dy: x.dy, dh: x.dh })), roles_off: r.roles.filter((x) => x.flag).map((x) => ({ role: x.role, fs: [x.fs_ref, x.fs_build], lines: [x.lines_ref, x.lines_build] })), positions_off: r.positions.filter((x) => x.flag).map((x) => ({ what: x.what, dx: x.dx, dy: x.dy, dw: x.dw, dh: x.dh })) }]));
          const content = [{ type: 'text', text: JSON.stringify({ dir, report: join(dir, 'FIDELITY.md'), round: result.round, flags: result.diff.flags, per, montages: result.montages, next: 'Open the montages, go through the checklist in FIDELITY.md, fix, run again (at least two rounds).' }) }];
          const m = result.montages['first-1440'] || Object.values(result.montages)[0];
          if (a.with_image && m) { const im = img(m); if (im) content.push(im); }
          return { content };
        } catch (e) { return { isError: true, content: [{ type: 'text', text: String(e.message || e) }] }; }
      });
  }
  // ---- export and launch (run locally; prepare and verify, never register, pay, sign or change DNS)
  const PREP = ' Prepares and verifies; never registers, pays, signs or changes DNS.';
  const themeFolder = (a) => {
    if (a.theme_dir) { if (!local) throw new Error('theme_dir is only available on the local MCP server (kk mcp); pass theme (slug)'); return a.theme_dir; }
    if (!a.theme) throw new Error('pass theme (slug) or theme_dir');
    const d = S.themeDir(a.theme);
    if (existsSync(join(d, 'pages', 'index.html'))) return d;
    const ex = join(SKILL_DIR, '..', '..', 'examples', 'themes', a.theme);
    if (existsSync(join(ex, 'pages', 'index.html'))) return ex;
    throw new Error('theme not found: ' + a.theme);
  };
  const sheetBase = () => (local ? process.cwd() : DATA_DIR);
  server.registerTool('kk_export', { description: 'Export a theme to a target: html, astro, react (Tailwind v4 @theme + shadcn variables + TSX sections + shadcn registry; the path for Next.js, TanStack Start/Lovable, Vite/Bolt, v0), wordpress (block theme, theme.json v3, patterns, ZIP, Playground blueprint) or elementor (Hello Elementor child theme + kit with global colours and fonts). Planned targets (shopify, figma, webflow, framer, typo3, shopware, elementor-sections, next) return their TODO plan. Then runs kk check on the export and compares it with the theme (similar = faithful). build=true runs npm install + build in the output (network for npm).' + PREP, inputSchema: { theme: z.string().optional(), theme_dir: z.string().optional(), target: z.string(), cms: z.enum(['none', 'sveltia', 'decap', 'pages', 'keystatic', 'directus', 'storyblok']).optional(), out: z.string().optional(), site_url: z.string().url().optional(), lang: z.string().optional(), name: z.string().optional(), build: z.boolean().optional(), check: z.boolean().optional(), force: z.boolean().optional() } },
    safe(async (a) => {
      const { exportTheme } = await import('./export/index.js');
      const themeDir = themeFolder(a);
      if (a.out && !local) throw new Error('out is only available on the local MCP server');
      const slug = (a.theme || themeDir.split(/[\\/]/).pop()).replace(/[^a-z0-9-]/gi, '-');
      const out = a.out || (local ? join(process.cwd(), `${slug}-${a.target}`) : join(DATA_DIR, 'exports', `${slug}-${a.target}`));
      const r = await exportTheme({ themeDir, target: a.target, out, cms: a.cms, siteUrl: a.site_url, lang: a.lang, name: a.name, build: !!a.build, check: a.check !== false, force: local ? !!a.force : true });
      return { ok: r.ok, code: r.code, out_dir: r.out_dir, files: r.files, notes: r.notes, validation: { errors: r.validation.errors, warnings: r.validation.warnings }, check: r.check ? { ok: r.check.ok, grade: r.check.pages.map((p) => `${p.page} ${p.grade}`).join(', '), hard_failures: r.check.hard_failures, regressions: r.check.regressions, blocked_requests: r.check.blocked, already_in_theme: r.check.baseline_rules } : null, compare: r.check ? { similar: r.check.compare.similar, verdict: r.check.compare.verdict, blink: r.check.compare.blink } : null };
    }));
  server.registerTool('kk_export_tokens', { description: 'One token file generated from a theme\'s tokens.json, for agents working inside an existing project: css (custom properties), theme.json (WordPress v3), tailwind (v4 @theme), elementor (kit site-settings fragment, lossy hex).', inputSchema: { theme: z.string().optional(), theme_dir: z.string().optional(), format: z.enum(['css', 'theme.json', 'tailwind', 'elementor']) } },
    safe(async (a) => (await import('./export/index.js')).exportTokens(themeFolder(a), a.format)));
  server.registerTool('kk_launch_check', { description: 'Automatic launch checks against a live (or staging) URL: DNS/SPF/DKIM/DMARC, TLS and redirects, security headers, third-party requests and storage before interaction (real browser, observe only), legal links and placeholders, compliance-claim wording, titles/OG/sitemap/robots/404/favicon, lab LCP/CLS/bytes, forms, kk check on the first pages. form_test=true sends exactly one marked POST to form_endpoint (same site or the sheet\'s endpoint). Passing means nothing mechanical is missing, not that the site is legally compliant.' + PREP, inputSchema: { url: z.string(), only: z.array(z.enum(['dns', 'tls', 'privacy', 'legal', 'search', 'perf', 'forms', 'a11y', 'ops', 'handover'])).optional(), pages: z.number().int().min(1).max(50).optional(), form_endpoint: z.string().optional(), form_test: z.boolean().optional(), processors: z.boolean().optional(), recheck: z.boolean().optional(), detail: z.enum(['summary', 'full']).optional() } },
    safe(async (a) => {
      if (!local && !/^https?:\/\//i.test(a.url)) throw new Error('url must be http(s)');
      const { runLaunch } = await import('./launch/index.js');
      const { sheetPath } = await import('./launch/sheet.js');
      const sp = /^https?:/i.test(a.url) ? sheetPath(a.url, sheetBase()) : null;
      const r = await runLaunch({ target: a.url, only: a.only, pages: a.pages || 20, formEndpoint: a.form_endpoint, formTest: !!a.form_test, processors: !!a.processors, recheck: !!a.recheck, sheet: sp && existsSync(sp) ? sp : undefined, outDir: sp ? dirname(sp) : undefined });
      if (r.error) throw new Error(r.error);
      if (a.detail === 'full') return r;
      return { summary: r.summary, code: r.code, failing: r.findings.filter((f) => !f.ok && f.severity !== 'info'), info: r.findings.filter((f) => f.severity === 'info').map((f) => `${f.id}: ${f.detail}`), manual_open: r.manual_open, changes: r.changes, processors: r.processors?.md, report: r.files, disclaimer: r.disclaimer };
    }));
  server.registerTool('kk_launch_sheet', { description: 'The launch sheet of a site (Markdown with a YAML block; the handover document). action get | init (from the template, never overwrites) | tick (appends a manual confirmation: item, by, note). tick only with relayed_from_owner=true, i.e. the human confirmed it in the conversation. Values that look like secrets are refused: the sheet stores only where credentials live.' + PREP, inputSchema: { site: z.string(), action: z.enum(['get', 'init', 'tick']), item: z.string().optional(), by: z.string().optional(), note: z.string().optional(), relayed_from_owner: z.boolean().optional() } },
    safe(async (a) => {
      const S2 = await import('./launch/sheet.js');
      const path = S2.sheetPath(a.site, sheetBase());
      if (a.action === 'init') { const r = S2.initSheet(a.site, path); return { created: r.created, path: r.path, text: r.text }; }
      if (a.action === 'tick') { if (!a.relayed_from_owner) throw new Error('tick records a human confirmation: set relayed_from_owner=true only when the human confirmed it in the conversation, with their name in by'); const r = S2.tickSheet(path, { item: a.item, by: a.by, note: a.note }); return { path: r.path, manual: r.data.manual }; }
      const r = S2.readSheet(path); if (!r) throw new Error('no launch sheet for ' + a.site + ' (action init creates one)'); return r.text;
    }));
  server.registerTool('kk_processors', { description: 'Processors table for the privacy policy (Art. 28 GDPR): from the launch sheet accounts, third-party hosts seen in a real browser, MX and SPF includes (mail providers). Unknown hosts are listed as "unidentified: ask". Markdown and JSON.' + PREP, inputSchema: { url: z.string().url() } },
    safe(async (a) => {
      const { runLaunch } = await import('./launch/index.js'); const { sheetPath } = await import('./launch/sheet.js');
      const sp = sheetPath(a.url, sheetBase());
      const r = await runLaunch({ target: a.url, only: ['dns', 'privacy'], pages: 10, processors: true, perf: false, a11yPages: 0, sheet: existsSync(sp) ? sp : undefined });
      if (r.error) throw new Error(r.error);
      return r.processors;
    }));
  server.registerTool('kk_dns_plan', { description: 'DNS record table for the human to enter at the DNS provider: web (A/AAAA/CNAME), MX, SPF, DKIM, DMARC, CAA. No DNS change is made.' + PREP, inputSchema: { domain: z.string(), web_target: z.string().optional(), mail_provider: z.string().optional(), ca: z.string().optional() } },
    safe(async (a) => (await import('./launch/plan.js')).dnsPlan(a)));
  server.registerTool('kk_legal_inputs', { description: 'The twelve privacy-policy inputs (launch.md L7), pre-filled from a launch check of the URL and the launch sheet; gaps are marked GAP. Not legal advice; the owner approves the final text.' + PREP, inputSchema: { url: z.string().url() } },
    safe(async (a) => {
      const { runLaunch } = await import('./launch/index.js'); const { sheetPath, readSheet } = await import('./launch/sheet.js'); const { legalInputs } = await import('./launch/plan.js');
      const sp = sheetPath(a.url, sheetBase());
      const r = await runLaunch({ target: a.url, only: ['dns', 'privacy', 'legal', 'forms'], pages: 10, processors: true, perf: false, a11yPages: 0, sheet: existsSync(sp) ? sp : undefined });
      if (r.error) throw new Error(r.error);
      return legalInputs({ report: r, sheet: readSheet(sp)?.data || {} });
    }));
  return server;
}
