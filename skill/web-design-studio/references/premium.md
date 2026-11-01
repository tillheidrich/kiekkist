# Premium theme quality

What bought themes have that an AI first draft lacks, as numbers an agent can hit and a checker can count. Also: what a theme ships (the target for `kk_save_theme`), how to rebuild a design faithfully when that is allowed, and how Elementor kits compare to our output.

Evidence base: Kiekkist board "Benchmark: Premium-Themes (30.10.2026)", 34 captures (33 ok, 1 blocked). 7 Flothemes sites (Mono, Elise, Velvet, Lyra, June, Nomade, Pronto), 9 ThemeForest demos (Salient, Uncode ×2, Kalium ×2, Ohio, Avada, The7, Enfold), 10 Webflow templates ($59 to $79), 5 Framer templates ($79 to $149), 2 getdesign.md pages. Numbers below come from the captured tokens (desktop 1440), the CSS of the templates (mobile breakpoints), the page sets linked from each home page, and full-page and mobile screenshots. Each claim names the theme it comes from.

Two families showed up, and they set different bars:

- **Photographer themes** (Flothemes, Pronto). The image carries the page. Display type stays small (34 to 45 px), set in a serif with no tracking. Labels are small uppercase with wide tracking. Premium comes from restraint, consistent photo grading and a complete set of photographer pages.
- **Studio templates** (Webflow, Framer, Uncode, Ohio). The type carries the page. Display type is huge (100 to 300 px) with negative tracking. These pages are long (9,000 to 28,000 px), lean on motion libraries and use many image sizes.

An AI first draft usually falls between the two: 48 to 64 px sans headings with no tracking, three to six images, the same "centred heading + three cards" section repeated, a one-line footer and no inner pages. It sits in the dead middle, and nothing about it is decided.

---

## 1. What premium themes have that first drafts lack

### 1.1 Distinct section layouts per page

- **Flothemes Mono** (a photographer's live site, 10,419 px): 7 different layouts on the home page. In order: a full-bleed hero with split navigation; a two-column intro on a cream band (`#fbfaf7`); a staggered three-image collage (large image with text on it, a small image set lower, a B/W portrait set higher, each with a small underlined uppercase link); an about block (large serif name, tracked subline, body, link, portrait); a 4-column masonry portfolio with serif captions; a dark CTA band on a background image with an outlined button; a text + image block. No layout appears twice in a row.
- **Pronto** (merissawakefield.com): 9 layouts. Hero, a two-column intro, an about card framed with a hairline and a vertical rule, a blog feature (one large post and two small), an image + text "Portfolio" block, testimonials split by a vertical divider, an Instagram row, an SEO paragraph and a tinted three-column footer.
- **Uncode Creative Architect**: hero, portrait + long text with read-more, a dark services band in three columns (statement, numbered steps, accordion list), a scattered case-study grid with a giant word behind it, and news.
- **Counter-example, Kalium Construction:** 12 sections, but only 3 patterns ("centred heading + grid of cards" again and again, plus a yellow CTA band twice). It looks like a template even though it is one. More sections do not make a page premium. Different sections do.

**Bar:** at least 6 distinct layout patterns on a home page. The same pattern never appears twice in a row. "Centred heading + N equal cards" appears at most once.

### 1.2 Header and menu variants

Observed variants:

- **Split navigation with the logo centred.** Mono (four links left, logo, three links and search right), Pronto.
- **Logo left, links right ("Type B left-aligned").** Elise, Velvet, Lyra.
- **Transparent header over the hero ("flo-header--over").** June. The header turns solid once the page scrolls (Mono, Pronto).
- **Static header ("Type C").** Nomade.
- **Pill navigation centred, with one CTA button on the right.** Kanzo ("Free consultation").
- **Text toggle "MENU +" that opens a full-screen overlay.** Korda, Teracle.
- **Mega menu.** Salient, Uncode, Ohio, Avada. Useful only for large sites.
- **Off-canvas and hamburger variants as separate demos.** Ohio ships `centered-hamburger` and `creative-hamburger`.

Every Webflow and Framer template switches to a hamburger or "MENU" toggle at 390 px. Themes sell headers as **selectable variants** (Flothemes types A, B, C). A theme always defines both the scrolled state and the transparent-on-hero state.

**Bar:** the header has at least 2 defined states (on the hero / scrolled), and the mobile menu has its own design (not a dropdown list). The menu opening and closing is animated (opacity/transform, 200 to 400 ms).

### 1.3 Hero variety

- **Full-bleed photo or video at 100vh** with a centred serif line and a tracked uppercase subline. Mono, Elise, Nomade, Pronto.
- **Giant wordmark or display line, 130 to 300 px**, often bleeding past the edges or cropped on purpose. Arpeggio (wordmark across the full width), Caspia (wordmark with photos floating around it), Archon 260 px, Soren 279 px, Kanzo 300 px, Teracle 200 px (on mobile cropped to "TECTURE STU" as texture).
- **Asymmetric split.** Studio Monolight: a photo block overlaps a coloured panel, with a vertical rotated label and slide arrows.
- **Hero with a docked card.** Kanzo: a project card ("Tsuki House, Detail Project") pinned to the bottom right of the hero image.
- **Video hero.** Edge Studio, Atelier Norr (3 videos on the page), Neiden (19 videos).

**Bar:** the hero is a decision, not a default. Pick one of these types on purpose, and write its decisions into DESIGN.md (`SKILL.md`: the hero is the art bible).

### 1.4 Type scale

Measured at 1440 px (h1 or largest size) and in the CSS at 479/390 px:

| Theme | Display 1440 | Display 390 | Tracking on display | Families |
|---|---|---|---|---|
| Flothemes Mono (photographer's site) | 45 px Unna | about 28 px | 0 | 4 (Prata, Unna, Nunito Sans + system) |
| Elise (laurabravi.com) | 28 to 38 px Cormorant | n/m | +0.079em (h1 set in caps) | 4 |
| Pronto (merissawakefield.com) | 89 px Fraunces Thin (w100) | about 45 px | −0.01em | 6 |
| Salient Agency | 90 to 100 px Playfair | n/m | 0 | 3 |
| Ohio Demo 1 | 75 px DM Sans 700 | n/m | **−0.045em** | 2 |
| Kalium Construction | 72 px Archivo Narrow 600 | n/m | 0 | 2 |
| Avada Photography | 120 px Megrim | n/m | 0 | 3 |
| Atelier Norr (Webflow) | 60 to 170 px Inter Display | 42 px | **−0.04em** h1, −0.03em h2 | 2 to 3 |
| ArchLine (Webflow) | 65 px Inter 600 | 46 px | **−0.035em** (−2.275 px) | 1 |
| Archon (Webflow) | 260 px Bebas Neue | 90 px | −0.023em, −4 px at the largest size | 2 |
| Kanzo (Webflow) | 80 px headings, 300 px background word | 60 to 100 px | slight negative | 3 (Inter Tight + Instrument Serif italic + Libre Caslon Condensed) |
| Teracle (Webflow) | 200 px Chakra Petch | cropped | 0 | 2 |
| Victor Noir (Webflow) | 100 to 120 px Satoshi | 72 px | n/m | 1 |
| Korda (Framer) | 112 px Inter 500 | about 60 px | **−0.05em** | 1 |
| Soren (Framer) | 279 px | n/m | n/m | 3 (incl. Chivo Mono labels) |

(n/m = not measured)

Patterns:

- **Ratio of display size to body size.** Photographer themes run 2.1 to 2.8 (body 15 to 16 px, display 34 to 45 px). Studio templates run 6 to 19. The first draft's 3 to 4 is the weak zone: too loud to be quiet, too timid to be bold. Choose one camp.
- **Negative tracking on large sans display:** −0.02em to −0.05em (Ohio, Atelier Norr, ArchLine, Korda, Archon). Serif display stays at 0 or slightly positive.
- **Small uppercase labels, widely tracked:** 11 to 13 px, +0.15em to +0.2em. This shows up in all Flothemes sites (Mono 0.2em, Lyra 0.15 to 0.17em, Velvet 0.2em) and in Pronto. Eyebrow labels with a dot or bracket do the same job in the studio templates (Kanzo "● ABOUT", Uncode "● SERVICES").
- **Mobile scaling:** display shrinks to 35 to 70 % of desktop (Archon 260 → 90, Kanzo 300 → 100, Victor Noir 120 → 72, Edge 102 → 56, Atelier Norr → 42). It does not shrink proportionally: the smallest display sizes stay at least 2.5× body on mobile.
- **One extra voice:** a serif italic inside a sans headline (Kanzo "for a *Refined Lifestyle*", "Rooted in *Simplicity & Balance*"), or a mono for labels (Soren Chivo Mono, getdesign.md Geist Mono).
- **Number of families:** Webflow and Framer templates use 1 to 3. Flothemes customer sites carry 4 to 6, because the theme lets owners upload any font. That is a weakness of the customer sites, not the theme, and not a model to copy.

**Bar:** display/body ratio ≤ 3 (quiet camp) or ≥ 5 (bold camp), never 3.2 to 4.8 without a written reason. Display at 390 px at least 2.5× body. Sans display ≥ 56 px gets tracking between −0.01em and −0.05em. Uppercase labels get +0.08em to +0.2em. At most 3 families. Fluid sizes with `clamp()` (`web.md`).

### 1.5 Image treatment

- **Image count on the home page:** Avada Photography 123, Uncode 110 to 115, Archon 97, ArchLine 86, Atelier Norr 74, Kanzo 70, Mono 92 `img` elements (masonry portfolio). A first draft has 3 to 6. Premium pages *show the work*.
- **Mixed sizes and offsets instead of equal cards.** The Mono collage (three images at different sizes and heights). The Uncode Architect case grid (images in 4 widths placed on a 4-column grid with free cells and a giant word behind). Arpeggio (pairs of portrait images, the second offset downwards). The Monolight collage (overlapping images). Victor Noir (`.9fr 1.1fr` columns).
- **Full-bleed against framed.** Heroes and CTA bands are full-bleed. Content images are framed with page margins, sometimes inside a hairline frame (Pronto). Full-width project cards stack as 100 % bands with the title left, the client right and a hairline between them (Arpeggio).
- **Captions with substance:** project name and type (Uncode "Nordic Villa", "Oakley University"), category pills (Kanzo "Hospitality", "Retail"), serif captions under each masonry image (Mono "Bauzeitreportage – Mit einer Maurerkolonne unterwegs").
- **One grade across all photos** (warm and matte at Pronto, Elise and Mono; cool and desaturated in the architecture templates). This was the single strongest factor in how expensive a site looked. Several current demos use generated images (Arpeggio, the Monolight interiors), but always in one consistent look.
- **Technique:** `srcset` on most images (The7 93 of 95, Arpeggio 285, Mono 86 of 92), `loading="lazy"` below the fold (Webflow templates lazy-load almost every image).

**Bar:** the home page shows ≥ 12 real work images (portfolio clients ≥ 20) in ≥ 3 different aspect ratios and ≥ 2 sizes per row in at least one section. All photos share one grade (write it into DESIGN.md: warm/cool, contrast, saturation). Every portfolio image has a caption with what and where.

### 1.6 Whitespace rhythm

- The largest spacing token sits between 100 and 160 px (Victor Noir and Archie 160, Neiden 150, Monolight 131, Korda 128, Kanzo 120, ArchLine 112, the Flothemes sites 101). Section gaps are this large token, not 48 to 64 px.
- **Alternating surfaces:** Mono changes white → cream band → white → dark image band. Uncode changes white → dark band `#141618` → warm grey case band. Pronto ends with a tinted footer.
- **Page length:** Webflow and Framer home pages run 9,000 to 28,500 px (Neiden 28,528; Archon 22,860; Teracle 22,635; Arpeggio 21,722). Flothemes pages run 2,400 to 12,600 px. A first draft is 3,000 to 5,000 px.

**Bar:** section padding ≥ 96 px at 1440 px and ≥ 56 px at 390 px. At least 2 background surfaces alternate on the home page. Vertical spacing comes from a scale with ≥ 6 steps and a largest step ≥ 112 px.

### 1.7 Grid

- The Webflow CSS always uses the breakpoints 991 / 767 / 479. The most common column sets are `1fr 1fr` (Atelier Norr 17×, ArchLine 17×, Monolight 16×), then `1fr 1fr 1fr`, then 4 columns. Templates add asymmetric sets: `.9fr 1.1fr` (Victor Noir), `1fr auto` (Atelier Norr), `33.3vw 33.3vw` (Monolight).
- **Text starts off the left edge.** Uncode places the body text from column 3 of 12 next to a small portrait. Mono sets its intro as a centred serif heading on the left with body text on the right. This offset is what reads as "designed".
- **Free cells.** The Uncode case grid and the Arpeggio pairs leave cells empty on purpose.

**Bar:** at least one section uses an asymmetric split (not 50/50) or an offset text column. At least one section leaves intentional empty grid cells. Gutters are tokens (typically 24 to 40 px at 1440 px).

### 1.8 Demo content quality

- **Names, places and dates instead of lorem ipsum:** Uncode ("St George House", news items dated 25.03.2025), Monolight (founder bios "Elena M.", "Andrea S."), Kalium (team "Sarah G. Voigt, Project Manager", partner logos), Pronto (real testimonials with first names).
- Demos sell a **life** ("Melbourne Bayside Family Photographer", "London-based design studio"). The copy has a voice and local detail.
- For our client work, the rule in `web.md` and `legal.md` stands: real client copy and photos, labelled gaps, no invented proof. For theme demos (Kiekkist examples): invented but plausible, with names, places and dates, and marked as example content.

### 1.9 Micro-interactions and motion

Libraries found on the captured pages:

- **GSAP:** Uncode, Kalium, Atelier Norr, Kanzo, Archon, ArchLine, Teracle.
- **Lenis smooth scroll:** Uncode, Atelier Norr, Teracle, Arpeggio.
- **Split text:** Kanzo, Archon, ArchLine, Teracle.
- **Webflow Interactions:** most Webflow templates.
- **Framer appear effects:** all Framer templates.
- **Lottie:** Uncode, Archon, Monolight, The7.

Typical effects: headlines revealed line by line or word by word; text that fills from grey to black while it scrolls (Kanzo "Deeply rooted…"); images revealed with a clip or scale from 1.1 to 1.0; image zoom on hover in the project grid with the title fading in; a background word in a marquee (Uncode "Case Studies"); slider arrows with a counter (Monolight "01").

**Watch out:**

- Several templates hide content until a scroll trigger fires. In full-page screenshots, Kanzo, Caspia and Monolight showed large empty areas. Without JavaScript, or for a crawler, the content is invisible. Premium themes get this wrong. We do not.
- Ohio blocked the first screen with a newsletter modal. A modal on the first screen is a minus, not a feature.

**Bar:** hover states on every link, card and image. The menu animates in and out. Reveal motion only with `opacity`/`transform`, 300 to 800 ms, with a stagger of 40 to 80 ms per item. All content is visible without JS and with `prefers-reduced-motion: reduce`. No modal on the first screen. Smooth scroll is optional and off for reduced motion.

### 1.10 Page transitions

None of the captured themes used a page-transition library (no Barba or Swup found). Webflow and Framer fade the page in on load. Flothemes uses a short fade. **Convention:** a 200 to 300 ms fade on load or the View Transitions API in Astro. A full-screen wipe between pages is a matter of taste, not the bar.

### 1.11 Galleries and sliders

- **Flothemes:** every site loads Slick (slideshow block), Masonry and a lightbox. Pages are built from blocks such as `slideshow-1/2`, `listing-2--masonry`, `gallery-view-2--columns-4` and `listing-pagination`.
- **Uncode, Salient, Kalium:** Isotope filters, Masonry and a lightbox. Salient, Kalium and The7 use Swiper.
- Done well this means: keyboard and swipe, a visible counter or progress, arrows outside the image, captions in the lightbox, no autoplay faster than 5 s, images held at their aspect ratio (no cropping heads in masonry), and lazy loading.

**Bar:** every gallery has a lightbox with keyboard (← → Esc), swipe, captions and focus return. Sliders have a counter, a pause option and no autoplay under 5 s.

### 1.12 Footer richness

Footer markup size: Arpeggio 39.5 kB, Pronto 34.6 kB, Neiden 25 kB, Korda 14.7 kB, Kalium 10 kB, Atelier Norr 8 kB. What they contain:

- logo and a short claim
- 2 to 4 link columns
- address, phone and email
- a CTA button ("Contact me", "Get a quote")
- social icons
- an Instagram row or newsletter (Pronto)
- an SEO paragraph about the region (Pronto)
- legal links
- a back-to-top link

**Bar:** the footer has ≥ 4 of these elements: contact block, CTA, navigation columns, social, newsletter or feed, legal, back-to-top. In Germany, Impressum and Datenschutz are mandatory.

### 1.13 Consistency across inner pages

What the templates link from the home page (page set):

- **Atelier Norr:** about, projects + project (CMS), blog, contact, privacy, terms, 401, 404, utility pages.
- **Studio Monolight:** studio, works, portfolio, news-stories, shop, checkout, contact, styleguide, licensing, changelog, 401, 404.
- **Victor Noir:** home-a and home-b, about-a and about-b, projects-a and projects-b, blog, shop, product, checkout, legal. Page variants are part of the product.
- **Ohio:** about-ver1 to about-ver6, contact-us-ver1 to contact-us-ver6, plus header variants.
- **Neiden (Framer, 11 pages):** home, about-us, projects (9 CMS entries), blog (7), career, contacts, thank-you, privacy, terms, 404.
- **Korda:** home, about, projects (9), articles (6), a subscribe confirmation, and a **design-system page**.
- **Flothemes photographers:** about, portfolio/gallery, blog, contact, FAQ, testimonials, packages/pricing, experience, albums, videography (sarbostudio, silviaporopat, alessiotagliavento).

Inner pages reuse the same header, footer, type scale and section vocabulary. They vary the layout, not the system.

**Bar:** every theme ships the full page set from section 3. Every inner page uses only DESIGN.md tokens and components. The home page is never the only finished page.

---

## 2. Theme quality bar (checklist for the checker)

`M` = measurable automatically, `S` = screenshot or agent judgement. **C** = convention (everyone does it, missing it reads as cheap). **T** = taste (a choice; write it down in DESIGN.md, do not enforce it).

| # | Check | Threshold | M/S | C/T | Source |
|---|---|---|---|---|---|
| 1 | Distinct section layouts on home | ≥ 6, no pattern twice in a row | S (M via section fingerprint) | C | Mono, Pronto, Uncode; counter-example Kalium Construction |
| 2 | Repeated "heading + N equal cards" | ≤ 1 per page | M | C | first drafts, Kalium |
| 3 | Display/body ratio | ≤ 3 or ≥ 5 (3.2 to 4.8 needs a reason) | M | T (camp) / C (decide) | Flothemes vs Webflow/Framer |
| 4 | Display at 390 px | ≥ 2.5× body, no overflow | M | C | Webflow CSS |
| 5 | Tracking on sans display ≥ 56 px | −0.01em to −0.05em | M | C | Ohio, Atelier Norr, ArchLine, Korda |
| 6 | Uppercase labels | tracking +0.08em to +0.2em, 11 to 14 px | M | C | Flothemes, Pronto |
| 7 | Font families | ≤ 3 | M | C | Webflow/Framer 1 to 3 |
| 8 | Header states | on-hero and scrolled defined; mobile menu designed | S | C | Flothemes A/B/C, Korda |
| 9 | Work images on home | ≥ 12 (portfolio ≥ 20), ≥ 3 aspect ratios | M | C | Avada, Uncode, Mono |
| 10 | Asymmetric or offset section | ≥ 1 | S | T | Uncode, Victor Noir, Mono collage |
| 11 | Section padding | ≥ 96 px desktop, ≥ 56 px mobile; largest spacing token ≥ 112 px | M | C | spacing tokens 100 to 160 |
| 12 | Alternating surfaces | ≥ 2 background tones | M | C | Mono, Uncode |
| 13 | Captions | every portfolio image: what + where | M (count) | C | Uncode, Mono |
| 14 | Photo grade | one grade written in DESIGN.md | S | T | all |
| 15 | Hover states | links, cards, images, buttons | M (CSS `:hover` per component) | C | all |
| 16 | Motion safety | content visible without JS and with reduced motion; only opacity/transform | M | C | Kanzo/Caspia failure |
| 17 | No first-screen modal | 0 | M | C | Ohio failure |
| 18 | Gallery | lightbox with keyboard, swipe, captions | M (presence) + S | C | Flothemes, Uncode |
| 19 | Footer | ≥ 4 element types, Impressum + Datenschutz | M | C | Arpeggio, Pronto |
| 20 | Page set | full set from section 3, 404 included | M | C | Webflow, Framer |
| 21 | Token drift on inner pages | 0 raw values outside tokens | M | C | `kk_check` |
| 22 | Images | `srcset`, width/height, lazy below the fold | M | C | The7, Arpeggio |
| 23 | Contrast on image heroes | text ≥ 4.5:1 against the actual image region (scrim if needed) | M | C | Pronto failure (thin serif on a light photo at 390 px) |
| 24 | One signature element | named in DESIGN.md | S | T | Arpeggio wordmark, Mono collage |

Taste decisions to make explicitly, not by default: quiet or bold camp; serif or sans display; photo grade; signature element; motion intensity (none / reveal / scroll-driven).

---

## 3. Theme anatomy (target for `kk_save_theme`)

What a premium theme ships. Webflow, Framer and Kits converge on this.

### Pages

- **Home** in at least 2 variants (Victor Noir home-a/b; Kits ship "Home Style 1 to 3"; Flothemes ships 20+ page templates).
- **About** (Ohio: 6 variants).
- **Services** + **service detail**.
- **Portfolio/projects** + **project detail** (CMS-driven).
- **Blog/journal** + **article** (CMS).
- **Contact** + **thank-you**.
- **Pricing/packages** (Flothemes photographers, Kanzo, Cooper).
- **Team/career** (Neiden, Kits).
- **FAQ** and **testimonials** (Flothemes, Kits).
- **Legal:** Impressum, Datenschutz.
- **Utility:** 404, password/401 (Webflow), coming soon/maintenance (Kits).
- **Style guide / design system page** (Webflow /styleguide, Korda /design-system).
- **Licensing/credits** and **changelog** (Webflow).

### Global parts

- **Header** in 2+ variants (transparent over hero, solid, split-logo or left-logo), plus the mobile menu.
- **Footer** in 1 to 2 variants.
- **Announcement bar** (optional).
- **Cookie notice** in the theme's own style.

### Section library

At least 20 sections, each with desktop and mobile layouts (Flothemes: each kit has 20 blocks, the theme 70+ predesigned layouts, each with a separate mobile version):

- **Heroes (4):** full-bleed image/video, wordmark, split, hero with card.
- **Intro/statement (2):** two-column, centred serif.
- **Work (4):** masonry, asymmetric case grid, full-width project bands, slider.
- **Text + image (3):** offset, overlapping, framed.
- **Services/process:** numbered steps, accordion list, columns.
- **Proof:** testimonials, logos, figures, press.
- **About/person.**
- **Team.**
- **Pricing/packages.**
- **FAQ.**
- **CTA bands (2):** image background, plain colour.
- **Blog teaser.**
- **Instagram/feed.**
- **Contact with form + map/address.**

### Components and states

- **Buttons** (primary, secondary, text link with underline), each with default, hover, focus, active and disabled.
- **Links** with hover and focus.
- **Form fields:** default, focus, error, success, disabled.
- **Cards:** default, hover.
- **Navigation:** default, active page, hover; mobile menu open and closed.
- **Gallery:** lightbox open, slider counter.
- **Accordion:** open, closed.
- **Tags/pills.**
- **Pagination.**
- **Empty and error states:** 404, no search results, form failure.

### System files

- `tokens.css`: colour (2 schemes: light and one alternative or dark, as in Flothemes kits), type scale, spacing scale, radii, motion durations.
- `DESIGN.md`: the art bible, with hero decisions, photo grade, signature element, do/don't. Structure it like the getdesign.md/Stitch format: colour, typography, components, layout, responsive.
- **Demo content** with names, places and dates, marked as example.
- **Licences:** fonts (OFL text), image credits.

`kk_save_theme` should refuse or warn when the page set has only a home page, when there are fewer than 12 sections, or when a component lacks focus or hover states.

---

## 4. Rebuild mode ("nachbauen")

### When it is allowed

Rebuild faithfully (structure, layout, type, spacing and assets 1:1) **only** when:

1. **It is the user's own site.** Example: a photographer rebuilding their own portfolio, with their own content.
2. **It is a theme the user licensed**, and the rebuild stays within the licence. Theme licences bind to one end product:
   - **Flothemes:** "use each purchased Flothemes theme on one domain only". Modification is allowed, reselling is not.
   - **ThemeForest Regular Licence:** 1 end product, you may build it for one client, not for several clients or jobs. Not allowed in items for sale or in templates.
   - **Webflow template, paid:** "one single End Product for yourself or for one client". You may not extract components to use elsewhere.
   - **Framer marketplace:** the licence page could not be fetched on 30.10.2026. Check the template page before rebuilding.

   So: a rebuild of a licensed theme is for the licensed domain only. It may not become a Kiekkist theme, a template for other clients or a public example.
3. **The rights holder gave written permission.**

In every other case, rebuild the **structure and mechanism** with the client's own content, own photos, licensed fonts, own colours and a changed composition. That is the "recognisable influence" side of the similarity dial (`directions.md`, `legal.md` § 23 UrhG, § 4 Nr. 3 UWG). Logos, photos, texts and the theme's code never move over. Font files only move over when the licence covers the new use (a commercial font bought for the old site does not automatically cover a new build).

### Process

1. **Capture.** Run `kk` capture at 1440 and 390, plus full-page screenshots.
   - Scroll the page through before the full-page shot, because scroll-triggered content stays hidden otherwise (Kanzo, Caspia, Monolight).
   - Dismiss modals (Ohio).
   - Capture inner pages too (about, a portfolio detail, contact).
   - Save the HTML and CSS only for analysis (§ 44b UrhG), and only in the private reference store.
2. **Section inventory.** List each section top to bottom: type (from section 3 of this file), height at 1440 and 390, grid, content slots, background, motion. Example for the Mono home page: hero-fullbleed / intro-2col-cream / collage-3-staggered / about-person / masonry-4col / cta-image-dark / text-image.
3. **Tokens.** Take colours, families, sizes, line heights, tracking and spacing from the captured tokens and the CSS (custom properties first, then computed styles). Write them to `tokens.css`. Write DESIGN.md with the decisions (hero, grade, signature).
4. **Layout grid.** Columns, gutter, max width and margins per breakpoint. Note asymmetric splits and offsets as numbers (for example "text column starts at col 3/12", "collage: 7/12 + 3/12 offset 120 px down + 2/12 offset 60 px up").
5. **Components.** Header (both states and mobile), footer, buttons, links, cards, gallery/lightbox, forms, with every state.
6. **Assets.** Use the user's own photos and logo. Self-host fonts, and only under a valid licence. Icons from an open set, not ripped from the theme.
7. **Build section by section** in Astro/HTML from tokens only. After each section, take a screenshot at 1440 and 390.
8. **Pixel comparison loop.**
   - Screenshot the original and the rebuild with the same viewport, fonts loaded, motion disabled (`prefers-reduced-motion`) and identical content.
   - Diff each section with pixelmatch/odiff.
   - Proposed tolerance: ≤ 3 % differing pixels per section after masking photos and video. Also check per section that the bounding boxes of headings, images and buttons are within ±4 px at 1440 and ±2 px at 390.
   - Fix the largest deviation first and repeat until all sections pass or the remaining difference is explained (such as a licence-free substitute font).
9. **Check.** Run `kk_check`. Also check the bar in section 2, motion safety, contrast on images, accessibility (`web.md`), and inner pages against the same tokens.
10. **Record.** In DESIGN.md, write the source, the licence basis (own site / licence no. / permission), and what was deliberately changed.

The capture tool and checker do not have this diff loop yet (as of 30.10.2026). Until they do, run it with Playwright and pixelmatch in the build folder.

---

## 5. Elementor and WordPress kits, and how our output compares

### How a kit is built

- **Base:** WordPress + a thin theme (usually Hello Elementor) + Elementor (often Pro) + helper plugins. The Mtech kit, for example, needs "Jeg Elementor Kit" and "MetForm".
- **Global kit (site settings).** A special post holding global colours (built-in IDs primary, secondary, text, accent, plus custom ones), global fonts, typography, buttons, form fields, layout widths and breakpoints. Widgets reference these as `__globals__: { "title_color": "globals/colors?id=primary" }` and fall back to raw values if the global is missing.
- **Templates:** one JSON per page. A typical set is Global Style; Home 1 to 3; About; Service; Service Single; Portfolio; Portfolio Single; Team; Testimonials; FAQ; Blog; Single Blog; Contact; Header; Footer; 404.
- **Theme builder:** header, footer, single and archive templates applied by display conditions.
- **Installation:** set permalinks → install Hello Elementor → upload the kit ZIP → install the required plugins → **import the global kit first** → import the templates one by one.
- Flothemes works the same way with its own builder ("Flex"): a style kit = a font pairing + 2 colour schemes + 20 blocks; 70+ predesigned layouts, each with a desktop and a mobile version; WP blocks (listings, slideshows, forms) next to Flex blocks; page templates for home, about, contact and so on.

### What a client expects from it

- Change text and photos in a visual editor without calling anyone.
- Add a page from a template and duplicate sections.
- Change the colour or font once, and it changes everywhere.
- Forms that send email, a gallery they can fill, blog posts.
- Mobile tweaks per breakpoint.
- Hosting they understand and an update button.

The cost: heavy DOM and CSS, plugin dependencies, update risk, slower pages. That cost shows up as the many libraries in the captured WordPress demos. Clients also get editing freedom that breaks the design (6 font families on Flothemes customer sites).

### Our output side by side

| Kit concept | Our equivalent |
|---|---|
| Global kit (colours, fonts, buttons, breakpoints) | `tokens.css` + DESIGN.md (one source; components use only tokens) |
| Page templates (Home 1 to 3, About, …) | Astro pages/layouts with page variants, from the page set in section 3 |
| Section templates and blocks | Astro section components with props (the section library) |
| Theme builder header/footer + conditions | layout components (`BaseLayout`, header variants via prop) |
| Widgets | components with documented states |
| Kit "Style Guide" page | `/styleguide` page in the theme, as in Webflow and Korda |
| Visual editing | content in Markdown/content collections or a headless CMS. The client edits text, images, projects and posts, but not tokens and layout. |

**What we must match** so a client doesn't miss the kit: a style guide page; documented page and section variants; content editing for text, images, projects and posts; a clear "how to add a page" in the handover. **Where we are better:** speed, no plugin chain, no design drift (tokens can't be overridden per widget), DSGVO (self-hosted fonts, no CDN), and a DESIGN.md any agent can continue from.

**Sales rule:** don't promise free layout editing. Sell "your content, safely editable; layout changes are a small job". Show the style guide page as proof of the system.

---

## Sources and notes

- Research board with 34 references (private Kiekkist instance; kits.yumnatype.com failed with "non-public address").
- Flothemes licence: help.flothemes.com/article/329-terms-and-conditions. Mono and Flex: flothemes.com/new-theme-mono/, help.flothemes.com/article/391-getting-started-with-flex-flothemes.
- **Flothemes status as of 30.10.2026:**
  - The company is part of Pixieset. The shop now leads to "Pronto". The demo server (demo.flothemes.com) shows a maintenance page.
  - Of 10 German showcase sites checked, 2 still run a Flothemes theme, 3 moved to Squarespace, 2 to Wix, and 3 could not be identified or were unreachable.
  - Of about 66 sites in three international showcase posts: 11 on classic Flothemes themes, 6 on Pronto, 12 on Kadence.
- ThemeForest Regular Licence: themeforest.net/licenses/standard. ThemeForest blocks automated fetching, so the sales figures are from WinningWP's all-time list (Avada 324k, Enfold 124k, Bridge 71k, Salient 63k, Uncode 22k), with no date given.
- Webflow template licences: webflow.com/templates/template-licenses.
- Elementor global styles: developers.elementor.com/docs/data-structure/global-styles/. Kit contents: ThemeForest "Mtech" kit page.
- getdesign.md: browsable front end of github.com/VoltAgent/awesome-design-md (MIT; 73 brands in the repo, "550+" in the catalog). The files are analyses of public CSS, "not official design systems"; using them is allowed, impersonating brands and copying logos or images is not.
