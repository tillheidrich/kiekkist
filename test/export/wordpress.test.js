// WordPress block theme: theme image URLs in patterns keep the slash after the theme folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { exportTheme } from '../../src/export/index.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'themes');

test('wordpress: pattern asset URLs are trailingslashit( get_theme_file_uri() ) + assets/…', async () => {
  const out = mkdtempSync(join(tmpdir(), 'kk-wp-'));
  const slug = 'nordlicht-immobilien';
  const r = await exportTheme({ themeDir: join(EX, slug), target: 'wordpress', out, force: true, check: false, screenshot: false });
  assert.equal(r.code, 0);
  const php = readdirSync(join(out, slug, 'patterns')).map((f) => readFileSync(join(out, slug, 'patterns', f), 'utf8')).join('\n');
  assert.doesNotMatch(php, /get_theme_file_uri\(\s*'\/'\s*\)/, 'no get_theme_file_uri( "/" ) without trailing slash');
  const uses = php.match(/<\?php echo esc_url\( trailingslashit\( get_theme_file_uri\(\) \) \); \?>assets\//g) || [];
  assert.ok(uses.length > 0, 'patterns reference theme assets through the slash-safe base');
});

test('wordpress: a ready screenshot image is used instead of a browser shot', async () => {
  const out = mkdtempSync(join(tmpdir(), 'kk-wp-'));
  const img = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  await exportTheme({ themeDir: join(EX, 'nordlicht-immobilien'), target: 'wordpress', out, force: true, check: false, screenshotImage: { data: img, ext: 'jpg' } });
  assert.deepEqual(readFileSync(join(out, 'nordlicht-immobilien', 'screenshot.jpg')), img);
});
