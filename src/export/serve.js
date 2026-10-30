// Tiny static file server on 127.0.0.1 for post-export checks (no dependency, local only).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, extname, sep } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

export async function serveDir(dir) {
  const root = resolve(dir);
  const isFile = async (p) => !!(await stat(p).catch(() => null))?.isFile();
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let p = resolve(join(root, path));
      if (p !== root && !p.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      const cands = path.endsWith('/') ? [join(p, 'index.html')] : [p, p + '.html', join(p, 'index.html')];
      let hit = null; for (const c of cands) if (await isFile(c)) { hit = c; break; }
      if (!hit) { const nf = join(root, '404.html'); res.writeHead(404, { 'content-type': TYPES['.html'] }).end(await isFile(nf) ? await readFile(nf) : 'not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[extname(hit).toLowerCase()] || 'application/octet-stream' }).end(await readFile(hit));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}
