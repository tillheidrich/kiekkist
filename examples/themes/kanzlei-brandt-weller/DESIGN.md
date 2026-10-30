---
name: Kanzlei Brandt Weller
description: "Purely typographic theme for a commercial law and tax firm serving family-owned Mittelstand companies: book typography, margin numbers, case references instead of imagery."
colors:
  paper: "#f7f7f5"  # oklch(97.5% 0.002 95)
  margin: "#ededea"  # oklch(94.5% 0.003 95)
  ink: "#16181c"  # oklch(21% 0.008 260)
  ink-2: "#4a4d53"  # oklch(42% 0.01 260)
  rule: "#bebebb"  # oklch(80% 0.004 95)
  rule-strong: "#16181c"  # oklch(21% 0.008 260)
  green: "#20563f"  # oklch(41% 0.07 162)
  green-soft: "#ddece4"  # oklch(93% 0.02 162)
typography:
  display:
    fontFamily: Source Serif 4
    fontSize: "clamp(2.25rem, 1.5rem + 3.2vw, 4.5rem)"
    fontWeight: 420
    lineHeight: 1.06
    letterSpacing: "-0.012em"
  heading:
    fontFamily: Source Serif 4
    fontSize: "clamp(1.5rem, 1.2rem + 1vw, 2.125rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.005em"
  lead:
    fontFamily: Source Serif 4
    fontSize: "clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0"
  body:
    fontFamily: Source Serif 4
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "0"
  meta:
    fontFamily: Public Sans
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0.01em"
  smallcaps:
    fontFamily: Public Sans
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.12em"
rounded:
  none: "0"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1.25rem"
  "5": "2rem"
  "6": "3.5rem"
  "7": "5.5rem"
components:
  case-reference:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    typography: "{typography.meta}"
    rounded: "{rounded.none}"
  practice-table:
    textColor: "{colors.ink}"
    rule: "{colors.rule}"
  button-text:
    textColor: "{colors.green}"
    underline: "2px"
---

# Kanzlei Brandt Weller

Purely typographic theme for a commercial law and tax firm serving family-owned Mittelstand companies: book typography, margin numbers, case references instead of imagery.

## Overview

A law firm that does not look like a law firm brochure: no scales, no gavel, no paragraph sign, no handshake. The site is set like a well-made commentary. Every section carries a **Randnummer** (Rn.) in the margin column, the way German legal commentaries are cited, and every case example carries an **Aktenzeichen** (`Az. 25/0412 · NAC`). The practice areas use the same three-letter codes as the case references, so the system is consistent from the table of practice areas to the mandate examples.

## Colors

Neutral paper (not cream), graphite text, one accent: the dark green of a file folder. Green is used for links, case references and the 2px section rules. No second accent.

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--c-paper` | `oklch(97.5% 0.002 95)` | `#f7f7f5` | Page background, neutral paper |
| `--c-margin` | `oklch(94.5% 0.003 95)` | `#ededea` | Margin column and table heads |
| `--c-ink` | `oklch(21% 0.008 260)` | `#16181c` | Text, graphite |
| `--c-ink-2` | `oklch(42% 0.01 260)` | `#4a4d53` | Secondary text, margin notes |
| `--c-rule` | `oklch(80% 0.004 95)` | `#bebebb` | Rules |
| `--c-rule-strong` | `oklch(21% 0.008 260)` | `#16181c` | Section rules, 2px |
| `--c-green` | `oklch(41% 0.07 162)` | `#20563f` | Accent: file-folder green, links and case references |
| `--c-green-soft` | `oklch(93% 0.02 162)` | `#ddece4` | Highlight behind a case reference |

## Typography

Source Serif 4 carries everything that is read, using its optical-size axis: display cuts for the big statement, text cuts at 18px for body. Public Sans appears only in the margin, in tables and in meta lines, small and with tabular figures. Hierarchy comes from size and space, not from colour.

Fonts (self-hosted woff2, latin + latin-ext, in `assets/fonts/`, licence files alongside):

- **Source Serif 4**: text and display (optical sizes). OFL-1.1, from `@fontsource-variable/source-serif-4`.
- **Public Sans**: meta, labels, tables. OFL-1.1, from `@fontsource-variable/public-sans`.

## Layout

Book layout: a fixed margin column (11rem) for Randnummern and notes, a text column with 38rem measure, tables may run across both. Max width 76rem, centred, section rules end with the text block like a printed page. On mobile the margin column folds above the text as a single meta line.

## Components

Practice table (code, field, typical occasion, partner), case reference chip (no radius), mandate entries as ruled list, a fee box that states prices, partner list as typeset text without photos.

## Imagery

None. The theme is deliberately typographic. If a client insists on portraits, use black and white, same crop, placed in the margin column.

## Motion

None. Links underline thicken on hover.

## Do

- State fees in euros.
- Write in full sentences, first person plural.
- Use Randnummern only as a real sequence.

## Don't

- No paragraph sign as decoration.
- No stock images of handshakes, books or Justitia.
- No centred text blocks.

## Files

- `pages/index.html`, `pages/nachfolge.html` (web, 360 to 1440 px)
- `slides/01.html` (1920×1080)
- `social/01.html` (1080×1350), `social/02.html` (1200×630)

The company is fictional. Example content for Kiekkist, all copy written for this theme.
