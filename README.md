# Kiekkist

Kiekkist makes Claude and Codex design the way a small agency does: first a brief and real references, then three distinct directions built as real pages with the client's own content, then a human decision, then a checked build. It has two parts that work together or alone:

- **The skill** (`skill/web-design-studio`, MIT) walks an agent through the process: briefing, research, moodboard, three directions, decision, design system, roll-out to web pages, slides, social graphics and app screens, measured checks and an independent critique.
- **The tool** (this repository, AGPL-3.0) is a self-hosted studio with an MCP server: reference capture with screenshots and measured tokens, boards, directions, decisions, a theme library, a taste profile built from your verdicts, a browser-based checker, exports to HTML, Astro, React, WordPress and Elementor, and launch checks.

*Kiekkist* is Low German for "look-box": *kieken* means to look, *Kist* is a box.

Website and gallery of finished, checked designs: https://kiekkist.heidrich-digital.de

## Why

Ask a model for a website and you get the same page every time: centred hero, three cards, a purple gradient, Inter. Rule lists help a little, but they jump straight from prompt to code. Agencies don't. They look at real work, show options, let someone choose and remember what the client liked. Kiekkist gives an agent those missing steps and a way to measure the result.

## Install

Pick the first option that fits where you work.

1. **Remote MCP server (gallery).** Add `https://kiekkist.heidrich-digital.de/mcp-gallery` as a remote MCP connector in Claude (claude.ai: Settings, Connectors; Claude Code: `claude mcp add --transport http kiekkist-gallery https://kiekkist.heidrich-digital.de/mcp-gallery`). It searches the gallery and hands out free designs and licensed ones. It does not run your own references or checks; for that, self-host the tool (option 4).
2. **Skill ZIP for claude.ai.** Download `dist/web-design-studio-skill.zip` from this repository (or rebuild it with `npm run skill:zip`) and upload it under Settings, Capabilities, Skills.
3. **Skill folder in your repository** (Claude Code, including cloud sessions). Copy `skill/web-design-studio` to `.claude/skills/web-design-studio` in the project, or to `~/.claude/skills/` for all projects. Without a Kiekkist server the skill keeps its state in a `.kiekkist/` folder in the project.
4. **Self-hosted tool, local or Docker.** Gives the agent the full MCP tool set (`kk_*`), the web UI, the checker and exports.

```bash
git clone https://github.com/tillheidrich/kiekkist && cd kiekkist
npm ci
npx playwright install chromium
export KK_PASSWORD=$(openssl rand -base64 18) KK_TOKEN=$(openssl rand -hex 24)   # required: at least 12 / 24 characters
npm run seed     # sources, the example themes, a demo board
npm start        # http://localhost:4410
# quick local test without login: HOST=127.0.0.1 KK_INSECURE_LOCAL=1 npm start
```

Docker:

```bash
docker build -t kiekkist .
docker run -p 4410:4410 -v kk-data:/data -e KK_PASSWORD=... -e KK_TOKEN=... kiekkist
```

Connect an agent to your instance:

```bash
claude mcp add --transport http kiekkist https://your-host/mcp --header "Authorization: Bearer $KK_TOKEN"
# or, without a server, from a checkout over stdio:
claude mcp add kiekkist -- node /path/to/kiekkist/cli/kk.js mcp
```

Optional settings: `KIEKKIST_GALLERY_URL` (gallery searched by `kk_gallery_search`, default https://kiekkist.heidrich-digital.de), `KK_MCP_KEY` (separate key for `/mcp?key=` connectors that cannot send headers), `KK_SECRET` (signs file links; generated in the data dir otherwise), `KK_MAX_CONTEXTS` (browser contexts, default 2), `KK_PUBLIC_URL`, `KK_LANG=de|en`, `KK_DATA_DIR`, `KK_SEED=off` (start empty).

## Quick start

Ask your agent for something concrete, for example: "Moodboard and three directions for an estate agent in Hamburg." With the skill installed it reads your taste profile, asks a few briefing questions, researches references, builds three directions on a board and waits for you to choose. After the decision it writes the design system, builds the pages and runs the checker.

Check a page right away, no server needed:

```bash
npm run check -- examples/themes/nordlicht-immobilien/pages/index.html --profile bfsg
npm run check -- ./dist/index.html --root ./dist          # a build folder with root-relative paths
```

## Commands

The CLI is `kk` (`node cli/kk.js`, or run `npm link` once in the checkout to get `kk` on your PATH). Commands marked *server* talk to your instance (`KK_URL`, `KK_TOKEN`); the others run locally.

| Command | What it does |
|---|---|
| `kk check <file\|url\|--theme slug>` *server* | Hard errors, counted slop signals, token drift, mobile evidence, a score from 0 to 100. Options: `--profile none\|bfsg\|public`, `--pages all` (site mode), `--perf`, `--no-mobile`, `--brand-font`, `--ban <signal>` (house rules). Locally: `npm run check -- <file>` with the same options. |
| `kk compare <board>` *server* | Are the directions really different? Screenshot hash plus structural signals; exit 1 if a pair is too similar. |
| `kk export <theme-dir> --target html\|astro\|react\|wordpress\|elementor` | Turns a theme into a project scaffold, then checks the export against the theme (regressions, off-origin requests, visual fidelity). `--cms` adds an editor config, `--build` checks the real build. |
| `kk launch <url\|export-dir>` | Pre-launch checks: DNS and mail records, TLS, security headers, privacy (third-party requests, cookies before consent), legal pages and placeholders, search basics, lab performance, forms, accessibility, handover. Prepares and verifies; never registers, pays, signs or changes DNS. |
| `kk add`, `kk refs`, `kk judge`, `kk new-board`, `kk direction`, `kk decide`, `kk themes`, `kk save-theme`, `kk profile`, `kk gallery` *server* | Collect references, run boards, record verdicts and decisions, keep themes, read the taste profile, search the gallery. |
| `kk tokens <theme-dir> --format css\|theme.json\|tailwind\|elementor` | Token file for an existing project. |
| `kk spec <url\|file\|dir>` | Measures a reference at 1440/1024/768/390 plus a breakpoint sweep: container, grid ratios, type scale with ratios, line breaks, section geometry, image formats, colours. Writes `SPEC.draft.md`, `spec.json` and screenshots to `.kiekkist/fidelity/`. Never stores the page's HTML. |
| `kk motion <url\|file\|dir>` | What moves: getAnimations, keyframes, transitions, scroll and view timelines, hover diffs, libraries; OBSERVED vs INFERRED; frame strips and translation hints. |
| `kk fidelity <ref url\|spec dir> <build>` | Reference and build side by side at 1440 and 390 (montages), px deltas per section, type role and key element; `FIDELITY.md` with the checklist; exit 1 while values are off. `--labels before,after` for existing sites. |
| `kk improve <url\|file\|dir>` | Audits an existing site (measurement, check, motion, slop tells) into `IMPROVE.md`: keep / fix / redesign with numbers, a suggested depth (polish or redesign) and a target spec that keeps brand and content. |
| `kk workflow [new\|polish\|redesign]`, `kk references`, `kk reference <id>` | The visual-fidelity workflow and checklist; an optional private reference library (`KK_REFS_FILE`, built with `scripts/refs-catalogue.mjs`). |
| `kk mcp` | Local MCP server over stdio. |

## Visual fidelity and existing sites

The visual reference is the basis of a design, not an abstract summary of it. The skill makes "Reference to spec" a mandatory phase: pick a reference, `kk spec` and `kk motion` it, write SPEC.md with numbers, build, then `kk fidelity` until its report says FIDELITY COMPLETE (no value outside tolerance after at least two rounds). For existing sites ("Bestehende Seite verbessern") `kk improve` comes first, then polish (same structure) or redesign (new composition, brand and content kept), with before/after montages; URLs and SEO-relevant content never break.

The tools measure boxes, computed styles and timings and take screenshots into a private working folder; they never store a page's HTML, CSS or scripts. Public pages load through the egress guard; local builds are served on 127.0.0.1 and may load only from there. MCP: `kk_get_workflow`, `improve_site` (a hosted instance accepts public URLs only), `kk_search_references` and `kk_get_reference_spec` (only with `KK_REFS_FILE`), and on the local `kk mcp` server `kk_spec`, `kk_motion`, `kk_fidelity`. A reference library holds third-party screenshots: keep it private.

## Knowledge packs

The skill and the checker read versioned JSON packs in `knowledge/packs/`, so the rules can change without code changes:

| Pack | Content | Licence |
|---|---|---|
| `tells.json` | signals of autopilot design, counted with thresholds, each with its evidence | MIT |
| `reflex-fonts.json` | fonts that models reach for by reflex, by role and sector | MIT |
| `a11y-eu.json` | WCAG 2.2 AA, EN 301 549, BFSG and BITV items with how to test them | CC BY 4.0 |
| `privacy-eu.json` | GDPR, TDDDG and AI Act items for websites | MIT |
| `stacks.json` | stacks, CMS and hosting options for small business sites | MIT |
| `topologies.json` | page structures for the direction distance check | MIT |
| `evidence.json` | the evidence classes used across the packs | MIT |

Corrections are welcome; please open a "knowledge-pack correction" issue with a source. `scripts/gen-tells-md.mjs` regenerates the derived tables in the skill.

## Evidence classes

Every rule and number says how much it rests on:

| Class | Meaning |
|---|---|
| **S** | Standard, norm or law (WCAG, EN 301 549, BFSG, GDPR). |
| **M** | Measured effect on people in a published study, named with its limits. |
| **D** | Measured default or telemetry: how often models or the web do something (crawls, generated output). Shows a reflex, says nothing about harm. |
| **P** | Practitioner consensus across several independent sources. |
| **H** | Our hypothesis. A prompt to look, nothing more. |
| **T** | Taste shared by several sources, not a rule (design signals only). |
| **V** | Vendor claim or vendor case study (evidence pack only). |

The evidence pack also records a status per finding: replicated, single-study, contested or myth. Thresholds are house values; change them for your own house rules and write the change down. Definitions: `skill/web-design-studio/references/tells.md` and `knowledge/packs/evidence.json`.

## What is checked

The checker opens the page in Chromium at 390, 768 and 1440 px, waits until animations have settled, loads it a second time without JavaScript and with reduced motion, and blocks every request to another host so it can count it.

- **Accessibility, the automatable part of WCAG 2.2 AA and EN 301 549:** contrast (including opacity and gradients), axe-core rules, keyboard walk with focus visibility and traps, target sizes, reflow at 320 px, text spacing, text resize to 200 %, orientation, motion and pause controls, forced-colours mode, hover and focus content, the BFSG or BITV information page and its required contents.
- **Privacy:** fonts from a CDN and every other third-party request, with its host. `kk launch` adds cookies and storage before consent, trackers, embeds and the processors list.
- **Mobile lab:** a throttled run on the Moto G Power profile (slow 4G, 4x CPU) with LCP, CLS, TBT, transfer budgets, LCP image rules, font swap shift, first screen, body text size and line length.
- **Design:** overflow (long German compounds included), placeholder text, token drift from the theme, and counted slop signals with thresholds.

## Honest limits

- Automated tests cover only part of WCAG 2.2. The report lists what a person still has to check by hand, with a screen reader and a keyboard. A passing check is not a conformance statement.
- A passing check means nothing measurable is broken. It does not mean the design is good; that stays a human judgement, which is why the process ends with a separate critique.
- Lab numbers are a lab run on one machine, not field data. Local files are served from loopback, so they get no DNS, TLS or CDN distance.
- Legal checks look for links, placeholders and required wording. They are not legal advice.
- The example themes are built and tuned with this checker, so they pass it. Judge the checker on your own pages, not on its examples.

## What is private and what is not

The code is open. Your collection is not: screenshots and tokens of other people's websites stay in your instance (`KK_DATA_DIR`). Don't publish them. Kiekkist helps you take principles from references, not copy their look.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bugs and ideas go into issues. New checker rules need a source, an evidence class and a threshold, and a test fixture that fires them.

## Security

Please report vulnerabilities privately to security@heidrich-digital.de, not in a public issue. See [SECURITY.md](SECURITY.md).

## Licence

- Tool (everything outside the folders below): AGPL-3.0-only, see `LICENSE`.
- Skill `skill/web-design-studio`: MIT, see its `LICENSE`.
- Knowledge packs: the licence declared in each pack (MIT, `a11y-eu.json` CC BY 4.0), see `knowledge/README.md`.
- Example themes: code and copy CC BY 4.0; **photos © Till Heidrich, licensed only for use within these examples, not for other use**; fonts under the SIL Open Font License 1.1 with their licence files. See `examples/LICENSE`.

See `NOTICE` for third-party components. Kiekkist is made by Till Heidrich, [Heidrich Digital](https://heidrich-digital.de).
