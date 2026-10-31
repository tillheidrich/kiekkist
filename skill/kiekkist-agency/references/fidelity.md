# Visual fidelity: reference to spec, build, compare

Abstract "design DNA" loses exactly what made a reference worth collecting: its concrete composition. From now on the visual reference itself is the basis of the design process. The aim is visual quality you can measure against the reference, not a page "with a similar mood".

This file covers three modes. `get_workflow` / `kk_get_workflow` (mode `new`, `polish` or `redesign`) returns the same steps as data.

| Mode | When | Core loop |
|---|---|---|
| `new` | every new design, direction or theme | reference → kk spec + kk motion → SPEC.md → build → kk fidelity (2+ rounds) |
| `polish` | existing site, same structure (Bestehende Seite verbessern, Tiefe a) | kk improve → agreed fix list → fix in their stack → kk fidelity before/after |
| `redesign` | existing site, new composition (Bestehende Seite verbessern, Tiefe b) | kk improve → inventory → reference spec → build with their brand and content → two fidelity loops |

## Tools

| Step | CLI | MCP (local server) |
|---|---|---|
| Find a reference in the owner's library | `kk references <query> [--industry x] [--cluster C07] [--has-spec]`, `kk reference <id>` | `kk_search_references`, `kk_get_reference_spec` (only where `KK_REFS_FILE` is configured) |
| Measure layout | `kk spec <url> [--viewports 1440,1024,768,390] [--frames]` | `kk_spec` |
| Measure motion | `kk motion <url> [--width 1440] [--hovers 8]` | `kk_motion` |
| Compare | `kk fidelity <ref url or spec dir> <build> [--labels before,after]` | `kk_fidelity` |
| Audit an existing site | `kk improve <url> [--industry x] [--mood y] [--perf]` | `improve_site` |
| Workflow and checklist | `kk workflow [new\|polish\|redesign]` | `kk_get_workflow` |

Output goes to a working folder (default `.kiekkist/fidelity/<slug>/…`, which belongs in `.gitignore`). The tools measure boxes, computed styles and timings and take screenshots; they never store a page's HTML, CSS or scripts. Public pages load through the tool's egress guard (public addresses only); own builds are served from 127.0.0.1 and may load only from there.

## Mode new: reference to spec (mandatory before building)

1. **Pick the reference.** One primary reference per direction. Prefer references with desktop and phone screenshots and a reachable live URL (`has_shots`, `live_url`). Write one sentence: which composition you want from it.
2. **Measure it.** `kk spec <live url>` and `kk motion <live url>`. Then look at every screenshot and frame yourself. The numbers do not replace looking; they stop you from guessing.
3. **Write SPEC.md and MOTION.md** from the drafts (template: `templates/SPEC.md`). Concrete numbers: container and gutters, grid columns and ratios, type scale with ratios, line breaks (lines per statement at 1440 and 390), element positions, image formats and crops, section geometry (y, height, vh), spacing steps, breakpoints, motion (OBSERVED vs INFERRED with timing, easing, trigger). "Modern layout with generous whitespace" is not a spec. "Section padding 128 / 96 / 64 at 1440 / 1024 / 390, content 1312 at x 64" is.
4. **Write LEGAL.md**: what is taken as principle, what is own, which signature elements are replaced and by what.
5. **Build to the spec.** New brand, own copy, own images, own code. Hero first, then section by section. When something is hard to build, solve it concretely; never fall back to a standard component.
6. **Compare and correct, at least two rounds.** `kk fidelity <spec dir> <build>`: montages at 1440 and 390 (first screen and full page), section, type and position deltas, values outside tolerance marked CHECK. Fix every CHECK that is not a deliberate deviation, run again. FIDELITY-log.md keeps the rounds; summarise them in COMPARE.md.
7. **Checklist and checker.** Go through the checklist below with the montages open. Then `kk check --profile bfsg --perf` on every page (0 hard errors) and `kk check --compare <reference>` (record the similarity; for commercial templates it must say distinct).
8. **Report honestly**: reference, build and montages side by side; what matches, what is deliberately different, what is still off.

A pixel overlay is only meaningful and allowed for a permitted reconstruction (own site, licensed template, written permission). Otherwise compare against the spec and judge the montages side by side.

## Checklist (the owner's)

- Proportions: section heights, column ratios and the hero split match the spec (fidelity table, no CHECK left unexplained).
- Positions: h1, navigation, first button and first-screen media sit where the spec says (dx/dy within 12 px).
- Type sizes and line breaks: every role within 6 % of the spec, the same number of lines for h1 and the big statements at 1440 and 390.
- Image formats and crops: same named ratios per slot, subject placed like the reference, no stretched or letterboxed image.
- Vertical rhythm: section paddings and gaps follow the measured steps; nothing collapsed or doubled.
- Unusual layout decisions are implemented (sticky panels, overlaps, asymmetric columns, peeking carousels), not flattened.
- Motion works: each OBSERVED behaviour is rebuilt or deliberately replaced; reduced motion, no-JS and snapshot states are finished.
- No standard component slipped in where the reference has an individual solution (SaaS hero, three equal cards, bento, icon row, uniform cards).

## Hard bans

These are never the answer to "this is hard to build":

- Standard SaaS hero (centred claim, subline, two buttons, product shot or blob below).
- Three equal feature cards in a row.
- Bento grid as a filler layout.
- Generic gradients (purple-to-blue, mesh blobs, radial halo behind the headline).
- Interchangeable icon rows (icon, two words, one line, times four).
- The same card layout for every section of the page.

If a design must change for legal reasons, design a deliberate alternative of the same quality level; never a default.

## Distance rules

- Layout principles, proportions, rhythm and interaction ideas may follow the reference closely: measure them and hit the numbers.
- Always own: brand name, logo, copy, images, colours, icons and illustrations, and every distinctive signature element (custom artwork, a logo-like device, a unique illustration). Replace each with an alternative of equal quality and record it in LEGAL.md.
- Commercial templates (Webflow, Framer, Showit, Squarespace and similar are sold products): composition-level inspiration only. Change the hero composition and the section order; `kk check --compare` against the template must say distinct.
- Fonts: OFL or licensed for the client, self-hosted. Pick the closest match by measuring (x-height, width, contrast) and record the choice.
- Never store or ship third-party HTML, CSS, scripts or assets. Screenshots of third-party pages stay in the private working folder (`references/legal.md`).

## Media rules

- The hero opener (image or video) is unique: one opener belongs to one design only. Check the hero registry before choosing; reuse further down a page is fine.
- Choose images by composition, perspective, colour and format for the slot measured in the spec (named ratio, crop, subject position).
- No filler images. If nothing fits: an honest placeholder plus an exact generation prompt with file name and aspect ratio in IMAGE-PROMPTS.md.
- Video: muted, short (header loops at most 8 s), poster first, pause control, no autoplay under reduced motion.

## Motion translation: the effect, not the technique

- Rebuild what the visitor sees with CSS scroll-driven animations (`animation-timeline: view()` / `scroll()` with `animation-range`), cross-document View Transitions (`@view-transition { navigation: auto; }`), `clip-path` and `mask` reveals, transitions on hover and focus.
- No heavy libraries (GSAP, Lenis, Locomotive, Barba, three.js): rebuild the visible effect or replace it; one small passive script at most (`kk motion` names the libraries it finds and prints a translation hint per finding).
- `prefers-reduced-motion: reduce`: everything off, content in its finished state.
- Snapshot-safe: without JS, in print and with `?static` every element shows its finished state (no text at opacity 0, no unrevealed images). Start word reveals at a visible opacity so the largest text paints in the first frame.
- Keep OBSERVED timings and easings where they serve; mark every INFERRED value as such.

## Mode polish and mode redesign: Bestehende Seite verbessern

Content and brand of the client are preserved in both depths.

1. **Audit.** `kk improve <url>` (MCP `improve_site`): measures the site like kk spec (1440 and 390, sweep), motion, runs the checker (accessibility profile, privacy and third parties, mobile lab) and writes IMPROVE.md: **keep / fix / redesign** with numbers, a suggested depth, a target spec draft that keeps the brand (logo, colours unless they fail contrast, fonts, content) and, with the library configured, two or three matching references (`--industry`, `--mood`).
2. **Agree the depth with the client.**
   - **(a) Polish**: same structure. Fix the type scale (clear ratios, 5 to 7 steps), spacing rhythm (three padding steps), contrast (lightness only, hue kept), image formats and crops, motion (reduced motion, no layout shift), performance and accessibility.
   - **(b) Redesign**: new composition from a reference spec (mode new, steps 1 to 4), then the client's brand and content mapped onto it.
3. **Never break SEO-relevant content or URLs**: same paths (or 301 redirects), titles, headings, body text, structured data, internal links, forms and legal pages. Inventory them before changing anything.
4. **Before and after.** `kk fidelity <old site or its spec dir> <new build> --labels before,after`: montages and deltas with numbers; `kk check` on both, the after report must not regress. Redesigns also run the reference loop (`kk fidelity <reference spec> <build>`, at least two rounds).
5. **Deliver back into their stack**: a patch or theme update, or `kk export --target wordpress|astro|html|react|elementor`, plus a change list with numbers.

Measure the old site before the first change (`kk spec <url> --out .kiekkist/fidelity/<client>/before`) so the before state survives the relaunch.

## Worked example: New Genre (reference) and Dawnwright (lab build), 31.10.2026

Reference: the homepage of the design studio New Genre (newgenre.studio), measured live with Playwright at 1440, 1024, 768 and 390. Build: "Dawnwright", a fictional daylight practice, own code, copy, palette, OFL fonts and photos. Numbers only; no text from the reference.

**Spec (excerpt).** Breakpoints 768 (pill navigation, 3-column logo grid), 1024 (desktop navigation, side-by-side work rows), 1440 (final type step). Page container: padding 64 from 768 up, 32 below; content 1312 at x 64 on 1440, 326 at x 32 on 390. Type: condensed display serif 72 / 64 / 36 px (1440 / 1024 / 390), line height 1.05, tracking -0.02em; grotesk 450 for everything else at 32 / 24 / 20 px; hero / body ratio 4.5, hero / h2 2.25, h2 / description 1.6; body text gets smaller on desktop (18 to 16) while headings grow. h1: 3 lines in a 1024 box at (64, 256) on 1440, 4 lines at 326 px on 390. Sections at 1440 (y + height): sticky hero 0 + 2160 (240vh), logo grid 2160 + 491, work list 2651 + 2876, process carousel 5527 + 946, news grid 6474 + 2868, closing statement 9341 + 1800 (200vh), footer contact 11141 + 513, footer art 11655 + 2250 (250vh). Work row: text column 426.7 (measure 363), media 869 x 490 at x 507, aspect 455:256, row pitch 619. Carousel cards 427 x 591 with a square art area, fourth card cut by the viewport at x 1392. News cards 4:5. Section paddings 128 / 96 / 64.

**Motion (excerpt).** Hero words fade and rise on load, 500 ms per word, stagger about 85 ms (OBSERVED: keyframes and frames). A 240vh section scrolls one long gradient behind a sticky 100vh text panel, so the "sky brightens" without JavaScript (OBSERVED). Statement swap at scroll y 0.68 vh (OBSERVED). Navigation hides on scroll down, transform 0.7 s (duration INFERRED). Footer video scrubbed by scroll, 4.27 s over 1350 px (OBSERVED). Smooth-scroll library (OBSERVED, not rebuilt).

**Translation.** Word reveal as CSS keyframes starting at opacity 0.18 (first frame paints). Sky as the same CSS mechanism with an own palette. Swap via a sentinel and one class toggle. Footer video replaced by an own SVG sunrise driven by a CSS scroll-driven animation (`view-timeline`, range contain 0 to 85 %). Cursor-following labels replaced by labels inside the image on hover and focus. Native scrolling.

**Replaced on purpose (LEGAL.md).** The scrubbed flower film and the photographed flower series (commissioned artwork), the client logo wall (third-party marks), wordmark and mark, the commercial fonts (closest OFL faces chosen and recorded), secondary text at 40 % opacity (fails contrast; 68 % used).

**Rounds.** Round 0: h1 two lines instead of three (the OFL serif runs about 14 % narrower), cards 405 instead of 427 wide, closing text 62 px too low, logo grid 932 instead of 437 px high on phones. Round 1: copy length and card basis fixed; 44 accessibility errors and two gradient slop signals remained. Round 2: statement measure capped at 11.7em, palette replaced (signals gone), 0 hard errors. Round 3: rows side by side from 768 with fixed 490 px media like the reference, hero 64 px from 768. Final at 1440: hero, grid, work rows, carousel, closing and footer art within 0 to 13 px of the reference; document 751 px shorter because three fewer news cards (a content decision, recorded). Checker 86/100, 0 hard errors, mobile LCP 1.8 s; similarity to the reference 0.28 "distinct" (geometry close by design; fonts, colours, content different).

**Honest gaps.** Type texture differs (narrower, higher-contrast serif); stills instead of hover videos; flatter footer art than a real film; process art centred instead of bleeding off the card edge. Each gap is listed, none is hidden.
