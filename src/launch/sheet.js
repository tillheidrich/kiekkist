// Launch sheet: Markdown with a fenced YAML block (machine-readable) and one table per step (launch.md).
// Append-only: init never overwrites, tick appends a manual confirmation. Values that look like
// secrets are refused: the sheet stores where credentials live, never the credentials.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseYaml, dumpFlow, dumpScalar } from './yaml.js';

const STEPS = ['Domain', 'DNS', 'Hosting', 'Deploy', 'Editor', 'Forms', 'Mail', 'Legal pages', 'Analytics', 'Search', 'Performance', 'Security headers', 'Backups', 'Monitoring', 'Handover', 'Care'];

export function sheetPath(site, base = process.cwd()) {
  const host = (() => { try { return new URL(site).hostname; } catch { return String(site).replace(/[^a-z0-9.-]+/gi, '-'); } })();
  return join(base, '.kiekkist', 'launch', `${host}.md`);
}

export function template(site) {
  return `# Launch sheet: ${site}

\`\`\`yaml
site: ${site}
mail: { used: true, dkim_selectors: [] }
bfsg: null            # applies? decided by: <name>, <date>
llms_txt: false
analytics: { tool: none, origin: first-party }
allow_third_party: [] # each entry needs a reason: consent | contract
storage_allow: []     # strictly necessary keys only, each with a reason
processors: []        # names that must appear in the privacy policy
accounts: []          # { service, provider, owner: client, dpa: <date>, creds: "<where, never the secret>" }
redirects_file: null
budget: { lcp_ms: 2500, cls: 0.1, js_kb: 50, total_kb: 800 }
monitor_url: null
manual: []
\`\`\`

The YAML block above is read by \`kk launch\`. Manual confirmations are appended under \`manual\` (\`kk_launch_sheet\` action tick). Credentials never go here, only where they are stored.

${STEPS.map((s) => `## ${s}\n\n| Decision | Who | Date | Credentials stored in | Check |\n|---|---|---|---|---|\n|  |  |  |  |  |\n`).join('\n')}`;
}

export function parseSheet(md) {
  const m = /```ya?ml\n([\s\S]*?)\n```/.exec(md || '');
  return m ? parseYaml(m[1]) : {};
}
export function readSheet(path) { return existsSync(path) ? { path, text: readFileSync(path, 'utf8'), data: parseSheet(readFileSync(path, 'utf8')) } : null; }

export function initSheet(site, path = sheetPath(site)) {
  if (existsSync(path)) return { created: false, ...readSheet(path) };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, template(site));
  return { created: true, ...readSheet(path) };
}

/** Values that look like secrets (high-entropy tokens, password=, API key formats). */
export function looksSecret(v) {
  const s = String(v ?? '');
  if (/(password|passwort|passwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/i.test(s)) return true;
  if (/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b|\bxox[abp]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s)) return true;
  for (const w of s.split(/[\s,;"']+/)) {
    if (w.length < 20 || /^https?:/.test(w)) continue;
    const freq = {}; for (const c of w) freq[c] = (freq[c] || 0) + 1;
    const H = -Object.values(freq).reduce((a, n) => a + (n / w.length) * Math.log2(n / w.length), 0);
    if (H > 4 && /[0-9]/.test(w) && /[a-zA-Z]/.test(w)) return true;
  }
  return false;
}

/** Append one manual confirmation to the YAML block (never rewrites existing entries). */
export function tickSheet(path, { item, by, note, date = new Date().toISOString().slice(0, 10) }) {
  if (!item || !by) throw Object.assign(new Error('tick needs item and by (the person who confirmed it)'), { code: 'BAD_INPUT' });
  for (const v of [item, by, note]) if (looksSecret(v)) throw Object.assign(new Error('refused: this looks like a secret. The sheet stores only where credentials live.'), { code: 'BAD_INPUT' });
  const s = readSheet(path); if (!s) throw Object.assign(new Error('no launch sheet at ' + path + ' (init it first)'), { code: 'BAD_INPUT' });
  const entry = dumpFlow({ id: item, done: date, by, ...(note ? { note } : {}) });
  let text = s.text;
  const block = /```ya?ml\n([\s\S]*?)\n```/.exec(text);
  if (!block) throw Object.assign(new Error('launch sheet has no YAML block'), { code: 'BAD_INPUT' });
  let yaml = block[1];
  if (/^manual:\s*\[\s*\]\s*$/m.test(yaml)) yaml = yaml.replace(/^manual:\s*\[\s*\]\s*$/m, `manual:\n  - ${entry}`);
  else if (/^manual:\s*$/m.test(yaml)) { const lines = yaml.split('\n'); const at = lines.findIndex((l) => /^manual:\s*$/.test(l)); let j = at + 1; while (j < lines.length && /^\s+/.test(lines[j])) j++; lines.splice(j, 0, `  - ${entry}`); yaml = lines.join('\n'); }
  else yaml += `\nmanual:\n  - ${entry}`;
  text = text.replace(block[0], '```yaml\n' + yaml + '\n```');
  writeFileSync(path, text);
  return readSheet(path);
}
export { dumpScalar };
