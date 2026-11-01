# Accessibility in the EU (EAA, BFSG, BITV, EN 301 549, WCAG 2.2)

**Not legal advice.** A working guide for designers and agents, status **30 October 2026**. Where the law is unsettled this file says so with **[open]**; settled points from the legal text carry **[law]**; points from guidance or secondary sources carry **[guidance]** or **[secondary]**. When a client's obligations decide money or risk, the client asks a lawyer.

The machine-readable rule list is the knowledge pack `a11y-eu` (`kk_knowledge` / `knowledge/packs/a11y-eu.json`): all 55 WCAG 2.2 A/AA success criteria plus the EN 301 549 clauses beyond WCAG, each with medium, design-decision flag, automation and test method. This file is the process around it.

## Status in one screen (30 Oct 2026)

| Topic | Status | Source |
|---|---|---|
| European Accessibility Act, Directive (EU) 2019/882 | Applies since **28 June 2025** to products placed on the market and services provided to consumers after that date. No amendment found. | EAA Art. 31, 32 [law] |
| Germany: BFSG + BFSGV | In force since 28 June 2025. BFSG last changed 6 May 2024. **BFSGV amended 10 July 2026** (BGBl. 2026 I Nr. 205, in force 16 July 2026): only self-service terminals (§ 7) and telecom/emergency calls (§ 14). Nothing changed for websites or shops. | gesetze-im-internet.de; BR-Drs. 314/26 [law] |
| EU infringement against Germany | Opened 19 July 2022 for incomplete transposition; supplementary reasoned opinion in March 2026. The July 2026 BFSGV change fixes two of three points; the third is to be handled in other regulations. | BR-Drs. 314/26 [law]; dates of the opinion [secondary] |
| Market surveillance (DE) | **MLBF** (Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen, AöR), Magdeburg, working since **26 Sept 2025**; strategies adopted early 2026; complaint and § 32 BFSG application forms online. No published fines found. | Land SH page; mlbf-barrierefrei.de [law/primary]; itmr-legal 27 Aug 2026 [secondary] |
| Court decisions on BFSG | **None published** that we could find (search 30 Oct 2026). Whether BFSG duties are "market conduct rules" under § 3a UWG (so competitors can send Abmahnungen) is **[open]**. | itmr-legal (Rechtsstand 27 Aug 2026) [secondary] |
| Abmahnungen | Two reported waves: from August 2025 (single trader, around 595 euro settlements) and from February 2026 (Berlin firm with a third-party test report, around 2,700 euro). No reported judgment backs them. | itmr-legal, foehlisch, anwalt.de [secondary] |
| BGG reform (private sector) | Cabinet draft 11 Feb 2026, first reading 7 May 2026, hearing 22 June 2026, **not adopted** as of 30 Oct 2026. Would add "reasonable accommodations" on request for private providers, no new technical standards. | bundestag.de [primary] |
| EN 301 549 | **V4.1.1 published 2 Sept 2026** (WCAG 2.2 AA, 4.1.1 Parsing removed, new user-preference clauses 9.7/10.7, EAA annex ZB). **Not yet cited in the Official Journal**; citation expected around 30 Nov 2026. Until then **V3.2.1 (WCAG 2.1 AA)** is the cited version, and only under the Web Accessibility Directive. Under the EAA no harmonised standard is cited yet. | ETSI PDF; AccessibleEU 7 Sept 2026 [primary]; Deque, Level Access [secondary] |
| WCAG | WCAG 2.2 (W3C Recommendation 5 Oct 2023, updated 12 Dec 2024) = **ISO/IEC 40500:2025** (Oct 2025). WCAG 3 is a draft and binds nobody. | W3C [primary] |

**Working target for every Kiekkist project: WCAG 2.2 AA plus the EN 301 549 extras in the pack.** That satisfies V3.2.1 (a subset), anticipates V4.1.1, and is what the BFSGV calls "Stand der Technik" (§ 3 BFSGV) in practice [guidance].

## 1. The law, condensed

### EAA (Directive (EU) 2019/882) [law]

- **Services in scope** (Art. 2(2)): electronic communications; access to audiovisual media services; elements of air, bus, rail and waterborne passenger transport (websites, apps, e-tickets, real-time information, interactive terminals); **consumer banking services**; **e-books** and dedicated software; **e-commerce services**.
- **E-commerce services** (Art. 3(30)): "services provided at a distance, through websites and mobile device-based services by electronic means and at the individual request of a consumer with a view to concluding a consumer contract". The key words are *consumer* and *concluding a contract*.
- **Products in scope** (Art. 2(1)): consumer computers and operating systems, payment terminals, ATMs, ticketing and check-in machines, interactive information terminals, consumer phones/routers/TV equipment, e-readers.
- **Microenterprise** (Art. 3(23)): fewer than 10 persons **and** annual turnover **or** balance sheet total not exceeding 2 million euro. Microenterprises **providing services** are exempt from the accessibility requirements and the related obligations (Art. 4(5)). **Products are not exempt.**
- **Obligations for service providers:** meet Annex I (Sections III and IV: information about the service, accessible websites and apps "in a consistent and adequate way by making them perceivable, operable, understandable and robust", accessible support services, e-commerce specifics); publish the information of Annex V (in general terms and conditions or another clearly visible way); keep it for as long as the service is offered; correct non-conformity and inform the authority. Exemptions for "fundamental alteration" or "disproportionate burden" must be assessed and documented (Annex VI).
- **Transition** (Art. 32): services may use products already used before 28 June 2025 until 28 June 2030; contracts concluded before 28 June 2025 may run unchanged until they expire, at most five years. Self-service terminals: up to 20 years (Member State option).
- **Content excluded** from website/app requirements (Art. 2(4)): pre-recorded time-based media and office files published before 28 June 2025; online maps if essential information is provided accessibly; third-party content not funded, developed or controlled by the operator; archived content not updated after 28 June 2025.
- **Not in scope:** B2B-only services; websites that only present a business; the public sector (that is the Web Accessibility Directive 2016/2102).

### Germany: BFSG + BFSGV [law]

- **§ 1 Abs. 3 BFSG** mirrors the EAA list; **§ 2 Nr. 26** defines e-commerce as digital services "über Webseiten und über Anwendungen auf Mobilgeräten ... auf individuelle Anfrage eines Verbrauchers im Hinblick auf den Abschluss eines Verbrauchervertrags".
- **§ 2 Nr. 17** Kleinstunternehmen = EAA definition; **§ 3 Abs. 3**: the requirements do not apply to Kleinstunternehmen that offer services. BMAS has published guidelines for them.
- **§ 1 Abs. 4**: same content exclusions as the EAA (pre-2025 media and office files, maps, third-party content, archives).
- **§ 14**: the provider may offer the service only if it meets the BFSGV **and** the information per **Anlage 3** is published "für die Allgemeinheit in barrierefreier Form"; keep it updated; correct non-conformity; inform the MLBF.
- **Anlage 3 Nr. 1**: state "in seinen Allgemeinen Geschäftsbedingungen oder auf andere deutlich wahrnehmbare Weise" how the service meets the requirements, at least: (a) general description of the service in an accessible format, (b) explanations needed to understand how the service is carried out, (c) how it meets the BFSGV requirements, (d) the competent market surveillance authority.
- **BFSGV § 12** (all services): information about the service via more than one sensory channel, findable, understandable, perceivable, in text formats that can be turned into other formats, adequate font size, contrast and spacing, alternatives for non-text content; websites and apps "wahrnehmbar, bedienbar, verständlich und robust"; accessible support services. **§ 19** (e-commerce): accessibility information about products sold (where the supplier provides it); accessible identification, authentication, security and payment functions. **§ 17** (banking): information not above **CEFR B2**.
- **Enforcement:** MLBF checks formal conformity first (information per Anlage 3, naming the MLBF), then substance [guidance, MLBF strategy as reported]. Steps: request to correct with deadline, then restriction or prohibition of the service, then fines. **§ 37 BFSG**: up to **100,000 euro** for offering a non-conforming service (§ 37 Abs. 1 Nr. 8, which covers both duties of § 14 Abs. 1) and up to 10,000 euro for information and cooperation failures. Consumers and recognised associations can apply to the MLBF (§ 32), sue administratively (§ 33) and use the free **Schlichtungsstelle nach § 16 BGG** (§ 34).
- **MLBF contact** (for Anlage 3 lit. d): Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF AöR), Carl-Miller-Straße 6, 39112 Magdeburg, kontakt@mlbf-barrierefrei.de, www.mlbf-barrierefrei.de (source: Land Schleswig-Holstein page, checked 30 Oct 2026; re-check before each launch).

### Public sector: BGG + BITV 2.0 (federal) and Land laws [law]

- Federal bodies: § 12a ff. BGG and **BITV 2.0** (last changed 24 Oct 2023). Presumption of conformity via harmonised standards cited in the OJEU (§ 3 Abs. 2), today EN 301 549 V3.2.1; uncovered needs per state of the art (§ 3 Abs. 3); interaction, forms, authentication and payment "höchstmögliches Maß" (§ 3 Abs. 4).
- **§ 4 BITV:** start page offers explanations in **Leichte Sprache and Deutscher Gebärdensprache** (contents, navigation, essence of the accessibility statement, pointers to more such content).
- **§ 7 BITV / § 12b BGG:** *Erklärung zur Barrierefreiheit* in accessible, machine-readable form, reachable from the start page and every page; feedback mechanism reachable from every page; contents per Implementing Decision (EU) 2018/1523; real evaluation, say whether by a third party or self-assessment; update annually and after major changes.
- Länder and municipalities follow their **own Land laws** (Niedersachsen: NBGG and its regulation), which implement the same directive with similar content. Check the Land's regulation and its enforcement body (Durchsetzungs-/Schlichtungsstelle) before writing a municipal statement.

### Austria and Switzerland (brief)

- **Austria: Barrierefreiheitsgesetz (BaFG)**, BGBl. I Nr. 76/2023, applicable since 28 June 2025; same scope and microenterprise exemption; authority and penal body is the **Sozialministeriumservice**; fines up to **80,000 euro**, lower for SMEs, "beraten vor strafen" for first or minor breaches. WKO advises a separate page/button rather than burying the information in the AGB. [secondary: WKO, updated 28 Jan 2026] Public sector: Web-Zugänglichkeits-Gesetz (WZG).
- **Switzerland:** not bound by the EAA. Swiss companies selling to EU consumers fall under the EAA for those services. Domestically, BehiG obliges federal bodies (standard eCH-0059, WCAG-based); private providers are only barred from discrimination. A partial revision of BehiG (Federal Council message December 2024) is in parliamentary committee; on 25 Feb 2026 the Federal Council added an Inklusionsgesetz as counter-proposal to the Inklusions-Initiative. No private-sector web duty is in force. [admin.ch, primary]

## 2. Phase 1 (Briefing): is the client in scope?

Ask these and write the answers into the brief under **Accessibility scope**. Record the result as one of: `in scope`, `likely in scope`, `out of scope (reason)`, `voluntary`.

1. **Who buys?** Consumers, businesses, or both? Is there any way for a consumer to conclude a contract online (shop, booking with payment, booking without payment, subscription, paid download, membership, ticket, online order of a quote that becomes binding)?
2. **What can be done on the site/app?** Pure presentation; contact form or chat; quote request; appointment or table booking; shop; customer account; app.
3. **Company size:** headcount in full-time equivalents (trainees and people on parental leave do not count, part-timers pro rata [guidance: ZDH/Bundesfachstelle]) and annual turnover or balance sheet total. Do they belong to a group (partner/linked enterprises can count, per the EU SME definition) **[open]** for small trades in family groups.
4. **Public body?** Kommune, Kita owned by the municipality, school, public company, association mostly publicly funded? Then BITV/Land law, not BFSG.
5. **Which countries?** Selling to consumers in other EU states brings their transposition (e.g. Austria BaFG) and their authority.
6. **Third parties:** which booking, shop, payment, chat, map, video and consent tools are used? You inherit their barriers (EN 301 549 9.6, complete processes).
7. **Documents and media:** PDFs (price lists, brochures, menus), videos, podcasts, social channels. Who produces captions and tagged PDFs?
8. **Existing obligations:** brand book contrast rules, accessibility audits, complaints received, an Abmahnung received?

### Decision table [law + guidance; this is where uncertainty lives]

| Situation | Status | Confidence |
|---|---|---|
| B2C online shop, company with 10+ FTE or > 2 M euro turnover and balance sheet | **In scope** | high |
| Same, but a Kleinstunternehmen (< 10 FTE and <= 2 M euro turnover or balance sheet) | **Exempt** for the service; still recommended; exemption ends the year the thresholds are exceeded | high (law) |
| Pure presentation website (services, references, contact data) | **Out of scope** | high [ZDH/Bundesfachstelle] |
| Contact form, call-back form, chat for first contact | Usually **out of scope** | medium; becomes in scope if the form is designed to conclude a contract [ZDH FAQ 5] |
| Quote request ("Angebot anfordern") without online contract | Probably out of scope | **[open]**: no guidance; treat like a contact form unless the online flow leads to a binding order |
| Online appointment booking with online payment | **In scope** (if not micro) | high [ZDH FAQ 1, BMAS Leitlinien example] |
| Online booking without payment (pay on site) | **Likely in scope** | medium: ZDH says "einiges spricht dafür" |
| Hotel/restaurant with booking engine or table reservation | Booking engine with contract: in scope. Free table reservation | **[open]** whether a reservation is a consumer contract |
| B2B-only portal or shop (verified business customers only) | **Out of scope** | high, if consumers are actually excluded (login check, VAT ID), not just "Prices net" |
| Mixed B2B/B2C shop | **In scope** | high |
| Newsletter sign-up | Out of scope unless it concludes a paid contract | medium [ZDH FAQ 6] |
| Whole site or only the shop pages? | **[open]**. Recommend: all pages a consumer passes on the way to and through the contract (home, navigation, product pages, cart, checkout, account, contact, help, legal pages, accessibility information) | ZDH FAQ 8 recommends home, contact, help, legal pages too |
| Public body (Kommune, Landesbehörde) | BITV 2.0 or Land law; statement, feedback, Leichte Sprache/DGS duties | high |
| App of an in-scope service | In scope; tested against EN 301 549 clause 11 | high |

**Rules for the agent:**
- Never tell a client "you are not affected" as a fact. Say "according to the BFSG definition and the guidance of the Bundesfachstelle as reported by the ZDH, a pure presentation site is not covered; this is not legal advice".
- Even when out of scope, build to WCAG 2.2 AA: it costs little when decided in design, it protects against future scope changes (shop added later, BGG reform, EN 301 549 V4.1.1), and it is the agency's quality standard.
- Do not sell overlays ("accessibility widgets") as compliance. They do not fix the source and are a common Abmahnung target.

## 3. Phases 4 and 6 (Directions and System): decisions a designer must make

These cannot be fixed later by a developer without changing the design. Each one becomes a token or a component rule in DESIGN.md, and every direction must satisfy them (directions may differ in style, not in accessibility).

1. **Contrast pairs.** Text 4.5:1, large text (>= 24 px, or >= 18.66 px bold) 3:1, in every theme and state. Record each ground/ink pair with its ratio in DESIGN.md (`color.md`). Text over photos only with a solid or sufficiently dark field; measure the worst area.
2. **Non-text contrast 3:1** (1.4.11): input borders, checkbox and radio outlines, toggle tracks, icon-only buttons, chart lines, focus rings. Add a `--line-strong` token at 3:1 against the ground; pale hairlines are decoration only.
3. **Focus indicator** (2.4.7, aim for 2.4.13): a `--focus` token, e.g. `outline: 2px solid var(--focus); outline-offset: 2px`, 3:1 against both the component and the ground, visible in forced-colours mode (use `outline`, not only `box-shadow`). Design it on dark and light grounds and on photos.
4. **Focus not obscured** (2.4.11): sticky header height becomes `scroll-padding-top`; sticky CTA bars, chat bubbles and cookie banners must not cover focused elements. Decide in the layout whether a sticky header is worth it.
5. **Target size** (2.5.8): floor 24×24 CSS px or spacing so a 24 px circle around each target does not touch another; design primary touch actions at 44×44 (Apple HIG 44 pt, Material 48 dp). Icon buttons, pagination dots, close buttons, footer social icons are the usual failures.
6. **Reflow at 320 CSS px** (1.4.10) and **text spacing** (1.4.12): draw the 320 px layout, not only 390. No fixed heights on anything that contains text; buttons, badges and cards grow with text. Long German compounds need `hyphens: auto` and `lang="de"`.
7. **Type scale in rem**, body at least 16 px (17–19 px for reading pages and older audiences), line length about 60–75 characters, line height around 1.5 (`typography.md`).
8. **Colour never alone** (1.4.1): links in body text underlined (or 3:1 against text plus a non-colour cue on hover/focus), errors with icon and text, required fields marked in text, charts with direct labels or patterns, status with icon plus word.
9. **Motion** (2.2.2, 2.3.1, 2.3.3, `motion.md`): anything moving longer than 5 s gets a visible pause control in the component design; carousels do not auto-advance, or have pause; `prefers-reduced-motion: reduce` switches off parallax, scroll-linked effects, smooth-scroll libraries and autoplay video. No flashing above three per second.
10. **Consistent help** (3.2.6): one help block (phone, email, contact link, FAQ, chat) in a fixed order and place on every page; same for navigation (3.2.3) and labels (3.2.4). Write a label glossary.
11. **Forms** (1.3.5, 3.3.1–3.3.4, 3.3.7, 3.3.8): visible labels above fields (placeholders are not labels), required marked in text, error state = icon + message text next to the field + summary for long forms, autocomplete tokens, no "repeat email", review step before binding orders, paste allowed in passwords and codes, no puzzle CAPTCHA (use honeypot/server checks or offer an alternative), passkeys or magic links welcome. Biometrics never the only login (EN 5.3).
12. **Dragging** (2.5.7) and gestures (2.5.1): before/after sliders, sortable lists, range sliders, map panning and swipe carousels all need buttons or inputs as single-pointer alternatives.
13. **Hover content** (1.4.13): tooltips and mega menus dismissable with Esc, hoverable, persistent. Avoid hover-only information.
14. **Language** (3.1.1, 3.1.2): page language; English slogans and quotes in German pages get `lang="en"`.
15. **Plain language**: EAA/BFSGV require information to be "understandable"; banking caps it at B2 (§ 17 BFSGV). For trades and SMEs write plain German by default (short sentences, active voice, explain terms). **Leichte Sprache** (DIN SPEC 33429) is a legal duty only for public bodies (§ 4 BITV); for private clients offer it as an option for key pages.
16. **Media plan**: captions for all videos with speech (budget them), audio description or integrated description (say what you show), transcripts for audio, CC button on the player bar at the same level as play (EN 7.3).
17. **User preferences** (EN 9.7 in V4.1.1, 11.7 for apps): do not override forced colours, text size or pointer settings; icons in `currentColor`; real borders; test the design in Windows contrast themes.
18. **Cookie banner** as a designed component: keyboard first, reject on the first layer as easy as accept, contrast, no focus trap, does not cover focused content, reopen link in the footer (legal side: `privacy-eu.md`).

## 4. Phase 7 (Roll-out): build rules per medium

### Web
- Semantic HTML first: `header`, `nav`, `main`, `footer`, one `h1`, ordered headings, `button` for actions and `a` for navigation, lists for lists, tables with `th` and `scope`.
- Visible-on-focus skip link to `main`.
- Every interactive element reachable and operable by keyboard; custom widgets follow WAI-ARIA Authoring Practices (menus, tabs, accordions, dialogs with focus management and return).
- Images: meaningful `alt`, decorative `alt=""`; SVG icons `aria-hidden="true"` inside named buttons; icon-only buttons with `aria-label` that starts with any visible text (2.5.3).
- Status messages via `role="status"`/`aria-live` (cart updates, filter counts, form success).
- Never `user-scalable=no` or `maximum-scale=1`.
- `<html lang="de">`, `lang` on foreign passages.
- Video: self-hosted `<video>` with `<track kind="captions" srclang="de">`, `controls`, no autoplay with sound; background video muted, paused under reduced motion, pause button.
- Footer on every page: link **"Barrierefreiheit"** to the accessibility information (BFSG) or **"Erklärung zur Barrierefreiheit"** (public), plus contact and help in the fixed order.
- Shop: product data field for accessibility information (BFSGV § 19 Nr. 1), checkout review step, accessible payment widgets (test the provider's overlay), session timeout warning.
- CMS (EN 5.10): required alt-text and caption fields, heading levels instead of font-size controls, accessible templates, warnings for empty alt or skipped headings. Clients can only keep a site conformant if the editor makes it easy.

### PDF and office documents
- Produce from the source with tags: Word/PowerPoint "Save as PDF" with *Document structure tags for accessibility*; InDesign export "Create Tagged PDF" with articles panel order, alt text in object export options, document language and title.
- Target **PDF/UA** (ISO 14289-1, or -2 for PDF 2.0): tagged, `/Lang`, `/Title` with "display document title", logical reading order, headings/lists/tables tagged, figures with alt, decorations as artefacts, bookmarks for documents over a few pages, real text (OCR any scan).
- Validate with **veraPDF** (PDF/UA profile, open source) and **PAC** (free checker by axes4, a vendor); then a screen-reader read of the first pages.
- Prefer HTML pages over PDFs for price lists and menus; a PDF then is an extra.

### Slides
- Real slide titles (title placeholder; may be visually hidden in HTML decks), unique per slide.
- Reading order set (PowerPoint Selection pane, Keynote object order); alt text on images and charts; no text inside images; slide and deck language set.
- Contrast above the minimum for projectors; no information by colour alone in charts.
- Embedded video captioned; avoid auto-advancing slides and flashing transitions.
- Run the PowerPoint/Keynote accessibility checker; export to PDF with structure tags; reading decks sent as PDF are documents (EN 301 549 clause 10).
- HTML decks: each slide a `section` with a heading, keyboard navigation, focus visible, `aria-live` slide announcements, speaker notes available as text.

### Social media
Marketing posts are not themselves a BFSG "service", so this is **best practice, not a legal duty** [law reading; secondary consensus]. It is still what disabled followers need:
- Alt text in the platform's alt field for every image (and in a text file next to the asset); describe content and any text in the image.
- Captions for every video with speech: upload SRT where the platform allows it, otherwise burn in; burned-in captions at a readable size with a solid band and 4.5:1.
- Text in graphics at 4.5:1, kept out of platform UI overlays; the essential message also in the post text (graphics are images of text by nature).
- Hashtags in CamelCase (#BarrierefreiesWeb), emojis sparingly and at the end, no fancy Unicode "bold" letters (screen readers spell them out or skip them).
- No strobe edits; reels under three flashes per second.

### Apps (native)
- Test against **EN 301 549 clause 11**, not clause 9; WebViews inside apps also count as clause 11 (EN 9.0 Note 3).
- Native controls or correct accessibility traits/roles, labels, values and actions for VoiceOver and TalkBack (11.5.2); do not disrupt platform features (11.6.2).
- Follow user settings (11.7): Dynamic Type / font scale to the largest sizes without clipping, Bold Text, Increase Contrast, Reduce Motion, Reduce Transparency, dark mode.
- Touch targets 44×44 pt / 48×48 dp; gesture alternatives; no orientation lock unless essential; biometrics with an alternative.
- The accessibility information belongs on the store page or the website where the app is offered. Apple shows "Accessibility Nutrition Labels" on App Store pages (announced May 2025 [secondary]); fill them truthfully.

## 5. Phase 8 (Review): test protocol

### What automation can and cannot do
Automated tools prove absence of some failures, never conformance. Of the 55 A/AA criteria, axe-core 4.14 has rules tagged for 23 (two of them disabled by default), and most of those only catch the mechanical part (missing alt, not wrong alt; missing label, not unclear label). Criteria with no axe rule at all include 1.3.2, 1.3.3, 1.4.10, 1.4.11, 1.4.13, 2.1.2, 2.4.3, 2.4.5, 2.4.6, 2.4.7, 2.4.11, 2.5.1, 2.5.7, 3.2.x, 3.3.1, 3.3.3, 3.3.4, 3.3.7, 3.3.8, 4.1.3. The pack field `automated` says per criterion what `kk_check` covers (`kk:` rule ids), what axe covers (`axe:`), what is still planned (`kk-planned:`, only flash and images of text) and what stays `manual`; "partial", "heuristic" or "only" there means the criterion still needs the manual pass.

Notes on axe-core 4.14 as used by `kk_check`: it runs at every viewport and once more with the mobile menu opened, with the WCAG 2.0–2.2 A/AA and best-practice tags; `audio-caption` and `css-orientation-lock` are switched on, `duplicate-id*` are obsolete (WCAG 2.2 removed 4.1.1). Every WCAG A/AA violation is an error whatever its impact (impact only weights the score); best-practice results are warnings; `incomplete` results are counted in `stats.axe.incomplete` for manual review.

### What `kk_check` measures (rule ids in brackets)
- **Per viewport:** text contrast, overflow, target size, axe; text spacing with the WCAG test styles (`text-spacing`) at the narrowest and widest width.
- **Extra widths:** 320×640 for reflow and sticky bars eating the screen (`reflow-320`), 844×390 for orientation locks (`orientation`).
- **Keyboard walk** at the narrowest and widest width: focus visible (`focus-visible`), not hidden by sticky bars or the cookie banner (`focus-obscured`, error when fully hidden), order jumps and positive tabindex (`focus-order`), traps (`keyboard-trap`), consent banner reachable (`consent-banner`); clickable elements without keyboard access (`click-handler-not-focusable`).
- **States and preferences:** forced colours (`forced-colors`, `forced-color-adjust-scan`), reduced motion (`reduced-motion`, `reduced-motion-ignored`), moving content without pause (`pause-control-missing`), audio autoplay (`autoplay-audio`), hover and tooltip content (`hover-content`), text-only zoom (`text-resize-200`, heuristic).
- **Content and forms:** non-text contrast of fields and icons (`non-text-contrast`), language (`lang-mismatch`, `lang-parts`), label in name and icon names (`label-in-name`, `icon-name`), autocomplete, paste, CAPTCHA, confirmation fields, required cues (`autocomplete-missing`, `auth-paste`, `captcha-detect`, `redundant-entry`, `form-errors`), dragging-only widgets (`dragging`), overlays (`overlay-detect`), linked PDFs (`pdf-link-scan`, tagging basics only).
- **Information duties:** footer link and contents of the accessibility page (`statement-link`, `statement-content`), Leichte Sprache and DGS links (`public-sector-links`). Pass `profile: "bfsg"` for a private provider in scope (MLBF must be named; missing link is an error) or `profile: "public"` for public bodies (feedback, Schlichtung, status, date within 13 months); default `none`. The report adds a `scope_hint` (shop or booking signals) that never decides scope.
- **Several pages:** `checkTarget({ pages: [...] })` (CLI: `--page` per extra page, same origin or local files) compares navigation order (`consistent-nav`), help order (`consistent-help`), link names (`consistent-id`), titles (`title-unique`) and search/sitemap (`multiple-ways`). Run it on the start page plus at least four templates.

The report section `a11y` lists every finding with WCAG success criterion, level, EN 301 549 clause and pack item, grouped by principle, and ends with "geprüft nach WCAG 2.2 AA / EN 301 549 V4.1.1 (automatisierbare Teile), Stand <date>; manuelle Prüfpunkte: n". Quote that line, never a conformance claim.

### Manual protocol (one pass per template type, plus every step of each process)
Record results per criterion in `.kiekkist/a11y-audit.md` with page, finding, criterion, severity, fix.

1. **Automated baseline:** `kk_check` at 390, 768 and 1440 (plus 320 and landscape automatically), with the right `profile`, and once in site mode over the templates; fix all hard failures first, then work through the `manual` list of the `a11y` section.
2. **Keyboard walk** (2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11, 3.2.1): mouse away. Tab from the address bar: skip link appears first; every link, button, field and widget reachable in reading order; focus always visible and never hidden by sticky elements or the cookie banner; Enter/Space work; Esc closes menus and dialogs and returns focus; no trap in iframes (maps, video, booking, payment, chat). Complete each process (order, booking, contact) by keyboard only.
3. **Zoom and reflow** (1.4.4, 1.4.10): browser zoom 200 % at 1280 px wide (nothing clipped), then 400 % (equals 320 px; no horizontal scroll for text, nothing lost; sticky headers must not eat the screen). Firefox "zoom text only" at 200 %.
4. **Text spacing** (1.4.12): run this bookmarklet, look for clipped or overlapping text:
   ```js
   javascript:(()=>{const s=document.createElement('style');s.textContent='*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';document.head.appendChild(s)})()
   ```
5. **Reduced motion and moving content** (2.2.2, 2.3.1, 2.3.3): set the OS to reduce motion and reload; parallax, scroll smoothing and autoplay must stop. Without the setting: every carousel, video and loop longer than 5 s has a working pause.
6. **Screen reader smoke test** (1.1.1, 1.3.1, 2.4.2, 2.4.4, 2.4.6, 3.1.1, 3.3.1, 3.3.2, 4.1.2, 4.1.3): NVDA + Firefox or Chrome on Windows, VoiceOver + Safari on macOS and iOS, TalkBack + Chrome on Android for mobile. Listen to: page title, landmarks list, headings list (NVDA H / VoiceOver rotor), links list (do they make sense out of context), images (alt sensible), one form with deliberate errors (labels read, errors announced and associated), a status message (cart, filter), a dialog (focus moves in, title read, focus returns).
7. **Colour and contrast** (1.4.1, 1.4.3, 1.4.11): greyscale view for colour-only meaning; measure contrast of states not covered by the check (hover, focus, placeholder, text on photos, charts, icons, input borders).
8. **Forced colours / user preferences** (EN 9.7, 11.7): Windows contrast theme (or Chrome DevTools "Emulate forced-colors: active"): icons, borders, focus and custom controls stay visible.
9. **Media** (1.2.x, EN 7): captions present, accurate and synchronised; CC control on the player bar; transcript for audio.
10. **Forms and authentication** (1.3.5, 3.3.x): autofill works, paste works in password and code fields, no puzzle CAPTCHA, errors with suggestions, review step for binding orders, no re-entry of known data.
11. **Consistency across pages** (3.2.3, 3.2.4, 3.2.6, 2.4.5): compare header, footer, help block order and labels on at least five pages.
12. **Documents**: veraPDF/PAC for every linked PDF created from 28 June 2025; screen-reader read of the first page.
13. **Apps**: VoiceOver and TalkBack walk through one core task; largest text size; Reduce Motion; Switch/Voice Control smoke test; Xcode Accessibility Inspector / Android Accessibility Scanner.
14. **Statement check**: footer link on every page; contents per template below; MLBF named; date current.

A passing protocol means "no known barriers found in the tested sample", which is what the statement may claim. It never means "certified".

## 6. Phase 9 (Filing and handover): accessibility information and statements

Deliver as an HTML page (accessible, linked from the footer of every page, and referenced from the AGB). Keep the date current and update after every substantial change. Store the audit file with the project.

### Template DE: Informationen zur Barrierefreiheit (private provider, § 14 BFSG, Anlage 3)

```markdown
# Informationen zur Barrierefreiheit

Stand: [TT.MM.JJJJ]

## Unser Angebot
[Allgemeine Beschreibung der Dienstleistung in einfachen Worten: was man hier kaufen oder buchen kann, wer der Anbieter ist.]   <!-- Anlage 3 Nr. 1 lit. a -->

## So funktioniert der Kauf / die Buchung
[Schritte von der Auswahl bis zur Bestätigung; Zahlungsarten; Lieferung oder Termin; Widerruf und Rückgabe; Kundenkonto ja/nein; wie man Hilfe bekommt (Telefon, E-Mail, Formular), Zeiten.]   <!-- lit. b -->

## Wie wir die Anforderungen an die Barrierefreiheit erfüllen
Diese Website/App wurde nach den Anforderungen der Verordnung zum Barrierefreiheitsstärkungsgesetz (BFSGV) gestaltet. Als Maßstab verwenden wir die harmonisierte Norm EN 301 549 und die Web Content Accessibility Guidelines (WCAG) 2.2 auf Stufe AA.
- [Konkrete Merkmale: Bedienung per Tastatur, sichtbarer Fokus, Kontraste nach WCAG, Textalternativen für Bilder, Untertitel für Videos, verständliche Formulare mit Fehlerhinweisen, skalierbare Schrift bis 400 %, Unterstützung von Screenreadern, Anpassung an Systemeinstellungen wie „Bewegung reduzieren".]
- Geprüft am [Datum] durch [eigene Prüfung / Dienstleister] mit [Methode: automatisierte Prüfung und manuelle Prüfung mit Tastatur, NVDA, VoiceOver, Zoom].
- Bekannte Einschränkungen: [Inhalt, Grund, Alternative, geplanter Termin der Behebung] – oder: „Uns sind derzeit keine Barrieren bekannt."
- Informationen zur Barrierefreiheit der angebotenen Produkte: [wo zu finden, sofern vom Hersteller bereitgestellt]   <!-- BFSGV § 19 Nr. 1 -->   <!-- lit. c -->

## Barriere melden
Wenn Sie auf eine Barriere stoßen, schreiben Sie uns: [E-Mail], [Telefon], [Formular-Link]. Wir antworten innerhalb von [x] Werktagen.

## Zuständige Marktüberwachungsbehörde   <!-- lit. d -->
Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF AöR)
Carl-Miller-Straße 6, 39112 Magdeburg
E-Mail: kontakt@mlbf-barrierefrei.de · Web: www.mlbf-barrierefrei.de

## Schlichtung
Bei Streitigkeiten können Sie kostenfrei ein Schlichtungsverfahren bei der Schlichtungsstelle nach § 16 des Behindertengleichstellungsgesetzes beantragen (§ 34 BFSG): [aktuelle Adresse und Website der Schlichtungsstelle BGG eintragen].
```

Notes: lit. a to d are mandatory; reporting and Schlichtung are recommended (the Schlichtung right exists in § 34 BFSG). Do not call this page "Erklärung zur Barrierefreiheit" in a private context; that term belongs to the public sector [guidance: ZDH FAQ 11]. For exempt microenterprises a short voluntary page is good practice: "Wir sind ein Kleinstunternehmen im Sinne des § 2 Nr. 17 BFSG und daher von den Anforderungen ausgenommen (§ 3 Abs. 3 BFSG). Wir gestalten unser Angebot trotzdem nach WCAG 2.2 AA ..." Do not claim the exemption if the thresholds are not checked.

### Template DE: Erklärung zur Barrierefreiheit (public body, § 12b BGG, § 7 BITV 2.0, EU model 2018/1523)

```markdown
# Erklärung zur Barrierefreiheit

[Name der öffentlichen Stelle] ist bemüht, ihre Website [URL] / App [Name] im Einklang mit [§ 12a BGG und BITV 2.0 | Landesrecht, z. B. NBGG] barrierefrei zugänglich zu machen.

## Stand der Vereinbarkeit mit den Anforderungen
Diese Website ist [vollständig | teilweise | nicht] mit [EN 301 549 V3.2.1 / WCAG 2.1 AA; ab Zitierung V4.1.1 / WCAG 2.2 AA] vereinbar.

## Nicht barrierefreie Inhalte
- [Inhalt] – Grund: [Unvereinbarkeit | unverhältnismäßige Belastung (mit Begründung) | nicht im Anwendungsbereich]; Alternative: [...]; Behebung bis: [...]

## Erstellung dieser Erklärung
Erstellt am [Datum]. Grundlage: [Selbstbewertung | Prüfung durch Dritte: Name, Verfahren (z. B. BITV-Test)], zuletzt überprüft am [Datum]. [Link zum Prüfbericht]

## Feedback und Kontakt
Barrieren melden oder Inhalte in barrierefreier Form anfordern: [Kontaktformular-Link], [E-Mail], [Telefon]. Antwort innerhalb von [x] Wochen.

## Schlichtungsverfahren / Durchsetzung
[Bund: Schlichtungsstelle nach § 16 BGG beim Beauftragten der Bundesregierung für die Belange von Menschen mit Behinderungen, Adresse/Website eintragen]
[Land/Kommune: zuständige Durchsetzungs- oder Schlichtungsstelle nach Landesrecht]

## Leichte Sprache und Gebärdensprache
[Link zu den Erläuterungen nach § 4 BITV 2.0 auf der Startseite]
```

### Template EN: Accessibility information / statement

```markdown
# Accessibility

Last updated: [YYYY-MM-DD]

## Our service
[What customers can buy or book here and who provides it.]

## How it works
[Steps from selection to confirmation, payment options, delivery or appointment, cancellation, how to get help.]

## How we meet the accessibility requirements
This website/app is designed to meet the accessibility requirements of Directive (EU) 2019/882 as transposed in [country, e.g. German BFSG/BFSGV]. We use EN 301 549 and WCAG 2.2 Level AA as our benchmark.
- [Key features ...]
- Last tested on [date] by [us / third party] using [method].
- Known limitations: [content, reason, alternative, fix date] – or "We are not aware of any barriers."

## Report a barrier
[email], [phone], [form]. We reply within [x] working days.

## Market surveillance authority
[For Germany: MLBF AöR, Carl-Miller-Straße 6, 39112 Magdeburg, kontakt@mlbf-barrierefrei.de. For Austria: Sozialministeriumservice. Other countries: the authority named in that country's transposition.]
```

## 7. Agent rules (short)

- In Phase 1 always fill **Accessibility scope** with status, reason and confidence; never state legal certainty that does not exist.
- In Phases 4 and 6 every direction and the final system pass the 18 design decisions above; record the tokens (`--focus`, `--line-strong`, contrast table, target sizes, motion rules, help block order) in DESIGN.md.
- In Phase 7 build per medium rules; in Phase 8 run `kk_check` (with `profile` and site mode) plus the manual protocol; in Phase 9 hand over the accessibility page, the audit file and the CMS rules.
- Wording to clients: "conforms to WCAG 2.2 AA in the tested sample on [date]", never "100 % barrierefrei" or "BFSG-zertifiziert" (there is no such certificate).
- Re-check this file's status table when EN 301 549 V4.1.1 is cited in the OJEU (expected around 30 Nov 2026), when the BGG reform passes, and when the first BFSG court decision or MLBF report is published.

## Sources (checked 30 Oct 2026)

Primary:
- Directive (EU) 2019/882, EUR-Lex https://eur-lex.europa.eu/eli/dir/2019/882/oj (text read via the legislation.gov.uk copy of the original, Art. 3, 4, 32).
- BFSG, https://www.gesetze-im-internet.de/bfsg/ (Stand: Art. 32 G v. 6.5.2024).
- BFSGV, https://www.gesetze-im-internet.de/bfsgv/ (Stand: V v. 10.7.2026, BGBl. 2026 I Nr. 205); Bundesrat Drucksache 314/26 (28 May 2026), https://dserver.bundestag.de/brd/2026/0314-26.pdf.
- BITV 2.0, https://www.gesetze-im-internet.de/bitv_2_0/ (Stand: V v. 24.10.2023).
- EN 301 549 V4.1.1 (2026-09), ETSI, https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf (clauses 9.0, 9.6, 9.7, 10, 11, 12, Annex ZB read directly).
- AccessibleEU, "The European accessibility standard EN 301 549 has been updated", 7 Sept 2026.
- W3C WCAG 2.2, https://www.w3.org/TR/WCAG22/; W3C news "WCAG 2.2 approved as ISO/IEC 40500:2025", 21 Oct 2025.
- Land Schleswig-Holstein, MLBF page (address, start date); MLBF website https://www.mlbf-barrierefrei.de/ (news 1 June 2026, complaint and § 32 forms).
- Deutscher Bundestag, Textarchiv 2026 KW 19 (BGG reform first reading 7 May 2026).
- Swiss Federal Council, press release 25 Feb 2026 (Inklusionsgesetz, BehiG revision in committee).
- axe-core 4.14.0 rule metadata (local `node_modules/axe-core`).

Secondary (marked where used; vendors and law firms have commercial interests):
- ZDH, Praxis Recht "Barrierefreiheit von Webseiten", page dated 18 Aug 2026, FAQ based on Bundesfachstelle answers of Feb 2025 (trade association; one PDF version wrongly gives 29 June 2025 as the start date).
- itmr-legal, "BFSG 2026: MLBF-Prüfung und Abmahnung", Rechtsstand 27 Aug 2026 (law firm; contains an invented example case, flagged by the authors).
- axes4 blog, 4 June 2026 (PDF tool vendor; claims about Abmahnung increases without figures).
- Deque, "EN 301 549 v4.1.1 is final", Sept 2026; Level Access EN 301 549 page (vendors; expected OJEU date and DOA/DOP/DOW dates).
- Beck-aktuell, 11 Feb 2026 (BGG cabinet draft).
- WKO, Barrierefreiheitsgesetz information, updated 28 Jan 2026 (Austrian chamber).
