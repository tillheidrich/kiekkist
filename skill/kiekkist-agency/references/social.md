# Social graphics

A social graphic is seen at thumbnail size, for about a second, between other people's content. It must be recognisable before it is read. Build it from the same tokens as the website, as a series system, not as one-off posters.

## Formats

| Format | Size (px) | Ratio | Used for |
|---|---|---|---|
| Square | 1080×1080 | 1:1 | feed posts on most platforms |
| Portrait | 1080×1350 | 4:5 | feed posts; takes more vertical space in the feed |
| Link preview (Open Graph) | 1200×630 | about 1.91:1 | `og:image` for shared links, LinkedIn and Facebook link posts |
| Story, reel cover (optional) | 1080×1920 | 9:16 | stories, short video covers |

Platform specs change. Re-check the platform's own help pages before a campaign and note the date in DESIGN.md.

## Safe zones and crops

- **Profile grid crops.** Some platforms crop feed images in the profile grid (Instagram moved to a taller 3:4 grid thumbnail in early 2025). Keep headline and logo inside the central area so they survive a crop from the sides or from top and bottom.
- **Stories and reels.** Platform UI covers the top and bottom of the frame (profile name, reply bar, captions). Keep text out of roughly the top and bottom 250 px of a 1920 frame (practice; check the current platform UI).
- **Link previews.** Some clients show the 1200×630 image cropped or very small. The headline must still read at 600 px wide; nothing important within the outer 5 %.

## Readability at thumbnail size

Test every graphic at 25 % of its size (270 px wide for a square). If the main message is not readable there, it is not readable in the feed.

House rules (practice, not research):

- At most two text levels: one headline, one short supporting line. More text belongs in the caption.
- Headline at least about 64 px on a 1080 canvas, supporting text at least about 36 px.
- High contrast; no text over busy photo areas without a solid field behind it.
- One focal point per graphic.

## A series system

The client posts many graphics over months. Design the system, not the single post:

- **Fixed slots**: where headline, supporting line, image, an optional logo and an optional badge or date sit. Many strong brand feeds carry no logo on most tiles; recognition comes from the system. Two text elements per tile is the measured median; more is a slide, not a tile. The slots repeat; the content changes.
- **Templates per post type**: announcement, tip, project photo, quote or review, event, job offer. Three to six types usually cover a year.
- **Brand rules first.** If the client or the taste profile defines a social schema (for example a fixed line structure, a word limit per line, a badge shape), it is binding and overrides this file.
- **Variation inside the system**: alternate colour fields from the palette, swap image and text sides, use the signature element in different scales. A feed of identical posts is as dull as a feed of unrelated ones.

## Production

- Build each template as HTML at its exact size (`social/announcement-1080x1350.html`) linking `../tokens.css`.
- Render to PNG with a headless browser at the exact viewport and `deviceScaleFactor: 1` for platform upload; keep a 2x render for print or high-density use if needed.
- Export colours as sRGB; platforms convert everything to sRGB anyway.
- Provide alt text for every post in a text file next to it; platforms let users add it and screen reader users depend on it.

## Format traps

| Trap | Fix |
|---|---|
| Thin type disappears after platform compression | medium or heavier weights for small text |
| Fine gradients band after compression | flat fields or add grain |
| Red text on black or blue on red vibrates | check contrast and hue distance |
| Logo too small to read | the logo is the least important element in the feed; consistent placement does the recognition, not size |
| QR codes on feed posts | rarely work on the device that shows the post; use them on print and slides |

## Check

Run the check on each template for overflow and contrast. Then put the planned posts side by side as a 3-column grid preview: does the series read as one client, and does each post read at thumbnail size?

## Canvas size for Kiekkist

Put the canvas size in the head of every file, so Kiekkist renders the screenshot at the right size: `<meta name="kk:size" content="WIDTHxHEIGHT">`, for example `1920x1080` (slide), `1080x1350` or `1200x630` (social), `390x844` (app).
