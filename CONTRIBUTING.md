# Contributing

Thanks for helping. Kiekkist is small and opinionated; these rules keep it that way.

## Before you start

- Open an issue first for anything bigger than a bug fix, so we can agree on the approach.
- Bugs: include the command, the page or a minimal HTML fixture, the expected and the actual result, and your Node and Playwright versions.
- Knowledge-pack corrections: use the "knowledge-pack correction" issue template and give a source. Opinions without a source go into discussions, not packs.

## Development

```bash
npm ci
npx playwright install chromium
npm test                      # node --test, real Chromium; some tests measure time, so avoid heavy parallel load
node src/check/cli.js test/fixtures/clean.html
```

Node 22, ES modules, no build step, no frontend framework. Plain HTML and CSS with OKLCH tokens in the UI.

## Rules for changes

- **Checker rules** need a source, an evidence class (see README), a threshold and a test fixture that fires them, plus a clean fixture that does not. Put thresholds into the knowledge pack, not into code, and bump the pack `version`.
- **Generated files:** after changing `knowledge/packs/tells.json` or `reflex-fonts.json`, run `node scripts/gen-tells-md.mjs`; the tests fail when the derived files are out of date.
- **Example themes** must contain only original work, freely licensed fonts with their licence files, and photos the author may license. No screenshots or assets of other people's websites anywhere in the repository.
- **No secrets** in code, fixtures or tests. Use obviously fake values.
- Keep the security model intact: fail closed, no new network egress from Chromium, no new routes without auth.
- English for code, comments and docs. German is fine where the product is German on purpose (legal checks, example copy).

## Licences of contributions

By contributing you agree that your contribution is licensed under the licence of the part you change: AGPL-3.0-only for the tool, MIT for `skill/`, the declared licence for each knowledge pack, CC BY 4.0 for example theme code and copy.
