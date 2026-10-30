# Motion, headers and interaction

How premium studio, consultancy and editorial sites build the first screen, the header and the things that move, measured on live sites, so an agent can build pages that feel considered rather than static or template-animated.

**Evidence base.** 25 sites loaded with Playwright (Chromium) on 30 Oct 2026, at 1440×900 and 390×844, with a slow wheel scroll recorded on video, first-screen and scrolled screenshots, plus a run with `prefers-reduced-motion: reduce` and one with JavaScript off. Values come from `getComputedStyle`, `document.getAnimations()`, the sites' CSS (same-origin rules plus fetched stylesheets) and Chrome DevTools event-listener inspection. Artefacts (probe JSON, screenshots, videos) are in `scratchpad/motion-research/<site>/`.

Sites measured: linear.app, wearecollins.com, pentagram.com, work.co, bergerfohr.com, edenspiekermann.com, instrument.com, bakkenbaeck.com, hellomonday.com, stripesessions.com (stripe.com/sessions redirects there), vercel.com, apple.com/macbook-pro and /airpods-pro, bcg.com, pudding.cool, studiodumbar.com, zeichenundwunder.de, koto.studio, deptagency.com, kms-team.com, raffinerie.com, bureauborsche.com, ressourcenmangel.de, vitsoe.com, locomotive.ca.
Not measurable from the sandbox: mckinsey.com, metadesign.com, enode.no, strichpunkt-design.de (proxy refused or timed out), nytimes.com (403), ig.ft.com (bot challenge), hort.org (domain parked). BCG loaded, but its cookie modal covered the first screen.

Conventions: **[measured]** is a value read from the live site. **[seen]** is something visible in screenshots or video. **[interpretation]** is my reading of why it works or a threshold I propose. Cubic-bezier names like "easeOutCubic" are the standard Penner equivalents of the measured values.

---

## 0. The headline findings

1. **Premium sites move less than templates do.** Work & Co (47 elements with transitions), Edenspiekermann (15), Berger & Föhr (32), Vitsœ (21), Pudding (0 keyframe animations) carry their premium through type, image and layout, and keep motion for state changes. I saw no count-up numbers on any of the 25 sites (screenshots and scroll videos; not a scripted check). Only Pentagram, Zeichen & Wunder, Hello Monday and Raffinerie hid many elements before scrolling [measured: opacity-0 elements below the fold before scroll; see table].
2. **UI state changes are fast: 100 to 320 ms.** The most common transition duration per site was 0.1 s (Linear, Raffinerie), 0.15 s (Vercel, Bakken & Bæck), 0.2 s (Bureau Borsche, Studio Dumbar, Locomotive), 0.25 s (Work & Co, Instrument, Pudding), 0.3 s (Pentagram, Berger & Föhr, Dept, KMS, Ressourcenmangel) or 0.32 s (Apple). Longer values of 0.45 to 1.2 s appear only on large one-off moves: header slide, hero entrance, page transition.
3. **The easing is almost always a decelerating curve**, either Material's `cubic-bezier(0.4, 0, 0.2, 1)` (Pentagram, Berger & Föhr, Bakken & Bæck, Vercel, Dept, Raffinerie) or an ease-out (`0.215,0.61,0.355,1`, `0.19,1,0.22,1`, `0.16,1,0.3,1`, `0.25,0.46,0.45,0.94`). Apple uses `cubic-bezier(0.4, 0, 0.6, 1)` on 261 elements. Plain `ease` dominates only on the plainer sites.
4. **Modern native CSS is already in production**: scroll-driven animations (`animation-timeline: view()` at Bakken & Bæck, Vercel and Dept, all wrapped in `@supports`), `@starting-style` entrances (Collins, Stripe Sessions, Dept, Vercel, Locomotive), `linear()` spring easings (Bakken & Bæck, Collins, Dept) and View Transitions (Collins, Dept, Linear, Locomotive).
5. **The failure modes are measurable.** Hidden-until-JS heroes (Linear, Pentagram, Hello Monday, Raffinerie, Berger & Föhr), preloaders that keep the first screen empty for seconds (Koto, Zeichen & Wunder, Instrument), scroll hijacking via non-passive wheel listeners plus Lenis (Studio Dumbar, Locomotive, Hello Monday, Raffinerie), and infinite animations that keep running under reduced motion (Linear, Stripe Sessions, Koto, Apple, Locomotive).

---

## 1. Header and hero patterns that read as premium

Each pattern below was observed on at least one live site.

### 1.1 Typographic statement hero (one sentence, measured scale)

- **What:** the first screen is one sentence of display type and almost nothing else: no image, no CTA pair, no badge row.
- **Seen on:** Collins ("Rewrite your worth.", serif 72 px / 400, letter-spacing −1.44 px, centred, award laurels below) [measured]; Work & Co ("We solve complex problems through design & technology", 56 px / 500, −1.12 px) [measured]; Bakken & Bæck (50/56 px, 500, −1 px, followed by a client logo row) [measured]; Dept ("THE GROWTH INVENTION COMPANY", 112 px / 900, one word in brand orange) [measured]; KMS Team ("CREATING DIGITAL RELATIONSHIPS", 200 px / weight 100) [measured]; Stripe Sessions (100 px / 250, line-height 85 px, letter-spacing −4 px) [measured]; Edenspiekermann (serif and sans mixed in one line: "Design strategy **that ships**") [seen].
- **Mechanism [interpretation]:** the claim is the design. Negative tracking on large sizes (about −1 to −4 % of the font size at all of the sites above), a single size step and generous empty space signal confidence. The scale is set to the sentence, not to a template.
- **Build:** `h1` with `font-size: clamp()`, `letter-spacing: -0.02em` from about 48 px up, `text-wrap: balance`, `max-width` in `ch`. Self-hosted variable font. A CSS-only entrance is optional (see 4.2).
- **Mobile:** all of them reflow to 3 or 4 lines at 390 px and keep the statement on the first screen (Collins, Dept, KMS, Stripe) [seen]. KMS switches from weight 100 to a heavy weight on mobile [seen in the 390 px screenshot].
- **Failure mode:** generic copy. "We craft digital experiences" at 112 px is slop at any size. The pattern only works with a specific claim.

### 1.2 Full-bleed work video as the hero (the work is the claim)

- **What:** the first screen is a muted looping case video. Its only text is a small caption naming the project.
- **Seen on:** Studio Dumbar (full-bleed video, project name bottom right, `autoplay muted loop playsinline`, no poster) [measured]; Locomotive (full-bleed Vimeo MP4, poster set, playback started by JS, h1 set bottom-left over the video) [measured]; Raffinerie (stacked full-bleed case panels with centred titles) [seen]; Edenspiekermann (video directly under the statement, 1425×900, `poster` set, Mux stream) [measured].
- **Mechanism:** shows rather than tells. The caption ties the motion to a real client.
- **Build:** `<video muted playsinline loop preload="metadata" poster="…jpg">` with `<source>` in WebM/MP4, self-hosted, about 6 to 12 s and under about 3 MB. Start it in JS only when `prefers-reduced-motion: no-preference` and the video is in view; otherwise leave it on the poster. Provide a visible pause button (WCAG 2.2.2 for motion longer than 5 s; Apple's galleries ship one, see 3.6).
- **Mobile:** Studio Dumbar and Locomotive keep the video full-bleed in portrait crops [seen]. Edenspiekermann's 390 px run has a `preload="none"` video with a poster [measured].
- **Failure mode:** no poster means a black or grey box until the video arrives (Studio Dumbar's and Raffinerie's JS-off screenshots show black or grey video areas) [seen]. Stock footage in this slot reads as template.

### 1.3 Statement plus index (navigation as content)

- **What:** under the hero sits a plain, ruled list of entry points such as Select Clients, Practice Areas, Outcomes, Process, Leadership, News, instead of service cards.
- **Seen on:** Work & Co ("Index" with large row links separated by hairlines, identical at 390 px) [seen]; Edenspiekermann (numbered service rows "01 Make strategy your edge" with a red circled numeral) [seen]; Vitsœ (four ruled "Why Vitsœ?" columns, no animation at all) [seen].
- **Mechanism [interpretation]:** reads like the contents page of a book or annual report. It is honest, scannable and needs no motion.
- **Build:** `<nav aria-label="Index"><ol>` with large links, `border-block-start: 1px solid`, a hover state that changes colour or offsets an arrow (150 to 250 ms).
- **Mobile:** same list, full width [seen at Work & Co].
- **Failure mode:** bolting icons and three-line blurbs onto every row turns it back into a card grid.

### 1.4 Interactive sentence (hero copy as a filter)

- **What:** the hero sentence contains controls: "We design [Brand Identity ▾] for [Entertainment ▾]". The words cycle in sync with a project carousel, and opening a control filters the work.
- **Seen on:** Pentagram [measured]. The words sit in a vertical strip moved by `transform: translate(0, -572px)` (GSAP 3.12.7 present). The full sentence is also in an `sr-only` span ("We design everything for everyone"), the visible words are `aria-hidden`, and the controls are real `<button aria-expanded>` elements.
- **Mechanism:** one element is at once claim, navigation and portfolio filter. The motion carries information (which discipline matches which project).
- **Build:** a static sentence with two `<button>` dropdowns that rewrite the text and filter a list. The word change is a `translateY` on an overflow-hidden line box of 300 to 400 ms with an ease-out. Without JS, show the sentence with its default words and the full project list.
- **Failure mode:** Pentagram's JS-off screenshot shows an empty hero and 271 of 562 text elements at opacity 0 [measured]. Do not copy that part.

### 1.5 Hero with a live or product element (split)

- **What:** headline on one side, a working (or near-working) piece of the product or data on the other.
- **Seen on:** Linear (headline over the actual app UI) [seen]; Vercel (headline, a noise-textured triangle canvas, and a scripted AI-chat demo further down) [seen]; Koto (live local time "05:22 UTC+1" in the header) [seen]; Hello Monday ("3 days until Monday" countdown badge) [seen].
- **Mechanism [interpretation]:** a live value proves that the site is real and current. A small live detail (clock, date, status) costs nothing and outperforms decorative motion.
- **Build:** server-render the real value and update it with a small script. Product UI should be HTML/SVG rather than a screenshot only if it is interactive. Otherwise use an AVIF screenshot with an explicit width and height.
- **Failure mode:** fake dashboards with invented numbers. The checker should flag hero numbers that have no source.

### 1.6 Founders and contact in the hero (studio as people)

- **What:** big wordmark, a photograph of the people in their studio, and address, email and phone directly on the first screen.
- **Seen on:** Berger & Föhr (wordmark "B&F", studio photo, an "art and design duo" paragraph, street address, phone) [seen].
- **Mechanism [interpretation]:** for a small consultancy, proximity and accountability are the premium signals. This fits a Handwerk or Mittelstand client better than any animation.
- **Build:** static. Image with `fetchpriority="high"` and no lazy loading. Contact as real `tel:` and `mailto:` links.
- **Failure mode:** B&F's own JS-off run shows the photo missing and 59 of 61 text elements at opacity 0 [measured]. Render it statically.

### 1.7 Hide-on-scroll-down, reveal-on-scroll-up header

- **What:** the header sits transparent at the top, slides away when the user scrolls down, and returns with a solid background on the first upward scroll.
- **Seen on:** Instrument (sticky 50 px, `translateY(-50px)` when scrolling down; on scroll up it returns with `background: #fff`; `transition: transform .2s ease-in-out, background-color .35s ease-in-out`) [measured]; Edenspiekermann (fixed, hidden going down, back with white background going up, `transform .75s ease-out`) [measured]; Bureau Borsche (fixed panel translated about −151 px when scrolled down) [measured]; Collins (fixed header with `transform .45s cubic-bezier(0.215,0.61,0.355,1)` prepared; it did not move in my test) [measured].
- **Mechanism:** content gets the full viewport while reading, and navigation is one gesture away.
- **Build:** `position: sticky; top: 0`, plus a 10-line script that compares `scrollY` against the last value in a passive scroll listener (threshold about 8 px, ignore the first 100 px) and toggles `data-hidden`. CSS does `transform: translateY(-100%)` over 200 to 300 ms with an ease-out on reveal. Never hide while focus is inside the header or a menu is open.
- **Mobile:** Instrument keeps the header sticky at 390 px (53 px, background turns dark when scrolled) [measured].
- **Failure mode:** 0.75 s (Edenspiekermann) feels sluggish next to a 0.2 s reveal [interpretation]. Keep it at 300 ms or less.

### 1.8 Header that turns solid or detaches into a floating bar

- **What:** a transparent header gains a background after the hero, or condenses into an inset rounded bar.
- **Seen on:** Ressourcenmangel (class `header--fixed` added on scroll, transparent to white; `background-color .15s, height .3s, padding .3s`) [measured]; Stripe Sessions (the nav becomes a floating pill inset 16 px from the edges with a frosted light background; `height .4s ease-in`) [measured and seen]; Linear (fixed 73 px, transparent with `backdrop-filter: blur(20px)` throughout; border and background transition 0.1 s) [measured]; Dept (fixed, 90 % white in OKLab with `backdrop-filter: blur(24px) brightness(1.05) saturate(1.25)`) [measured]; BCG (logo and search as separate floating rounded boxes) [seen].
- **Build:** a scroll-driven version needs no JS: `animation: header-solid linear both; animation-timeline: scroll(root); animation-range: 0 120px;` with a keyframe from transparent to the surface colour, inside `@supports (animation-timeline: scroll())` and `@media (prefers-reduced-motion: no-preference)`. Fallback: solid background from the start.
- **Failure mode:** blur plus transparency over busy video kills text contrast. Check contrast against the worst frame.

### 1.9 Two-tier header: global nav scrolls away, local nav sticks

- **What:** the site nav scrolls off, and a product or section nav (name, section links, primary action) sticks at `top: 0`.
- **Seen on:** Apple AirPods Pro (global nav 44 px scrolls away; local nav "AirPods Pro 3 · Overview · Hearing Health · Tech Specs · Compare · [Buy]" is `css-sticky`, 52 px, at top 0 after scrolling) [measured]. The same pattern appears on its mobile run [seen].
- **Use for:** long service or case pages ("Leistung · Ablauf · Preise · [Termin anfragen]").
- **Build:** `position: sticky; top: 0` on the second nav. No JS needed.

### 1.10 Wordmark-scale header that shrinks or crops

- **What:** the brand name set huge at the top, cropped by the viewport on scroll, with the small nav above or beside it.
- **Seen on:** Instrument (full-width "INSTRUMENT" wordmark under pill-shaped nav links; it fades in letter by letter after load) [seen in video]; Berger & Föhr ("B&F") [seen]; Ressourcenmangel ("RYSM" 150 px) [measured]; KMS (wordmark-sized h1) [measured].
- **Failure mode:** Instrument's first screen was blank white for about 3 s while the wordmark faded in [seen in the 1 fps frame grid]. A wordmark should be visible at first paint.

---

## 2. Motion budget: measured values

### 2.1 Per-site table (desktop, computed styles)

"Top durations" are the most frequent `transition-duration` values with their element counts. "Hidden→revealed" counts elements below the fold at opacity 0 before scrolling, and how many reached opacity 1 during the slow scroll. "RM" is the number of `prefers-reduced-motion` occurrences in the CSS. "Infinite" is the number of infinite Web Animations still running when reduced motion was requested.

| Site | Elements w/ transition | Top durations | Dominant easing | Libraries detected | Hidden→revealed | RM rules | Infinite under reduce |
|---|---|---|---|---|---|---|---|
| Linear | 411 | 0.1 s×267, 0.16 s×41, 0.7 s×30 | `0.25,0.46,0.45,0.94`; `0.32,0.72,0,1` (with 0.7 s) | none (Next.js) | 0/0 | 42 | 75 |
| Collins | 108 | 0.7 s×28, 0.25 s×15, 0.45 s×7 | `0.215,0.61,0.355,1`; `0.19,1,0.22,1` | none (Nuxt) | 9/0 | 0 | 0 |
| Pentagram | 296 (249 `all`) | 0.3 s×185, 0.4 s×66 | `0.4,0,0.2,1` | GSAP 3.12.7 | 81/10 | 4 | 0 |
| Work & Co | 47 | 0.25 s×21, 0.3 s×6 | `ease` | none | 0/0 | 0 | 0 |
| Berger & Föhr | 32 | 0.3 s×22, 1 s×6 | `0.4,0,0.2,1`; `0.54,0.15,0.15,1` | none | 4/3 | 0 | 0 |
| Edenspiekermann | 15 | 0.2 s×8, 0.3 s×4, 0.75 s×1 | `ease-in-out`, `0.15,0,0.25,1` | none (Next.js) | 0/0 | 2 | 0 |
| Instrument | 80 | 0.25 s×30, 0.3 s×14, 0.35 s×11 | `ease`, `ease-in-out` | none (Nuxt) | 2/2 | 5 | 0 |
| Bakken & Bæck | 131 | 0.3 s×56, 0.15 s×54, 0.22 s×20 | `0.4,0,0.2,1`; `linear()` spring | none | 15 (scroll-driven) | 4 | 0 |
| Hello Monday | 1 | 1 s×1 | `ease` | canvas | 1/0 (mobile 32/32) | 0 | 0 |
| Stripe Sessions | 267 | 0.8 s×95, 0.2 s×79, 0.5 s×59 | `0.19,1,0.22,1`; `0.45,0.02,0.09,0.98` | none (Next.js) | 0/0 | 30 | 1 |
| Vercel | 156 | 0.1 s×79, 0.15 s×50 | `0.4,0,0.2,1` | none (Next.js) | 0/0 | 56 | 0 |
| Apple AirPods Pro | 700 | 0.32 s×264, 0.24 s×154 | `0.4,0,0.6,1`; `ease` | none | 73/15 | 12 | 3 |
| BCG | 308 | 0.5 s×191, 0.35 s×74 | `0.64,2,0.67,1.53` (on `background`) | canvas | 0/0 | 0 | 0 |
| The Pudding | 102 | 0.25 s×93 | `ease` | none | 0/0 | 2 | 0 |
| Studio Dumbar | 27 | 0.2 s×20 | `linear` | GSAP + ScrollTrigger + Lenis | 0/0 | 0 | 0 |
| Zeichen & Wunder | 278 | 0.4 s, 0.2 s, 0.8 s×18 | `0.4,0,0.6,1` | Lenis | 78/9 | 2 | 0 |
| Koto | 270 | 0.167 s×177, 0.25 s, 0.333 s, 0.083 s | `linear`; `0.85,0,0.85,1`; `0.15,0,0.15,1` | none (Next.js) | 0/0 | 0 | 2 |
| Dept | 102 | 0.3 s×88, 0.45 s×8 | `0.4,0,0.2,1`; `linear()` | none | 11/1 | 102 | 0 |
| KMS Team | 118 | 0.3 s×68, 0.25 s×26 | `0.5,1,0.89,1` | none | 5/0 | 0 | 0 |
| Raffinerie | 116 | 0.1 s×50, 0.3 s×36, 1 s×22 | `0.4,0,0.2,1` | none | 0/0 | 0 | 0 |
| Bureau Borsche | 253 | 0.2 s×253 | `ease-in-out` | none | 0/0 | 0 | 0 |
| Ressourcenmangel | 127 | 0.3 s×82 | `ease` | none | 1/0 | 0 | 1 |
| Vitsœ | 21 | 0.2 s×6, 0.3 s×3 | `ease`, `ease-in` | none | 0/0 | 0 | 0 |
| Locomotive | 9 | 0.2 s×6 | `0.23,1,0.32,1`; `0.215,0.61,0.355,1` | Lenis + three.js | 2/0 | 10 | 2 |

Notes:
- Koto's durations of 0.083, 0.167 and 0.333 s are exactly 5, 10 and 20 frames at 60 fps [measured values; frame reading is interpretation]. The motion was timed like animation keys.
- BCG's `cubic-bezier(0.64, 2, 0.67, 1.53)` overshoots and is applied to `background` on 190 elements [measured]. Overshoot on a colour property has no physical meaning [interpretation]. Treat it as an anti-example.
- Pentagram (249) and Stripe Sessions (159) use `transition: all` [measured]. That is common but not a model: it animates layout properties whenever they change.

### 2.2 Duration bands to build with

Derived from the table; the bands themselves are my synthesis.

| Kind of change | Band | Observed examples |
|---|---|---|
| Colour or opacity on hover, nav link | 100 to 320 ms | Linear 0.1 s, Vercel 0.1 to 0.15 s, Bakken 0.3 s, Apple nav colour 0.32 s `0.4,0,0.6,1`, Stripe button 0.2 s |
| Underline or indicator | 200 ms | Edenspiekermann nav `::after` `scaleX(0→1)` 0.2 s ease-in-out |
| Image zoom on card hover | 200 to 300 ms, scale 1.05 to 1.1 | Pudding 1→1.05 in 0.25 s; Stripe 1→1.1 in 0.3 s `0.19,1,0.22,1`; Instrument and Edenspiekermann start at 1.05 and settle to 1 on hover (0.25 s / 0.2 s ease-out) |
| Header hide/reveal | 200 to 450 ms (one site at 750 ms) | Instrument 0.2 s; Collins 0.45 s; Edenspiekermann 0.75 s |
| Header background change | 150 to 350 ms | Ressourcenmangel 0.15 s; Instrument 0.35 s |
| Dialog or menu open | 300 ms | Stripe dialog backdrop 0.3 s `0.215,0.61,0.355,1`, entering from `translateY(96px)` |
| Hero entrance (once) | 0.7 to 1.2 s | Collins 0.7 s ease-out with `@starting-style` (translateY 8rem); laurels rotate in over 1.2 s; Stripe 0.8 s `0.19,1,0.22,1` |
| Page or shared-element transition | 0.45 to 0.62 s | Collins View Transitions 0.45 s `cubic-bezier(.5,.3,0,1)`; Dept gallery image VT 0.62 s `cubic-bezier(0.16,1,0.3,1)` |
| Stagger step | 20 to 150 ms | Apple captions 20 ms per item + 160 ms base; Apple staggered tiles `--staggered-delay: 0.15s` |
| Ambient loops | 2.8 to 50 s | Linear dot grid 2.8 s `steps(1)`; Stripe `colorWheel` 10 s; Vercel marquee 40 s; Bakken marquee 50 s |

### 2.3 Easings to use

All of these were measured on the sites named:

- **Standard UI** `cubic-bezier(0.4, 0, 0.2, 1)`: Pentagram, Berger & Föhr, Bakken & Bæck, Vercel, Dept, Raffinerie.
- **Apple UI** `cubic-bezier(0.4, 0, 0.6, 1)`: Apple (261 elements), Zeichen & Wunder (167).
- **Ease-out cubic** `cubic-bezier(0.215, 0.61, 0.355, 1)`: Collins header and entrances, Stripe dialogs, Locomotive.
- **Expo out, for large travel** `cubic-bezier(0.19, 1, 0.22, 1)`: Stripe Sessions (129 elements), Collins.
- **Quint-ish out, for shared elements** `cubic-bezier(0.16, 1, 0.3, 1)`: Dept view transitions, Bakken, Vercel tokens.
- **Quad out** `cubic-bezier(0.25, 0.46, 0.45, 0.94)`: Linear (267 elements).
- **Drawer, sheet** `cubic-bezier(0.32, 0.72, 0, 1)`: Linear (with 0.7 s).
- **Spring as `linear()`**, e.g. Bakken's `linear(0 0%, 0.44 8%, 0.58 17%, 0.68 25%, 0.755 34%, 0.81 42%, 0.86 50%, 0.89 59%, 0.95 67%, 0.98 84%, 1 100%)` at 0.22 s on 20 elements; Dept and Collins define `linear()` springs as custom properties.

Rule [interpretation, consistent with every site above]: entering or growing uses ease-out, leaving or hiding uses ease-in or the standard curve, and `linear` is only for scroll-linked progress, marquees and frame-stepped loops.

### 2.4 What moves and what never moves

Observed across the sample:
- **Moves:** hover and focus states (every site); the header's state (1.7, 1.8); case media (video loops, image zoom on hover); one entrance on the hero (Collins, Linear, Instrument); scroll-linked reveals on grid rows (Bakken, Vercel, Dept); page transitions (Collins, Dept).
- **Does not move on any measured site:** body copy paragraphs after they have appeared; prices and contact details; form fields (apart from focus); footers. No count-up numbers were seen. No site animated the logo continuously, apart from Bakken's logo, which moves only on hover and only with `prefers-reduced-motion: no-preference`.
- **Moving things per first screen [seen]:** usually 0 or 1, either the hero video (Studio Dumbar, Locomotive, Edenspiekermann) or an ambient graphic (Stripe ribbon, Linear figure dots further down). Logo marquees (Vercel 40 s, Bakken 50 s) are the second moving thing when present, and they are slow.

### 2.5 Scroll-driven vs time-based

- **Scroll-driven, native:** Bakken & Bæck fades rows with `view-timeline-name: --fade-in-row` and `animation-range: entry var(--fade-in-offset,0%) entry calc(var(--fade-in-offset,0%) + 60%)`, inside `@media (prefers-reduced-motion: no-preference) { @supports (animation-timeline: view()) { … } }` [measured]. Vercel uses `animation-timeline: view(); animation-range: entry cover 50%` at a container breakpoint [measured]. Dept drives a 3D carousel rotation with `animation-range: entry exit` in `@supports` [measured].
- **Scroll-driven, JS:** Studio Dumbar (GSAP ScrollTrigger + Lenis), Pentagram (GSAP).
- **Time-based:** everything on hover and click, and entrances on load (Collins `@starting-style`, Linear JS blur-in).

Rule [interpretation]: tie decoration to scroll position (reversible, user-paced) and tie state to time (hover, open, close). Never make essential content depend on a scroll position being reached.

---

## 3. Interaction patterns that carry content

### 3.1 Filterable work index

- **Seen on:** Instrument ("Recent work: All · Brand · Marketing · Product" chips above the grid) [seen]; Pentagram (sentence dropdowns, 1.4) [measured]; The Pudding (search field plus "Our faves · Popular · Updating · Your input · Video · Audio" filters, a `<select>` on mobile) [seen].
- **Build:** a `<fieldset>` of radio buttons styled as chips, or links with `?type=brand`, so it works without JS. Filtering toggles the `hidden` attribute. Wrap the swap in `document.startViewTransition` when available (Dept and Collins use View Transitions) and fall back to an instant swap.

### 3.2 Numbered service rows

- **Seen on:** Edenspiekermann ("01 Make strategy your edge" with a short paragraph and two case images per row) [seen]; Work & Co's Index (1.3).
- **Build:** an `<ol>` with `counter()` numerals. A row can expand with `<details>`/`<summary>` and `interpolate-size: allow-keywords` plus a `::details-content` transition (progressive; instant open where unsupported).

### 3.3 Media that plays only in view

- **Seen on:** Bakken & Bæck. The `<video>` elements have no `autoplay` attribute and a thumbnail `<img>` underneath. The two videos in view were playing and the ones 1123 px down were paused; after scrolling 400 px those started too [measured].
- **Build:** an IntersectionObserver with `threshold: 0.25` calls `play()` and `pause()`, only when `prefers-reduced-motion: no-preference`. The poster image is real `<img>` content.

### 3.4 Click-to-play with sound (not autoplay)

- **Seen on:** KMS Team (hero video with `autoplay=false`, `muted=false` and a large circular play button) [measured]; Zeichen & Wunder and Dept (visible mute toggle) [seen].
- **Rule:** sound only after a click. Never autoplay with sound (none of the sites did).

### 3.5 Interactive diagram as the services explanation

- **Seen on:** Zeichen & Wunder (overlapping circles "Brand Strategy" and "Brand Design" with a hatched intersection, as a Venn diagram of the offer) [seen].
- **Build:** inline SVG with `<a>` per region, `:hover`/`:focus-visible` highlighting the region (opacity or fill over 200 ms), and the same content as a list beneath for screen readers and mobile.

### 3.6 Gallery with progress and pause

- **Seen on:** Apple AirPods Pro (carousel with dot/progress indicator and a separate play/pause button, on desktop and at 390 px) [seen]; Pentagram (dot buttons with `aria-label="view slide N"`) [measured].
- **Rule:** any auto-advancing element needs a pause control (WCAG 2.2.2).

### 3.7 Live detail in chrome

- **Seen on:** Koto (local time and timezone in the header) [seen]; Hello Monday (days until Monday) [seen].
- **Build:** server-render the value and update it once a minute. Cheap and specific.

### 3.8 Hover that changes the image, not the layout

- **Seen on:** Stripe (image 1→1.1 inside an overflow-hidden frame, 0.3 s `0.19,1,0.22,1`); Pudding (1→1.05, 0.25 s); Instrument and Edenspiekermann (resting at 1.05, settling to 1 on hover); Vitsœ (opacity to 0.91 and nothing else); Bakken (link colour to 40 % alpha over 0.3 s) [all measured].
- **Rule:** transform or opacity on the media inside a fixed frame, and nothing that reflows the grid.

---

## 4. Implementation guidance

### 4.1 Default stack: native CSS, progressive

1. **Transitions** on `color`, `background-color`, `opacity`, `transform`, `translate`/`scale` only. Name the properties; avoid `transition: all`.
2. **Entrances with `@starting-style`**, CSS-only, so they work without JS (Collins does this for the hero title and laurels: `@starting-style { .head__title { opacity: 0; transform: translateY(8rem) } }`; Stripe for dialogs):
   ```css
   @media (prefers-reduced-motion: no-preference) {
     .hero h1 { transition: opacity .7s cubic-bezier(.215,.61,.355,1), translate .7s cubic-bezier(.215,.61,.355,1); }
     @starting-style { .hero h1 { opacity: 0; translate: 0 2rem; } }
   }
   ```
   Browsers without support show the text immediately, which is the correct fallback.
3. **Scroll-driven decoration**, copied in structure from Bakken & Bæck:
   ```css
   @media (prefers-reduced-motion: no-preference) {
     @supports (animation-timeline: view()) {
       .reveal { animation: fade-in linear both; animation-timeline: view(); animation-range: entry 0% entry 60%; }
     }
   }
   @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
   ```
   Content is visible by default. The animation only exists where it is supported and wanted.
4. **View Transitions** for filter swaps and page changes: `@view-transition { navigation: auto; }` for multi-page sites, `document.startViewTransition()` for in-page swaps. Durations 0.45 to 0.62 s, easing `cubic-bezier(.5,.3,0,1)` (Collins) or `cubic-bezier(0.16,1,0.3,1)` (Dept). Linear switches root view-transition animations off and disables `::view-transition-group(*)` under reduced motion [measured]. Do the same.
5. **Sticky** for headers and local nav: `position: sticky` (Instrument, Vercel, Apple).

### 4.2 When a library is justified

- **GSAP** (Pentagram, Studio Dumbar) is free including its plugins since Webflow's acquisition. Use it for sequenced timelines that CSS cannot express, such as the Pentagram sentence synced with a carousel, or SVG morphing. Download the file into the project (`/js/gsap.min.js`); never load it from a CDN. Wrap it in `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` branch.
- **Lenis / smooth scroll: avoid by default.** Studio Dumbar, Locomotive and Zeichen & Wunder use it. At Studio Dumbar, Locomotive, Hello Monday and Raffinerie I measured **non-passive `wheel` or `touchmove` listeners on `window`/`document`** [measured]. That is scroll hijacking: the browser has to wait for JS before it scrolls, input feels laggy on low-end machines, momentum differs from the OS, and keyboard, find-in-page and anchor jumps can break [interpretation, based on how non-passive listeners work]. Lenis is fine only for a showcase site whose content is the motion, and never for Handwerk or Mittelstand clients.
- **three.js / WebGL** (Locomotive, Stripe ribbon, Vercel canvas): only when the 3D object is the subject, with a static image fallback (Stripe's JS-off run shows a plain grey box in its place [seen]).

### 4.3 Reduced motion

- Put every non-essential animation inside `@media (prefers-reduced-motion: no-preference)` (Bakken's pattern) rather than trying to undo it afterwards.
- Stop infinite loops under reduce. Linear (75), Apple (3), Koto (2), Locomotive (2) and Stripe (1) still had infinite animations running with `reducedMotion: 'reduce'` [measured].
- Apple adds an `html.reduced-motion` class for its JS-driven staggered fades [measured]. That is a reasonable pattern when JS owns the motion.
- Videos: under reduce, show the poster and do not call `play()`.

### 4.4 Never hide content behind JS

Measured with JavaScript off (desktop, 1440×900):
- Linear: hero lines carry inline `style="opacity:0; filter:blur(10px); transform:translateY(20%)"`, so the first screen is blank without JS. Even with JS, my headless run took several seconds after DOMContentLoaded before the lines blurred in [measured, video frames].
- Pentagram: 271 of 562 text elements at opacity 0; empty hero.
- Hello Monday: `body.innerText` length 0 and all 121 text elements at opacity 0.
- Berger & Föhr: 59 of 61 at opacity 0. Raffinerie: 54 of 61. Zeichen & Wunder: 95 of 134.
- Positive examples: Apple (0 of 567 hidden, 30 524 characters of text), BCG (0 of 372), The Pudding (0 of 237), Edenspiekermann (0 of 36), Vitsœ (0 of 103).

Rule: the initial state in HTML/CSS is the final, visible state. JS may only add the "from" state just before animating (or use `@starting-style`, which has no JS dependency).

### 4.5 Performance

- Animate `transform`/`translate`/`scale`/`opacity` only. Of the header transitions above, Ressourcenmangel animates `height` and `padding`, and Stripe animates `height` [measured]; that triggers layout on every frame [interpretation]. Prefer `scale` or `translate` on an inner element.
- `will-change`: sparingly. Dept has 65 declarations and Hello Monday 28 [measured]. Add it in JS just before a large move and remove it afterwards.
- `filter: blur()` entrances (Linear) and `backdrop-filter` (Linear 20 px, Dept 24 px) are GPU-expensive. Use them on one element at a time.
- INP: no work in non-passive scroll or wheel handlers. Use `{ passive: true }` and `requestAnimationFrame`, or better, CSS scroll timelines.
- Preloaders cost the first screen: Koto showed a black screen for more than 12 s of the recording, Zeichen & Wunder an empty screen with a single dot, and Instrument a white screen for about 3 s [seen in the 1 fps frame grids; sandbox network was slower than a real user's].

---

## 5. Motion slop list (template or AI tells)

Each item has a threshold an automated check can apply. Thresholds are my proposals [interpretation], calibrated so that the premium sites above pass and the failure cases fail.

| Tell | Why it reads as slop | Threshold |
|---|---|---|
| Everything fades up on scroll | Uniform `fade-up` on every block is the default of template kits. Premium sites reveal rows of work at most (Bakken, Vercel). | > 6 elements per page with a scroll entrance animation, or > 40 % of `section` elements, fails |
| Hero text hidden until JS | Blank first screen without JS or on slow devices (Linear, Pentagram, Hello Monday) | any `h1` or first-screen text with effective opacity < 0.05 in a JS-off render fails |
| Preloader or intro | Delays the claim | first contentful text later than 1.5 s after DOMContentLoaded, or a full-viewport overlay at t = 1 s, fails |
| Counters counting up | Not seen on any of the 25 sites | any number that animates from 0 fails |
| Parallax on every image | Not observed as a pattern on the sample | > 2 elements with scroll-linked `translate` other than the hero fails |
| Slow UI transitions | UI feels heavy; the sample uses 100 to 320 ms | hover, focus or toggle transitions > 400 ms fail; > 600 ms on any UI state change fails hard |
| Bouncy or overshoot easing on UI | BCG's `0.64,2,0.67,1.53` on `background` | any cubic-bezier y-value > 1.1 or < −0.1 on `color`/`background`/`border` fails; on `transform` warn |
| `transition: all` | Animates layout by accident | > 20 % of transitioned elements with `all` warns |
| Smooth-scroll hijack | Lenis or locomotive-scroll plus non-passive wheel listeners | non-passive `wheel`/`touchmove` on `window`/`document`/`html`/`body` fails; Lenis or locomotive-scroll present warns |
| Custom cursor | No measured site hid the system cursor (`cursor: none` count was 0 everywhere) | any `cursor: none` on `body`/`html` or a cursor-following element fails |
| Infinite decorative loops | Distraction and battery drain | > 2 infinite animations in the first viewport warns; any infinite animation running under reduced motion fails |
| Staggered letter-by-letter headline | Splitting a headline into letter spans breaks reading and screen readers unless an sr-only copy exists | split headline with no `sr-only`/`aria-label` copy fails; > 12 split spans warns |
| Blur-in on every heading | Reads as a 2024 AI landing page default [interpretation] | more than 1 element with an animated `filter: blur` per page warns |
| Logo marquee at speed | The sample's marquees are 40 to 50 s per loop | marquee loop < 20 s warns; no pause on hover/focus warns |

---

## 6. Check rules (automatable)

Run with Playwright at 1440×900 and 390×844, once normally, once with `reducedMotion: 'reduce'`, and once with `javaScriptEnabled: false`. Every rule maps to a probe used for this research (`scratchpad/motion-research/probe.cjs`).

1. **Entrance count.** Before scrolling, record elements below the fold with computed opacity < 0.05 or a non-`none` transform. Scroll in 120 px steps every 110 ms, then count those that reached opacity > 0.9 or a `none` transform. Fail if > 6 per page. Sample: Pentagram 81 hidden / 10 revealed, Zeichen & Wunder 78 / 9, Apple 73 / 15, most others 0 to 15.
2. **UI duration.** For `a`, `button`, `[role=button]`, `summary`, inputs and header: max `transition-duration` ≤ 400 ms (warn), ≤ 600 ms (fail).
3. **Easing sanity.** Parse `transition-timing-function`. Flag y < −0.1 or > 1.1 on non-transform properties, and `linear` on hover state changes (warn).
4. **No `transition: all`** on more than 20 % of transitioned elements (warn).
5. **Scroll hijack.** Use CDP `DOMDebugger.getEventListeners` on `window`, `document`, `documentElement`, `body`: any `wheel`, `mousewheel` or `touchmove` listener with `passive: false` fails. Also detect `window.lenis`, `html.lenis` or `[data-scroll-container]` (warn).
6. **Reduced motion.** With `reducedMotion: 'reduce'`, `document.getAnimations()` filtered to `iterations === Infinity && playState === 'running'` must be 0. The CSS must contain at least one `prefers-reduced-motion` block if it contains any `@keyframes` or `animation-timeline`.
7. **No content hidden without JS.** In a JS-off render, every `h1`, `h2`, `p` and `img` in the first viewport must have an effective (ancestor-multiplied) opacity ≥ 0.95, `visibility: visible`, and `document.body.innerText.length` must be > 200.
8. **Scroll-driven animations gated.** Any `animation-timeline` must sit inside `@supports (animation-timeline: …)` and a `prefers-reduced-motion: no-preference` block (Bakken's structure).
9. **Hero video.** Every `<video>` intersecting the first viewport must have `muted`, `playsinline` and a `poster`. If it loops for more than 5 s, a visible pause control is required. Fail on `autoplay` without `muted`, or on audio playing without a user gesture.
10. **Video below the fold** must not use `preload="auto"` (Hello Monday's hero video had `preload="auto"` [measured]). Use `metadata` or `none`, and play via IntersectionObserver.
11. **First paint not blocked.** Screenshot at 1.5 s after DOMContentLoaded and compare it with the screenshot at 6 s. If the 1.5 s frame is visually empty (more than 95 % one colour) while the 6 s frame has text, fail as a preloader.
12. **Header behaviour.** After scrolling 1500 px down and then 300 px up: if the header is hidden (`translateY < 0`), it must be visible again after the upward scroll (Instrument and Edenspiekermann pass). A header that animates `height`/`padding` warns. A header with `backdrop-filter` must pass contrast against the content under it at the sampled scroll positions.
13. **Animated properties.** All running Web Animations and transitions on scroll should touch only `transform`, `translate`, `scale`, `rotate`, `opacity`, `filter` (warn), `clip-path` (warn). Animating `width`, `height`, `top`, `left`, `margin` or `padding` warns.
14. **`will-change` budget.** More than 10 static `will-change` declarations in CSS warns (Dept 65, Hello Monday 28 [measured]).
15. **Cursor.** `cursor: none` on `html`/`body`, or a fixed element following `pointermove`, fails.
16. **Split text has an accessible copy.** If a heading contains more than 3 inline-block spans with individual transforms, it must have an `sr-only` copy or an `aria-label` (Linear and Pentagram both provide a visually hidden full sentence [measured]).
17. **Moving things on the first screen.** Count running animations, playing videos and canvases with animation frames intersecting the first viewport: more than 2 warns.

---

## 7. Quick recipes

**Header that turns solid after the hero (no JS):**
```css
.site-header { position: sticky; top: 0; background: transparent; }
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .site-header { animation: header-solid linear both; animation-timeline: scroll(root); animation-range: 0 120px; }
  }
}
@supports not (animation-timeline: scroll()) { .site-header { background: var(--surface); } }
@keyframes header-solid { to { background: var(--surface); box-shadow: 0 1px 0 var(--line); } }
```

**Hide on scroll down, show on scroll up (about 10 lines of JS):**
```js
const h = document.querySelector('.site-header'); let last = scrollY;
addEventListener('scroll', () => {
  const y = scrollY, down = y > last + 8, up = y < last - 8;
  if (y < 100 || up) h.dataset.hidden = 'false';
  else if (down && !h.contains(document.activeElement)) h.dataset.hidden = 'true';
  if (down || up) last = y;
}, { passive: true });
```
```css
.site-header { transition: translate .25s cubic-bezier(.215,.61,.355,1), background-color .3s ease; }
.site-header[data-hidden="true"] { translate: 0 -100%; }
@media (prefers-reduced-motion: reduce) { .site-header { transition: none; } }
```

**Card image hover (Stripe/Pudding values):**
```css
.card figure { overflow: hidden; }
.card img { transition: scale .3s cubic-bezier(.19,1,.22,1); }
@media (hover: hover) { .card:hover img, .card:focus-visible img { scale: 1.05; } }
```

**Nav underline (Edenspiekermann values):**
```css
.nav a { position: relative; }
.nav a::after { content: ""; position: absolute; inset: auto 0 -2px; height: 1px; background: currentColor;
  scale: 0 1; transform-origin: left; transition: scale .2s ease-in-out; }
.nav a:is(:hover, :focus-visible, [aria-current="page"])::after { scale: 1 1; }
```
