# Slides

A deck is a sequence of fixed compositions, not a web page. Build it from the same tokens as the website, on a fixed stage, and check every slide as an image.

## Canvas

- Every slide is authored on a **1920×1080** stage (16:9). The stage scales as a whole to fit the viewport; it may letterbox, it never reflows.
- Inside the stage, use fixed px values. `clamp()` and viewport units belong outside the stage only.
- One file per slide (`slides/01-title.html`) or one deck file with one `section.slide` per slide; both link `../tokens.css`.
- Export to PDF with print CSS (`@page { size: 1920px 1080px; margin: 0 }`) and a headless browser, one page per slide. Check the PDF, not only the HTML.

## Grid

- A margin of the same size on all four sides, defined as a token, and a column grid inside it (12 columns works; 6 makes stronger slides).
- A fixed position for recurring elements: slide title, page number, source line. They do not move between slides. The logo belongs on the title and closing slides; inner slides and section dividers usually do without it (measured decks from consultancies rarely repeat it).
- **Decide the mode first:** a *presented* deck (spoken to, few words: about 44 pt titles, 24 pt text, at most about 25 words per slide) or a *reading* deck (sent as PDF and read alone: about 28 pt titles, 13 pt text on a 960×540 pt stage, warn above about 180 words). Keep the title-to-text ratio between about 1.8 and 2.6. They are two token sets, not one deck with small type.
- One baseline for body text across slides, so a sequence of slides does not jump.

## Readable sizes

These are house rules (practice, not research), chosen so slides stay readable when shared in a video call on a laptop and on a projector at the back of a room:

| Element | Minimum on the 1920 stage |
|---|---|
| Body text, bullets | 28 px |
| Captions, sources, footnotes | 20 px |
| Slide title | 48 px |
| Numbers in charts, axis labels | 22 px |

If content does not fit at these sizes, split the slide. Never shrink text to fit.

Contrast: projectors and screen-sharing compression wash out colour. Keep text contrast well above the WCAG minimum (`color.md`) and avoid light text on mid-tone images.

## Density modes

Ask which kind of deck it is; it changes everything:

| Mode | Use | Design |
|---|---|---|
| **Speaker deck** | Someone presents live | One idea per slide, large type, few words, more slides |
| **Reading deck** | Sent around, read alone | Self-contained slides, structured grids, tables, captions, still one main point per slide |

When the use is mixed, pick the closer one; a half-and-half deck serves neither.

## From the system

- Type roles from DESIGN.md. If the deck must also exist as PPTX, the fonts must be installed on presenting machines or embedded; otherwise PowerPoint substitutes them silently. Decide this before the first slide; if embedding is impossible, the deck needs a fallback face named in DESIGN.md.
- Colours: use sRGB-safe values for anything exported to PPTX or PDF.
- One recurring motif from the direction's signature element, not a new idea per slide.
- Slide types to cover for a full system: title, section divider, statement, content with image, comparison, numbers or chart, quote, team or contact, closing.

## Content rules

- One message per slide, written as a sentence in the title where it helps ("Renovations take 6 weeks on average, repairs 3 days"), not a topic label ("Duration").
- Numbers need sources on the slide.
- Real images from the client. No stock metaphors (handshakes, chess pieces, light bulbs).
- No internal labels on slides: no "Option A", file names, "template", "draft" unless it is a draft.

## Format traps

| Trap | Fix |
|---|---|
| Text overflows its box only in the exported PDF | check the export, not the browser preview |
| PPTX conversion drops effects (blend modes, filters, CSS gradients on text) | keep effects out of slides that must become PPTX |
| Fonts substituted on another machine | embed or install; name a fallback in DESIGN.md |
| Dark slides unreadable on a bright projector | test one slide on a projector or at reduced screen brightness |
| Slide numbers missing in the PDF | number in the slide markup, not only in presenter tools |
| Animation-dependent content | every slide makes sense as a still image |

## Check

Render every slide to an image at 1920×1080 and look at it. Run the check for overflow and contrast. Then look at the whole deck as a contact sheet: does it read as one system, and does each slide carry exactly one point?

## Canvas size for Kiekkist

Put the canvas size in the head of every file, so Kiekkist renders the screenshot at the right size: `<meta name="kk:size" content="WIDTHxHEIGHT">`, for example `1920x1080` (slide), `1080x1350` or `1200x630` (social), `390x844` (app).
