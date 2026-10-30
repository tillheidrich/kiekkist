# Critique

The person who built a design is the worst judge of it. You know what you meant, so you see it. The review therefore has two layers: a measurement that does not care what you meant, and a critique by a separate agent that never saw you build.

## Layer 1: measurement

Run `kk_check` with the theme slug, a URL or the HTML, or `node scripts/check.mjs <theme-dir|file|url>`. The report contains:

- `hard`: failures to fix (contrast, overflow, missing alt, placeholders, CDN fonts).
- `counts`: slop signals with count, threshold and `over` flag (catalogue in `tells.md`).
- `findings`: details with selector and viewport.
- `score` and `grade`: a summary for comparison over time, not a quality verdict.

Fix every hard failure. For each counter that is over its threshold, remove the cause or write one line why the brief earns it. Then go to layer 2 with the report.

### Manual checklist when no tool is available

If `check.mjs` reports that neither Kiekkist nor its CLI is available, do this by hand, with a browser tool if you have one:

1. **Overflow:** open each page at 390, 768 and 1440 px. Run `document.documentElement.scrollWidth > window.innerWidth` in the console. Look for clipped text in cards and buttons.
2. **Contrast:** list every text colour on every ground colour from the tokens; compute the WCAG ratio (any contrast tool or `culori` in Node). Check accent text and text on images.
3. **Token drift:** search the CSS for raw colours and sizes outside `tokens.css` (`#`, `rgb(`, `oklch(` in component styles; px values not on the spacing scale).
4. **Fonts:** search for `fonts.googleapis`, `fonts.gstatic`, `typekit`. Confirm every font file has its licence.
5. **Content:** search for lorem, placeholder, TODO, invented numbers.
6. **Slop signals:** walk the tables in `tells.md` and count.
7. **Similarity:** compare topology, type pair and signature with the last three entries of `.kiekkist/log.json`.

Write the results in the same shape as the tool report so they can be compared later.

### Blink test for direction sets

For a set of directions, look at the first screens side by side for one second each, desktop and phone. If two read as the same page in different clothes, the set fails regardless of scores. `kk_compare` measures this (perceptual hash of the first screen, hero arrangement, section sequence); trust your eyes over the number when they disagree, and say which.

### Per-section review (during building)

After each section, take a screenshot and check it against DESIGN.md in a short pass/fail table: tokens only, type roles, spacing scale, one primary action, real content, works at 390. Fix before the next section. The hero is built and polished first; its decisions (the "art bible": type sizes, spacing, image treatment, signature element) are written into DESIGN.md before the rest of the page is built.

### Positive test

Absence of slop is not quality. A finished page should show one signature interaction or element and at least five visible detail decisions that belong to this client (a figure style, a list marker, a caption treatment, a navigation idea, a photo crop rule). List them. Fewer than five means "correct, not good".

## Layer 2: independent critique

### The packet

Spawn a sub-agent with a fresh context. Give it **only**:

- the confirmed brief,
- the decision record (chosen direction, reason, combination),
- DESIGN.md,
- screenshots of every built page or slide at every checked viewport,
- the file paths, so it can open the pages itself,
- the check report from layer 1,
- the last three structure entries from the log (for the variance axis).

Do **not** give it the build conversation, your intentions, or your own assessment. Its value is that it sees what is there, not what you meant.

### Prompt for the sub-agent

> You are a senior art director reviewing a design you did not make. Read the brief and the decision first. Then look at every screenshot before reading DESIGN.md, and note your first impression in two sentences: what would a stranger say this is, and what would they remember an hour later. Then score six axes from 1 to 5 using the anchors provided, with one sentence of evidence each, pointing at a specific place in a specific screenshot. List findings with priority P0 to P3. Name two or three things that work. End with the single change that would lift the design most. Do not rewrite the design. Do not soften findings. If the design is correct but unremarkable, say so in those words.

### The six axes

| Axis | Question | 1 | 3 | 5 |
|---|---|---|---|---|
| **Stance** | Does the design take a position about this client? | competent layout, no idea | an idea is visible but timid | one clear idea carries every page |
| **Hierarchy** | Is the order of importance clear in two seconds? | everything equal | main point clear, rest flat | primary, secondary, action instantly clear on every page |
| **Execution** | Type setting, spacing, alignment, states, responsiveness | visible errors | clean, some rough spots | precise at every viewport and state |
| **Specificity** | Could a competitor use this by swapping the logo? | yes, unchanged | partly; some sections are generic | no; content, structure and details belong to this client |
| **Restraint** | Does every element earn its place? | decoration everywhere | some decoration without job | nothing to remove; boldness spent in one place |
| **Variance** | Does it differ structurally from the last builds? | same skeleton as a recent build | different surface, same skeleton | clearly different structure and voice |

No overall score. The axes do not add up to quality, and an average hides the one weak axis that matters.

### Priorities

| Priority | Meaning | Action |
|---|---|---|
| **P0** | Blocks the job: the audience cannot read, find or do the main thing; legal or accessibility failure | fix before anything else |
| **P1** | Seriously weakens the job: unclear hierarchy, generic first screen, broken state, contradiction with the decision | fix in this round |
| **P2** | Noticeable flaw with a workaround: inconsistent spacing, weak secondary section | fix if the round allows |
| **P3** | Polish | note for later |

Rule of thumb: would the client or a visitor notice and be bothered without being told? Then at least P1.

### When no sub-agent exists

Do the critique yourself, but only after a deliberate reset: read nothing but the packet, write the first impression before reading DESIGN.md, and mark the report `single-context`. It is weaker; say so.

## Correction rounds

- Fix all P0 and P1, then measure again (layer 1) and send the changed screens back for a short re-review of the fixed points.
- **At most two correction rounds.** After that, stop and report what remains with its priority. Endless polishing usually makes a design safer and blander.
- A fix must not break the decision. If the critique asks for something that contradicts the chosen direction, raise it with the human; do not quietly change direction.

## Correct is not good

A design can pass every measurement and score 3 everywhere. Then it is correct and forgettable. Say this plainly in the report: "Correct, not good. Nothing is broken; nothing is memorable. The lift would be ..." and name the one change. Clients forgive a missing polish pass. They do not come back for a page they cannot remember.

## Report format

```
Review: <theme or page>, <date>, <dual-context | single-context>

First impression: ...
Check: grade <X>, hard failures <n> (all fixed | open: ...), counters over threshold: <list with fix or reason>

Stance        <1-5>  <evidence>
Hierarchy     <1-5>  <evidence>
Execution     <1-5>  <evidence>
Specificity   <1-5>  <evidence>
Restraint     <1-5>  <evidence>
Variance      <1-5>  <evidence>

Works: ...
Findings:
  P0 ...
  P1 ...
  P2 ...
  P3 ...
Biggest lift: ...
Verdict: ready | ready after fixes | correct, not good | not ready
```
