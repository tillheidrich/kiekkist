// Local egress proxy for Chromium. Every connection the browser makes (navigations, redirects, frames,
// workers, WebSockets) goes through here; the target is resolved once, checked against private ranges,
// and the proxy connects to exactly that IP (no DNS rebinding). Only ports 80 and 443.
import http from 'node:http';
import net from 'node:net';
import { lookup } from 'node:dns/promises';
import { isPrivateIp } from './browser.js';

async function publicIp(host) {
  const h = String(host).replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) throw new Error('blocked');
  const addrs = net.isIP(h) ? [{ address: h }] : await lookup(h, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('blocked');
  return addrs[0].address;
}
let started = null;
export function startEgress() {
  if (started) return started;
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url);
      if (u.protocol !== 'http:' || !['', '80'].includes(u.port)) throw new Error('port');
      const ip = await publicIp(u.hostname);
      const headers = { ...req.headers, host: u.host }; delete headers['proxy-connection'];
      const up = http.request({ host: ip, port: 80, method: req.method, path: u.pathname + u.search, headers, timeout: 20_000 }, (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); });
      up.on('timeout', () => up.destroy()); up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      req.pipe(up);
    } catch { res.writeHead(403, { 'content-type': 'text/plain' }); res.end('blocked by kiekkist egress'); }
  });
  server.on('connect', async (req, sock, head) => {
    sock.on('error', () => {});
    try {
      const m = String(req.url).match(/^(.+):(\d+)$/);
      if (!m || !['443', '80'].includes(m[2])) throw new Error('port');
      const ip = await publicIp(m[1]);
      const up = net.connect(+m[2], ip, () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if (head?.length) up.write(head); up.pipe(sock); sock.pipe(up); });
      up.setTimeout(60_000, () => up.destroy());
      up.on('error', () => sock.destroy()); sock.on('close', () => up.destroy());
    } catch { sock.end('HTTP/1.1 403 Forbidden\r\n\r\n'); }
  });
  started = new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  server.unref();
  return started;
}
