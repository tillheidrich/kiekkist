# Colour

Colour is decided at the scale of the whole surface, not swatch by swatch. Pick a strategy first, then hues, then build the system in OKLCH so lightness behaves predictably.

## Why OKLCH

OKLCH describes a colour by **L** (perceived lightness, 0 to 1), **C** (chroma, roughly 0 to 0.37 in practice) and **H** (hue angle, 0 to 360). Unlike HSL, equal steps in L look like equal steps in lightness across hues, so ramps and contrast are easier to control. It is part of CSS Color Level 4 and supported in all current major browsers.

```css
:root {
  --ink: oklch(0.24 0.02 250);
  --paper: oklch(0.97 0.008 250);
  --accent: oklch(0.58 0.13 160);
}
```

Gamut: not every OKLCH value exists in sRGB. High chroma at some hues falls outside and gets clipped by the browser. Check values with a converter (culori in Node, the browser devtools colour picker) and keep a sRGB-safe value for anything exported to PPTX, PNG or print. Wide-gamut accents can be added under `@media (color-gamut: p3)`.

## Four strategies

Decide how much of the surface colour owns. This is one of the five direction axes.

| Strategy | What it means | Fits |
|---|---|---|
| **One accent** | Tinted neutrals carry the surface; one accent marks action and emphasis | product surfaces, reading-heavy sites, conservative clients |
| **Owned colour** | One saturated colour covers a large share of the surface: fields, bands, whole sections | brands that want recognition at a glance |
| **Palette** | Three or four named colours, each with a job | multi-offer clients, culture, education, wayfinding |
| **Flooded** | The surface is the colour; text and images sit on it | posters, campaigns, the first screen of a bold direction |

Brand surfaces may take the bolder strategies when the brief allows. Product surfaces usually work best with "one accent" plus status colours, because there colour has to mean something (selected, error, success).

Commit at surface scale. A few accent dots scattered over grey is not a strategy; it is indecision.

## The scene decides light or dark

Never default to light or to dark. Use the scene sentence from the board: "A landlord checks the offer on his phone in the car, in daylight" means light ground, strong contrast. "A guest looks at the menu at the bar in the evening" can carry a dark ground. Dark mode, if needed, is designed: lower chroma, raised surfaces lighter than the ground, accents adjusted for contrast. Inverting lightness is not a dark mode.

## Tinted neutrals

Pure grey looks dead next to a brand colour. Tint neutrals towards the brand hue with low chroma, typically somewhere between 0.005 and 0.02 (practice, not a norm). Build them as a ramp:

```css
--n-50:  oklch(0.98 0.006 250);
--n-100: oklch(0.95 0.008 250);
--n-300: oklch(0.85 0.010 250);
--n-500: oklch(0.62 0.012 250);
--n-700: oklch(0.42 0.014 250);
--n-900: oklch(0.22 0.016 250);
```

Keep the hue constant along the ramp and step L evenly. Cool tints read technical and calm, warm tints read soft and homely; let the material and temperature from the board decide.

## Building a palette

1. **Start from the client's world.** Existing brand colours, vehicle livery, materials of their trade (copper, slate, timber, enamel), the colours their customers associate with them. Brand rules always win.
2. **Name colours by role, not by hue.** `--ground`, `--surface`, `--ink`, `--ink-muted`, `--accent`, `--accent-ink`, `--line`, `--focus`, plus status colours if the register needs them. Four to six named roles in the direction; the system may add ramps.
3. **Primitive and semantic layers.** Primitives (`--copper-500`) hold values; semantic tokens (`--accent: var(--copper-500)`) are what components use. Components never use primitives directly.
4. **Run the reflex test.** "Would I give this palette to any client in this industry?" Navy and gold for a law firm, green for an eco brand, indigo for software, cream with terracotta for anything warm: all are defaults (see `tells.md`). Keep one only with a brief-based reason.
5. **Check against competitors.** If the main competitor owns a colour, do not take a near neighbour of it. Compare in OKLCH: similar L and H with similar C reads as "the same colour" to customers.

## Contrast

- WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text (at least 24 px regular or about 18.7 px bold) and for UI components and focus indicators. Check every text-on-ground pair in every mode you ship.
- Coloured text on coloured ground fails more often than you expect; check accent text on surface tints.
- APCA (the contrast method proposed for WCAG 3) is still a draft. You may use it as additional information; WCAG 2.2 remains the binding check.
- Projectors and sunlight wash out contrast. For slides and outdoor phone use, aim above the minimum.

## Tokens

`tokens.css` holds the semantic and primitive custom properties. `tokens.json` holds the same values in W3C DTCG format:

```json
{
  "color": {
    "accent": {
      "$type": "color",
      "$value": { "colorSpace": "oklch", "components": [0.58, 0.13, 160], "hex": "#06915f" },
      "$description": "Calls to action, links, focus"
    }
  }
}
```

The DTCG format (2025.10) writes colours as an object with `colorSpace` and `components`; the optional `hex` is a fallback for tools without OKLCH support. Compute it with a converter, never by eye. Some older tools only read CSS strings; if a consumer needs that, generate it from tokens.json rather than editing by hand. Keep tokens.css and tokens.json in sync. Token drift, a raw colour in a component that is not in the tokens, is counted by the check.
