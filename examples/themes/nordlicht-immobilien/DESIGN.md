---
name: Nordlicht Immobilien
description: "Editorial theme for a high-end estate agency in the Hamburg Elbvororte: magazine layout, large photography, generous white space and a printed exposé data sheet."
colors:
  paper: "#f6f9fb"  # oklch(98% 0.004 240)
  paper-2: "#edf1f4"  # oklch(95.5% 0.006 240)
  ink: "#151e29"  # oklch(23% 0.025 255)
  ink-2: "#4d5660"  # oklch(45% 0.02 250)
  line: "#cdd2d6"  # oklch(86% 0.008 245)
  brass: "#af8c54"  # oklch(66% 0.085 78)
  brass-text: "#785224"  # oklch(47% 0.08 68)
  deep: "#172632"  # oklch(26% 0.03 245)
  on-deep: "#f6f9fb"  # oklch(98% 0.004 240)
typography:
  display-xl:
    fontFamily: Cormorant
    fontSize: "clamp(3.25rem, 2rem + 6vw, 8.5rem)"
    fontWeight: 300
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  display-lg:
    fontFamily: Cormorant
    fontSize: "clamp(2.4rem, 1.6rem + 3.4vw, 4.75rem)"
    fontWeight: 350
    lineHeight: 1
    letterSpacing: "-0.015em"
  display-md:
    fontFamily: Cormorant
    fontSize: "clamp(1.75rem, 1.3rem + 1.6vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  body:
    fontFamily: Hanken Grotesk
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: Hanken Grotesk
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.14em"
  data:
    fontFamily: Hanken Grotesk
    fontSize: "0.9375rem"
    fontWeight: 450
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  none: "0"
  hairline: "1px"
  button: "2px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "1rem"
  "4": "1.5rem"
  "5": "2.5rem"
  "6": "4rem"
  "7": "7rem"
  "8": "11rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "14px 22px"
  link-quiet:
    textColor: "{colors.ink}"
    underline: "1px brass, offset 0.3em"
  expose-sheet:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "32px"
---

# Nordlicht Immobilien

Editorial theme for a high-end estate agency in the Hamburg Elbvororte: magazine layout, large photography, generous white space and a printed exposé data sheet.

## Overview

Nordlicht reads like the property section of a good weekend magazine, not like a portal. One large photograph per view, a light Cormorant headline that is allowed to be very big, and long quiet stretches of paper. The agency sells few houses and says so; the design has to carry that restraint. Everything a buyer needs is set in the **Exposé-Datenblatt**, the signature element: a printed-looking data sheet with hairline rules, tabular figures, energy data as required by the GEG and a small floor-plan drawing in inline SVG.

## Colors

Cool paper white instead of cream, harbour navy instead of black, and one metal accent (brass) that only ever appears as a rule, a marker or a small label. Brass is too light for body text on paper; use `--c-brass-text` when it must be read. The dark band (`deep`) is reserved for the contact block and the app header.

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--c-paper` | `oklch(98% 0.004 240)` | `#f6f9fb` | Page background, cool paper white |
| `--c-paper-2` | `oklch(95.5% 0.006 240)` | `#edf1f4` | Data sheet and quiet panels |
| `--c-ink` | `oklch(23% 0.025 255)` | `#151e29` | Primary text, near-black harbour navy |
| `--c-ink-2` | `oklch(45% 0.02 250)` | `#4d5660` | Secondary text, captions |
| `--c-line` | `oklch(86% 0.008 245)` | `#cdd2d6` | Hairlines |
| `--c-brass` | `oklch(66% 0.085 78)` | `#af8c54` | Accent for rules and markers only (not text on paper) |
| `--c-brass-text` | `oklch(47% 0.08 68)` | `#785224` | Accent when used as text on paper (6.6:1) |
| `--c-deep` | `oklch(26% 0.03 245)` | `#172632` | Dark contact band |
| `--c-on-deep` | `oklch(98% 0.004 240)` | `#f6f9fb` | Text on deep |

## Typography

Cormorant (variable, 300 to 500) for headlines and place names, often in italic for the Elbvororte. Hanken Grotesk for running text, labels and all numbers; labels are uppercase with 0.14em tracking, numbers use `font-variant-numeric: tabular-nums`. Headlines are set left, never centred, and may break into the margin.

Fonts (self-hosted woff2, latin + latin-ext, in `assets/fonts/`, licence files alongside):

- **Cormorant**: display. OFL-1.1, from `@fontsource-variable/cormorant`.
- **Hanken Grotesk**: text. OFL-1.1, from `@fontsource-variable/hanken-grotesk`.

## Layout

12-column grid, max 90rem, gutter clamps from 1rem to 4rem. Text never exceeds 34rem measure. Hero: full-bleed photograph first, headline below it overlapping the grid on the left. Sections are separated by space (7rem to 11rem), not by boxes. On mobile the order stays the same, the photo crops to 4:5.

## Components

Exposé-Datenblatt (definition list in two columns, hairlines, floor plan), object list as ruled rows (location in italic, key data right-aligned), a process line with real weeks, a two-column index of locations, a single dark ink button with 2px radius. No cards with shadows.

## Imagery

Own architectural photography only, shot in natural light, never retouched with AI. Wide, calm, a lot of sky or water. Captions state place and photographer. Example images: Till Heidrich (tillheidrich.de), Hamburg 2019 and Copenhagen 2022.

## Motion

None beyond a 160ms colour change on hover and focus. No scroll reveals, no parallax.

## Do

- Let one image fill the viewport width per page section.
- Write prices, areas and energy values in full, with units.
- Use italic Cormorant for place names.

## Don't

- No cream background with terracotta.
- No stacked cards with shadows or rounded 16px corners.
- No "Traumimmobilie", no superlatives.

## Files

- `pages/index.html`, `pages/verkaufen.html` (web, 360 to 1440 px)
- `slides/01.html` (1920×1080)
- `social/01.html` (1080×1350), `social/02.html` (1200×630)
- `app/01.html` (390×844)

The company is fictional. Example content for Kiekkist, all copy written for this theme.
