// Kiekkist UI behaviour: verdict buttons (keys 1-4), confirm deletes, live status of captures.
(() => {
  const post = (url, data) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.judge button');
    if (!b) return;
    const f = b.closest('.judge');
    const was = b.getAttribute('aria-pressed') === 'true';
    const judgment = was ? null : b.value;
    f.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    if (!was) b.setAttribute('aria-pressed', 'true');
    const note = document.querySelector('textarea[name=note]');
    const r = await post('/ui/judge', { kind: f.dataset.judge, id: f.dataset.id, judgment, note: note && note.value ? note.value : undefined });
    if (!r.ok) alert('Could not save verdict');
  });
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const forms = document.querySelectorAll('.judge'); if (forms.length !== 1) return;
    const i = ['1', '2', '3', '4'].indexOf(e.key); if (i < 0) return;
    forms[0].querySelectorAll('button')[i]?.click();
  });
  document.addEventListener('submit', (e) => {
    if (e.target.matches('[data-confirm]') && !confirm('Sure?')) e.preventDefault();
    if (e.target.matches('form.srcq')) {
      e.preventDefault();
      const q = e.target.q.value;
      document.querySelectorAll('a[data-tpl]').forEach((a) => { a.href = a.dataset.tpl.replace('{q}', encodeURIComponent(q)); });
    }
  });
  document.addEventListener('change', (e) => { if (e.target.matches('select[data-autosubmit]')) e.target.form.submit(); });
  // bookmarklet window: close after saving
  document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) window.close(); });
  // board order: after a move the page comes back with #mv-<ref>-<dir>; keep keyboard focus on that button
  const m = /^#(mv-[\w-]+)$/.exec(location.hash);
  if (m) { const b = document.getElementById(m[1]); if (b) { if (b.disabled) b.parentElement.querySelector('button:not([disabled])')?.focus(); else b.focus(); } }
  // refresh while captures are pending
  if (document.querySelector('.card[data-status="queued"], .card[data-status="capturing"], .tile[data-status="queued"], .tile[data-status="capturing"]') && !document.activeElement?.closest?.('form')) setTimeout(() => { if (!document.activeElement?.closest?.('form')) location.reload(); }, 6000);
})();
