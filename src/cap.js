// Capability URLs for stored files: /v/<kind>/<id>/<mac>/<path>.
// No cookie needed (works for share links, sandboxed previews and agents); the mac is an HMAC over kind/id
// (plus the board's share token, so rotating it revokes all board links). Files are served with a sandbox CSP.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, DATA_DIR } from './db.js';

function loadSecret() {
  if (process.env.KK_SECRET && process.env.KK_SECRET.length >= 32) return process.env.KK_SECRET;
  const f = join(DATA_DIR, '.secret');
  if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('base64url'), { mode: 0o600 });
  return readFileSync(f, 'utf8').trim();
}
const SECRET = loadSecret();
export const KINDS = ['refs', 'boards', 'themes'];
const scope = (kind, id) => {
  if (kind !== 'boards') return `${kind}/${id}`;
  const t = db.prepare('SELECT share_token FROM boards WHERE id=?').get(id)?.share_token;
  return t ? `boards/${id}/${t}` : null;
};
export function capMac(kind, id) {
  const s = scope(kind, id);
  return s ? createHmac('sha256', SECRET).update(s).digest('base64url').slice(0, 32) : null;
}
export function capUrl(kind, id, rel) {
  const mac = capMac(kind, id);
  return mac ? `/v/${kind}/${id}/${mac}/${rel.split('/').map(encodeURIComponent).join('/')}` : null;
}
export function capOk(kind, id, mac) {
  if (!KINDS.includes(kind) || typeof mac !== 'string') return false;
  const want = capMac(kind, id);
  if (!want || want.length !== mac.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(mac));
}
