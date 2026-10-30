const de = {
  library: 'Sammlung', boards: 'Boards', themes: 'Themes', sources: 'Quellen', profile: 'Geschmack', search: 'Suchen',
  add_ref: 'Seite sammeln', url: 'Adresse', industry: 'Branche', tags: 'Schlagworte', note: 'Notiz', mechanism: 'Was genau ist gut daran?',
  save: 'Speichern', cancel: 'Abbrechen', capture: 'Erfassen', queued: 'wartet', capturing: 'wird erfasst', error: 'Fehler', ok: 'fertig',
  love: 'Liebe ich', like: 'Gut', meh: 'Naja', no: 'Nein', judged_by_claude: 'Einschätzung Agent', all: 'Alle',
  new_board: 'Neues Board', name: 'Name', client: 'Kunde', brief: 'Briefing', directions: 'Richtungen', decision: 'Entscheidung',
  choose: 'Diese Richtung nehmen', reason: 'Warum?', combine: 'Kombinieren mit …', decided: 'entschieden', collecting: 'sammelt',
  open: 'Öffnen', share_link: 'Link für Kunden', references: 'Referenzen', no_refs: 'Noch nichts gesammelt.',
  check: 'Prüfung', score: 'Punkte', download_zip: 'ZIP herunterladen', pages: 'Seiten', slides: 'Folien', social: 'Social', app: 'App',
  verdict: 'Urteil', why: 'Warum?', recapture: 'Neu erfassen', delete: 'Löschen', open_site: 'Seite öffnen', tokens: 'Tokens',
  colors: 'Farben', fonts: 'Schriften', sizes: 'Schriftgrößen', radii: 'Radien', spacing: 'Abstände', add_to_board: 'Zu Board',
  empty_themes: 'Noch keine Themes.', empty_boards: 'Noch keine Boards.', profile_intro: 'Was Kiekkist aus deinen Urteilen weiß. Agenten lesen das vor jeder Designarbeit.',
  sources_intro: 'Wo man sucht. Pro Quelle: wofür sie taugt und was man meiden sollte.', login: 'Anmelden', password: 'Passwort',
  thesis: 'These', label_safe: 'sicher', label_middle: 'mittel', label_bold: 'mutig', preview: 'Vorschau', mobile: 'Mobil', desktop: 'Desktop',
  made_from: 'Aus Richtung', hard: 'Harte Fehler', signals: 'Slop-Signale', over: 'über Schwelle', none: 'keine',
  stats_line: '{refs} Referenzen · {boards} Boards · {themes} Themes · {judged} Urteile von dir',
};
const en = {
  library: 'Library', boards: 'Boards', themes: 'Themes', sources: 'Sources', profile: 'Taste', search: 'Search',
  add_ref: 'Collect page', url: 'URL', industry: 'Industry', tags: 'Tags', note: 'Note', mechanism: 'What exactly is good about it?',
  save: 'Save', cancel: 'Cancel', capture: 'Capture', queued: 'queued', capturing: 'capturing', error: 'error', ok: 'done',
  love: 'Love', like: 'Like', meh: 'Meh', no: 'No', judged_by_claude: 'Agent assessment', all: 'All',
  new_board: 'New board', name: 'Name', client: 'Client', brief: 'Brief', directions: 'Directions', decision: 'Decision',
  choose: 'Choose this direction', reason: 'Why?', combine: 'Combine with …', decided: 'decided', collecting: 'collecting',
  open: 'Open', share_link: 'Client link', references: 'References', no_refs: 'Nothing collected yet.',
  check: 'Check', score: 'Score', download_zip: 'Download ZIP', pages: 'Pages', slides: 'Slides', social: 'Social', app: 'App',
  verdict: 'Verdict', why: 'Why?', recapture: 'Recapture', delete: 'Delete', open_site: 'Open site', tokens: 'Tokens',
  colors: 'Colours', fonts: 'Fonts', sizes: 'Type sizes', radii: 'Radii', spacing: 'Spacing', add_to_board: 'Add to board',
  empty_themes: 'No themes yet.', empty_boards: 'No boards yet.', profile_intro: 'What Kiekkist knows from your judgments. Agents read this before any design work.',
  sources_intro: 'Where to look. Per source: what it is good for and what to avoid.', login: 'Sign in', password: 'Password',
  thesis: 'Thesis', label_safe: 'safe', label_middle: 'middle', label_bold: 'bold', preview: 'Preview', mobile: 'Mobile', desktop: 'Desktop',
  made_from: 'From direction', hard: 'Hard errors', signals: 'Slop signals', over: 'over threshold', none: 'none',
  stats_line: '{refs} references · {boards} boards · {themes} themes · {judged} of your judgments',
};
export const LANG = (process.env.KK_LANG || 'en').startsWith('de') ? 'de' : 'en';
const dict = LANG === 'de' ? de : en;
export const t = (k, vars) => { let s = dict[k] ?? en[k] ?? k; if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace('{' + a + '}', b); return s; };
