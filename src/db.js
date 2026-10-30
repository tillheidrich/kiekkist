import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

export const DATA_DIR = resolve(process.env.KK_DATA_DIR || './data');
mkdirSync(join(DATA_DIR, 'refs'), { recursive: true });
mkdirSync(join(DATA_DIR, 'boards'), { recursive: true });
mkdirSync(join(DATA_DIR, 'themes'), { recursive: true });

export const db = new Database(join(DATA_DIR, 'kiekkist.db'));
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS refs (
  id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT, domain TEXT,
  captured_at TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', error TEXT,
  industry TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]', media TEXT NOT NULL DEFAULT 'web',
  mechanism TEXT, note TEXT, judgment TEXT, judged_by TEXT, judged_at TEXT,
  tokens TEXT, source TEXT, origin TEXT
);
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, client TEXT, brief TEXT,
  status TEXT NOT NULL DEFAULT 'collecting', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, share_token TEXT
);
CREATE TABLE IF NOT EXISTS board_refs (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  ref_id TEXT NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
  note TEXT, position INTEGER DEFAULT 0, PRIMARY KEY (board_id, ref_id)
);
CREATE TABLE IF NOT EXISTS directions (
  id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL, label TEXT, thesis TEXT, tokens TEXT, ref_ids TEXT NOT NULL DEFAULT '[]',
  preview_path TEXT, created_at TEXT NOT NULL, judgment TEXT, note TEXT
);
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  direction_id TEXT REFERENCES directions(id) ON DELETE SET NULL,
  combine_note TEXT, reason TEXT, decided_by TEXT, decided_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS themes (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, summary TEXT, industry TEXT NOT NULL DEFAULT '[]',
  media TEXT NOT NULL DEFAULT '["web"]', mood TEXT NOT NULL DEFAULT '[]', fonts TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, judgment TEXT, note TEXT,
  check_score REAL, check_grade TEXT, check_at TEXT, origin TEXT NOT NULL DEFAULT 'own', source_direction TEXT
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, kind TEXT, good_for TEXT,
  industries TEXT NOT NULL DEFAULT '[]', search_url_template TEXT, note TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, kind TEXT NOT NULL, subject TEXT, payload TEXT
);
`);

export const now = () => new Date().toISOString();
export const newId = (p = '') => p + randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toLowerCase();

// additive migrations (idempotent)
for (const [t, c, def] of [['sources', 'good_for_en', 'TEXT'], ['sources', 'note_en', 'TEXT'], ['sources', 'industries_en', "TEXT NOT NULL DEFAULT '[]'"]]) {
  if (!db.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`);
}

const J = ['industry', 'tags', 'tokens', 'ref_ids', 'media', 'mood', 'fonts', 'industries', 'industries_en', 'payload'];
export function row(r) {
  if (!r) return r;
  const o = { ...r };
  for (const k of J) if (k in o && typeof o[k] === 'string') { try { o[k] = JSON.parse(o[k]); } catch {} }
  return o;
}
export const rows = (rs) => rs.map(row);
export const js = (v) => (v === undefined ? undefined : JSON.stringify(v ?? null));

export function logEvent(kind, subject, payload) {
  db.prepare('INSERT INTO events (at, kind, subject, payload) VALUES (?,?,?,?)').run(now(), kind, subject, JSON.stringify(payload ?? {}));
}

export const JUDGMENTS = ['love', 'like', 'meh', 'no'];
