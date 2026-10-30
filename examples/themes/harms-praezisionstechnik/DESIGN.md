---
name: Harms Präzisionstechnik
description: "Dense, technical B2B theme for a CNC and precision-engineering supplier: drawing-frame grid, tolerance callouts in µm, spec tables, certificates and an order-status app screen."
colors:
  sheet: "#f1f4f6"  # oklch(96.5% 0.004 250)
  panel: "#fbfcfd"  # oklch(99% 0.002 250)
  ink: "#101418"  # oklch(19% 0.01 250)
  ink-2: "#4a5158"  # oklch(43% 0.015 250)
  grid: "#c9cfd4"  # oklch(85% 0.01 245)
  line: "#2c628d"  # oklch(48% 0.09 245)
  signal: "#f4ce23"  # oklch(86% 0.17 95)
  steel: "#1c2328"  # oklch(25% 0.015 245)
  ok: "#21763c"  # oklch(50% 0.12 150)
  hold: "#ac5700"  # oklch(55% 0.15 55)
typography:
  display:
    fontFamily: Archivo
    fontSize: "clamp(2.5rem, 1.4rem + 4.6vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.01em"
    fontStretch: "68%"
  heading:
    fontFamily: Archivo
    fontSize: "clamp(1.5rem, 1.1rem + 1.4vw, 2.25rem)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "0"
    fontStretch: "75%"
  body:
    fontFamily: Archivo
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
    fontStretch: "100%"
  small:
    fontFamily: Archivo
    fontSize: "0.875rem"
    fontWeight: 450
    lineHeight: 1.45
    letterSpacing: "0"
    fontStretch: "100%"
  value:
    fontFamily: IBM Plex Mono
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
  label:
    fontFamily: IBM Plex Mono
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  none: "0"
  chip: "2px"
  hole: "50%"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2.5rem"
  "7": "4rem"
components:
  title-block:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
    rounded: "{rounded.none}"
  tolerance-callout:
    textColor: "{colors.line}"
    typography: "{typography.value}"
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  status-chip:
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
---

# Harms Präzisionstechnik

Dense, technical B2B theme for a CNC and precision-engineering supplier: drawing-frame grid, tolerance callouts in µm, spec tables, certificates and an order-status app screen.

## Overview

Harms is built like a technical drawing. The page sits inside a **drawing frame with zone markers** (A to F down the side, 1 to 8 across the top) and ends in a **title block** (Schriftfeld) with drawing number, revision and scale. The signature element is the **tolerance callout**: every claim is a measurable value in µm, Ra or °C, set in IBM Plex Mono with the blueprint line colour. Content is dense on purpose: buyers in purchasing and quality want tables, not moods.

## Colors

Drawing-sheet grey, ink, blueprint blue for lines and dimensions, signal yellow only as a fill behind ink (buttons, highlighted values). Status colours exist only in the app and always come with a text label.

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--c-sheet` | `oklch(96.5% 0.004 250)` | `#f1f4f6` | Background, drawing sheet |
| `--c-panel` | `oklch(99% 0.002 250)` | `#fbfcfd` | Tables and panels |
| `--c-ink` | `oklch(19% 0.01 250)` | `#101418` | Text and frame lines |
| `--c-ink-2` | `oklch(43% 0.015 250)` | `#4a5158` | Secondary text |
| `--c-grid` | `oklch(85% 0.01 245)` | `#c9cfd4` | Grid and table rules |
| `--c-line` | `oklch(48% 0.09 245)` | `#2c628d` | Drawing lines and dimension lines (blueprint blue) |
| `--c-signal` | `oklch(86% 0.17 95)` | `#f4ce23` | Signal yellow, only as fill behind ink |
| `--c-steel` | `oklch(25% 0.015 245)` | `#1c2328` | Dark bands |
| `--c-ok` | `oklch(50% 0.12 150)` | `#21763c` | Status: in tolerance / done |
| `--c-hold` | `oklch(55% 0.15 55)` | `#ac5700` | Status: waiting (decorative, with text label) |

## Typography

Archivo with its width axis: condensed (68 to 75%) and heavy for headings in uppercase, normal width for text. IBM Plex Mono for everything that is a value, a part number or a norm reference. Use the real symbols: Ø, ±, µm, Ra, °C.

Fonts (self-hosted woff2, latin + latin-ext, in `assets/fonts/`, licence files alongside):

- **Archivo**: display (condensed widths) and text. OFL-1.1, from `@fontsource-variable/archivo`.
- **IBM Plex Mono**: values, tolerances, part numbers. OFL-1.1, from `@fontsource/ibm-plex-mono`.

## Layout

Max 96rem inside a 1.25rem frame with zone markers. 12-column grid with visible 1px rules between cells; sections are tables and drawing panels rather than floating blocks. Mobile keeps the tables, they reflow into stacked label/value rows.

## Components

Title block, spec table, tolerance callout, inline SVG part drawings with dimension lines, certificate list with registration numbers and validity, signal-yellow button with hard edges, order-status timeline in the app.

## Imagery

No photos. Parts are drawn as inline SVG technical drawings (section views, dimension lines, surface symbols). This keeps the site honest about what the company makes and avoids stock machinery shots.

## Motion

None. Hover state on table rows is a signal-yellow left rule.

## Do

- Give tolerances with unit and method (e.g. measured on CMM at 20 °C).
- Show certificate numbers and validity dates.
- Use condensed uppercase only for headings.

## Don't

- No glowing CNC stock images, no sparks, no blue gradient.
- No vague claims like "höchste Präzision" without a number.
- No rounded cards.

## Files

- `pages/index.html`, `pages/fertigung.html` (web, 360 to 1440 px)
- `slides/01.html` (1920×1080)
- `social/01.html` (1080×1350), `social/02.html` (1200×630)
- `app/01.html` (390×844)

The company is fictional. Example content for Kiekkist, all copy written for this theme.
