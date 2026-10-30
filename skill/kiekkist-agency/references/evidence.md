# Evidence

What is actually known about mobile use, speed, reading, first impressions, trust, forms and persuasion, and what is folklore. Use this file when a rule needs a reason, when a client asks "why", and before you write a number into a pitch. The machine-readable twin is `knowledge/packs/evidence.json` (pack `evidence`, 91 items); item ids are given in brackets.

Reviewed 30 Oct 2026. Every number carries source, year and evidence class.

## Evidence classes

| Class | Meaning | How to use it |
|---|---|---|
| **S** | Standard, norm or law (WCAG, Google's CWV definitions, BGB, UCPD) | Binding. Not up for taste. |
| **M** | Measured effect on people in a published study | Name the study and its limits (sample, year, device). |
| **D** | Measured telemetry or defaults: crawls, analytics panels, field data | Describes what is, not what works. |
| **P** | Practitioner consensus (NN/g guidelines, qualitative tests, several independent guides) | Good default; say "experience shows", not "studies prove". |
| **H** | Our hypothesis or house threshold | A prompt to look. Never sell it as fact. |
| **V** | Vendor claim or vendor-published case study (Google case studies, tool vendors, agencies) | Direction at best. Name the vendor and its interest. |

Replication status in the pack: `replicated`, `single-study`, `contested`, `myth`.

## 1. Mobile reality

### Traffic share

| Fact | Number | Source, year, class |
|---|---|---|
| Phones' share of page views in Germany | **59.85 %** mobile, 38.31 % desktop, 1.84 % tablet (Sept 2026) | StatCounter 2026, D [de-mobile-share] |
| Android share of mobile, Germany | **72 %** Android, 28 % iOS | StatCounter 2026, D [de-android-share] |
| Smartphone users 16+ | **82 %** (about 56 m), 155 min/day | Bitkom 2025, n=1,004, M [de-smartphone-users] |
| Typical B2B site, mobile sessions | **28-31 %** (B2C 57-62 %) | Siege Media 2026, 120 brands, V [sector-b2b-mobile] |
| By industry, mobile sessions | home services 62-65 %, finance/property 66-76 %, health and beauty 72 %, SaaS 24-28 % | Siege Media 2026, V [sector-mobile-by-industry] |
| E-commerce | about 70 % of traffic mobile; desktop converts much better (3.4 %) | Contentsquare 2026, V [ecom-mobile-share] |

There is **no public per-sector split for Germany** (Destatis and Bitkom report usage, not traffic share by sector). What the data supports: local services, craft, health and real estate are mobile-majority; procurement-heavy B2B, software and engineering are desktop-majority, but their first contact (a search on the way, a link from a colleague) still happens on a phone. Rule: **design the phone version first for local and consumer clients; for B2B design both with equal care and check the client's analytics before arguing either way.**

### Devices and viewports (2026)

- Top mobile resolutions in Germany, Sept 2026: 414×896 (13 %), 384×832 (11 %), 393×873 (10 %), 390×844 (6 %), 360×780 (4 %), 412×915 (4 %) (StatCounter 2026, D) [de-viewports]. **360 px is still in the top six**: a layout must hold at 360, not only at 390.
- Phones are getting older: average age 24 months, 47 % of users keep theirs more than two years (Bitkom 2025, M) [de-device-age]. With 72 % Android, the realistic test device is a two-year-old mid-range Android, not the designer's iPhone.
- Lighthouse's mobile profile emulates a Moto G Power: 412×823 at DPR 1.75 (Lighthouse source, S) [lh-mobile-profile].

### Network

- Average download speeds in Germany: Telekom 69, Vodafone 56, O2 47 Mbps; 5G available 15-22 % of the time (Opensignal, Jul-Sep 2025, D) [de-network].
- Averages hide basements, trains and rural cells. Small pages are bound by **latency**, not bandwidth. Lab tests use Lighthouse "slow 4G": 150 ms RTT, 1.6 Mbps down, 750 kbps up, CPU 4x slower, intended to approximate a p75 4G connection (Lighthouse, S) [lh-mobile-profile].

### Hands and thumbs

- In 1,333 public observations, people touching a phone used one hand 49 %, cradled 36 %, two hands 15 %; about 75 % of touches were thumbs (Hoober 2013, M, single study, US, public places only) [hold-one-hand].
- Touch accuracy: about **7 mm at the centre, 12 mm in the corners**; people prefer to tap the centre (Hoober 2017 summarising Henze et al. 2011 and lab studies, M) [touch-accuracy].
- Error rate climbs sharply below 15 mm and exceeds 40 % under 8 mm; 10 mm buttons reach 98-99 % accuracy (Henze 2011, Lee and Zhai, via Hoober 2017, M) [touch-error-small].
- **Myth:** precise "thumb zone" heat maps that push everything to the bottom. Grips change constantly; Hoober himself called some of his reach diagrams misleading (P, myth) [thumb-zone-myth]. Rule: primary action in the centre or lower-middle band, secondary actions at the edges, generous targets at edges and corners.

### Target sizes

| Standard | Minimum | Class |
|---|---|---|
| WCAG 2.2 SC 2.5.8 (AA) | 24×24 CSS px, or spacing so 24 px circles do not overlap | S [target-wcag-min] |
| WCAG 2.2 SC 2.5.5 (AAA) | 44×44 CSS px | S |
| Apple HIG | 44×44 pt | S [target-apple] |
| Material Design | 48×48 dp, 8 dp between targets | S [target-material] |

House rule: 24 px is the legal floor, **44 px for primary touch actions**, 48 px for icon-only buttons.

### What changes from desktop

- Reflow: content must work at 320 CSS px without two-dimensional scrolling (WCAG 2.2 SC 1.4.10, S) [reflow-320].
- 19 % of mobile sites still block zoom (Web Almanac 2025, D) [zoom-disabled]. Never set `user-scalable=no` or `maximum-scale<5`.
- Hover does not exist on touch. Content shown only on hover is unreachable (WCAG 2.2 SC 1.4.13 for the hover content itself, S) [hover-content].
- Reading on phones is not worse for comprehension: 276 participants, no practical difference; hard texts read about 30 ms/word slower (NN/g 2016, M) [mobile-comprehension]. Long text is fine on mobile if it is structured; it is the chrome, not the text, that hurts.

## 2. Performance

### Thresholds (S)

| Metric | Good | Poor | Measured |
|---|---|---|---|
| LCP | ≤ 2.5 s | > 4.0 s | p75 of real visits, mobile and desktop separately [cwv-lcp] |
| INP | ≤ 200 ms | > 500 ms | p75 [cwv-inp] |
| CLS | ≤ 0.1 | > 0.25 | p75 [cwv-cls] |
| TBT (lab only) | ≤ 200 ms | > 600 ms | Lighthouse mobile [tbt-lab] |

Sources: web.dev "Web Vitals" (updated 2024), Lighthouse docs (S).

### Where the web stands (D)

- **48 %** of websites pass all three CWV on mobile, 56 % on desktop; good LCP 62 % mobile vs 74 % desktop (Web Almanac 2025, CrUX July 2025) [cwv-pass-mobile]. CrUX 202509: 53.7 % of origins good overall.
- LCP element is an image on **76 %** of mobile pages [lcp-is-image]; 16-17 % of mobile pages lazy-load that image; only 17.3 % give it `fetchpriority="high"` [lcp-lazy] (Web Almanac 2025, D).
- Median mobile home page: **2,559 KB** (images 911, JS 632, fonts 122, CSS 77, HTML 22); p90 page 8.3 MB (Web Almanac 2025, D) [weight-median].
- Good TTFB (< 0.8 s) on only 44 % of mobile sites (Web Almanac 2025, D) [ttfb-good].
- Fonts: 88 % of pages use web fonts; 65 % of font requests are WOFF2; half use `font-display: swap`; median font file mid-to-upper 30s KB (Web Almanac 2025, D) [fonts-usage].

### Budgets for a two-year-old mid-range Android

These are **house budgets (H)** built from the numbers above; they are deliberately below the median because the median page fails CWV on mobile.

| Budget (brochure / SME site, home page, compressed transfer) | Warn | Fail | Basis |
|---|---|---|---|
| Total transfer, first load | > 1,000 KB | > 2,500 KB (median) | Web Almanac 2025 median (D); Lighthouse flags > 5,000 KiB (S) [weight-lh-flag] |
| JavaScript | > 150 KB | > 350 KB | Russell 2023: 300-350 KiB JS is the ceiling for p75 devices (P) [budget-russell] |
| HTML + CSS + fonts on critical path | > 150 KB | > 250 KB | Russell 2023 (P) |
| Font files | > 4 files or > 150 KB | > 6 files or > 250 KB | median fonts 122 KB (D); house |
| LCP image | > 200 KB | > 400 KB | house; download is rarely the bottleneck, see below |

### LCP image rules (S/D)

From Google's CrUX analysis of poor-LCP sites: median p75 TTFB 2,270 ms, **resource load delay 1,290 ms**, image download 350 ms, render delay 360 ms. Most poor-LCP sites spend under 10 % of LCP downloading the image (web.dev 2024, D) [lcp-load-delay]. So:

1. The hero image is a plain `<img>` (or `<picture>`) in the HTML, discoverable by the preload scanner. No CSS background, no JS-injected slider.
2. `fetchpriority="high"`, never `loading="lazy"` on it.
3. `width`/`height` or `aspect-ratio` set (CLS).
4. `srcset` + `sizes`; served size ≤ rendered size × DPR; Lighthouse flags ≥ 4 KiB savings (S) [img-oversized].
5. AVIF/WebP with fallback; still compress, but fix discovery and TTFB first.
6. Static HTML or SSR; client-side rendering adds render delay.

### Speed and money: what you may say

- Vodafone A/B test: LCP 31 % faster (8.3 s to 5.7 s), **8 % more sales** (web.dev 2021, V: real A/B test, but published by Google, slow baseline) [speed-vodafone].
- Deloitte "Milliseconds make millions": 0.1 s faster associated with +8.4 % retail conversions (V, observational, commissioned by Google, no confidence intervals) [speed-deloitte]. Say "associated with", never "causes".
- **"53 % leave if a page takes more than 3 s"**: 2016 DoubleClick ad-network claim without published method (V, myth) [speed-53pct]. Do not use.

## 3. Reading and scanning

- 57 % of viewing time above the fold, **74 % in the first two screens**, 81 % in three (NN/g 2018, 120 users, desktop 1920×1080, M) [fold-57]. The fold is neither dead nor absolute: people scroll when the top promises something, and attention decays steadily. Not measured on phones; assume the decay is at least as steep.
- 80 % of fixations on the left half (NN/g 2017, desktop, M) [left-80].
- People read about **20 %** of the words on a page, at most 28 % (Weinreich et al. 2008, 25 users, 45,237 page views, M, single study) [read-20pct].
- Scanning patterns: the **layer-cake** pattern (headings first, then the section that matters) is the most efficient; the F-pattern is a failure mode of unstructured text (NN/g eyetracking 2006-2019, M) [scan-layercake]. Design for layer-cake: subheadings that state the point, short sections, bold key terms, descriptive link text.
- Font size: readability and comprehension improved up to 18 pt; 10-14 pt worse (Rello et al. CHI 2016, n=104, desktop, M, single study) [font-size-18]. Body at least 16 px; 17-19 px for reading pages (P) [body-16].
- Line length: faster reading with long lines (up to about 100 cpl) but better preference and often comprehension at 45-75 cpl (Dyson 2004 review, M, contested) [line-length]. On a 390 px phone with 16 px gutters and 17 px type you get 38-45 characters; below about 30 cpl German compounds break badly.
- Hidden navigation (hamburger) reduces discoverability; on mobile the cost is smaller and site-dependent (NN/g 2016, 179 users, M) [hamburger-hidden]. Label the icon ("Menü"), and surface the two to four key destinations in the page itself.
- Carousels: 1.07 % of Notre Dame home-page visits clicked a slide, 89 % of those on slide 1 (Runyon 2013, M, single study) [carousel-clicks]. Anything after slide 1 is effectively invisible.
- Horizontal scrollers are often missed; partially visible next items and persistent controls help (NN/g 2014, P) [hscroll-missed].
- Sticky headers: keep them minimal, maximise content-to-chrome ratio, prefer partially persistent headers on mobile (NN/g 2021, P) [sticky-chrome]. A focused element must not be fully hidden behind them (WCAG 2.2 SC 2.4.11, S) [focus-obscured].
- Auto-moving content longer than 5 s needs pause/stop (WCAG 2.2 SC 2.2.2, S) [autoplay-pause].

## 4. First impressions and aesthetics

- **50 ms**: visual-appeal ratings after 50 ms correlated highly with ratings after longer viewing (Lindgaard et al. 2006, three small lab studies, M) [first-50ms]. It measured liking of screenshots, nothing else. **"Users decide in 50 ms whether to stay"** is an overreach (myth) [first-50ms-overreach].
- Low visual complexity and high **prototypicality** (looks like its category) won beauty ratings at 17-50 ms exposure (Tuch et al. 2012, M) [complexity-proto]. Consequence for distinctive design: be different in voice, type, image and detail; keep structure recognisable (navigation where expected, contact findable, offer legible).
- Preferences for colourfulness and complexity differ by age, education and country (Reinecke et al. 2013; Reinecke and Gajos 2014, about 40,000 online participants, M) [colorfulness-demo]. There is no universal "beautiful"; there is a target group.
- "Design look" was the most mentioned credibility cue (46.1 % of comments, n=2,684; Fogg et al. 2002, M) [fogg-design-look].

## 5. Trust and credibility for SME and B2B services

- Four factors, stable since 1999: design quality; **upfront disclosure** (contact, prices, fees, process); comprehensive and current content; connection to the rest of the web (reviews, press, profiles) (NN/g 2016, P) [trust-4-factors].
- Users ignore generic stock people and look at photos of **real employees** and decision-relevant product photos (NN/g eyetracking 2010, M) [real-photos]. Photos also make adjacent claims feel truer (Newman et al. 2012, replicated lab effect, M) [truthiness-photo]: use that power only for true claims.
- Third-party reviews beat on-site testimonials (NN/g 2016, P) [third-party-reviews]. Retail data: five reviews vs none, about 270 % higher purchase likelihood; ratings 4.0-4.7 convert better than a perfect 5.0 (Spiegel Research Center with review vendor PowerReviews 2017, V) [reviews-5].
- B2B buyers check price early to build a shortlist; if exact prices are impossible, show **sample prices for typical scenarios** (NN/g 2006, P) [b2b-prices].
- Legal floor in Germany: say whether and how you check reviews; fake or bought reviews are banned (UWG § 5b(3), S) [dp-reviews-law].

Practical checklist for a Handwerk/Mittelstand page: name and face of the owner, Meisterbrief or certification with number, real project photos with place and year, phone number tappable in the first screen, a price range or sample price, Google rating linked to the profile, imprint one tap away, no stock people.

## 6. Forms and conversion

- Average cart abandonment **70.22 %** (50 studies). Excluding browsers: extra costs 40 %, distrust with card data 19 %, forced account 18 %, too long/complicated 17 % (Baymard 2025, M) [cart-abandon].
- Average US checkout: 23.48 elements (14.88 fields); **7-8 fields** suffice in Baymard's tests (M) [checkout-fields]. For a lead form: name, contact (one of phone or e-mail), message, optional date or postcode. Every extra field needs a reason.
- 75 % of 150+ large e-commerce sites have "mediocre" mobile UX; 93 % lack adaptive error messages (Baymard 2026, M) [mobile-ux-mediocre].
- Inline validation: +22 % success, -22 % errors, -42 % time in one test (Wroblewski/Etre 2009, M, single study) [inline-validation]. Validate on blur, not per keystroke.
- WCAG 2.2: `autocomplete` tokens for personal data (SC 1.3.5) [input-purpose]; no redundant entry, no paste blocking or puzzles at login (SC 3.3.7, 3.3.8) [redundant-entry] (S). On mobile add `type="email"`, `type="tel"`, `inputmode="numeric"` for the right keyboard; inputs ≥ 16 px.
- **Three-click rule**: 44 users, 620 tasks: click count did not predict success or satisfaction (Porter/UIE 2003, M, myth) [three-click].
- **Hick's law** predicts choice time only for practised users with familiar, ordered options; novices scan linearly (Cockburn et al. CHI 2007, M, contested as a design rule) [hick-limits]. It does not prove that fewer menu items convert better.

## 7. Persuasion: evidence vs myth

| Lever | Status | What the evidence says | Use |
|---|---|---|---|
| Anchoring (numeric) | **replicated** | Among the strongest effects in Many Labs 1 (Klein et al. 2014, 36 samples) [anchoring] | Show packages side by side; honest reference prices only |
| Anchoring of willingness to pay with arbitrary anchors | **contested** | Much weaker in replication (Maniadis et al. 2014) [anchoring-wtp] | Do not promise uplift |
| Decoy / attraction effect | **contested** | Largely vanished with realistic product displays (Frederick et al. 2014); appears when dominance is obvious (Huber et al. 2014) [decoy] | No "decoy tier" promises on pricing pages |
| Choice overload ("jam study") | **contested** | Meta-analytic mean effect ≈ 0 across 50 studies (Scheibehenne et al. 2010); moderators exist [choice-overload] | Reduce options for clarity, not because of "overload" |
| Scarcity | **replicated, small** | d ≈ 0.28; demand cues ("most booked") beat supply cues ("3 left") (Ladeira et al. 2023 meta, 335 effects) [scarcity-meta] | Only when true; fake scarcity is illegal |
| Defaults | **contested in size** | d ≈ 0.68 (Jachimowicz 2019) but nudges shrink towards zero after publication-bias correction (Maier 2022) [defaults] | Sensible defaults for convenience; never pre-ticked consent or add-ons |
| Descriptive norms ("most guests…") | **contested** | Hotel-towel effect did not replicate in German hotels (Bohner and Schlüter 2014) [hotel-towel] | Prefer concrete proof (numbers of projects, named clients) |
| Left-digit pricing | **replicated (perception)** | 22 m used-car sales drop at 10,000-mile thresholds (Lacetera et al. 2012) [left-digit] | Fine in retail; for services and quotes uplift unmeasured |
| Button colour | **myth** | "Red beats green +21 %" is one 2011 vendor test (HubSpot) [button-color] | Contrast and hierarchy of the one primary action |
| Reviews / ratings | **single study (V)** | +270 % with 5 reviews (Spiegel/PowerReviews 2017) [reviews-5] | Show real third-party reviews with link |

Also myths: the **8-second attention span** (no traceable study; Microsoft Canada 2015 cited a secondary website) [attention-8s]; "53 % leave after 3 s" [speed-53pct]; "users decide in 50 ms" [first-50ms-overreach]; the three-click rule [three-click]; "design for the F-pattern" (it is a failure mode) [scan-layercake]; "Hick's law says fewer options convert better" [hick-limits]; "the fold is dead" and "everything must be above the fold" (both wrong, see [fold-57]); "7±2 items in a menu" (Miller's span concerns memory, not menus you can see).

## 8. Dark patterns to avoid (law and evidence)

Evidence that they work, and why regulators act:
- Mild dark patterns more than doubled acceptance of a dubious offer, aggressive ones nearly quadrupled it; aggressive ones caused backlash (Luguri and Strahilevitz 2021, M) [dp-effect].
- Removing "reject" from the first consent layer raised consent by 22-23 points; only 11.8 % of 680 UK banners met minimal GDPR requirements (Nouwens et al. CHI 2020, M) [dp-consent].
- 148 of 399 EU shops (37 %) used manipulative practices: fake timers 42, hidden information 70, steering 54 (EU sweep 2023, M) [dp-eu-sweep]; 1,818 instances on about 11,000 shops, 22 vendors selling them as plug-ins (Mathur et al. 2019, M) [dp-mathur].

Law (S):
- **UCPD** blacklist (UWG in Germany) bans false "only for a very limited time" claims, fake reviews and more; Commission guidance 2021 applies it to dark patterns [dp-ucpd].
- **DSA Art. 25** bans deceptive interface design for online platforms (marketplaces, social networks), not for ordinary company sites [dp-dsa].
- **BGB § 312j** order button ("zahlungspflichtig bestellen"), **§ 312k** cancellation button for online subscriptions since 1 July 2022 [dp-de-buttons].
- **PAngV § 11**: strike-through prices must reference the lowest price of the previous 30 days [dp-pangv].
- Consent banners: GDPR/TDDDG; German authorities require a reject option equivalent to accept on the first layer. Best fix: no consent-requiring tools at all (see `legal.md`).
- **FTC** (US clients): fake urgency, drip pricing, sneak-into-basket, obstruction to cancel, disguised ads (FTC 2022) [dp-ftc].
- **Digital Fairness Act**: announced as a Q4 2026 proposal, not law yet (status July 2026) [dp-dfa].

Never ship: fake countdowns or stock counters, pre-ticked boxes, confirmshaming ("No, I don't want to save money"), hidden costs revealed late, cancel flows harder than sign-up, reject buttons styled as links, fake "X people are viewing" counters, reviews without provenance.

## 9. Mobile translation of desktop designs

Premium desktop layouts do not shrink; they transform. Classes: rules backed by S or M sources are marked; the rest is P (premium-theme benchmark in `premium.md`, NN/g guidance) or H.

| Desktop element | Mobile transformation | Basis |
|---|---|---|
| **Hero** (split or full-bleed, H1 + lead + CTA + image) | First screen at 390×844 shows: who, what, for whom (H1 ≤ 3 lines), one primary CTA and a phone link. Image goes below or is art-directed (`<picture>` with a mobile crop), never a centre crop of a landscape. Use `100svh`, not `100vh`. Hero image is the LCP: `fetchpriority="high"`, no lazy load. | fold-57 (M, desktop), lcp-load-delay (D), touch-accuracy (M), H for the 3-line limit |
| **Navigation** | 5+ items become a labelled menu button; 2-4 key destinations (Leistungen, Referenzen, Kontakt) also appear as links in the page; phone and contact always one tap away. | hamburger-hidden (M), trust-4-factors (P) |
| **Grids** (3-4 columns of cards) | One column. Reorder by importance, not DOM accident. Cards become rows with image left or no image if the image adds nothing. Avoid 2 tiny columns at 390 except for logos and thumbnails. | reflow-320 (S), P |
| **Horizontal scroll** (galleries, logo bands, testimonial sliders) | Allowed only for secondary content, with the next item visibly peeking (≥ 15 % visible), scroll-snap, and a keyboard-focusable region. Never for services, prices or contact. | hscroll-missed (P), carousel-clicks (M) |
| **Hover-only info** (image captions on hover, reveal cards, mega-menu previews) | Every hover reveal becomes visible by default or tap/focus-triggered. Guard hover polish with `@media (hover: hover)`. | hover-content (S) |
| **Sticky header / sticky CTA** | Header ≤ 15 % of viewport height at 390×844 (≤ 127 px; target ≤ 64 px), ideally partially persistent. A sticky bottom CTA bar is fine if ≥ 48 px high, does not cover form fields or the cookie dialog, and is hidden when the keyboard is open. `scroll-padding-top` for anchors and focus. | sticky-chrome (P), focus-obscured (S), H for 15 % |
| **Typography** | Body 16-18 px (never smaller than desktop body), line height 1.5-1.6, display sizes via `clamp()` with the minimum checked at 360 px; H1 at 390 roughly 32-44 px; German compounds need `hyphens: auto`. | body-16 (P), font-size-18 (M), line-length (M) |
| **Image art direction** | Separate crops for portrait viewports (`<picture media>`), subject in the central 60 %, faces not cut by the header; text never in images. Serve ≤ rendered width × DPR. | img-oversized (S), P |
| **Tables and comparisons** | Pricing tables become stacked cards with the plan name repeated; comparison tables keep a sticky first column or become per-item lists. | reflow-320 (S, tables exempt but usability is not), P |
| **Forms** | Single column, labels above fields, inputs ≥ 16 px and ≥ 44 px high, correct `type`/`inputmode`/`autocomplete`, primary button full width. | checkout-fields (M), input-purpose (S), body-16 (P) |
| **Motion and video** | Background video off or replaced by a poster on mobile and under `prefers-reduced-motion`; auto-rotation needs pause. | autoplay-pause (S), weight budgets (H) |
| **Footer** | Contact, opening hours, imprint, privacy in this order; tappable `tel:` and map link. | trust-4-factors (P) |

## 10. Claims you may make to clients

Safe, sourced, and worded honestly. Quote the source in the deck footnote.

1. "Six in ten page views in Germany come from phones; in local services it is usually more. In B2B it is often around a third, which is still the first contact for many buyers." (StatCounter 2026 D; Siege Media 2026 V)
2. "Seven in ten phones here run Android and the average phone is two years old, so we test on a mid-range Android, not only an iPhone." (StatCounter 2026 D; Bitkom 2025 M)
3. "Google calls a page fast when the main content appears within 2.5 seconds for three quarters of visits. Fewer than half of websites manage that on phones." (web.dev S; Web Almanac 2025 D)
4. "In a controlled test, Vodafone sold 8 % more after making the main content load about a third faster. That is one company's test, published by Google, but the direction is consistent." (V)
5. "People spend about three quarters of their attention in the first two screens, so the offer, the proof and the contact belong there." (NN/g 2018 M)
6. "Most visitors scan headings rather than reading; clear subheadings help them find what they need." (NN/g M)
7. "Visitors trust real photos of your team and work; generic stock photos are ignored." (NN/g 2010 M)
8. "Typical prices or price ranges help buyers put you on their shortlist." (NN/g P)
9. "Each extra form field costs completions; seven or eight fields are enough even for a full checkout." (Baymard 2025 M)
10. "Countdown timers, fake stock counters and pre-ticked boxes are illegal in the EU, and regulators found them on a third of shops in 2023." (UCPD S; EU sweep 2023 M)
11. "Buttons should be at least as large as a fingertip: 44 px is Apple's minimum; the accessibility law minimum is 24 px." (Apple HIG S; WCAG 2.2 S)

Do not say: "users decide in 50 ms", "attention span is 8 seconds", "53 % leave after 3 seconds", "red buttons convert better", "the third option makes the middle one sell" (decoy), "fewer choices always convert better", "the three-click rule", "every 0.1 s brings 8 % more revenue".

## Open gaps (2026)

- No public data on mobile share by sector for Germany. Get the client's own analytics before arguing.
- No published mobile eyetracking replication of the 2018 fold study.
- No independent study links layout or typography trends to SME conversion; most CRO "data" is vendor case studies.
- The checker's lab metrics approximate field data; they cannot replace CrUX or real-user measurement.
