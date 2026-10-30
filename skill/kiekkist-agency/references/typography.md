# Typography

Type carries most of a design's personality and most of its usability. Choose faces the way a set designer chooses props: from the client's world, for a role, with a reason you can say out loud.

## Roles before faces

Decide the roles first, then fill them:

| Role | Job | Usually |
|---|---|---|
| **Voice** (display) | Headlines, the first impression, the signature | a face with a point of view, set large |
| **Reading** (text) | Body copy, long passages, forms | a face built for small sizes and long reading |
| **Utility** | Labels, navigation, data, prices, tables | often the reading face; tabular figures switched on |
| **Accent** (optional) | One special job: numbers in a price list, a signature line | only if it earns its place |

One family can fill every role. Two families are common. Three need a reason. If you use two, they must be clearly different; two similar grotesques look like a mistake.

## Where good choices come from

- **The client's world.** Signage on their vehicles, the lettering on a 1960s shop front, the forms their customers fill in, technical drawings, the trade's catalogues. Ask what type the audience already reads every day.
- **The register.** Brand surfaces want a voice. Product surfaces want a workhorse; system UI stacks are legitimate there.
- **The scene sentence.** A phone in daylight needs open apertures and generous size. A projector in a bright room needs weight.
- **The directions.** The three directions should differ on type (see `directions.md`), so do not pick one pair and reuse it three times.

## The reflex test

For every face you pick, ask: **"Would I pick this same face for any similar task?"** Run the brief through your head with a different client name in the same industry. If you would land on the same face, you have not chosen; you have defaulted. Either find a reason in the brief that no other face satisfies, or choose again.

"It feels warm" or "it feels premium" is not a reason. That is how category stereotypes work.

## Reflex list

These faces come back far more often than the briefs justify. They are not bad typefaces. Using one in the voice role needs a written reason from the brief. A serif display with one italic word in the headline is the editorial-lane version of the same reflex (see `tells.md`).

<!-- reflex:start -->
<!-- Generated from knowledge/packs/reflex-fonts.json (version 2026-10-30.1) by scripts/gen-tells-md.mjs. Edit the pack, not this block. -->

Pack `reflex-fonts` 2026-10-30.1, reviewed 30.10.2026. Role "display" means the face counts only when it sets headings; "any" counts wherever it sets text. The check reports matches as info (`reflex-font`).

| Face | Role | Sector default in | Why it is on the list | Class · source | Added |
| --- | --- | --- | --- | --- | --- |
| Inter | any |  | most frequent text face in a 30-brief experiment; also used as display; named display reflex in the maintainer's research sweep; Inter in 104 of 355 superdesign records | D · bis, impeccable, wiki-q37, superdesign | 29.10.2026 |
| Fraunces | display |  | most frequent display face in the same experiment; soft serif for anything "warm" | D · bis | 29.10.2026 |
| Playfair Display | display |  | training-data reflex; with one italic word it is the editorial-lane cliché | D · impeccable, wiki-rt12 | 29.10.2026 |
| Instrument Serif | display |  | current display reflex of generators and of the "anti-AI" tips | D · impeccable, kiekkist | 29.10.2026 |
| Instrument Sans | any |  | training-data reflex | D · impeccable | 29.10.2026 |
| Cormorant (all styles) | display | wine, hotel, property | sector default (Cormorant Garamond) | D · bis | 29.10.2026 |
| Canela | display | law | sector default; commercial face | D · bis | 29.10.2026 |
| Barlow Condensed | display | construction, logistics | sector default | D · bis | 29.10.2026 |
| Space Grotesk | any | ai, crypto, fintech | sector default; named display reflex in the maintainer's research sweep; Space Grotesk in 49 of 355 superdesign records | D · bis, wiki-q37, superdesign | 29.10.2026 |
| Sora | any | ai, crypto, fintech | sector default | D · bis | 29.10.2026 |
| Poppins | any | education | sector default | D · bis | 29.10.2026 |
| Lora | display |  | training-data reflex | D · impeccable | 29.10.2026 |
| Crimson (all styles) | display |  | training-data reflex (Crimson Text, Crimson Pro) | D · impeccable | 29.10.2026 |
| Newsreader | display |  | training-data reflex | D · impeccable | 29.10.2026 |
| Syne | display |  | training-data reflex | D · impeccable | 29.10.2026 |
| Space Mono | display |  | training-data reflex as a voice face (mono labels are counted separately) | D · impeccable | 29.10.2026 |
| IBM Plex (all styles) | display |  | training-data reflex (Plex Sans, Serif, Mono) | D · impeccable | 29.10.2026 |
| DM Sans | any |  | training-data reflex | D · impeccable | 29.10.2026 |
| DM Serif (all styles) | display |  | training-data reflex (DM Serif Display, Text) | D · impeccable | 29.10.2026 |
| Outfit | any |  | training-data reflex; also a "replacement" recommended by other skills | D · impeccable, taste | 29.10.2026 |
| Plus Jakarta Sans | any |  | training-data reflex; recommended as an "anti-AI tip" that is itself a default; Plus Jakarta Sans in 58 of 355 superdesign records | D · impeccable, wiki-rt12, superdesign | 29.10.2026 |
| Geist | any |  | generator default; named display reflex in the maintainer's research sweep | D · taste, wiki-q37 | 29.10.2026 |
| Satoshi | any |  | generator default and "replacement" font of other skills; Satoshi in 83 of 355 superdesign records | D · taste, superdesign | 29.10.2026 |
| Manrope | any |  | generator default | D · kiekkist | 29.10.2026 |
| General Sans | any |  | generator default; General Sans in 86 of 355 superdesign records | D · superdesign | 30.10.2026 |
| Cabinet Grotesk | display |  | "replacement" font of other skills, therefore a default by construction | D · taste | 30.10.2026 |
| Clash Display | display |  | generator default | D · superdesign | 30.10.2026 |
| Switzer | any |  | generator default | D · superdesign | 30.10.2026 |
| Montserrat | any |  | long-time template default | P · kiekkist | 30.10.2026 |
<!-- reflex:end -->

Add anything you notice yourself reaching for twice in a row to the pack `knowledge/packs/reflex-fonts.json` (with reason, source and date), then run `node scripts/gen-tells-md.mjs`. Check `.kiekkist/log.json` for the last type pairs; do not repeat the last one.

## Free, self-hostable faces by role

All faces below are under the **SIL Open Font License 1.1**, checked against the Fontsource API on 29.10.2026, and available as variable fonts unless marked "static". OFL allows commercial use, embedding on websites and in apps, and modification; you may not sell the fonts on their own, and a modified version must not use a Reserved Font Name. Keep the licence file next to the font files.

German needs ä, ö, ü and ß (all in the basic Latin subset). The capital ẞ and most Central European characters need the latin-ext subset; ship it.

### Sans for reading and utility

| Face | Character | Good for |
|---|---|---|
| Public Sans | neutral, sturdy, made for public-sector interfaces | forms, portals, public services |
| Hanken Grotesk | friendly grotesque with clear shapes | service businesses, product UI |
| Schibsted Grotesk | newspaper grotesque, compact | news-like density, B2B |
| Albert Sans | geometric with Scandinavian restraint | architecture, property, design |
| Figtree | clean, slightly rounded geometric | apps, approachable brands |
| Onest, Golos Text | modern grotesques with wide language coverage | multilingual, interfaces |
| Archivo | grotesque with width axis from condensed to expanded | trades, industry, signage-like headlines |
| Red Hat Text / Red Hat Display | paired text and display optical versions | technical brands |
| Source Sans 3 | humanist, very complete | long reading, documentation |
| Libre Franklin | American gothic tradition | editorial, institutions |
| Work Sans | grotesque with wide weight range | display at heavy weights, text at light |
| Atkinson Hyperlegible Next | designed for low-vision readers; distinct letterforms | accessibility-first services, health, public |
| Inclusive Sans | designed for legibility | inclusive services |
| Overpass | derived from US highway signage lettering | wayfinding, mobility, infrastructure |
| Mona Sans / Hubot Sans | grotesque with width axis; Hubot is its technical sibling | tech with character |

### Serif for voice or reading

| Face | Character | Good for |
|---|---|---|
| Source Serif 4 | transitional, optical sizes | long reading, institutions, law |
| Literata | made for e-reading | long texts, publishing |
| Spectral (static) | elegant, screen-first | editorial, culture |
| EB Garamond | classic Garamond revival | heritage, books, wine (watch the reflex in that sector) |
| Libre Caslon Text (static) | Caslon for body text | traditional institutions |
| Young Serif (static) | heavy, old-style display | food, crafts, posters |
| Besley | Clarendon-flavoured, sturdy | trades, signage, Victorian warmth |
| Alegreya | calligraphic, lively | literature, culture |
| Petrona | versatile text serif with many weights | editorial with a modern edge |
| Brygada 1918 | revival of a 1918 Polish typeface | history, heritage |
| Gloock (static) | high-contrast display serif | fashion, beauty, premium (high reflex risk, see list) |
| Bodoni Moda | Bodoni with optical sizes | fashion, luxury headlines |
| Roboto Serif | adjustable serif for UI | product interfaces that want a serif |
| Bitter | slab for screens | trades, sturdy text |
| Zilla Slab (static) | contemporary slab | tech with editorial tone |

### Display with strong character

| Face | Character | Good for |
|---|---|---|
| Bricolage Grotesque | quirky grotesque with optical size and width | brands that want warmth without a serif |
| Familjen Grotesk | grotesque with ink-trap detailing | culture, studios |
| Big Shoulders Display | condensed, Chicago signage roots | events, sports, industry |
| Anybody | extreme width axis | posters, bold directions |
| Libre faces from Velvetyne and Collletttivo | experimental display faces, OFL | bold directions; check each licence file |

### Monospace and data

| Face | Character | Good for |
|---|---|---|
| JetBrains Mono | coding mono, clear | technical products |
| Commit Mono (static, latin only) | neutral mono | data tables, code |
| Fragment Mono (static) | Helvetica-like mono | labels with editorial tone |
| Martian Mono | wide mono with width axis | headlines in technical brands |
| Red Hat Mono | pairs with Red Hat Text | technical systems |
| B612 (static) | designed for aircraft cockpit displays | dense data, instruments |

Fontshare faces are free under the ITF Free Font License, not OFL. They are usable commercially under their own terms; read and store that licence before using one.

## Pairing patterns

Not fixed pairs, patterns to fill with faces that pass the reflex test:

| Pattern | Example | When |
|---|---|---|
| One family, many weights and widths | Archivo throughout, condensed for display | trades, industry, strong systems |
| Text serif + utility sans | Source Serif 4 + Public Sans | institutions, law, consulting |
| Characterful display + neutral text | Big Shoulders Display + Hanken Grotesk | events, sports, local brands with energy |
| Slab display + humanist text | Besley + Source Sans 3 | craft, signage feeling |
| Grotesque + mono for data | Schibsted Grotesk + Fragment Mono | catalogues, price-heavy pages, reports |
| Readability first | Atkinson Hyperlegible Next alone | health, public services, older audiences |

## Setting the type

- **Scale.** Pick a modular ratio and stick to it; fewer, clearly different sizes beat many close ones. Fluid sizes with `clamp()` for web display sizes; fixed sizes for slides (`slides.md`).
- **Line length.** 45 to 75 characters for body text, the range typographers have used for a century (Bringhurst, *The Elements of Typographic Style*). Never above 80 (WCAG 1.4.8).
- **Line height.** Larger for body (around 1.5 for sans, a little more for serif), tighter for display.
- **German specifics.** Long compounds break layouts. Set `lang="de"`, use `hyphens: auto` on body text, add `overflow-wrap: break-word` as a safety net, and test with real long words from the client's content ("Grundstückswertermittlung", "Dachgeschossausbau"). Use correct quotes („…“) and the non-breaking space in "5 €" and "z. B.".
- **Numbers.** Tabular figures (`font-variant-numeric: tabular-nums`) in tables, prices, timetables.
- **Weight carries hierarchy** as much as size does. Do not fake bold or italic; ship the real styles or the variable axis.

## Self-hosting

1. Get the files: download from the foundry, from the font's repository, or install the Fontsource npm package (`@fontsource-variable/<name>`) and copy the woff2 files.
2. Ship only what you use: woff2, the needed subsets (latin, latin-ext for German), the needed axes or weights.
3. Declare with `@font-face` in `tokens.css` or a fonts stylesheet; `font-display: swap`; `unicode-range` per subset.
4. Preload at most one file: the face used in the first viewport.
5. Store the licence file in `assets/fonts/` and list every face with its licence in `theme.json` (`fonts`) and DESIGN.md.
6. Never link `fonts.googleapis.com` or another font CDN in client work. Reason in `legal.md`.


## Brand fonts are exempt

Fonts fixed by the client's brand book are not reflex choices. The reflex test applies only to free choices. When the brand binds the families, vary the directions through roles instead: which family carries the voice, size, weight, width, case and line length.
