---
name: Studio Elbe Strategieberatung
description: "Premium theme for a small strategy consultancy for the Mittelstand: a serif thesis, one real photograph, services as a ruled list and a decision log as signature."
colors:
  night: "#06161c"  # oklch(19% 0.025 225)
  night-2: "#102229"  # oklch(24% 0.028 225)
  bone: "#f1eee9"  # oklch(95% 0.008 85)
  mute-dark: "#a4b0b5"  # oklch(75% 0.015 220)
  line-dark: "#34454c"  # oklch(38% 0.025 225)
  white: "#fcfcfa"  # oklch(99% 0.002 85)
  ink: "#09161b"  # oklch(19% 0.02 225)
  mute-light: "#47555b"  # oklch(44% 0.02 225)
  line-light: "#cacfd1"  # oklch(85% 0.006 225)
  buoy: "#c93029"  # oklch(55% 0.19 28)
  buoy-on-dark: "#ef6856"  # oklch(68% 0.17 30)
typography:
  thesis:
    fontFamily: Newsreader
    fontSize: "clamp(2.5rem, 1.2rem + 5.4vw, 7rem)"
    fontWeight: 340
    lineHeight: 1
    letterSpacing: "-0.025em"
  display:
    fontFamily: Newsreader
    fontSize: "clamp(2rem, 1.3rem + 2.6vw, 3.75rem)"
    fontWeight: 360
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  service:
    fontFamily: Newsreader
    fontSize: "clamp(1.5rem, 1.1rem + 1.5vw, 2.5rem)"
    fontWeight: 380
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: Familjen Grotesk
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  small:
    fontFamily: Familjen Grotesk
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0.005em"
  label:
    fontFamily: Familjen Grotesk
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  none: "0"
  dot: "50%"
  field: "3px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "1rem"
  "4": "1.5rem"
  "5": "2.5rem"
  "6": "4.5rem"
  "7": "8rem"
components:
  service-row:
    textColor: "{colors.ink}"
    rule: "1px {colors.line-light}"
    typography: "{typography.service}"
  decision-log:
    backgroundColor: "{colors.night}"
    textColor: "{colors.bone}"
    rule: "1px {colors.line-dark}"
  link-arrow:
    textColor: "{colors.ink}"
    marker: "{colors.buoy}"
---

# Studio Elbe Strategieberatung

Premium theme for a small strategy consultancy for the Mittelstand: a serif thesis, one real photograph, services as a ruled list and a decision log as signature.

## Overview

Studio Elbe sells judgement, so the site leads with a thesis, not with a list of services. A large Newsreader statement on the dark water of the Elbe, one real aerial photograph from Stadersand, then the services as a plain ruled list with duration and price. The signature element is the **Entscheidungsprotokoll** (decision log): real-looking questions clients brought, the answer the studio gave and what happened after, each with an Elbe-km style location marker. It proves thinking instead of claiming it.

## Colors

Two grounds: night (the river at dusk) and white. One accent: the red of a fairway buoy, used as a single dot, a rule or a link marker, never as a fill area. Use the dark-ground variant of the red on night.

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--c-night` | `oklch(19% 0.025 225)` | `#06161c` | Dark background, Elbe at night |
| `--c-night-2` | `oklch(24% 0.028 225)` | `#102229` | Raised dark surface |
| `--c-bone` | `oklch(95% 0.008 85)` | `#f1eee9` | Text on night |
| `--c-mute-dark` | `oklch(75% 0.015 220)` | `#a4b0b5` | Secondary text on night |
| `--c-line-dark` | `oklch(38% 0.025 225)` | `#34454c` | Rules on night |
| `--c-white` | `oklch(99% 0.002 85)` | `#fcfcfa` | Light background |
| `--c-ink` | `oklch(19% 0.02 225)` | `#09161b` | Text on white |
| `--c-mute-light` | `oklch(44% 0.02 225)` | `#47555b` | Secondary text on white |
| `--c-line-light` | `oklch(85% 0.006 225)` | `#cacfd1` | Rules on white |
| `--c-buoy` | `oklch(55% 0.19 28)` | `#c93029` | Fairway-buoy red on white (5.2:1) |
| `--c-buoy-on-dark` | `oklch(68% 0.17 30)` | `#ef6856` | Fairway-buoy red on night (5.9:1) |

## Typography

Newsreader with optical sizes for the thesis and service names, light weights (340 to 380) and tight tracking at large sizes; italic for the one word that matters. Familjen Grotesk for all running text, labels and prices.

Fonts (self-hosted woff2, latin + latin-ext, in `assets/fonts/`, licence files alongside):

- **Newsreader**: display and thesis (optical sizes). OFL-1.1, from `@fontsource-variable/newsreader`.
- **Familjen Grotesk**: text and UI. OFL-1.1, from `@fontsource-variable/familjen-grotesk`.

## Layout

Generous, asymmetric. Thesis spans 10 of 12 columns, text blocks sit on columns 5 to 11. Services are full-width rows: name left, description middle, duration and price right. Max 86rem.

## Components

Thesis block, service rows with 1px rules and a buoy-red marker on hover, decision log (question, answer, effect, duration), short team block in text, contact line with a direct email.

## Imagery

One aerial photograph per page at most, from the Lower Elbe region, own work (Till Heidrich, Stadersand 2024). Top-down compositions that read almost abstract. No portraits without consent, no stock meeting rooms.

## Motion

Only the arrow in a service row shifts 4px on hover. No reveals.

## Do

- Write the thesis as an opinion a client could disagree with.
- Put duration and price on each service.
- Keep the red to one occurrence per viewport.

## Don't

- No three icon cards for "Analyse, Strategie, Umsetzung".
- No portraits of people pointing at whiteboards.
- No blue-to-purple gradients.

## Files

- `pages/index.html`, `pages/leistung.html` (web, 360 to 1440 px)
- `slides/01.html` (1920×1080)
- `social/01.html` (1080×1350), `social/02.html` (1200×630)

The company is fictional. Example content for Kiekkist, all copy written for this theme.
