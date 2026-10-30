---
version: alpha
name: "{{THEME_NAME}}"
description: "{{ONE_SENTENCE_SUMMARY}}"
colors:
  ground: "oklch({{L}} {{C}} {{H}})"
  surface: "oklch({{L}} {{C}} {{H}})"
  ink: "oklch({{L}} {{C}} {{H}})"
  ink-muted: "oklch({{L}} {{C}} {{H}})"
  accent: "oklch({{L}} {{C}} {{H}})"
  on-accent: "oklch({{L}} {{C}} {{H}})"
  line: "oklch({{L}} {{C}} {{H}})"
  focus: "oklch({{L}} {{C}} {{H}})"
typography:
  headline-display:
    fontFamily: "{{VOICE_FAMILY}}"
    fontSize: "{{px or rem}}"
    fontWeight: {{WEIGHT}}
    lineHeight: {{UNITLESS}}
    letterSpacing: "{{em}}"
  headline-lg:
    fontFamily: "{{VOICE_FAMILY}}"
    fontSize: "{{px or rem}}"
    fontWeight: {{WEIGHT}}
    lineHeight: {{UNITLESS}}
  body-md:
    fontFamily: "{{READING_FAMILY}}"
    fontSize: "{{px or rem}}"
    fontWeight: {{WEIGHT}}
    lineHeight: {{UNITLESS}}
  label-md:
    fontFamily: "{{UTILITY_FAMILY}}"
    fontSize: "{{px or rem}}"
    fontWeight: {{WEIGHT}}
    lineHeight: {{UNITLESS}}
    fontFeature: "\"tnum\" 1"
spacing:
  xs: "{{px}}"
  sm: "{{px}}"
  md: "{{px}}"
  lg: "{{px}}"
  xl: "{{px}}"
  margin: "{{px}}"
  content-max: "{{px}}"
rounded:
  none: "0px"
  sm: "{{px}}"
  md: "{{px}}"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
---

# {{THEME_NAME}}

<!--
  Write this file from the built pages and the recorded decision, not from wishes.
  Section order follows the design.md format; Imagery and Motion are extra sections that design.md consumers preserve.
  Delete this comment before saving.
-->

## Overview

{{Two or three paragraphs. Client, audience and the scene sentence. The thesis of the chosen direction in one sentence. The signature element and where it appears. Register (brand or product) and what that means for expression.}}

Decision: {{direction name}}, decided {{YYYY-MM-DD}} by {{who}}. Combination: {{per axis, or "none"}}.

## Colors

{{Colour strategy (one accent, owned colour, palette, flooded) and why. Each role in plain words: what it is for, where it must not be used. Contrast pairs that were checked, with ratios. Dark appearance if any.}}

## Typography

{{Each role (voice, reading, utility, accent) with family, licence, weights or axes used, where the files live. The scale and why. Rules for German: hyphenation, long words, quotes, numbers.}}

| Family | Role | Licence | Files |
|---|---|---|---|
| {{family}} | {{role}} | {{SIL OFL 1.1 or other}} | `assets/fonts/{{file}}.woff2` |

## Layout

{{Topology of the main pages. Grid: columns, margins, gutters. Spacing rules (inner smaller than outer, more space above headings). Density. How the first screen is built at 390 and 1440 px.}}

## Elevation & Depth

{{How surfaces separate: lines, tints, shadows, or nothing. If shadows exist, which levels and where.}}

## Shapes

{{Radius scale and which components use which radius. Line weights. Any shape motif from the signature element.}}

## Components

{{Inventory with states. For each: purpose, token usage, states (default, hover, focus, active, disabled, error, loading where relevant), and the native component it maps to for app builds.}}

- Buttons: ...
- Links: ...
- Form fields: ...
- Navigation: ...
- Content blocks (replacing generic cards): ...
- Price and data displays: ...
- Footer: ...

## Imagery

{{What carries the visual weight. Photo style (light, framing, subjects), who supplies photos, captions, placeholders until photos exist. What is excluded (stock clichés, generated people).}}

## Motion

{{The one orchestrated moment, if any. Responses to user actions. Durations and easing as tokens. Reduced-motion behaviour.}}

## Do's and Don'ts

- Do: {{rule derived from the decision}}
- Do: {{rule}}
- Don't: {{rule, ideally naming a rejected option from the directions}}
- Don't: {{rule}}

## Media

| Medium | Canvas | Files | Notes |
|---|---|---|---|
| Web | 390 / 768 / 1440 | `pages/` | |
| Slides | 1920×1080 | `slides/` | {{font embedding decision}} |
| Social | 1080×1080, 1080×1350, 1200×630 | `social/` | {{series slots}} |
| App | 390×844 | `app/` | {{native mapping}} |
