# House rules and brand-locked work

Some clients arrive with rules that are stricter than this skill's defaults: a brand book, a design law, a list of banned patterns, a fixed claim. Treat these as law for the project, write them down once, and make them checkable.

## The House rules block (in the brief)

Add this block to the brief whenever the client has binding rules. Copy their wording; cite the document and date.

```
## House rules  (source: <document>, <date>)
Locked:      colour | type | claim | voice | imagery | logo   (only what is really fixed)
Banned:      <patterns that become hard failures, e.g. glass, gradients, bento, icon libraries, emoji, parallax, counters, em dashes>
Limits:      <e.g. at most 3 analogue elements and 2 motions per screen; handwriting at most 4 notes per page>
Thresholds:  <stricter numbers, e.g. body 18 px, line height 1.6, contrast 7:1 for body, line length ≤ 66>
Voice:       <form of address, pronouns, banned words>
Imagery:     <own photos only, credit line, consent, no generated images>
Proof:       <every number with a source; no prices without approval>
Open:        <rules the client's documents contradict each other on; ask, do not pick>
```

Rules of use:

- **Precedence**: house rules beat this skill's defaults and every other design skill. Only an explicit instruction from the client in the conversation beats them.
- **Counted becomes banned.** A signal named under "Banned" is a hard failure for this project, whatever `tells.md` allows.
- **Stricter thresholds win**; looser client numbers never lower a WCAG minimum.
- **Contradictions inside the client's own documents** are not yours to resolve. List them under "Open" and ask once. Until answered, follow the most recent dated document and say so.
- **Ready-made assets only** where the rules supply them (annotation SVGs, icons, textures). Do not draw your own versions of brand assets.

## Brand-locked mode (Phase 4)

When colour and type (and maybe the claim and voice) are fixed, three directions cannot differ on those axes. They must differ more on the rest:

1. Run `scripts/axes.mjs --locked type,colour` (add `claim` handling yourself). It assigns topology, density, imagery and grid rhythm so every pair differs on at least three of them.
2. Start each direction from a different concept card (`concepts.md`). In locked work the concept carries most of the difference: one direction is a document, one a sequence, one a space.
3. Type may still change **roles**: the serif as voice in one, the sans in heavy weight in another, mono leading in a third, very large against very restrained sizes. Write down which role change carries the difference.
4. Colour may change **ratio**, not palette: paper-dominant, ink-dominant, a large colour field of the brand colour.
5. Run `kk_compare` with `ignore: ["h1"]` when the claim is fixed (and `"background"` when the paper colour is fixed), so fixed elements do not count as similarity.
6. If the house rules leave too little room for three real directions, say so and propose two plus a wildcard that breaks one rule visibly, marked as a rule break for the client to accept or reject.

## Content model before directions

Locked or not, decide the content before the look:

- Page types → section types → fields. Six to eight section types usually carry a whole site.
- Write the real texts for the hero and two sections before Phase 4. Directions built on real text expose length problems early (a four-line H1, 200 words above the fold).
- Mark every number that needs a source and every photo that needs consent.
