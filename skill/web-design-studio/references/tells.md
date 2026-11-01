# Tells

A catalogue of signals that a design was produced on autopilot. They are **counted, not banned.** Every one of them is the right choice for some brief. Banning them only pushes the model to the next default; counting them makes each use a decision you can defend.

## Read this first: what the evidence says

Be honest with yourself and the client about what is known.

- **Effect on people is measured only for AI-generated imagery, not for layout.** NielsenIQ reported in 2024 (EEG with about 150 people, survey with more than 2,000) that viewers identified most AI-generated ads intuitively, rated them more "annoying", "boring" and "confusing", and showed weaker memory activation even for high-quality ones. This is a vendor press release without published effect sizes or method details, so treat it as a limited signal. It concerns ads and images, not web layouts.
- **For layout and typography tells there is, as far as we found, no study linking them to lower trust or conversion.** What exists is measurement of *defaults*: tool authors who ran the same briefs many times and counted which fonts and palettes came back (see class D below), and broad practitioner agreement on which patterns read as template.
- **The strongest evidence in the field is about instructional design, not taste:** Mayer and Fiorella's multimedia principles (meta-analyses) report that labelling a chart or figure directly instead of through a legend helps understanding (spatial contiguity, d ≈ 1.10) and that removing decoration helps (coherence, d ≈ 0.86). These are learning effects in explanations and diagrams. They justify direct labels and leaving decoration out; they say nothing about brand surfaces.
- An "AI-generated" label hurt product evaluation only for products that carry identity (Frontiers, 2026, n = 200), not for functional ones. Use that split: on identity surfaces (people, craft, places) real photos are mandatory; on functional surfaces (a form, a timetable) they matter less.
- So the honest position: these signals show **default thinking**, which tends to make a page interchangeable with its competitors. Interchangeability is the real cost. Do not tell a client that an eyebrow label loses them customers; nobody has shown that.

## Evidence classes

| Class | Meaning |
|---|---|
| **S** | Standard or norm (WCAG, typographic canon). Binding unless the brief explicitly overrides. |
| **M** | Measured effect on people in a published study. Name the study and its limits. |
| **D** | Measured as a model default (frequency in generated output). Shows it is a reflex, says nothing about harm. |
| **P** | Practitioner consensus: named as a template tell by several independent design guides or skills. |
| **H** | Our hypothesis. Treat as a prompt to look, nothing more. |
| **T** | Taste: a stated preference shared by several sources, not a rule. |

The catalogue below is generated from the knowledge pack `tells` (`kk_knowledge pack=tells`), the same data the check reads, so this file and `kk_check` cannot disagree. Thresholds are **house thresholds** (class P at best). They are tuned for one web page at 1440 px; adjust per medium and write down the change.

<!-- tells:start -->
<!-- Generated from knowledge/packs/tells.json (version 2026-10-30.3) by scripts/gen-tells-md.mjs. Edit the pack, not this block. -->

Pack `tells` 2026-10-30.3: 89 hard failures, 93 counted signals, 6 process rules; 147 measured by `kk_check`, the rest are critique checklist items (column *Checker*: rule id or "manual"). Class column: evidence class · source ids (list at the end).

## Hard failures (fix, do not justify)

| Failure | How to detect | Fails when | Severity | Class | Checker |
| --- | --- | --- | --- | --- | --- |
| Text contrast below WCAG AA | computed colour of every text node over its effective background (opacity chain, layered backgrounds), every viewport. *WCAG 2.2, 1.4.3. Dark mode is not yet emulated (open).* | below 4.5:1 (body) or 3:1 (large text ≥ 24 px or bold ≥ 18.66 px) | error | S · wcag22 | `contrast` |
| Contrast over a gradient not reliably measurable | worst gradient stop under the text | worst stop below the AA ratio | warn | S · wcag22 | `contrast-gradient` |
| Contrast over a photo not measurable | text whose background stack ends in an image, video or large SVG | any; check by eye or add a scrim | warn | S · wcag22 | `contrast-unmeasurable` |
| Horizontal overflow of the page | `documentElement.scrollWidth > clientWidth` at 390, 768, 1440; the outermost sticking-out element is named. *WCAG 2.2, 1.4.10 Reflow* | more than 1 px | error | S · wcag22 | `page-overflow` |
| Text running out of its container | text line boxes outside their block (German compounds included); clipped boxes are reported as `content-clipped` | more than 1.5 px | error | P · kiekkist | `text-overflow` |
| Text cut off by an overflow:hidden container | text straddling the edge of a clipping container | any | warn | P · kiekkist | `content-clipped` |
| Missing alt text on images | `img`, `input[type=image]` without `alt` (empty `alt` is fine for decoration), `role=img` without a name. *WCAG 2.2, 1.1.1* | more than 0 | error | S · wcag22 | `img-alt` |
| Links and buttons without accessible name | name computed from aria-label, labelledby, text, alt, svg title. *WCAG 2.2, 4.1.2; Vercel: icon-only buttons need aria-label* | more than 0 | error | S · wcag22, vercel-wig | `accessible-name` |
| Click targets below 24 px and too close | bounding box of every target; inline links in running text are exempt. *WCAG 2.2, 2.5.8* | below 24 × 24 px with a neighbour closer than the spacing exception | error | S · wcag22 | `target-size` |
| Touch targets below 44 px on mobile | targets at viewports under 600 px. *WCAG 2.2, 2.5.5 (AAA); platform guidelines* | below 44 × 44 px | warn | S · wcag22 | `target-size-mobile` |
| Form fields with text under 16 px | computed `font-size` of text inputs, `select`, `textarea` at viewports under 600 px. *iOS zooms the page on focus below 16 px* | below 16 px | error | S · kiekkist, vercel-wig | `input-font-size` |
| Zoom disabled in the viewport meta | `user-scalable=no` or `maximum-scale` below 2 in `meta[name=viewport]`. *WCAG 2.2, 1.4.4 Resize text* | present | error | S · wcag22, vercel-wig | `zoom-disabled` |
| No visible focus | keyboard walk (Tab, up to 40 steps at the widest viewport, 30 at the narrowest); for the first 15 targets outline, box-shadow, border, background, colour and underline are compared with the rest state. *WCAG 2.2, 2.4.7. Typical cause: `outline: none` without a `:focus-visible` replacement.* | focused style equals the rest style | error | S · wcag22, vercel-wig | `focus-visible` |
| No reduced-motion handling | elements with CSS animations or transitions ≥ 200 ms; the page is re-measured with `prefers-reduced-motion: reduce` emulated. *WCAG 2.2, 2.3.3 (AAA); Vercel: honour prefers-reduced-motion* | motion present and no element changes under reduce | error | S · wcag22, vercel-wig, impeccable | `reduced-motion` |
| Third-party font CDN | attempted requests (the checker blocks them and records the host). *legal risk in the EU: IP address sent to a third party without consent (LG München I, 20.01.2022, 3 O 17493/20); see legal.md. Fontsource via jsDelivr counts too.* | any request to a listed host | error | S · legal-fonts | `font-cdn` |
| Third-party requests without need | attempted requests to other origins than the target (blocked and recorded), font hosts excluded (see font-cdn). *consent duty for analytics, embeds, maps (TTDSG/TDDDG § 25, DSGVO); the brief decides which are needed* | any host not passed with --allow-host | warn | S · legal-fonts | `third-party` |
| Placeholder text or images | visible text matched against the placeholder list (DE and EN, word boundaries, case-insensitive); image and background URLs against placeholder hosts. *Generic names (Acme, Max Mustermann) are invented proof as much as placeholders (§ 5 UWG when shipped).* | more than 0 | error | P · kiekkist, taste, impeccable | `placeholder` |
| Body line length too long | paragraphs, list items and quotes with at least 2 lines at the widest viewport: widest line divided by mean character width. *WCAG 2.2, 1.4.8 (AAA); 45 to 75 characters is the typographic canon* | above 80 characters; 76 to 80 only with line height ≥ 1.45 | error | S · wcag22, bringhurst | `line-length` |
| Content missing without JavaScript | second load with JavaScript disabled at the widest viewport; visible text length compared with the JavaScript run. *Also what crawlers, reader mode and AI agents see. Counters that start at 0 are counted separately (counter-zero-nojs).* | below 60 % of the text | error | P · kiekkist, wiki-t35 | `no-js-content` |
| More than one filled primary button per screen | buttons with an opaque fill that differs from the ground they sit on, grouped by screen-high bands, every viewport. *one primary action per screen; the second is secondary or a link* | more than 1 in one band | warn | P · impeccable, kiekkist | `multiple-primary` |
| More than one primary button colour | distinct fill colours of filled buttons on the page (sRGB distance > 30). *one CTA colour sitewide; the checker sees one page, so check the other templates too* | more than 1 | warn | P · kiekkist, impeccable | `cta-colours` |
| axe-core WCAG violations | axe-core at every viewport and with the mobile menu opened, rules tagged wcag2a/aa, wcag21a/aa, wcag22aa and best-practice (audio-caption and css-orientation-lock enabled), without the rules measured above; WCAG A/AA violations are errors whatever their impact (`axe-critical`, `axe-serious`, `axe-moderate`, `axe-minor`, weighted 1.34/1/0.67/0.34), best-practice ones warnings (`axe-best-practice`); each finding carries its success criterion | any WCAG A/AA violation (error); best-practice (warning) | error | S · wcag22, axe | `axe` |
| Text still invisible after scrolling | text at opacity 0 before scrolling that stays invisible after a full scroll | any | warn | P · kiekkist | `content-hidden` |
| Page could not be loaded or measured | navigation or measurement error at a viewport | any; a page measured at no viewport scores 0 | error | P · kiekkist | `load-failed` |
| Colours outside the palette | rendered colour weight farther than CIEDE2000 6 from every token (needs --tokens). *also catches raw near-black values that bypass the ink token* | more than 10 % of colour weight | warn | P · kiekkist | `token-drift-color` |
| Fonts outside the tokens | font families with at least 20 visible characters that are not in the tokens (needs --tokens) | any | warn | P · kiekkist | `token-drift-font` |
| No reflow at 320 px | extra viewport 320×640 (same context as the narrowest width): horizontal scrolling of the page, text cut at the viewport edge or newly clipped by its box; tables, pre/code, maps, figures with media and scroll containers are exempt; fixed/sticky bars covering more than half the height are a warning. *WCAG 2.2, 1.4.10 (AA); EN 301 549 9.1.4.10* | page wider than 320 px or text cut (error); sticky bars > 50 % of the height (warning) | error | S · wcag22 | `reflow-320` |
| Text breaks with WCAG text spacing | at the narrowest and widest viewport the WCAG test styles are injected (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em); only clipping, spill, ellipsis or line-clamp that was not there before counts. *WCAG 2.2, 1.4.12 (AA). Typical cause: fixed heights or nowrap on buttons, badges, nav items.* | any new clipping | error | S · wcag22 | `text-spacing` |
| Text-only zoom 200 % not supported | root font size set to 200 % at the widest viewport: text elements that do not grow (px sizes) and new clipping. *WCAG 2.2, 1.4.4 (AA), heuristic; real zoom is covered by reflow-320.* | fewer than half the text elements grow, or new clipping (heuristic) | warn | S · wcag22 | `text-resize-200` |
| Focused element hidden by sticky content | during the keyboard walk at the narrowest and widest viewport, 9 points inside each focused element are hit-tested; points covered by a fixed or sticky element count. *WCAG 2.2, 2.4.11 (AA), 2.4.12 (AAA). Fix with scroll-padding-top/bottom equal to the bar height.* | all 9 points covered (error, 2.4.11); some covered (warning, 2.4.12) | error | S · wcag22 | `focus-obscured` |
| Focus order jumps | keyboard walk: positive tabindex, or the next focus target lies more than one screen height above the previous one. *WCAG 2.2, 2.4.3 (A), heuristic* | any (heuristic) | warn | S · wcag22 | `focus-order` |
| Keyboard trap | keyboard walk: focus returns to an element already visited before the end of the page, and neither Shift+Tab (4 steps) nor Escape (for modal dialogs) leaves the cycle while focusable elements remain unreached; iframes holding focus for 15 steps are a warning (not inspectable). *WCAG 2.2, 2.1.2 (A)* | any trap | error | S · wcag22 | `keyboard-trap` |
| Clickable element not reachable by keyboard | an init script records click, pointer and touch listeners; elements with such a listener or an onclick attribute and cursor:pointer that are not focusable and contain no focusable element. *WCAG 2.2, 2.1.1 (A). Event delegation on a parent is not seen (partial check).* | any | error | S · wcag22 | `click-handler-not-focusable` |
| Form field or icon below 3:1 | border (each side ≥ 1 px), fill or shadow of inputs, selects, textareas and custom checkboxes against the effective background; fill or stroke of icons in icon-only links and buttons. *WCAG 2.2, 1.4.11 (AA)* | best boundary below 3:1 | error | S · wcag22 | `non-text-contrast` |
| Control disappears in forced-colours mode | screenshot of the top 2400 px at the widest viewport with and without forced-colors: active; a control or icon whose area has contrast normally and is flat in forced colours. *EN 301 549 V4.1.1 clause 9.7 (not yet harmonised). Use currentColor, real borders, SVG fill.* | any (heuristic, pixel comparison) | warn | S · en301549v4 | `forced-colors` |
| forced-color-adjust: none | computed forced-color-adjust on visible elements (inherited cases counted once). *EN 301 549 V4.1.1 clause 9.7* | any outside logos and colour swatches | warn | S · en301549v4 | `forced-color-adjust-scan` |
| Page language does not match the text | stopword count (German vs English) over the first 3,000 characters of main against <html lang>. *WCAG 2.2, 3.1.1 (A)* | declared de/en but the text is clearly the other language (≥ 30 words, 2× majority) | error | S · wcag22 | `lang-mismatch` |
| Passage in another language without lang | paragraphs, list items, headings, quotes and cells with ≥ 6 words whose stopwords point to the other language and no lang attribute on them or an ancestor. *WCAG 2.2, 3.1.2 (AA), heuristic, German and English only* | any (heuristic) | warn | S · wcag22 | `lang-parts` |
| Visible label not in the accessible name | links and buttons with aria-label or aria-labelledby: the visible text (normalised) must be contained in the name. *WCAG 2.2, 2.5.3 (A); best practice: the name starts with the visible text* | visible text not contained | error | S · wcag22 | `label-in-name` |
| Icon control named by title only, or icon read twice | icon-only links/buttons whose only name is the title attribute; svg with role="img" or <title> inside a labelled control without aria-hidden. *WCAG 2.2, 4.1.2 (A); title is not shown on touch and announced inconsistently* | any | warn | S · wcag22 | `icon-name` |
| Moving content without pause | running animations that are infinite or longer than 5 s on elements ≥ 2,500 px², autoplaying or playing video/audio with loop or longer than 5 s, marquee/blink; a button or link named pause/stop/anhalten/abspielen in the same section (or native controls) counts as control. *WCAG 2.2, 2.2.2 (A)* | any without control | error | S · wcag22 | `pause-control-missing` |
| Motion continues under reduced motion | after emulating prefers-reduced-motion: reduce, the same scan as pause-control-missing finds moving content. *WCAG 2.2, 2.3.3 (AAA); house standard in motion.md* | any | warn | S · wcag22 | `reduced-motion-ignored` |
| Audio plays automatically | video/audio with autoplay (or playing) that is not muted. *WCAG 2.2, 1.4.2 (A); axe no-autoplay-audio covers the timed case* | any | error | S · wcag22 | `autoplay-audio` |
| Personal-data field without autocomplete | name, id or label of text fields matched against personal-data tokens (name, e-mail, telefon, straße, plz, ort, firma …); missing, on or off autocomplete. *WCAG 2.2, 1.3.5 (AA); axe autocomplete-valid checks invalid tokens* | any (heuristic) | warn | S · wcag22 | `autocomplete-missing` |
| Paste blocked in login or code fields | a synthetic paste event on password, one-time-code and single-character fields is cancelled (error); autocomplete="off" on passwords and split code boxes without one-time-code (warnings). *WCAG 2.2, 3.3.8 (AA)* | paste cancelled | error | S · wcag22 | `auth-paste` |
| CAPTCHA found | scripts, iframes and markup of reCAPTCHA, hCaptcha, Turnstile, Friendly Captcha, MTCaptcha, slider puzzles; image/text/puzzle challenges are warnings, score-based ones info. *WCAG 2.2, 3.3.8 (AA): verify a non-cognitive alternative by hand* | image, text or puzzle challenge | warn | S · wcag22 | `captcha-detect` |
| Same information asked twice | fields named or labelled confirm/wiederholen/bestätigen next to e-mail (warning) or password (info, security exception). *WCAG 2.2, 3.3.7 (A), heuristic; multi-step flows stay manual* | e-mail confirmation field | warn | S · wcag22 | `redundant-entry` |
| Required fields or error messages unclear | required fields whose label gives no cue and no explanation of "*" in the form; forms with novalidate whose required fields have no aria-describedby/aria-errormessage and no live region. *WCAG 2.2, 3.3.1 (A), 3.3.2 (A); message quality stays manual* | any (heuristic) | warn | S · wcag22 | `form-errors` |
| Consent banner not usable by keyboard | known CMP roots or a fixed/dialog box about cookies; keyboard walk must reach it (error if never, warning after step 5); first layer needs reject next to accept at ≥ 70 % of its size (warnings, see privacy-eu.md). *Practice item; WCAG 2.1.1, 2.4.3, 2.4.11 applied to the banner* | not reachable by Tab | error | P · wcag22 | `consent-banner` |
| No accessibility information linked | link text or href matching Barrierefreiheit/Accessibility in the footer or the last quarter of the DOM; in site mode on every page. *BFSG § 14 + Anlage 3; BITV 2.0 § 7. Never read as conformance.* | missing (warning; error with profile bfsg/public or when shop or booking signals are found) | warn | S · bfsg | `statement-link` |
| Accessibility information incomplete | same-origin fetch of the linked page: date and contact always; MLBF with profile bfsg; feedback, Schlichtung, compliance status and a date within 13 months with profile public. *BFSG Anlage 3 lit. d; § 7 BITV 2.0* | any element missing | warn | S · bfsg | `statement-content` |
| Leichte Sprache or DGS missing (public bodies) | profile public only: links on the start page to Leichte Sprache and Deutsche Gebärdensprache. *§ 4 BITV 2.0* | either missing | error | S · bfsg | `public-sector-links` |
| Accessibility overlay widget | script hosts and toolbar markup of overlay widgets (accessiBe, UserWay, Eye-Able, EqualWeb, AudioEye and others). *Overlays do not make a site conform; fix the source* | any | warn | P · wcag22 | `overlay-detect` |
| Linked PDF not tagged | up to 5 same-origin PDFs (≤ 10 MB): MarkInfo Marked, structure tree, /Lang, /Title, DisplayDocTitle (Flate object streams are inflated); creation date reported for the pre-28.06.2025 exemption. *EN 301 549 clause 10; no PDF/UA verdict, use veraPDF or PAC* | any marker missing | warn | S · en301549v4 | `pdf-link-scan` |
| Navigation order differs between pages | site mode: relative order of the links shared by the first nav of each page. *WCAG 2.2, 3.2.3 (AA)* | order differs | error | S · wcag22 | `consistent-nav` |
| Help mechanisms in a different order | site mode: order of phone, e-mail, contact page, help/FAQ and chat in header and footer per page. *WCAG 2.2, 3.2.6 (A)* | order differs (error); missing on some pages (warning) | error | S · wcag22 | `consistent-help` |
| Same target, different name | site mode: links in nav, header and footer to the same path with different text. *WCAG 2.2, 3.2.4 (AA)* | any (heuristic) | warn | S · wcag22 | `consistent-id` |
| Duplicate or generic page titles | site mode: equal <title> on several pages or titles like Home/Startseite/index. *WCAG 2.2, 2.4.2 (A); axe document-title covers the missing title* | any | warn | S · wcag22 | `title-unique` |
| Only one way to find pages | site mode (≥ 3 pages): no search, no sitemap link. *WCAG 2.2, 2.4.5 (AA)* | none found (heuristic) | warn | S · wcag22 | `multiple-ways` |
| Dragging without a single-pointer alternative | carousels (Swiper, Splide, Embla, Flickity, Glide, Slick, Owl, Keen) without buttons; before/after sliders without range input or buttons; draggable elements without move buttons. *WCAG 2.2, 2.5.7 (AA)* | any (heuristic) | warn | S · wcag22 | `dragging` |
| Hover content not dismissible or not hoverable | up to two nav items with hidden submenus (or tooltip triggers) at the widest viewport: hover, move onto the content (must stay), press Escape (must close). *WCAG 2.2, 1.4.13 (AA)* | either fails | error | S · wcag22 | `hover-content` |
| Content locked to one orientation | viewport 844×390 after the 320 px pass: main hidden or a full-screen "please rotate" overlay; axe css-orientation-lock covers CSS rotation. *WCAG 2.2, 1.3.4 (AA)* | any | error | S · wcag22 | `orientation` |
| Invented proof | statistics, logos, reviews or awards without a source the client confirmed. *misleading commercial practice (UWG § 5; fake reviews are blacklisted)* | more than 0 | error | S · uwg | manual |
| Fonts without licence file | font files in `assets/fonts/` without matching licence | more than 0 | error | P · kiekkist | manual |

## Mobile evidence (report section `mobile`)

Measured at 390x844 and 360x780 and in a throttled lab load with Lighthouse's Moto G Power profile (412x823, DPR 1.75, 562.5 ms latency, 188,743 B/s down, 86,400 B/s up, CPU 4x). Only class S items may be errors. Lab numbers are first-party only: the check blocks third-party hosts. Column *Evidence* names the items in `knowledge/packs/evidence.json`.

| Check | How it is measured | Flags when | Severity | Class | Evidence | Checker |
| --- | --- | --- | --- | --- | --- | --- |
| Lab LCP on a throttled phone | lab run at 412x823, DPR 1.75, isMobile, CDP throttling latency 562.5 ms, 188,743 B/s down, 86,400 B/s up, CPU 4x; quiet = 1 s without requests and long tasks (max 15 s); median of the runs (1 by default, 3 with --perf); third-party hosts blocked; last largest-contentful-paint entry. *Core Web Vitals thresholds applied to a lab value; never reported as field data* | warn above 2.5 s, error above 4.0 s | error | S · web-vitals, lh-profile, evidence-pack | `cwv-lcp`, `lh-mobile-profile` | `lab-lcp` |
| Lab CLS on a throttled phone | lab run at 412x823, DPR 1.75, isMobile, CDP throttling latency 562.5 ms, 188,743 B/s down, 86,400 B/s up, CPU 4x; quiet = 1 s without requests and long tasks (max 15 s); median of the runs (1 by default, 3 with --perf); third-party hosts blocked; largest session window of layout shifts (gap < 1 s, window ≤ 5 s); a second value after scrolling is info (--perf). *Core Web Vitals thresholds applied to a lab value* | warn above 0.1, error above 0.25 | error | S · web-vitals, evidence-pack | `cwv-cls` | `lab-cls` |
| Lab Total Blocking Time on a throttled phone | lab run at 412x823, DPR 1.75, isMobile, CDP throttling latency 562.5 ms, 188,743 B/s down, 86,400 B/s up, CPU 4x; quiet = 1 s without requests and long tasks (max 15 s); median of the runs (1 by default, 3 with --perf); third-party hosts blocked; Σ max(0, duration − 50 ms) of long tasks between FCP and the quiet point. *Lighthouse mobile scoring bands* | warn above 200 ms, error above 600 ms | error | S · lighthouse, evidence-pack | `tbt-lab` | `lab-tbt` |
| Transfer weight of the first load | encodedDataLength of all first-party responses of the lab load (CDP), file and HTML targets via a gzip loopback server. *deliberately below the median: the median mobile page fails CWV (48 % pass); Lighthouse flags > 5,000 KiB (S); first-party only* | warn above 1,000 KB (H), stronger above 2,500 KB (Web Almanac median, D) | warn | D · web-almanac-2025, lighthouse, evidence-pack | `weight-median`, `weight-lh-flag`, `cwv-pass-mobile` | `transfer-total` |
| JavaScript transfer | encodedDataLength of Script responses of the lab load. *Russell 2023: 300-350 KiB JS is the ceiling for p75 devices; Web Almanac 2025 median 632 KB (D)* | warn above 150 KB (H), stronger above 350 KB | warn | P · russell-2023, web-almanac-2025, evidence-pack | `budget-russell`, `weight-median` | `transfer-js` |
| HTML, CSS and fonts on the critical path | encodedDataLength of Document, Stylesheet and Font responses of the lab load. *Russell 2023 budget* | warn above 150 KB, stronger above 250 KB | warn | P · russell-2023, evidence-pack | `budget-russell` | `transfer-critical` |
| Too many or too heavy font files | Font responses of the lab load: count and bytes. *Web Almanac 2025 median fonts 122 KB (D); font CDNs are already a hard failure (font-cdn)* | warn above 4 files or 150 KB, stronger above 6 files or 250 KB | warn | H · web-almanac-2025, kiekkist, evidence-pack | `fonts-usage`, `weight-median` | `font-files` |
| Font files not in WOFF2 or without font-display | font responses whose MIME type or file name is not WOFF2; @font-face rules (same-origin sheets) without font-display. *65 % of font requests are WOFF2; half of the pages use font-display: swap* | any | warn | D · web-almanac-2025, evidence-pack | `fonts-usage` | `font-format` |
| LCP image lazy-loaded | LCP element of the lab run is an img with loading="lazy". *web.dev guidance; 16-17 % of mobile pages do it (D)* | present | error | S · webdev-lcp-2024, web-almanac-2025, evidence-pack | `lcp-load-delay`, `lcp-lazy` | `lcp-image-lazy` |
| LCP image without fetchpriority | LCP img without fetchpriority="high" and without a matching link rel=preload as=image. *only 17.3 % of mobile pages set it (D)* | present | warn | S · webdev-lcp-2024, web-almanac-2025, evidence-pack | `lcp-lazy`, `lcp-load-delay` | `lcp-image-priority` |
| LCP image not in the initial HTML | LCP image is a CSS background, or neither its src/srcset nor its file name occurs in the raw HTML response. *median resource load delay on poor-LCP sites 1,290 ms* | present | warn | D · webdev-lcp-2024, evidence-pack | `lcp-load-delay` | `lcp-image-discoverable` |
| Heavy LCP image | encodedDataLength of the LCP image in the lab load. *download is under 10 % of LCP on most poor sites (D): discovery and TTFB first* | warn above 200 KB, stronger above 400 KB | warn | H · kiekkist, webdev-lcp-2024, evidence-pack | `lcp-load-delay` | `lcp-image-bytes` |
| Images larger than needed | visible img at 390 (after scrolling once): wasted ≈ bytes × (1 − (w×3 · h×3) / (naturalWidth · naturalHeight)); bytes from the lab load, Resource Timing or the file. *DPR 3 keeps it lenient: what is flagged is oversized even for the sharpest phones; images without width/height are counted by img-dimensions* | per image ≥ 4 KiB wasted; page total above 300 KB (H) | warn | S · lighthouse, evidence-pack | `img-oversized` | `img-oversized` |
| Layout shift when web fonts arrive | extra run (with --perf) with font responses delayed 1,500 ms: sum of layout shifts within 200 ms after a document.fonts loadingdone event. *share of the 0.1 CLS budget (S) is a house line; fix with size-adjust/ascent-override or font-display: optional* | warn above 0.02, stronger above 0.05 | warn | H · web-vitals, kiekkist, evidence-pack | `cwv-cls` | `font-swap-shift` |
| Horizontal scroller without cue or keyboard access | elements at 390 with overflow-x auto/scroll (or scroll-snap x) and scrollWidth > clientWidth: next item 15-85 % visible or arrows; tabindex or focusable content; phone link, form field, prices or navigation inside. *NN/g 2014; keyboard part WCAG 2.1.1 (axe scrollable-region-focusable reports it too); data tables in a scroll wrapper are skipped* | no peek and no arrows, no keyboard access, or essential content inside | warn | P · nngroup, wcag22, evidence-pack | `hscroll-missed` | `hscroll-container` |
| Content only reachable by hover | CSSOM: :hover rules that reveal (display, visibility, opacity, height, clip-path) an element hidden at rest, with no :focus/:focus-within/:focus-visible twin, no click toggle (aria-expanded, details) and not scoped to @media (hover: hover). *WCAG 2.1.1 and 1.4.13; touch screens have no hover. Complements hover-content (dismissible/hoverable) from the accessibility pass* | error when the revealed content holds links or buttons; warn otherwise | error | S · wcag22, mq4, evidence-pack | `hover-content` | `hover-only` |
| Sticky chrome takes too much of the phone screen | at 390x844, scrolled to 40 % of the page: union of fixed/sticky bars (≥ 40 % wide) glued to the top or bottom edge; consent dialogs reported apart; hide-on-scroll-down noted. *NN/g 2021 content-to-chrome ratio; the percentages are house lines (H). Focus under sticky bars: focus-obscured* | top above 15 % (127 px), stronger above 25 % (211 px); top + bottom above 30 % | warn | P · nngroup, kiekkist, evidence-pack | `sticky-chrome` | `sticky-share` |
| No primary action in the first phone screen | at 390x844 and 360x780 without scrolling: a filled button, tel:/mailto: link or a link reading Kontakt/Anfrage/Termin/Angebot/anrufen fully inside the screen above any bottom bar. *NN/g 2018: 57 % of viewing time above the fold, 74 % in two screens (desktop; the mobile transfer is an assumption)* | none found | warn | M · nngroup, evidence-pack | `fold-57` | `cta-first-screen` |
| Primary action only at the screen edge | vertical centre of the primary actions at 390x844 as share of the screen height. *info only: centre and lower middle are tapped most accurately; the thumb-zone heat map is a myth* | all of them in the top 12 % or bottom 5 % | info | M · hoober-2017, evidence-pack | `touch-accuracy`, `thumb-zone-myth` | `cta-reach` |
| Too few or too many words in the first phone screen | words of visible text nodes intersecting the first 390x844 screen (no aria-hidden, no consent dialog). *house range; people read about 20 % of the words (M). Desktop text wall: first-screen-words* | below 8 or above 90 | info | H · kiekkist, nngroup, evidence-pack | `read-20pct` | `first-screen-words-mobile` |
| H1 not fully in the first phone screen | first visible h1 at 390x844 and 360x780: rect inside the screen above any bottom bar; line boxes via Range.getClientRects. *derived from fold-57; desktop line count: h1-lines* | not fully visible, or more than 4 lines | warn | H · kiekkist, evidence-pack | `fold-57` | `h1-first-screen` |
| Body text too small on the phone | median computed font-size of visible p, li, dd, td with at least 40 characters at 390. *browser default 16 px, Apple body 17 pt, Material 16 sp; Rello 2016 (M, desktop): comprehension improved up to 18 pt* | below 16 px, stronger below 14 px | warn | P · platform-guides, rello-2016, evidence-pack | `body-16`, `font-size-18` | `body-size-mobile` |
| Line length off on the phone | median characters per line at 390 of paragraphs with at least 120 characters: content width / average glyph width (canvas measureText in the computed font). *Dyson 2004 (contested); at 390 with 16 px gutters and 17 px type expect 38-45. Desktop: the hard line-length rule (above 80) already covers the widest viewport* | median below 30 or above 75 | warn | M · dyson-2004, bringhurst, evidence-pack | `line-length` | `line-length-mobile` |
| Large touch targets packed too tightly | targets ≥ 44x44 at 390 whose edges are closer than 8 px to another target. *info only: WCAG 2.5.8 (target-size) is the hard rule* | more than 0 pairs | info | S · platform-guides, evidence-pack | `target-material` | `target-spacing` |
| Horizontal overflow at 360 px | the 390 page resized to 360x780: documentElement.scrollWidth > clientWidth. *WCAG 2.2, 1.4.10; 360x780 is 4.5 % of German phone traffic* | above 1 px | error | S · wcag22, statcounter-de, evidence-pack | `de-viewports` | `overflow-360` |
| First-screen block sized with 100vh | elements in the first 390 screen at least 90 % of its height whose matched rules or inline style set height/min-height in vh without an svh/dvh/lvh value. *mobile address bar: use 100svh or 100dvh (web.md format traps)* | present | warn | P · vercel-wig, kiekkist | - | `vh-hero` |
| Phone number without tel: link | German phone pattern ((+49\|0049\|0) and 7-15 digits, not after IBAN/BIC/USt/Fax) in the page text and no a[href^="tel:"] on the page. *web.md format traps* | present | warn | P · kiekkist | - | `phone-not-tappable` |
| E-mail or phone field with a text keyboard | input type text/search whose name, id, label, placeholder or autocomplete says e-mail or phone (not both). *autocomplete tokens themselves: autocomplete-missing (WCAG 1.3.5)* | present | warn | P · kiekkist, wcag22 | `input-purpose` | `input-type` |

## Counted signals

### Typography and labels

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Reflex fonts (model defaults) (info) | used families against the `reflex-fonts` pack (display-only entries count only in headings); fonts passed as brand fonts are exempt. *brand fonts fixed by the client are exempt (--brand-font)* | more than 0 without a written reason | D · reflex-fonts | `reflex-font` |
| Font families in use | first family of every text node with at least 20 characters | more than 3 | P · kiekkist, wiki-rt12 | `font-families` |
| Three or more families inside one card | boxes with background, border or shadow; distinct families of the text inside | more than 0 cards | P · wiki-rt12 | `card-fonts` |
| Pill / caps eyebrow labels above headings | small uppercase, tracked or pill text directly above a heading | more than 2 per page | P · kiekkist, impeccable | `eyebrow` |
| Tracked all-caps labels | text with `text-transform: uppercase` and letter spacing ≥ 0.02 em | more than 4 per page | P · kiekkist, taste | `tracked-caps` |
| Single coloured/italic word in the H1 | a span of at most three words inside `h1` with different colour, style, family or gradient. *with a serif display face this is the editorial-lane reflex (Playfair with one italic word)* | more than 0 | P · kiekkist, wiki-rt12 | `highlight-word` |
| Gradient text (background-clip:text) | `background-clip: text` with a gradient | more than 0 | P · impeccable, kiekkist | `gradient-text` |
| Monospace micro labels on non-data | small monospace text (≤ 14.5 px, ≤ 40 characters) that is not data: no code, table, time, price, date, ID or mostly-digit text | more than 3 | P · kiekkist, taste | `mono-labels` |
| Long centred text | centred paragraphs with more than three lines | more than 1 | P · kiekkist | `long-centred` |
| Four-line H1 | line count of the first visible `h1` at the widest viewport | more than 3 lines | P · wiki-rt12, taste | `h1-lines` |
| Text wall before the first scroll | words of visible text inside the first viewport at the widest viewport | more than 200 | P · wiki-rt12, kiekkist | `first-screen-words` |
| Orphan word in a heading | `h1` and `h2` with at least four words and two lines whose last line holds one word, widest viewport. *fix with `text-wrap: balance` or a non-breaking space* | more than 0 | P · impeccable, vercel-wig, wiki-design-portal | `orphan-heading` |
| Skipped heading level | visible headings in document order; a level deeper than previous + 1. *WCAG 1.3.1 best practice (axe heading-order is moderate and therefore not in the axe pass)* | more than 0 | P · impeccable, vercel-wig | `heading-skip` |
| Justified text | `text-align: justify` on blocks with at least two lines. *rivers on the web without fine hyphenation; WCAG 1.4.8 (AAA) advises against* | more than 0 | P · impeccable | `justified-text` |
| Eyebrow repeating the heading | eyebrow text whose words reappear in the heading below | more than 0 | P · kiekkist | manual |
| Display serif with one italic word | Playfair Display (or a similar high-contrast serif) in `h1` with one italic word; partly covered by highlight-word | more than 0 without a written reason | D · bis, wiki-rt12, wiki-q37 | manual |
| More than one radius inside one card | distinct border radii inside one card | more than 1 | P · kiekkist, wiki-rt12 | manual |
| Inter or the platform UI face as the only family on a brand surface | font stack inspection; product register is exempt | more than 0 without a written reason | D · bis, impeccable | manual |

### Structure and components

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Three equal cards with icon on top | three equal-width siblings in a row, at least two with an icon above their heading | more than 0 | P · kiekkist, taste, impeccable | `three-cards` |
| Numbered markers 01 / 02 / 03 on non-sequences | standalone "01" to "09" markers outside `ol`, tables and times; markers that sit together in one component (a list of steps or a timeline, not page sections with their own h2) are a real sequence and are not counted | more than 2 | P · kiekkist, taste | `numbered-sections` |
| Big-number stat counters | short numeric text ≥ 28 px or count-up markup | more than 2 (any without a confirmed source is invented proof) | P · kiekkist, wiki-design-portal | `stat-counters` |
| Counters showing 0 without JavaScript | second load with JavaScript disabled: count-up markup or large numbers reading "0", "0+", "0 %". *own check in the maintainer's notes (friendventure.de showed "0 Standorte, 0+ Spezialist:innen" without JS); crawlers and screenshot tools see the zeros* | more than 0 | P · wiki-t35 | `counter-zero-nojs` |
| Same border-radius on most boxes | share of boxes (background, border or shadow; pills excluded) using the most frequent radius | above 80 % with at least 6 boxes | P · kiekkist | `uniform-radius` |
| One soft shadow on every raised box | share of shadowed boxes using the most frequent shadow value | above 90 % with at least 6 shadowed boxes | P · kiekkist | `uniform-shadow` |
| Large soft shadows | outer shadows with blur ≥ 16 px, or offset ≥ 8 px with blur ≥ 10 px. *RT1 counter: 1 px lines and slight surface changes instead of shadows* | more than 3 | P · kiekkist, wiki-rt12 | `big-shadow` |
| Nested cards | a rounded box with background, border or shadow (≥ 120 × 60 px) inside another such box. *impeccable bans them outright; Kiekkist counts (double-bezel may be one direction’s signature with a reason)* | more than 1 | P · impeccable | `nested-cards` |
| Accent-stripe cards | groups of at least two siblings with a coloured left, right or top border ≥ 2 px that differs from their other borders. *single callouts (a quote, a fact box) are not counted* | more than 1 group | P · impeccable, wiki-rt12, wiki-q37 | `side-stripe` |
| Centred hero with two buttons | centred `h1` with at least two buttons below it in the same block | more than 0 | P · kiekkist, taste | `centred-hero` |
| Logo wall | a row of at least five image-only children | more than 0 without permission and reason | P · kiekkist | `logo-wall` |
| Testimonial carousel | slider markup or a horizontally scrolling container with quotes | more than 0 | P · kiekkist | `testimonial-carousel` |
| A caption under every image | pages with at least three content images, all inside `figure` with `figcaption`. *a caption that names place and work is a good detail; on every image without content it is a reflex* | match | P · wiki-rt12 | `captions-everywhere` |
| Emoji in headings | pictographic characters in headings | more than 0 | P · kiekkist, taste | `emoji-heading` |
| Icon tiles | an icon inside a rounded, tinted square | more than 3 per page | P · kiekkist | manual |
| Template section rhythm | hero, three cards, alternating image and text, logo strip, CTA band, footer, in this order (`fingerprint.sections` in the report) | full match | P · kiekkist | manual |
| SaaS sequence on a non-SaaS brief | hero → social proof → features → testimonials → pricing → FAQ | full match on a non-SaaS brief | P · kiekkist, wiki-rt12 | manual |
| Pill badges | small rounded labels on cards ("New", "Popular") | more than 2 per page | P · kiekkist | manual |
| Device mockups, countdowns | phone or laptop frames, timers | more than 0 without a written reason | P · kiekkist | manual |
| Decorative terminal windows | fake terminal or code windows with traffic-light dots that show no real product | more than 0 | P · wiki-q37 | manual |
| No real demo, only placeholder interfaces | product screens that are generated or mocked instead of the real product. *Q37 calls this the most important tell* | more than 0 | P · wiki-q37 | manual |
| Content hidden in accordions | body text that only appears after a click, outside FAQ | more than 1 group | P · kiekkist | manual |
| Legends instead of direct labels | charts with a separate legend box | more than 0 | M · mayer | manual |
| Long scroll without content | many sections that each say one generic thing; template 2024 SaaS layout | by judgement | P · wiki-rt12 | manual |
| Numbers sprinkled everywhere | figures in headings, cards and buttons that the brief did not supply. *related to stat-counters, but broader* | more than 0 unsourced | P · wiki-design-portal | manual |

### General quality

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| JavaScript errors on load | uncaught exceptions and `console.error` during load and scroll (failed requests the checker blocked are ignored) | more than 0 | P · impeccable | `js-errors` |
| Autoplaying media without controls | `video` or `audio` with `autoplay` and without `controls`. *WCAG 2.2, 2.2.2: motion longer than 5 s needs pause, stop or hide* | more than 0 | S · wcag22, vercel-wig | `autoplay-no-controls` |
| Video in the first screen without poster | `video` starting inside the first viewport without `poster`. *blank box until the video loads; no still for reduced motion* | more than 0 | P · vercel-wig | `hero-video-no-poster` |
| Images without width and height | `img` without `width`/`height` attributes and without CSS `aspect-ratio`. *layout shift (CLS)* | more than 0 | P · vercel-wig | `img-dimensions` |

### Colour and surface

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Gradients on large surfaces | gradient backgrounds covering ≥ 15 % of the viewport or ≥ half its width and 200 px high | more than 1 | P · kiekkist, taste | `gradient-surface` |
| Purple-to-blue gradient | gradient stops with a violet hue (270 to 335) next to blue or pink | more than 0 | D · frontend-design, kiekkist | `purple-gradient` |
| Radial halo or glow | `radial-gradient` backgrounds (pseudo-elements included) that fade to transparent. *radial orbs, spotlight backgrounds* | more than 0 | P · impeccable, wiki-q37 | `radial-glow` |
| Dot-grid background | repeated radial-gradient background with a tile ≤ 40 px | more than 0 | P · wiki-q37 | `dot-grid` |
| Rainbow colours | one gradient with at least four chromatic stops spanning more than 180° of hue | more than 0 | P · wiki-q37 | `rainbow-gradient` |
| Glass / backdrop-filter | `backdrop-filter` on visible elements | more than 1 | P · kiekkist, impeccable | `glass` |
| Cream + serif + terracotta cluster (parts present) | very light warm ground, serif display, orange-red accent (OKLCH ranges). *also the look of curated inspiration collections (large serif, cream, floating cards, orbs: Q09 comment)* | all three parts | D · bis, kiekkist, wiki-q37 | `cream-serif-terracotta` |
| Single acid/vermilion accent on near-black | ground lightness under 0.22 with one high-chroma lime or vermilion accent | match | P · kiekkist | `acid-on-black` |
| Purple or violet on black | ground lightness under 0.22 with a violet accent (hue 270 to 330, chroma ≥ 0.1) | match | P · wiki-q37 | `purple-on-black` |
| Gold accent | button, link or heading accent with hue 70 to 95, chroma ≥ 0.08, lightness 0.6 to 0.85. *with navy it is the law/finance sector default* | match without a written reason | P · wiki-rt12, bis | `gold-accent` |
| Pure black body text | paragraph text colour #000 on a light ground | more than 0 | P · kiekkist, impeccable | `pure-black-text` |
| Navy and gold for law, finance, property, insurance | tokens and industry | match without a written reason | D · bis | manual |
| Indigo or violet primary for a tech brief | tokens and industry | match without a written reason | D · bis, frontend-design | manual |
| Purple or teal on cream with gold; orange on off-white | tokens | match without a written reason | D · bis | manual |
| Warm colours on SaaS structure | tomato, mustard and light blue on cream with bento tiles: still SaaS | by judgement | P · wiki-ig-2909 | manual |
| AI infographic look | dark blue gradient, heavy grotesque, giant periwinkle number, source in monospace | match | P · wiki-f1 | manual |

### Motion

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Scroll-reveal / opacity-0 start states | reveal class names and data attributes, and text invisible at rest that appears on scroll | more than 3 | P · kiekkist, impeccable | `scroll-reveal` |
| Pulsing dot | element ≤ 16 px with an infinite animation | more than 0 | P · impeccable | `pulsing-dot` |
| Bounce or elastic easing | `cubic-bezier` timing with y outside 0 to 1 on transitions and animations. *taste shared by most sources, not a standard* | more than 0 | T · impeccable | `bounce-easing` |
| transition: all | computed `transition-property: all` with a duration | more than 0 | P · vercel-wig, impeccable | `transition-all` |
| Custom cursor | `cursor: none` or `cursor: url(...)` | more than 0 | P · kiekkist, wiki-rt12 | `custom-cursor` |
| Hover lift on every card | transforms on hover on repeated elements | more than 1 group | P · kiekkist, wiki-q37 | manual |
| Hover animation on everything, animated arrows | transitions on every interactive element; arrows that slide on hover. *not an argument against hover and focus states (WCAG/BFSG)* | by judgement (states themselves are required) | P · wiki-q37, wiki-rt12 | manual |
| Cursor followers | elements or backgrounds bound to pointer position | more than 0 | P · kiekkist, wiki-rt12 | manual |
| Slider, intro sequence, preloader, scroll hijacking | carousels in the first screen, splash screens, `wheel` handlers that take over scrolling | more than 0 | P · kiekkist | manual |

### Copy

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Em dashes in running text | count of the em dash "—" in visible running text (headings, nav, code excluded); the spaced German en dash "–" is the normal Gedankenstrich and is not counted. *house rules may set 0* | more than 2 per page, or more than 1 per 250 words | P · impeccable, kiekkist | `dashes` |
| Arrow "→" on buttons/links | arrow characters at the start or end of link and button text | more than 30 % of buttons (at least 2) | P · kiekkist, wiki-q37 | `arrow-buttons` |
| Middle-dot meta strings | text elements with two or more " · " separators | more than 2 | P · kiekkist | `middle-dot` |
| Filler vocabulary (EN) | visible text against the list | more than 1 | P · kiekkist, impeccable | `filler-en` |
| Filler vocabulary (DE) | visible text against the list | more than 1 | P · kiekkist | `filler-de` |
| "It's not X, it's Y" pattern | EN "it's not …, it's …" / "this isn't …, it's …"; DE "Es ist nicht …, es ist …" / "Das ist kein …, das ist …". *plain "nicht nur …, sondern auch" is normal German and not counted* | more than 0 | P · wiki-q37, wiki-monuntal | `not-x-but-y` |
| Three dots instead of the ellipsis | "..." in visible text | more than 0 | P · vercel-wig | `ellipsis-dots` |
| Hedging copy | "could", "might", "potentially" stacked in claims (DE: "könnte", "eventuell", "in vielen Fällen") | more than 2 per page | P · kiekkist | manual |
| Emoji as icons | emoji characters used as list or feature icons (partly caught by three-cards) | more than 0 | P · kiekkist, taste | manual |
| Confident opener + short emphasis sentence | a strong claim followed by a two-to-four-word sentence, repeated | more than 1 | P · wiki-monuntal | manual |

### Imagery

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Default icon library as decoration | SVG or icon-font class names of Lucide, Feather, Heroicons, Tabler, Phosphor, Material, Font Awesome. *product register: one coherent library is expected; Q37 names Lucide as tell number one* | more than 0 on brand surfaces without a written reason | P · wiki-q37, kiekkist | `icon-library` |
| Sparkle icon for "AI" | "✨" or a sparkles icon class | more than 0 | P · wiki-q37 | `sparkle-icon` |
| Generated photos of people or places presented as real | provenance check of every photo; glossy people "who never had a bad day", wrong hands. *legal risk; AI Act Art. 50 for photorealistic output* | more than 0 | M · nielseniq, frontiers-2026, wiki-rt12 | manual |
| Stock clichés | handshake, team pointing at a laptop, headset smile, lightbulb, puzzle pieces | more than 0 without a written reason | P · kiekkist | manual |
| Stock illustration sets | unDraw, Humaaans, Open Peeps | more than 0 on brand surfaces without a written reason | P · kiekkist | manual |
| Generated image used as asset | an image-to-site or generated mockup shipped as a page image | more than 0 (generated images are references only) | P · kiekkist | manual |

### Memory

| Signal | How to count | Flag when | Class | Checker |
| --- | --- | --- | --- | --- |
| Repeats a recent structure | same topology and type pair as any of the last three entries in `.kiekkist/log.json` or Kiekkist themes (kk_compare) | match | H · kiekkist | manual |
| Repeats a rejected mechanism | mechanism named under "Rejects" in the profile | match without the brief demanding it | H · kiekkist | manual |

### Measured frequencies (class D)

From the Taste study (248 gallery sites, 05.10.2026, scored by models, not by people). They show what is common on stronger or weaker gallery sites; they say nothing about effect on customers. Two of them point the other way, so those signals are counted only in their non-data or non-sequence use.

| Signal | Finding |
| --- | --- |
| Tracked all-caps labels | tiny uppercase labels on 57 % of weak vs 16 % of top sites (Taste study) |
| Monospace micro labels on non-data | monospace labels are MORE common on top sites (44 % vs 24 %, Taste study); only the non-data use is counted |
| Four-line H1 | 70 % of headlines fit in two lines (Taste study) |
| Three equal cards with icon on top | icon-topped feature cards on 28 % of weak vs 1 % of top sites (Taste study) |
| Numbered markers 01 / 02 / 03 on non-sequences | index numbering is MORE common on top sites (38 % vs 21 %, Taste study); only section numbering without a sequence is counted |
| Centred hero with two buttons | centred statement over media on 24 % of weak vs 7 % of top sites (Taste study) |
| Emoji in headings | emoji on 26 % of weak vs 10 % of top sites (Taste study) |
| Gradients on large surfaces | gradients on 52 % of weak vs 22 % of top sites (Taste study) |

## Process rules (not measured)

| Rule | What to do | Missed when | Class |
| --- | --- | --- | --- |
| DESIGN.md short and written by a human | keep DESIGN.md and house rules short; a human writes or edits them; do not let the model generate the rule file. *ETH study (arXiv 2602.11988, verified in part): model-written context files lowered agent success by 0.5 to 2 %, human-written ones raised it by about 4 %, at about 20 % more cost. Measured on coding agents, not on design.* | model-generated context file | M · eth-2602.11988, wiki-101 |
| Critic sees only screenshots, in a fresh session | the critique sub-agent gets brief, decision, screenshots and check report, never the build conversation or the original prompt | critic saw the build context | P · wiki-txt11, wiki-rt12 |
| Deliberate deletion pass | one round that only removes: sections without a claim, decoration, repeated proof, filler copy. *"AI adds, it rarely removes"* | no deletion round before delivery | P · wiki-txt11 |
| Pass/fail acceptance before delivery | review the AI diff like a pull request from a stranger; hard failures block delivery | delivered without a recorded gate | P · wiki-q37 |
| Still right after the third prompt | check spacing, states (error, empty, edit) and mobile after iterations, not only the first screen | only the first screen reviewed | P · wiki-txt11 |
| Let the model ask first | briefing questions before building; otherwise gaps are filled with "good enough" | built without a confirmed brief | P · wiki-rt12 |

### Sources

- `kiekkist`: Kiekkist house thresholds (tells.md, reviewed 29.10.2026) (AGPL-3.0)
- `wcag22`: W3C Web Content Accessibility Guidelines 2.2, https://www.w3.org/TR/WCAG22/ (W3C)
- `legal-fonts`: LG München I, 20.01.2022, 3 O 17493/20 (Google Fonts); TDDDG § 25; see legal.md
- `uwg`: UWG § 5 and Annex (misleading commercial practices, fake reviews)
- `bringhurst`: Robert Bringhurst, The Elements of Typographic Style
- `mayer`: Mayer & Fiorella, multimedia principles (meta-analyses; spatial contiguity d ≈ 1.10)
- `nielseniq`: NielsenIQ 2024 press release on AI-generated ads (no published effect sizes)
- `frontiers-2026`: Frontiers 2026, "AI-generated" label and product evaluation (n = 200)
- `impeccable`: Impeccable detector catalogue (rule names; own implementations), https://impeccable.style/slop (Apache-2.0)
- `taste`: Taste Skill research.md: 248 sites (One Page Love, Awwwards), 05.10.2026, scored by models, https://github.com/Leonxlnx/taste-skill (MIT)
- `vercel-wig`: Vercel Web Interface Guidelines, command.md, fetched 30.10.2026, https://github.com/vercel-labs/web-interface-guidelines (MIT)
- `frontend-design`: Anthropic frontend-design skill, https://github.com/anthropics/skills (see repo)
- `bis`: brand-identity-skill, references/ai-defaults.md (30-brief experiment), https://github.com/fatihaydost/brand-identity-skill (MIT)
- `reflex-fonts`: Kiekkist knowledge pack reflex-fonts (MIT)
- `wiki-rt12`: Maintainer's research notes, sources 19.10.2026, Reddit RT1–RT13 (RT12 r/webdesign "how to spot AI sites"; RT1; RT11)
- `wiki-q37`: Maintainer's research notes, sources 23.10.2026, Q06–Q49 (Q37 @nataindata "how I can see your design was vibe-coded"; Q09 comment danithedan; Q12)
- `wiki-t35`: Maintainer's research notes, sources 19.10.2026, Threads/LinkedIn T1–T36 (T35 friendventure.de counters without JS, own HTML check; T36)
- `wiki-txt11`: Maintainer's research notes, sources 20.10.2026, TXT1–TXT12 (TXT11 Lenny’s: separate critic, deletion round, third prompt)
- `wiki-f1`: Maintainer's research notes, source review 16.09.2026 (F1 infographic look)
- `wiki-monuntal`: Maintainer's research notes, Instagram archive 04.10.2026, no. 19 (monuntal, AI sentence rhythm)
- `wiki-ig-2909`: Maintainer's research notes, Instagram 29.09.2026, no. 10 (warm colours on SaaS structure)
- `wiki-101`: Maintainer's research notes, sources 15.–17.10.2026 part 2, no. 101 (Niklas, ETH paper)
- `wiki-design-portal`: Maintainer's design portal test runs (research sweep B1 no. 4 and 20; not public)
- `eth-2602.11988`: ETH Zürich, arXiv 2602.11988, context files for coding agents (checked in part), https://arxiv.org/abs/2602.11988
- `en301549v4`: ETSI EN 301 549 V4.1.1 (2026), Accessibility requirements for ICT products and services, https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf (ETSI)
- `bfsg`: Barrierefreiheitsstärkungsgesetz (BFSG) § 14 and Anlage 3; BITV 2.0 § 4 and § 7, https://www.gesetze-im-internet.de/bfsg/
- `axe`: axe-core 4.14 rule set (Deque), tags wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa/best-practice, https://github.com/dequelabs/axe-core (MPL-2.0)
- `evidence-pack`: Kiekkist knowledge pack evidence (knowledge/packs/evidence.json); item ids in each item's evidence_items (MIT)
- `web-vitals`: web.dev, Web Vitals (thresholds LCP/CLS/INP, 2024), https://web.dev/articles/vitals
- `lighthouse`: Lighthouse docs: Total Blocking Time, Properly size images, Avoid enormous network payloads (2025), https://developer.chrome.com/docs/lighthouse/performance/
- `lh-profile`: Lighthouse / DevTools source: mobile emulation (moto g power 2022) and throttling constants, https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/trace/lantern/simulation/Constants.ts
- `webdev-lcp-2024`: web.dev, Common misconceptions about how to optimize LCP (Kenny, 2024), https://web.dev/blog/common-misconceptions-lcp
- `web-almanac-2025`: HTTP Archive Web Almanac 2025 (Page Weight, Performance, Fonts, Accessibility), https://almanac.httparchive.org/en/2025/
- `russell-2023`: Alex Russell, The Performance Inequality Gap (2023 edition), https://infrequently.org/series/performance-inequality
- `nngroup`: NN/g: Beware Horizontal Scrolling (2014), Scrolling and Attention (2018), Sticky Headers (2021), How Little Do Users Read? (2008), https://www.nngroup.com/articles/
- `hoober-2017`: Steven Hoober, Design for Fingers, Touch, and People, Part 3, UXmatters 2017, https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php
- `rello-2016`: Rello, Pielot, Marcos, Make It Big! Font size and line spacing on online readability, CHI 2016, https://doi.org/10.1145/2858036.2858204
- `dyson-2004`: Dyson, How physical text layout affects reading from screen, Behaviour & IT 23(6), 2004, https://doi.org/10.1080/01449290410001715714
- `platform-guides`: Apple Human Interface Guidelines (body 17 pt) and Material Design 3 (16 sp body, 8 dp target spacing), https://m3.material.io/foundations/designing/structure
- `mq4`: W3C Media Queries Level 4 (hover, any-hover), https://www.w3.org/TR/mediaqueries-4/ (W3C)
- `statcounter-de`: StatCounter, mobile screen resolution Germany (360x780 in the top six), https://gs.statcounter.com/screen-resolution-stats/mobile/germany
<!-- tells:end -->

## House rules: when counts become errors

Some clients (and some agencies for their own site) ban signals outright. Then the client's house rules turn the named counted signals into hard failures for that project. Write them into the brief's "House rules" block (see `house-rules.md`). Pass them to the check as tokens-adjacent config or check them by hand; the default thresholds above apply only where no house rule exists.

## How to use the counts

1. Fix every hard failure.
2. For every flagged signal, either remove it or write one line in the check notes: which brief fact earns it. "The client's sign has had this navy and gold since 1962" is a reason. "Feels premium" is not; that is how the stereotype works.
3. A page with zero flags is not automatically good. It may just be empty. That is what the critique is for.

## Maintenance

Defaults move. A list like this ages within months. Change the pack (`knowledge/packs/tells.json`, bump its version), then run `node scripts/gen-tells-md.mjs` to regenerate the tables here, the reflex table in `typography.md` and the checker's built-in fallback; `npm test` fails while they are out of date. Date every change, keep removed entries in a short "retired" list with the reason, and prefer measured entries (class D or M) over opinions when adding new ones. Process items come from the wiki sweep of 30.10.2026; they are working rules for the agent, not checker rules.

Last reviewed: 30.10.2026.
