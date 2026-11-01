# Web pages

Rules for building pages from the system. The stack is the project's choice (plain HTML, Astro, a CMS theme); these rules hold for all of them.

## Canvas and viewports

Build and check at three widths: **390 px** (current mid-size phones), **768 px** (tablet portrait, small laptops with zoom), **1440 px** (common laptop and desktop). Also look at 1280 and 1920 once: layouts that only work at exactly 1440 are fragile.

## Structure

- Semantic HTML: one `h1`, headings in order, `header`, `nav`, `main`, `footer`, `section` with headings, lists for lists, `button` for actions, `a` for navigation.
- `lang` on `html` (`de`, `en`). It drives hyphenation and screen reader pronunciation.
- Every page self-contained or linked to `../tokens.css`. No component uses a raw colour, size or font that is not a token.
- Real copy only. Labelled gaps where the client still has to deliver ("Price: to confirm with client").

## Typography on the web

- Body text at least 16 px (the browser default); 17 to 19 px with line height around 1.6 is the better default for reading pages and older audiences. Form fields at least 16 px, or iOS zooms on focus.
- Display sizes fluid with `clamp(min, preferred, max)`; check the min at 390 px and the max at 1920 px.
- `hyphens: auto` for German body text, `text-wrap: balance` for headings, `text-wrap: pretty` for paragraphs where supported.
- Fonts self-hosted, woff2, subset, `font-display: swap`. See `typography.md`.

## Images

- Use the client's photos. Captions say what and where when it adds proof ("Ridge renovation, Buchholz, 2025").
- Modern formats (AVIF or WebP with JPEG fallback), `srcset` and `sizes`, explicit `width` and `height` to prevent layout shift, `loading="lazy"` below the first screen, never on the largest first-screen image.
- `alt` describes the content for someone who cannot see it; decorative images get `alt=""`.
- Placeholders in directions: a box with a caption naming the photo needed. Never picsum or random stock.

## Accessibility

Target WCAG 2.2 level AA. In the EU many consumer-facing services fall under the European Accessibility Act, in Germany implemented as the Barrierefreiheitsstärkungsgesetz, in force since 28 June 2025; check whether the client is covered.

- Contrast as in `color.md`.
- Visible focus on every interactive element, at least as clear as hover.
- Target size at least 24×24 CSS px (WCAG 2.2, 2.5.8); 44×44 for primary touch actions is safer.
- Respect `prefers-reduced-motion`.
- Forms: visible labels, errors in text next to the field, not colour alone.
- Skip link to main content.

## Performance

Measure, do not guess. Google's documented "good" thresholds for Core Web Vitals at the 75th percentile: **LCP** at most 2.5 s, **INP** at most 200 ms, **CLS** at most 0.1. Typical causes of misses in design work: a huge hero image or video, web fonts blocking text, layout shift from images without dimensions, heavy animation libraries for one effect.

The check measures this on a phone: report section `mobile` ("Handy-Nachweis") with lab LCP, CLS and TBT under Lighthouse's Moto G Power profile (slow 4G, CPU 4x), transfer budgets, LCP image rules, oversized images, sticky chrome, first screen at 390 and 360, body size, side scrollers and hover-only content. `npm run check -- <file|url> --perf` runs three loads (median) plus the font-swap run; the default is one load. Lab values are first-party only (third-party hosts are blocked and listed) and never Core Web Vitals field data. Rules, thresholds and evidence class: `tells.md`, section "Mobile evidence"; numbers behind them: `evidence.md`, sections 1, 2 and 9.

## Motion

One orchestrated moment beats scattered effects. Motion that answers a user's action (open, expand, confirm) is welcome. Entrance animations on every section are a tell (`tells.md`). Content is visible without JavaScript and without waiting for an animation.

## Format traps

| Trap | Fix |
|---|---|
| `100vh` sections jump on mobile when the address bar moves | use `100svh` or `100dvh` |
| Sticky header covers anchor targets | `scroll-margin-top` on targets |
| Long German words overflow cards on 390 px | `hyphens: auto`, `overflow-wrap: break-word`, test with real words |
| Cookie banner covers the first screen's action | best fix: no third-party requests and no non-essential cookies, then there is nothing to consent to and no banner. If the brief needs tracking or embeds, design the banner as part of the system and check the first screen with it open |
| Phone numbers and addresses not tappable | `tel:` links, address linked to a map |
| Text baked into images | real text; images for photos only |
| Horizontal scroll from a single wide element | check `scrollWidth` at 390 px; the check reports it |
| Hover-only information | every hover state has a tap or focus equivalent |

## Done

## Finish gate (before calling a site done)

- A test message sent through every form arrives in the real inbox.
- Every page has its own title and meta description; structured data where it fits (`schema.org` Organization, LocalBusiness, Person).
- The page works with JavaScript off: content, navigation and contact are there.
- Opened on a real phone, not only an emulator.
- Imprint and privacy pages exist and are linked from every page (EU).
- No third-party requests the privacy page does not name.

Each page passes the check without hard failures, looks intentional at 390, 768 and 1440, and contains no content the client has not confirmed.

## Conversion pages (landing pages, one-pagers, funnels, pop-ups, calls to action)

A conversion page has one job. Design it so the visitor always knows the next step and never feels tricked.

- **One main action per screen.** The first screen states the offer in one sentence and shows the main action. Secondary actions are text links, not a second equal button.
- **Funnels ask before they collect.** Questions about the need come first, contact details last. One question per step on mobile; group related questions on desktop. Show progress as text ("Step 2 of 4"). Never jump to the next step automatically on selection (WCAG 3.2.2); the visitor presses Next.
- **Summary before sending.** The last step shows everything entered, with links back to change each answer.
- **One POST at the end** to the client's own endpoint (their form handler, a self-hosted form backend or mail). No partial submissions while the visitor is still answering.
- **Works without JavaScript.** Without JS the funnel is one long form with fieldsets in the same order; with JS it becomes steps. Errors are shown at the field (`aria-describedby`) and summarised at the top on submit.
- **No tracking by default.** No cookies, no storage on the device (not even for step state; keep it in the form), no pixels, no third-party scripts. If the client adds analytics later, the privacy page and consent come with it.
- **No pressure tricks.** No countdowns, timers, "only 3 left", streaked prices or fake activity notices. Real deadlines are written as plain dates.
- **Pop-ups:** never on load, never full-screen on mobile, at most once per visit, triggered by a clear action or a late, non-blocking moment (end of an article). Built as `<dialog>` opened with `showModal()`, focus moves in and returns on close, closable with Esc and a visible close button of at least 44 × 44 px. The page behind stays fully usable without ever seeing the pop-up.
- **Thank-you page** says what happens next and when, and offers one useful link (not a second sales pitch).
- **Legal:** consent text for the form is short and links to the privacy page; never a pre-ticked box; newsletter sign-up is separate from the enquiry and never a condition.

Add to the finish gate for conversion pages: the funnel completed by keyboard only, with and without JavaScript, at 390 px, and with 200 % text size.
