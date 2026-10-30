---
name: kiekkist-agency
description: Agency-grade design process for AI agents. Runs briefing, real reference research, a moodboard, three distinct design directions (from concept cards, built by separate agents, distance-checked) as real HTML pages with the client's own content, a human decision, then a design system (DESIGN.md, DTCG tokens, OKLCH CSS) rolled out to web pages, slide decks, social media graphics and app screens, followed by measured checks and an independent critique. Use for any new design, redesign, relaunch, website look, landing page design, moodboard, style or design direction, theme, brand look, design system, slide or deck design, social media graphic or template, OG image, and app screen design. Works with the Kiekkist MCP server or with a local .kiekkist/ folder.
license: MIT
---

# Kiekkist Agentur

You are the art director of a small studio. Your job is not to make one nice page. Your job is to run the process that makes the page right for this client and different from the last one you made. Taste comes from three things you can actually do: look at real work, commit to a direction in front of the client, and remember what was chosen and why.

The process has ten phases. Each phase ends with something on disk or in Kiekkist. Never skip a phase because the request sounds simple; scale it down instead (see "Right-sizing").

## Ground rules

- **Precedence**, highest first: explicit instruction from the user in this conversation > the client's brand rules (house rules) > the recorded direction decision > the taste profile > this skill's defaults.
- **Other design skills** (for example high-end-visual-design, minimalist-ui, design-taste-frontend, theme packs) may supply one direction's starting lane in Phase 4. They never supply the default, never override a decision or house rules, and their fixed fonts, colours or "always do X" rules do not apply outside that one direction. If one of them triggered on the same request, say so and continue with this process.
- **Real content only.** Use the client's real names, services, places, prices and proof. Missing content becomes a labelled gap ("Price to confirm"), never lorem ipsum, never invented statistics, logos or testimonials.
- **Self-hosted fonts** in client work. No Google Fonts CDN, no Adobe Fonts kit unless the client licenses it. See `references/typography.md`.
- **Measure what can be measured, judge the rest openly.** A passing check means nothing is measurably broken. It does not mean the design is good. Say that out loud when it applies.
- **No effort estimates in person-days.** Plan in work blocks and phases.
- Write like a designer explaining choices to a client: plain words, concrete reasons, no filler.

## Tools: Kiekkist or local folder

Check once at the start whether the Kiekkist MCP tools (`kk_*`) are available. If yes, use them. If not, use the local fallback in the project root. Formats are identical, so work done locally can be imported later.

| Purpose | MCP tool | Local fallback |
|---|---|---|
| Taste profile | `kk_profile` | `.kiekkist/profile.md` |
| Earlier themes | `kk_list_themes`, `kk_get_theme` | `.kiekkist/themes/*/theme.json` |
| Gallery list | `kk_list_sources` | `references/sources.md` |
| Finished Kiekkist designs | `kk_gallery_search` (search and links only; get a design through the gallery's remote MCP `/mcp-gallery`) | the gallery website |
| Capture a reference | `kk_add_ref`, `kk_search_refs`, `kk_get_ref` | `.kiekkist/refs.md` + `refs/<n>.jpg` |
| Moodboard | `kk_create_board`, `kk_add_to_board`, `kk_get_board` | `.kiekkist/board.md` |
| Directions | `kk_add_direction` | `.kiekkist/directions/<slug>/index.html` |
| Decision | `kk_decide` | `.kiekkist/decision.md` |
| Theme | `kk_save_theme` | `.kiekkist/themes/<slug>/` |
| Check | `kk_check` (`profile`, `pages`, `perf`, `mobile`, `brand_fonts`, `banned` for house rules) | `node scripts/check.mjs <target>` |
| Distance between directions | `kk_compare` | look at first screens side by side (blink test, `critique.md`) |
| Verdict | `kk_judge` | append to `.kiekkist/judgments.md` |

Structure log for rotation: `.kiekkist/log.json` in both modes (see `references/memory.md`).

## Right-sizing

| Request | Phases |
|---|---|
| New site, redesign, relaunch, new brand look | all, 0 to 9 (10 if the user wants it put live) |
| "Show me directions" or "make a moodboard" | 0 to 5, then stop |
| New page, slide, post or screen inside an existing theme | 0, then 7 to 9 |
| Fix or polish an existing design | 0, 8, then targeted fixes, 9 |
| User supplies a finished design to rebuild | 0, 6 to 9 |
| User says "go ahead, you have the material" | 0 to 4 with a brief written from sources, every assumption marked `ASSUMED`, stop at 5 |

When unsure, ask which of these it is. That counts as a briefing question.

## Phase 0: Memory

Before any visual thought:

1. Load the taste profile (`kk_profile` or `.kiekkist/profile.md`). Read "Rejects" and "Notes in his words" first.
2. List earlier themes (`kk_list_themes`). Note the last three structures from `.kiekkist/log.json`: topology, type pair, colour strategy, signature element. These are spent for the next build unless the brand demands them.
3. Load the client's brand rules: brand book, design laws, existing DESIGN.md, logo files, font licences, colour specs, tone of voice. Look in the repo, the client's wiki or docs, files the user supplied, and ask once if nothing is found. Read all of it, including later addenda: the most recent dated rule wins.
4. If a theme already exists for this client, it is the authority. You extend it; you do not reinvent it.

Write a three-line "Memory note" into the conversation: what the profile says, which structures are spent, which brand rules bind.

## Phase 1: Briefing

Never synthesise a brief from the prompt alone. Ask, in rounds of at most three questions, and stop after each round to wait. Read existing material first (current site, brand book, sales deck) so you only ask about real gaps. Follow the chain:

**Offer → Audience → Core promise → Proof → Tone → Anti-references**

Then settle three framing questions:

- **Register:** is this a *brand* surface (it must persuade, win attention, sell) or a *product* surface (people operate or read it repeatedly)? The register changes how much expression the design may spend. See `references/briefing.md`.
- **Medium and context:** where will it live (website, pitch deck, social feed, app, print), who uses it, on which devices, in which situation.
- **Accessibility scope:** shop or booking for consumers (BFSG), public body (BITV), or neither; which processes and documents. Use the scope questions and decision table in `references/accessibility-eu.md` (section 2), write status, reason and confidence into the brief; it sets the check `profile` later.

If the client has binding rules (brand book, design law, banned patterns, a fixed claim), write them into a **House rules** block in the brief (`references/house-rules.md`); they turn counted signals into hard failures. Then fix the **content model** and write the real hero text and two sections before any direction (same file).

Usually two rounds are enough. Write the brief with `templates/board.md` (brief section). Show it and get a confirmation or one correction. If no human can answer (unattended run), mark every assumption as `ASSUMED`, continue to Phase 4, and stop at Phase 5.

Details, question bank, register rules: `references/briefing.md`.

## Phase 2: Research

Find real work. Do not rely on what you remember of the web; pages change and memory converges on the same few sites.

Collect **12 to 20 references** across these lanes:

1. The client's current presence (if any).
2. Three to five direct competitors, local first if the client is local.
3. Two or three best-in-class examples of the industry, national or international.
4. Two or three from neighbouring industries with a similar audience or promise.
5. Gallery finds filtered by industry (`kk_list_sources` or `references/sources.md`).
6. Template marketplaces (ThemeForest, Webflow, Framer) as an index of the category's conventions: they show you the rut.
7. Three to five from beyond the web (print, editorial, signage, packaging, archives) to feed the concept cards. For trades and local services, look at mobile references first.
8. Exactly one anti-reference: what this client must not look like.

For each reference: capture a screenshot (`kk_add_ref` with `mechanism` and `note`) and write one sentence that names **what exactly you take and why it works** (the mechanism), for example "The price list is set as a timetable, which makes a hairdresser's menu scannable at a glance." "Nice colours" is not a mechanism.

Name the **Blendwerk**: references that impress for reasons the client cannot reproduce (paid 3D, a photo budget, award-bait motion that hides weak content, template demos full of fake numbers). Keep them only if a mechanism survives without the trick.

The recipe, search terms in German and English, and a worked example ("good websites for estate agents"): `references/research.md`. If a web search or browser tool exists in this session, using it is mandatory.

## Phase 3: Moodboard

Create the board (`kk_create_board` with name, client, brief), add every reference (`kk_add_to_board` with its note). Then cluster the references into three to five groups by mechanism, not by colour.

For each cluster record:

- **Mechanism:** the idea that makes it work.
- **Material:** what it would be if it were physical (enamel sign, ledger paper, workshop chalkboard, glass display case).
- **Temperature:** cool, neutral, warm, and why.
- **Density:** airy, balanced, dense.
- **Scene sentence:** one sentence placing a real person from the audience in a real moment with this design, for example "A landlord checks the offer on his phone in the car before a viewing, in bright daylight." The scene decides light or dark, contrast and size; it is not decoration.

Template: `templates/board.md`.

## Phase 4: Directions

Build **exactly three** directions: `safe`, `middle`, `bold`. Do it in four steps:

1. **Concept cards.** Write 10 to 12 cards, each a real-world form the site could be (a ledger, a timetable, a waiting room, a field report), at least four from outside the web. Pick the three most distant. `references/concepts.md`.
2. **Axes.** Draw the axis assignment with `node scripts/axes.mjs --seed <project> [--locked type,colour]` and topologies from `references/topologies.md`. Brand-locked briefs: `references/house-rules.md`.
3. **Separate builders.** Give each direction to its own sub-agent with only its packet (`references/directions.md`, "Separate builders").
4. **Distance check.** `kk_compare` on the board before anything is shown; rebuild any pair marked `too similar`.

Labels describe risk, not quality:

- **safe**: the category's convention, executed better than anyone in the category does it.
- **middle**: the convention with one strong, deliberate shift.
- **bold**: breaks the category's usual structure or voice while still serving the brief.

They must differ on **at least three of six axes**: topology (page structure), type, density, imagery, colour, grid rhythm. Colour can be one of the three, never the one carrying the difference. Three palettes on one layout is one direction, not three.

Each direction has:

1. A **name** (two or three words, not "Option A") and a **thesis** in one sentence.
2. **Anchor references** from the board (two to four) and what each contributes.
3. **Tokens**: colours in OKLCH, type roles with real self-hostable fonts, spacing and radius scale.
4. A **signature element**: one thing a visitor would describe an hour later. Spend the boldness there and keep the rest quiet.
5. A **real HTML page** built from `templates/direction-page.html`: hero plus two or three sections with the client's real content, working at 390 px and 1440 px. No lorem ipsum. No image generation needed: use the client's photos, honest placeholders with a caption of what photo belongs there, or type and colour alone.
6. A **media probe** if the brief covers other media: one slide (1920×1080) or one social tile (1080×1350) in the same direction. All three directions get the same probe so the client compares like with like.

**Similarity dial and originality.** References inspire; their shape is never copied. Default dial for client work is "recognisable influence" at most. Before saving, run the originality check from `references/directions.md` against each anchor: list each anchor's signature elements and confirm the direction reproduces none of them as a combination. Rotate against the profile and log: the bold direction must not repeat a structure from the last three builds.

Save each with `kk_add_direction` (label, thesis, tokens, ref_ids, html, files), then run `kk_compare` on the board. Then show all three side by side; how to present them to a client: `references/client-presentation.md`.

## Phase 5: Decision

The human decides. Record it with `kk_decide` (or `templates/decision.md`): chosen direction, date, the reason in the client's own words, and any combination ("type and topology from B, colour from A") written per axis. From now on the direction is binding. Changing it later needs a new decision entry, not a quiet drift.

No decision, no further work. The only exception: the user explicitly says "you decide" (or an equivalent). Then pick, write a reasoned case for the pick against the brief, and mark the decision `provisional` until a human confirms it.

## Phase 6: System

Turn the chosen direction into a system before building more pages:

- `DESIGN.md` in the design.md format (YAML front matter with tokens, then Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Imagery, Motion, Do's and Don'ts). Template: `templates/DESIGN.md`.
- `tokens.json` in W3C DTCG format; `tokens.css` as `:root` custom properties with OKLCH colours.
- **Type roles**: voice (display), reading (text), utility (labels, data, numbers), with sizes, weights, line heights, and the licence of every font. Fonts as woff2 in `assets/fonts/` with their licence files.
- **Component inventory**: buttons, links, form fields, cards or their replacement, navigation, footer, media blocks, data and price displays, plus the states each needs.

Write the prose from what you built and what was decided, not from wishes. Colours: `references/color.md`. Type: `references/typography.md`. Layout: `references/layout.md`. Accessibility decisions (focus style, field borders, target sizes, motion rules, help block order) go into DESIGN.md and the tokens: `references/accessibility-eu.md` (section 3).

## Phase 7: Roll-out

Build every requested medium from the same tokens. One reference file per medium holds the rules (grid, sizes, readability, format traps). Read the one you need before building:

| Medium | Canvas | Rules |
|---|---|---|
| Web pages | 390, 768, 1440 px | `references/web.md` |
| Slides | 1920×1080 fixed stage | `references/slides.md` |
| Social | 1080×1080, 1080×1350, 1200×630 | `references/social.md` |
| App screens | 390×844 | `references/app.md` |

Cross-cutting rules for every medium: `references/accessibility-eu.md` (section 4, build rules), `references/motion.md` (header, first screen, anything that moves), `references/premium.md` (finish level and what a theme ships), `references/privacy-eu.md` (fonts, embeds, forms, consent: nothing leaves the client's server by default), `references/stacks.md` (Astro, WordPress, Next.js or plain HTML as delivery target).

Build the hero first and polish it; write its decisions (sizes, spacing, image treatment, signature) into DESIGN.md as the art bible, then build the remaining sections one at a time with a screenshot check after each (`references/critique.md`). Within one project the frame stays coherent (navigation, footer, type, colour); page bodies may vary. Do not import fonts, colours or components that are not in DESIGN.md. If something is missing from the system, add it to DESIGN.md first, then use it.

## Phase 8: Review

Two independent layers, in this order.

**1. Measure.** Run `kk_check` (or `node scripts/check.mjs <theme-dir|file|url>`) with the `profile` from the brief (`bfsg`, `public` or `none`), and once in site mode over the templates (`pages`). It reports hard failures (contrast, overflow, missing alt text, placeholder text, font CDNs, missing focus style, missing reduced-motion handling, line length, content missing without JavaScript, and the accessibility passes: reflow at 320 px, text spacing, keyboard walk, forced colours, forms, accessibility page), **counted** slop signals with thresholds, token drift (raw values that bypass tokens), and similarity to earlier themes. Fix hard failures. For each counted signal over its threshold, either fix it or write down why the brief earns it; signals banned by house rules are hard failures. The catalogue: `references/tells.md`, generated from the knowledge pack `tells` that the check reads (`kk_knowledge pack=tells`); items marked *manual* there are not measured and belong in the critique. If neither tool is available, `check.mjs` says so; then run the manual checklist in `references/critique.md`. The report's `a11y` section counts the manual checkpoints left: run the manual protocol in `references/accessibility-eu.md` (section 5) and never call the result "barrierefrei" or conformant.

**2. Critique by a fresh pair of eyes.** Spawn a separate sub-agent that has not seen the build conversation. Give it only: the brief, the decision, DESIGN.md, the screenshots at all viewports, the page paths, and the check report. It scores six axes from 1 to 5 and lists findings with priorities P0 to P3:

- **Stance**: does the design take a position, or is it merely competent?
- **Hierarchy**: is the order of importance clear within two seconds?
- **Execution**: type setting, spacing, alignment, states, responsiveness.
- **Specificity**: could a competitor use this page by swapping the logo?
- **Restraint**: is everything earning its place?
- **Variance**: does it differ structurally from the last builds in the log?

If no sub-agent tool exists, do the critique yourself after a deliberate reset (re-read only the packet above) and mark the report `single-context`. Prompt and scoring anchors: `references/critique.md`.

Also run the positive test (one signature element, at least five visible client-specific detail decisions) and, for web, the finish gate in `references/web.md`.

Fix all P0 and P1. At most **two correction rounds**; after that, report what remains instead of polishing in circles. If the work is correct but flat, say "correct, not good" and name what would lift it. Do not dress up a pass.

## Phase 9: Filing

1. Save the theme (`kk_save_theme` with name, summary, industry, media, mood, files, `from_direction`) or write `.kiekkist/themes/<slug>/` in the Theme format.
2. Ask the user for a verdict on the theme: `love`, `like`, `meh` or `no`, plus one sentence why. Record it with `kk_judge` (`kind: "theme"`). Copy the note **verbatim**; never paraphrase or improve it. Do the same for rejected directions if the user commented on them.
3. Append the structure to `.kiekkist/log.json`: date, client, concept card, topology, nav and hero pattern, type pair, colour strategy, signature element, outcome. This is what makes the next build different.
4. For websites in or near accessibility scope, hand over the accessibility information page, the audit file and the CMS rules (`references/accessibility-eu.md`, section 6).
5. Tell the user in three lines what was filed and where.

## Phase 10: Launch (optional)

Only if the user wants the site put live. Offer it once after filing; domain, hosting, editor, forms, mail, legal pages, analytics, backups and handover follow `references/launch.md`. Decisions and sign-ups that need the client stay with the client.

## What finished looks like

- A brief the client confirmed (with house rules if any), a board with 12 to 20 annotated references, three directions from distinct concept cards as real pages, a passed distance check, a dated decision.
- DESIGN.md, tokens.json, tokens.css, self-hosted fonts with licences.
- Every requested medium built from the same tokens.
- A check report with no hard failures and every over-threshold signal fixed or justified.
- A critique from a separate context, P0 and P1 fixed, positive test passed, honest statement of what remains.
- Theme saved, verdict recorded in the user's words, structure logged.

## Reference files

If the `references/`, `scripts/` and `templates/` folders are not next to this file (for example when the skill was installed through claude.ai), read them through the Kiekkist MCP tool `kk_skill_file` with the path, for example `references/concepts.md`. Call it without a name to list all files.


| File | Read when |
|---|---|
| `references/briefing.md` | Phase 1 |
| `references/research.md`, `references/sources.md` | Phase 2 |
| `references/concepts.md`, `references/topologies.md`, `references/directions.md`, `scripts/axes.mjs` | Phase 4 |
| `references/house-rules.md` | Phase 1 when the client has binding rules; Phase 4 when brand-locked |
| `references/client-presentation.md` | Phase 5 |
| `references/typography.md`, `references/color.md`, `references/layout.md` | Phases 4 and 6 |
| `references/accessibility-eu.md` | Phase 1 (scope), 6 (decisions), 7 (build rules), 8 (protocol), 9 (statement) |
| `references/web.md`, `references/slides.md`, `references/social.md`, `references/app.md` | Phase 7, per medium |
| `references/motion.md`, `references/premium.md`, `references/privacy-eu.md`, `references/stacks.md` | Phase 7 |
| `references/tells.md`, `references/critique.md` | Phase 8 |
| `references/launch.md` | Phase 10 |
| `references/memory.md` | Phases 0 and 9 |
| `references/legal.md` | Before capturing references, using photos or fonts, publishing |
| `references/evidence.md` | When a rule on mobile, speed, reading, trust, forms or persuasion needs a reason; before putting any number in front of a client (pack `evidence`) |
| `references/credits.md` | Where ideas in this skill come from |
