// Seeds demo data: sources, example themes (own work), demo boards.
// Usage: node seed/seed.js [--private]   (--private also loads seed/private/*.json, your own boards with screenshots of third-party sites; never publish those)
import { readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, DATA_DIR, now } from '../src/db.js';
import * as S from '../src/services.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const withPrivate = process.argv.includes('--private');
const noCapture = process.argv.includes('--no-capture');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// 1 sources
const srcFile = join(HERE, 'sources.json');
if (existsSync(srcFile)) { const list = readJson(srcFile); for (const s of list.sources || list) S.upsertSource(s); console.log('sources:', (list.sources || list).length); }

// 2 example themes (own work, safe to publish)
const exDir = join(ROOT, 'examples', 'themes');
if (existsSync(exDir)) for (const slug of readdirSync(exDir)) {
  const d = join(exDir, slug);
  if (!existsSync(join(d, 'theme.json'))) continue;
  const meta = readJson(join(d, 'theme.json'));
  S.saveThemeInternal({ ...meta, slug, name: meta.name || slug, origin: 'example', fromDir: d, process: false });
  if (!process.argv.includes('--no-shots')) await S.processTheme(slug).catch((e) => console.error(e.message));
  console.log('theme:', slug);
}

// 3 boards from seed files: public demo boards (URLs only, captured live) and private ones (with existing screenshots)
function loadBoard(file, { privateShots = false } = {}) {
  const data = readJson(file);
  const b = data.board || { name: file };
  const existing = db.prepare('SELECT id FROM boards WHERE name=?').get(b.name);
  const board = existing ? S.getBoard(existing.id) : S.createBoard(b);
  for (const r of data.refs || data.items || []) {
    const hasShots = privateShots && r.shots && Object.values(r.shots).some((p) => existsSync(p));
    const ref = S.addRef({ url: r.url, title: r.title, industry: r.industry, tags: r.tags, mechanism: r.mechanism, note: r.note_prefix && r.note ? `${r.note_prefix}: ${r.note}` : r.note,
      judgment: r.judgment, judged_by: r.judged_by, source: r.found_via, origin: 'seed', capture: !hasShots && !noCapture, enqueue: false });
    if (hasShots) {
      const dir = join(DATA_DIR, 'refs', ref.id); mkdirSync(dir, { recursive: true });
      const map = { desktop: 'shot-desktop.jpg', desktop2: 'shot-desktop-2.jpg', desktop3: 'shot-desktop-3.jpg', mobile: 'shot-mobile.jpg' };
      for (const [k, f] of Object.entries(map)) if (r.shots[k] && existsSync(r.shots[k])) copyFileSync(r.shots[k], join(dir, f));
      db.prepare("UPDATE refs SET status='ok', captured_at=? WHERE id=?").run(now(), ref.id);
    }
    S.addToBoard(board.id, { ref_id: ref.id, note: r.board_note || r.mechanism || null });
  }
  console.log('board:', b.name, (data.refs || data.items || []).length, 'refs');
}
for (const f of ['demo-immobilien.json']) if (existsSync(join(HERE, f))) loadBoard(join(HERE, f));
if (withPrivate) {
  const pdir = join(HERE, 'private');
  for (const f of existsSync(pdir) ? readdirSync(pdir).filter((x) => x.endsWith('.json')) : []) loadBoard(join(pdir, f), { privateShots: true });
}
console.log('done. data dir:', DATA_DIR);
const { closeBrowser } = await import('../src/browser.js'); await closeBrowser();
if (!noCapture) console.log('note: references are captured by the running server (start it to process the queue).');
process.exit(0);
