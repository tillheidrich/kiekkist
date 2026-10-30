// Minimal YAML subset for launch sheets (no dependency): block maps and lists, flow maps { a: b } and
// flow lists [a, b], quoted and plain scalars, comments. Not a general YAML parser.

function splitFlow(s) {
  const out = []; let depth = 0, q = null, cur = '';
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim());
}
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) { const ch = s[i]; if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).trimEnd(); }
  return s;
}
export function scalar(v) {
  v = v.trim();
  if (v === '') return null;
  if (v.startsWith('{') && v.endsWith('}')) { const o = {}; for (const part of splitFlow(v.slice(1, -1))) { const i = keyIndex(part); if (i > 0) o[part.slice(0, i).trim().replace(/^["']|["']$/g, '')] = scalar(part.slice(i + 1)); } return o; }
  if (v.startsWith('[') && v.endsWith(']')) return splitFlow(v.slice(1, -1)).map(scalar);
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (/^(null|~)$/i.test(v)) return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
function keyIndex(s) { let q = null; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === ':' && (i + 1 === s.length || s[i + 1] === ' ')) return i; } return -1; }

export function parseYaml(text) {
  const lines = String(text).split('\n').map((l) => stripComment(l.replace(/\t/g, '  '))).filter((l) => l.trim() !== '');
  let i = 0;
  const indent = (l) => l.match(/^ */)[0].length;
  function block(ind) {
    if (i >= lines.length) return null;
    const isList = lines[i].trim().startsWith('- ') || lines[i].trim() === '-';
    if (isList) {
      const arr = [];
      while (i < lines.length && indent(lines[i]) === ind && /^-( |$)/.test(lines[i].trim())) {
        const rest = lines[i].trim().slice(1).trim();
        if (!rest) { i++; arr.push(block(i < lines.length ? indent(lines[i]) : ind + 2)); continue; }
        const k = keyIndex(rest);
        if (k > 0 && !rest.startsWith('{') && !rest.startsWith('[')) { // "- key: value" starts a map
          lines[i] = ' '.repeat(ind + 2) + rest; arr.push(block(ind + 2)); continue;
        }
        arr.push(scalar(rest)); i++;
      }
      return arr;
    }
    const obj = {};
    while (i < lines.length && indent(lines[i]) === ind) {
      const t = lines[i].trim(); const k = keyIndex(t);
      if (k < 0) { i++; continue; }
      const key = t.slice(0, k).trim().replace(/^["']|["']$/g, ''); const rest = t.slice(k + 1).trim();
      i++;
      if (rest === '' ) { obj[key] = i < lines.length && indent(lines[i]) > ind ? block(indent(lines[i])) : (i < lines.length && indent(lines[i]) === ind && /^-( |$)/.test(lines[i].trim()) ? block(ind) : null); }
      else if (rest === '|' || rest === '>') { const buf = []; while (i < lines.length && indent(lines[i]) > ind) buf.push(lines[i++].trim()); obj[key] = buf.join(rest === '|' ? '\n' : ' '); }
      else obj[key] = scalar(rest);
    }
    return obj;
  }
  return block(lines.length ? indent(lines[0]) : 0) || {};
}

const needsQuote = (s) => /^[\s]|[\s]$|[:#{}\[\],&*!|>'"%@`]|^(true|false|null|~|-?\d+(\.\d+)?)$/i.test(s) || s === '';
export function dumpScalar(v) { if (v === null || v === undefined) return 'null'; if (typeof v === 'boolean' || typeof v === 'number') return String(v); const s = String(v); return needsQuote(s) ? JSON.stringify(s) : s; }
export function dumpFlow(v) {
  if (Array.isArray(v)) return `[${v.map(dumpFlow).join(', ')}]`;
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${dumpFlow(x)}`).join(', ')} }`;
  return dumpScalar(v);
}
