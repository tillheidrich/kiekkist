// Preparation helpers: processors table, DNS record plan, privacy-policy inputs. Nothing here changes
// DNS, signs or registers anything: it writes tables for the human.
import { providerOf } from './dns.js';

const HOSTS = [[/youtube(-nocookie)?\.com$|ytimg\.com$/, 'YouTube (Google Ireland / Google LLC)', 'non-EU parent; DPF'], [/vimeo\.com$|vimeocdn\.com$/, 'Vimeo', 'USA; DPF'], [/openstreetmap\.org$/, 'OpenStreetMap Foundation', 'UK (adequacy decision)'], [/google\.|gstatic\.com$|googleapis\.com$/, 'Google', 'USA; DPF'], [/friendlycaptcha\.(com|eu)$/, 'Friendly Captcha GmbH', 'Germany'], [/altcha\.org$/, 'ALTCHA', 'EU'], [/bunny(cdn)?\.(net|com)$|b-cdn\.net$/, 'BunnyWay d.o.o. (bunny.net)', 'Slovenia'], [/umami\.is$/, 'Umami Cloud', 'check region'], [/plausible\.io$/, 'Plausible Insights OÜ', 'Estonia'], [/storyblok\.com$/, 'Storyblok GmbH', 'Austria/USA, EU region selectable'], [/sanity\.io$/, 'Sanity', 'USA/Norway'], [/stripe\.com$/, 'Stripe', 'Ireland/USA'], [/mollie\.com$/, 'Mollie B.V.', 'Netherlands'], [/paypal\.com$/, 'PayPal (Europe) S.à r.l.', 'Luxembourg']];
export function hostProvider(host) { for (const [re, n, where] of HOSTS) if (re.test(host)) return { name: n, where }; return null; }

/** Processors table from the sheet, allowed hosts, MX and SPF includes. */
export function processorsTable({ sheet = {}, foreignHosts = [], mx = [], spfIncludes = [] }) {
  const rows = [];
  const add = (r) => { if (!rows.some((x) => x.provider === r.provider && x.service === r.service)) rows.push(r); };
  for (const a of sheet.accounts || []) if (a?.provider) add({ service: a.service || '?', provider: a.provider, source: 'launch sheet', data: '', dpa: a.dpa || 'missing', transfer: '' });
  for (const p of sheet.processors || []) { const n = typeof p === 'string' ? p : p?.name; if (n) add({ service: (p && p.service) || '?', provider: n, source: 'launch sheet', data: '', dpa: (p && p.dpa) || 'missing', transfer: '' }); }
  for (const m of mx) { const n = providerOf(m.exchange.toLowerCase()) || `unidentified: ask (${m.exchange})`; add({ service: 'mail (MX)', provider: n, source: `MX ${m.exchange}`, data: 'emails', dpa: 'check', transfer: '' }); }
  for (const inc of spfIncludes) { const n = providerOf(inc.toLowerCase()) || `unidentified: ask (${inc})`; add({ service: 'mail sending (SPF)', provider: n, source: `SPF include ${inc}`, data: 'emails', dpa: 'check', transfer: '' }); }
  const allowed = new Map((sheet.allow_third_party || []).filter((a) => a?.host).map((a) => [a.host, a.reason]));
  for (const h of foreignHosts) { const p = hostProvider(h); add({ service: allowed.has(h) ? `embed/service (${allowed.get(h)})` : 'third-party request (not allowed in the sheet)', provider: p ? p.name : `unidentified: ask (${h})`, source: `request log ${h}`, data: 'IP address, user agent', dpa: allowed.get(h) === 'contract' ? 'check' : 'n/a (consent)', transfer: p?.where || '' }); }
  const md = ['| Service | Provider | Found via | Data | DPA | Transfer outside EU/EEA |', '|---|---|---|---|---|---|', ...rows.map((r) => `| ${r.service} | ${r.provider} | ${r.source} | ${r.data} | ${r.dpa} | ${r.transfer} |`)].join('\n');
  return { rows, md };
}

/** DNS record plan for the human (no DNS change is made). */
export function dnsPlan({ domain, web_target, mail_provider, ca = 'letsencrypt.org' }) {
  const d = String(domain).replace(/^www\./, '');
  const ipv4 = /^\d+\.\d+\.\d+\.\d+$/.test(web_target || ''), ipv6 = /:/.test(web_target || '');
  const rows = [];
  if (ipv4) rows.push(['@', 'A', web_target, 'web, apex'], ['www', 'A', web_target, 'web, www (or CNAME to the apex)']);
  else if (ipv6) rows.push(['@', 'AAAA', web_target, 'web, apex'], ['www', 'AAAA', web_target, 'web, www']);
  else if (web_target) rows.push(['@', 'ALIAS/ANAME or A', `IP of ${web_target}`, 'apex cannot be a CNAME'], ['www', 'CNAME', web_target.endsWith('.') ? web_target : web_target + '.', 'web, www']);
  const MAIL = {
    'all-inkl': { mx: 'TODO(owner): MX host from the KAS panel', spf: 'v=spf1 mx a include:spf.kasserver.com ~all', dkim: 'selector from the KAS panel (kasYYYYMM)' },
    brevo: { mx: null, spf: 'v=spf1 include:spf.brevo.com ~all', dkim: 'brevo._domainkey (value from the Brevo panel)' },
    microsoft: { mx: `${d.replace(/\./g, '-')}.mail.protection.outlook.com`, spf: 'v=spf1 include:spf.protection.outlook.com -all', dkim: 'selector1/selector2 CNAMEs from the Microsoft 365 admin center' },
    google: { mx: 'smtp.google.com', spf: 'v=spf1 include:_spf.google.com ~all', dkim: 'google._domainkey (value from the Admin console)' },
    strato: { mx: 'smtpin.rzone.de', spf: 'v=spf1 redirect=smtp.rzone.de', dkim: 'from the Strato panel' },
    ionos: { mx: 'mx00.ionos.de / mx01.ionos.de', spf: 'v=spf1 include:_spf-eu.ionos.com ~all', dkim: 'from the IONOS panel' },
  };
  const m = mail_provider ? MAIL[String(mail_provider).toLowerCase().replace(/\s+/g, '-')] : null;
  if (mail_provider) {
    rows.push(['@', 'MX', m?.mx || `TODO(owner): MX of ${mail_provider}`, 'mail']);
    rows.push(['@', 'TXT', m?.spf || `v=spf1 include:<${mail_provider} SPF host> ~all`, 'SPF: exactly one record, at most 10 lookups']);
    rows.push(['<selector>._domainkey', 'TXT or CNAME', m?.dkim || `DKIM key from ${mail_provider}`, 'DKIM']);
    rows.push(['_dmarc', 'TXT', `v=DMARC1; p=none; rua=mailto:dmarc@${d}; adkim=r; aspf=r`, 'DMARC: start with p=none, raise to quarantine after reports are clean']);
  } else rows.push(['@', 'TXT', 'v=spf1 -all', 'no mail sent from this domain'], ['_dmarc', 'TXT', 'v=DMARC1; p=reject;', 'no mail sent from this domain']);
  rows.push(['@', 'CAA', `0 issue "${ca}"`, 'only this CA may issue certificates']);
  const md = [`DNS plan for ${d} (TTL 300 during the switch, 3600 afterwards). Write down the old records before changing anything.`, '', '| Name | Type | Value | Purpose |', '|---|---|---|---|', ...rows.map((r) => `| ${r.join(' | ')} |`), '', 'Prepared, not applied: a human enters these records at the DNS provider.'].join('\n');
  return { rows: rows.map(([name, type, value, purpose]) => ({ name, type, value, purpose })), md };
}

/** The twelve privacy-policy inputs (launch.md L7), pre-filled from a launch report, gaps marked. */
export function legalInputs({ report, sheet = {} }) {
  const f = (id) => (report?.findings || []).filter((x) => x.id === id);
  const foreign = report?.foreignHosts || [];
  const acc = (s) => (sheet.accounts || []).filter((a) => new RegExp(s, 'i').test(a?.service || ''));
  const gap = (t) => `GAP: ${t}`;
  const items = [
    ['Controller', gap('name, address, contact of the site owner; DPO if appointed (from the Impressum, confirmed by the owner)')],
    ['Hosting and server logs', acc('host').length ? acc('host').map((a) => `${a.provider} (DPA: ${a.dpa || 'missing'})`).join('; ') + '; ' + gap('log fields and retention from the host panel') : gap('hosting provider and log retention')],
    ['Processors and third parties', report?.processors?.rows?.length ? report.processors.rows.map((r) => `${r.provider}: ${r.service}`).join('; ') : gap('run kk launch --processors')],
    ['Contact form and email', f('forms.static').length ? `${f('forms.static').length} form(s) found; ` + gap('fields, purpose, legal basis, retention') : 'no form found on the crawled pages'],
    ['Analytics', foreign.some((h) => /analytics|tagmanager|clarity|hotjar|matomo|plausible|umami/.test(h)) ? 'third-party analytics found: ' + foreign.join(', ') : sheet.analytics?.tool && sheet.analytics.tool !== 'none' ? `${sheet.analytics.tool} (${sheet.analytics.origin || 'origin?'})` : 'none found'],
    ['Fonts', f('privacy.fonts-self-hosted').every((x) => x.ok) ? 'self-hosted, no connection to third parties' : 'fonts from third parties found: fix before writing the policy'],
    ['Embeds and maps', (sheet.allow_third_party || []).length ? (sheet.allow_third_party || []).map((a) => `${a.host} (${a.reason})`).join('; ') : f('privacy.iframe-before-click').every((x) => x.ok) ? 'none at load' : 'iframes at load found: add a two-click facade'],
    ['Newsletter', gap('provider and double opt-in, if any')],
    ['Shop and payment', gap('payment providers, if any')],
    ['Rights of data subjects', 'standard text (Art. 15 to 21 GDPR, complaint to a supervisory authority, withdrawal of consent)'],
    ['Provision required / automated decisions', 'normally: not required, no automated decision-making; ' + gap('confirm')],
    ['AI features', f('ai.chatbot-notice').length ? 'chat widget found: ' + gap('provider, what is sent, labelling') : 'none found'],
  ];
  return { items: items.map(([topic, value]) => ({ topic, value, gap: /GAP:/.test(value) })), md: items.map(([t, v], i) => `${i + 1}. **${t}**: ${v}`).join('\n') };
}
