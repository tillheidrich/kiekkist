# Directions

A direction is a promise you can show. It is not a mood, a palette or a list of adjectives. It is a real page with the client's real content, built from a thesis you can say in one sentence. Three of them, clearly different, so the client chooses between ideas and not between shades.

## The three labels

| Label | Client name | What it is | Typical risk |
|---|---|---|---|
| `safe` | Mild | The category's convention, executed better than anyone in the category does it. Same topology the market expects, sharper type, real proof, better photos, cleaner states. | Looks like the competitors. Counter it with execution and specificity. |
| `middle` | Medium | The convention with one strong, deliberate shift: a different topology, or a characterful type voice, or a colour strategy the category never uses. One shift, not three. | The shift is too timid to notice. Make it visible in the first viewport. |
| `bold` | Hot | Leaves the category's usual structure or voice while still answering the brief. It must work for the real audience in the real scene, not just impress designers. | Blendwerk. Check it against the scene sentence and the register. |

"Bold" never means decorated. A bold direction can be very quiet if the category is loud.

## The six axes

| Axis | What changes | Example values |
|---|---|---|
| Topology | How the page is structured and read | stacked bands, split diptych, index or list, poster fold, catalogue grid, narrative scroll, tool first, questions and answers (see `layout.md`) |
| Type | The voice of the display face and the reading face | grotesque, humanist sans, transitional serif, slab, condensed, monospace for data; one family or a pair |
| Density | How much sits on one screen | airy, balanced, dense |
| Imagery | What carries the visual weight | documentary photos, product or object photos, plans and diagrams, typography only, illustration, data |
| Colour | Colour strategy, not just hue | one accent, owned colour, palette, flooded (see `color.md`) |
| Grid rhythm | How the space is divided and repeated | symmetric 12 columns, asymmetric 7/5 with a wide margin, one reading measure, modular grid with rules, full-bleed bands, free poster composition |

**Rule:** the three directions differ pairwise on **at least three of the six axes**. Colour may be one of the three, never the one carrying the difference. A pair that differs mainly in colour fails, even if you can argue three axes. `scripts/axes.mjs` draws all six (brand-locked axes are left out and the rule applies to the rest).

Place each direction on the axes before building. A table like this goes into the board:

| Axis | Mild | Medium | Hot |
|---|---|---|---|
| Topology | stacked bands | index list | poster fold, then catalogue |
| Type | humanist sans | transitional serif display + grotesque | condensed grotesque only |
| Density | balanced | dense | airy first screen, dense below |
| Imagery | documentary photos | plans and facts | type only, one photo per object |
| Colour | one accent | owned colour | flooded first screen |
| Grid rhythm | symmetric 12 columns | one reading measure with a wide margin | free poster composition |

Check every pair: Mild vs Medium, Medium vs Hot, Mild vs Hot. Count the differing axes. Fix before building.

## Contents of one direction

1. **Name.** Two or three words that describe the idea, not the style. "Ledger", "Site Office", "Open House". Not "Modern Clean", not "Option B".
2. **Thesis.** One sentence: what this direction claims about the client and how the page makes that claim. "The agency's track record is the product, so the page reads like a ledger of sold houses."
3. **Anchors.** Two to four references from the board, each with what it contributes. "Ref 7: one line per project with year, place, size."
4. **Tokens.** Colours in OKLCH (4 to 6 named roles), type roles with real self-hostable fonts and their licences, spacing scale, radius scale. Stored in the `tokens` field of `kk_add_direction`.
5. **Signature element.** The one thing a visitor would describe an hour later. Everything else stays disciplined so the signature can carry.
6. **The page.** `templates/direction-page.html` filled with hero plus two or three sections of real content. It must work at 390 px and 1440 px. Check both before saving.
7. **Media probe** if the brief covers other media: one slide at 1920×1080 or one social tile at 1080×1350 in the same direction. All three directions get the same probe with the same content.

## Real content, no generated images

- Use the client's own text, offer names, prices, places, team names, reviews (quoted exactly, with source).
- Use the client's own photos when they exist. If not, an honest placeholder: a calm coloured box with a caption "Photo: roof ridge detail, close-up, morning light", so the client sees what is needed.
- A direction may carry no images at all if type and colour can hold it.
- No image generation is needed for this phase. Generated photos of people or places pretend to be evidence and are a known trust risk (see `tells.md`).

## Using other skills' lanes

A lane from another design skill (a fixed "editorial luxury" look, a minimalist kit, a preset theme) may serve as the **starting point of one direction**. Then:

- Name the source in the direction's notes.
- Adapt it to the brief: fonts, colours and components still go through the reflex test in `typography.md` and `color.md`.
- Never use it for more than one of the three directions, and never as the default for a client.

## Similarity dial

References inspire. Their shape is never copied. Set the dial per direction and state it on the board:

| Dial | Meaning | Use |
|---|---|---|
| Distant | Only abstract principles: density, contrast, rhythm | Default for the bold direction |
| Recognisable influence | Same medium and emotional temperature; different palette, composition, type and content | Maximum for client work |
| Close neighbour | Same composition logic and visual grammar | Not for client work. Only for internal studies that are never shipped |

The dial expresses intent. It is not a measured percentage.

## Originality check (before saving each direction)

For each anchor reference:

1. List its **signature elements**: the three to five things that make it recognisable (a specific layout device, a type treatment, a colour pairing, an image style, a motion idea, a wording).
2. Mark which of them your direction uses.
3. **Fail** if the direction reproduces two or more signature elements of the same anchor in combination, or any of: its text, its logo or wordmark shape, its photos, its numbers, its exact palette with the same roles.
4. Common patterns are not signature elements: a dark ground, large sans type, a pricing table, a standard footer. Escalate only distinctive combinations.

Write the result in one line per anchor on the board: "Ref 7: uses one-line project rows (1 of 4 signature elements). Pass." A visual similarity is a risk to manage, not a legal verdict; see `legal.md`.

## Rotation against memory

Before building, read the last three entries of `.kiekkist/log.json` and the profile.

- The **bold** direction must not repeat the topology, the type pair or the signature element of any of the last three builds.
- The **safe** direction may repeat a topology if it is the category's convention, but not the type pair of the last build.
- If the profile says a mechanism was rejected, do not offer it again unless the brief clearly demands it; then say so.

State the rotation in two lines before building: "Last three: index list (law firm), poster fold (bakery), stacked bands (roofer). Hot goes catalogue grid with condensed type; Mild uses stacked bands because it is the agency convention, with a different type pair."

## Failure patterns

- Three palettes on one layout.
- Three directions from the same school (three kinds of minimal). Pick from clearly different traditions: information design, editorial, craft and material, technical, poster and typographic, warm humanist.
- A direction defined by adjectives only ("premium, modern, trustworthy"). Every direction claims these.
- A beautiful hero and two sketchy sections. The client buys the whole page.
- Directions that only work with photos the client does not have.
- The recommended direction is always the middle one. Recommend from the brief, not from habit.

## Saving

`kk_add_direction` with: `name`, `label` (`safe`, `middle`, `bold`), `thesis`, `tokens`, `ref_ids`, `html`, `files` (fonts, images, probe pages). Locally: `.kiekkist/directions/<slug>/index.html` plus `direction.json` with the same fields.


## Where directions come from

Do not derive three directions from one layout by turning a dial. Start each from a different concept card (`concepts.md`), assign axes with `scripts/axes.mjs`, and pick topologies from `topologies.md`.

## Separate builders

One context that builds three directions in a row carries its first idea into the second and third. When a sub-agent tool exists, give each direction to its own builder:

- The packet per builder: the brief (with house rules), its concept card, its axis row, its two to four anchor references with mechanisms, the real texts, the brand assets, `templates/direction-page.html`, and the list of the other two directions' **concept names only** (so it knows what to avoid, without seeing their pages).
- Builders do not see each other's HTML or screenshots.
- Each builder returns the page, tokens, its thesis and a one-paragraph note of the decisions it made.
- You review all three together afterwards. Without a sub-agent tool: build each after re-reading only its packet, and mark the round `single-context`.

## Distance check (before showing)

Run `kk_compare` on the board (or `node src/check/compare.js a.html b.html c.html` in the Kiekkist repo). A pair marked `too similar` is rebuilt: keep the stronger one, give the other a new concept card and topology. `borderline` pairs need one sentence why the difference is enough. The blink test behind it: shown for a second at 1440 and 390, would a client tell them apart?

## When type is bound by the brand

See "Brand-locked mode" in `house-rules.md`. The type axis still counts when the directions change roles: serif as the voice in one, the sans in heavy weight in another, mono as the leading voice in a third, or very large against very restrained sizes. Write down which role change carries the difference.
