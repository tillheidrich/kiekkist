// Image-slot leftovers (rule `placeholder`): working notes for missing photos must never reach the visitor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { slotFindings } from '../../src/check/rules.js';
import { checkTarget } from '../../src/check/index.js';

const ids = (html) => slotFindings(html).map((f) => f.value).sort();

test('slot notes in visible text fail', () => {
  assert.deepEqual(ids('<div class="slot"><p>Foto folgt: brunsbeck/saal<br><small>3:2, siehe docs/IMAGE-PROMPTS.md</small></p></div>'), ['foto-folgt', 'image-prompts']);
  assert.deepEqual(ids('<span>Bild: sunderwisch/huehnermobil, 4:3 (siehe IMAGE-PROMPTS.md)</span>'), ['bild-label', 'image-prompts']);
  assert.deepEqual(ids('<figcaption><p>Image slot kestrel-row/room-1 (treatment room) can replace this photo.</p></figcaption>'), ['image-slot']);
  assert.deepEqual(ids('<figcaption><b>img: basalt-path/food-1</b>Photo: lunch on the levada</figcaption>'), ['img-label']);
  assert.deepEqual(ids('<p>Prompts stehen in IMAGE-PROMPTS.md</p>'), ['image-prompts-file']);
  for (const f of slotFindings('<p>Foto folgt</p>')) { assert.equal(f.rule, 'placeholder'); assert.equal(f.severity, 'error'); }
});

test('alt text or aria-label starting with Platzhalter or Image slot fails', () => {
  assert.deepEqual(ids('<img src="a.webp" alt="Platzhalter: Porträt der Trainerin">'), ['alt-placeholder']);
  assert.deepEqual(ids('<img src="a.webp" alt=\'Image slot room-1\'>'), ['alt-placeholder']);
  assert.deepEqual(ids('<div role="img" aria-label="Platzhalter für ein Foto: Terrasse"></div>'), ['aria-label-placeholder']);
});

test('clean pages, real descriptions, scripts and comments pass', () => {
  assert.deepEqual(ids('<img src="a.webp" alt="Die Trainerin an ihrer Hobelbank"><div class="slot" aria-hidden="true"></div>'), []);
  assert.deepEqual(ids('<p>Vorlage mit Platzhaltern. Felder ausfüllen.</p><img alt="Ein Platzhalter-freies Bild">'), []);
  assert.deepEqual(ids('<!-- Foto folgt: x/y --><script>const s = "img: a/b";</script><style>.x::after{content:"Image slot"}</style><p>Fotos vom Hof</p>'), []);
  assert.deepEqual(ids('<p>Bild: Hof im Mai</p><p>img: none</p>'), []);
  assert.deepEqual(ids(''), []);
});

test('checkTarget reports slot notes in the rendered page as hard errors', { timeout: 120000 }, async () => {
  const browser = await chromium.launch();
  try {
    const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hof</title></head><body><main><h1>Hofladen</h1><p>Eier, Kartoffeln und Spargel aus eigenem Anbau.</p><div id="s"></div></main><script>document.getElementById("s").textContent = "Foto folgt: hof/eier";</script></body></html>';
    const r = await checkTarget({ html, browser, viewports: [1440], axe: false, a11y: false, mobile: false, noJs: false, interaction: false });
    const hits = r.hard.filter((f) => f.rule === 'placeholder' && f.value === 'foto-folgt');
    assert.equal(hits.length, 1, JSON.stringify(r.hard.map((f) => f.rule)));
    assert.equal(hits[0].severity, 'error');
  } finally { await browser.close(); }
});
