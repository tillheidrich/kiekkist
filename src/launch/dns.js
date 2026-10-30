// DNS checks with node:dns (no DNS changes, read-only). Each query times out after 5 s.
import { Resolver } from 'node:dns/promises';

const T = 5000;
export function makeResolver(servers) { const r = new Resolver({ timeout: T, tries: 1 }); if (servers?.length) r.setServers(servers); return r; }
const q = async (fn) => { try { return await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), T + 500))]); } catch (e) { if (['ENODATA', 'ENOTFOUND', 'ENOENT'].includes(e.code)) return null; throw e; } };
const txt = async (r, name) => ((await q(() => r.resolveTxt(name))) || []).map((parts) => parts.join(''));

export const apexOf = (host) => host.replace(/^www\./, '');
const MAIL_PROVIDERS = [[/kasserver\.com$/, 'All-Inkl'], [/brevo\.com$|sendinblue\.com$/, 'Brevo'], [/protection\.outlook\.com$|outlook\.com$/, 'Microsoft'], [/_spf\.google\.com$|google\.com$/, 'Google'], [/strato\.de$|rzone\.de$/, 'Strato'], [/ionos\.(de|com)$|kundenserver\.de$/, 'IONOS'], [/mailjet\.com$/, 'Mailjet'], [/hetzner\.(com|de)$|your-server\.de$/, 'Hetzner'], [/mailbox\.org$/, 'mailbox.org'], [/posteo\.de$/, 'Posteo'], [/mittwald\.de$/, 'Mittwald'], [/netcup\.net$/, 'netcup'], [/amazonses\.com$/, 'Amazon SES'], [/sendgrid\.net$/, 'SendGrid (Twilio)'], [/mailgun\.org$/, 'Mailgun'], [/zoho\.(eu|com)$/, 'Zoho'], [/scw-tem\.cloud$|scaleway\.com$/, 'Scaleway'], [/lettermint\.co$/, 'Lettermint']];
export function providerOf(host) { for (const [re, n] of MAIL_PROVIDERS) if (re.test(host)) return n; return null; }

/** Count DNS lookups of an SPF record recursively (RFC 7208: include, a, mx, ptr, exists, redirect). */
export async function spfLookups(r, domain, depth = 0, seen = new Set()) {
  if (depth > 10 || seen.has(domain)) return { lookups: 0, includes: [], error: depth > 10 ? 'too deep' : null };
  seen.add(domain);
  const recs = (await txt(r, domain)).filter((t) => /^v=spf1(\s|$)/i.test(t));
  if (recs.length !== 1) return { lookups: 0, includes: [], error: recs.length ? `${recs.length} SPF records at ${domain}` : `no SPF record at ${domain}` };
  let lookups = 0; const includes = [];
  for (const term of recs[0].split(/\s+/).slice(1)) {
    const m = /^[+~?-]?(include|a|mx|ptr|exists|redirect)(?:[:=](.+))?$/i.exec(term);
    if (!m) continue;
    lookups++;
    const kind = m[1].toLowerCase();
    if ((kind === 'include' || kind === 'redirect') && m[2]) {
      includes.push(m[2]);
      const sub = await spfLookups(r, m[2], depth + 1, seen);
      lookups += sub.lookups; includes.push(...sub.includes);
    }
  }
  return { lookups, includes, record: recs[0] };
}

/** Run the DNS part of the catalogue. sheet: parsed launch sheet. */
export async function dnsChecks(url, sheet = {}, { resolver } = {}) {
  const r = resolver || makeResolver();
  const host = new URL(url).hostname, apex = apexOf(host);
  const F = [];
  const add = (id, sev, ok, detail, evidence) => F.push({ id, severity: ok ? 'pass' : sev, ok, detail, evidence: evidence || apex });
  try {
    // dns.web
    const res = {};
    for (const h of [apex, 'www.' + apex]) {
      const a = await q(() => r.resolve4(h)), aaaa = await q(() => r.resolve6(h)), cname = await q(() => r.resolveCname(h));
      res[h] = { a: a || [], aaaa: aaaa || [], cname: cname || [] };
    }
    const resolves = (h) => res[h].a.length || res[h].aaaa.length || res[h].cname.length;
    add('dns.web', 'error', resolves(apex) && resolves('www.' + apex), `${apex}: ${resolves(apex) ? [...res[apex].a, ...res[apex].aaaa, ...res[apex].cname].join(', ') : 'does not resolve'}; www.${apex}: ${resolves('www.' + apex) ? [...res['www.' + apex].a, ...res['www.' + apex].aaaa, ...res['www.' + apex].cname].join(', ') : 'does not resolve'}`);
    // dns.mx
    const mx = (await q(() => r.resolveMx(apex))) || [];
    const mailUsed = sheet.mail?.used !== false;
    if (mailUsed) add('dns.mx', 'warn', mx.length > 0, mx.length ? mx.sort((a, b) => a.priority - b.priority).map((m) => `${m.priority} ${m.exchange}`).join(', ') : 'no MX record (the sheet says mail is used)');
    // dns.spf
    const spf = await spfLookups(r, apex);
    if (mailUsed || spf.record) add('dns.spf', 'error', !spf.error && spf.lookups <= 10, spf.error ? spf.error : `${spf.record} (${spf.lookups} DNS lookups${spf.lookups > 10 ? ', limit is 10' : ''})`);
    // dns.dkim
    for (const sel of sheet.mail?.dkim_selectors || []) {
      const rec = (await txt(r, `${sel}._domainkey.${apex}`)).find((t) => /v=DKIM1|k=rsa|p=/.test(t));
      add('dns.dkim', 'warn', !!rec, rec ? `${sel}._domainkey: ${rec.slice(0, 60)}…` : `${sel}._domainkey.${apex}: no DKIM record`);
    }
    if (mailUsed && !(sheet.mail?.dkim_selectors || []).length) F.push({ id: 'dns.dkim', severity: 'info', ok: true, detail: 'no DKIM selector in the launch sheet (mail.dkim_selectors): not checked', evidence: apex });
    // dns.dmarc
    const dmarc = (await txt(r, `_dmarc.${apex}`)).find((t) => /^v=DMARC1/i.test(t));
    add('dns.dmarc', 'warn', !!dmarc && /;\s*p=(none|quarantine|reject)/i.test(dmarc), dmarc ? `${dmarc}${/rua=/i.test(dmarc) ? '' : ' (no rua address for reports)'}` : `no DMARC record at _dmarc.${apex}`);
    // dns.caa
    const caa = (await q(() => r.resolveCaa(apex))) || [];
    F.push({ id: 'dns.caa', severity: 'info', ok: caa.length > 0, detail: caa.length ? caa.map((c) => `${c.critical} ${c.issue ? 'issue ' + c.issue : c.issuewild ? 'issuewild ' + c.issuewild : JSON.stringify(c)}`).join(', ') : 'no CAA record (recommended: allow only the CA in use)', evidence: apex });
    F.push({ id: 'dns.dnssec', severity: 'info', ok: true, detail: 'DNSSEC not checked (needs a validating resolver); check at the registrar', evidence: apex });
    return { findings: F, mx, spf };
  } catch (e) {
    F.push({ id: 'dns.web', severity: 'error', ok: false, detail: 'DNS lookup failed: ' + (e.code || e.message), evidence: apex });
    return { findings: F, mx: [], spf: { includes: [] } };
  }
}
