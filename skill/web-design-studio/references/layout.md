# Layout

Layout is the axis where generated work converges hardest. A page can have a fresh palette and fresh type and still read as a template because it has the same skeleton as every other page: hero, three cards, alternating image and text, logo strip, call-to-action band, footer. Decide the skeleton on purpose.

## Story before shape

Before picking a topology, write the page's argument as a sequence of beats, one line each, from the brief:

1. **Hook**: the first thing the audience must understand.
2. **Problem or situation**: what they came with.
3. **Answer**: what the client offers for it.
4. **How**: how it works, what happens next.
5. **Proof**: why to believe it.
6. **Close**: the one action.

Not every page needs every beat, and the order can change. The topology carries the argument; it does not replace it.

## Topologies

Name the topology of each direction. These are the common ones; combine at most two on one page (one for the first screen, one for the rest).

| Topology | Shape | Carries well |
|---|---|---|
| **Stacked bands** | Full-width sections, one idea each, text and visual alternating | a product or service with several distinct parts |
| **Split diptych** | Two columns for most of the page: a fixed statement or navigation column beside a scrolling content column | single-voice studios, consultants, personal brands |
| **Index or list** | The work or offer as a set list: one line per item with facts | track records, project lists, menus, legal specialisms |
| **Poster fold** | One composed first screen carries the message; the rest is quieter | events, launches, a single strong offer |
| **Catalogue grid** | Many comparable items in a grid with real images and facts | shops, property listings, product ranges |
| **Narrative scroll** | The argument told top to bottom, one beat per screen | offers that need explaining, unfamiliar services |
| **Tool first** | The page opens with the thing the visitor came to do: calculator, booking, search | appointments, quotes, configurators |
| **Questions and answers** | The page is built from the real questions customers ask | trust-heavy decisions: health, law, finance, big purchases |
| **Document** | A long, well-set text with a table of contents | reports, guides, terms that matter |

The safe direction usually takes the category's topology. The bold direction usually changes it.

## Grid

- Choose columns from content, not habit. A 12-column grid is flexible; fewer columns (4, 6) give stronger compositions with less temptation to fill every cell.
- Define margins and gutters as tokens (`--space-gutter`, `--space-margin`) and use them everywhere.
- Break the grid on purpose, once or twice, for the signature element. Breaking it everywhere is noise.
- Align text to a shared left edge in most layouts. Centred text works for short statements, not for paragraphs.

## Spacing

- One spacing scale for the whole system, stored as tokens (for example a geometric scale on a 4 px or 8 px base). Do not invent one-off values.
- Inner spacing smaller than outer spacing: the space inside a group is less than the space between groups. This is how the eye finds groups.
- More space above a heading than below it, so the heading belongs to what follows.
- Vary section rhythm: a dense passage earns a quiet one. Equal padding on every section is a tell.

## Density

| Density | Feels | Fits |
|---|---|---|
| Airy | calm, expensive, slow | few offers, strong images, brand register |
| Balanced | familiar, efficient | most service sites |
| Dense | competent, informative, fast | catalogues, B2B, product register, price-driven decisions |

Density is a direction axis. Dense is not ugly; badly organised density is.

## Hierarchy in two seconds

Squint at the screenshot or blur it. You should still see: the one most important thing, the second, the action. If everything has the same weight, hierarchy is missing. Use size, weight, colour and space, in that order of strength, and spend them on few elements.

## Mobile is a different page

At 390 px the order of beats matters more than the grid. Decide what the phone visitor sees first, not what the desktop layout collapses into. Typical traps: a sidebar that lands above the content, a three-column comparison that becomes a long unreadable stack, a sticky header that eats a quarter of the screen.

## Recording structure

Every finished theme logs its structure in `.kiekkist/log.json` (see `memory.md`): topology, navigation pattern, first-screen pattern, footer pattern, type pair, colour strategy, signature element. The next build reads it and rotates. Structure varies across clients; within one client's site it stays coherent.
