# Knowledge packs

Versioned JSON files the skill and the checker read. Each pack declares its own licence in its `license` field:

| Pack | Licence |
|---|---|
| `packs/tells.json` | MIT |
| `packs/reflex-fonts.json` | MIT |
| `packs/evidence.json` | MIT |
| `packs/privacy-eu.json` | MIT |
| `packs/stacks.json` | MIT |
| `packs/topologies.json` | MIT |
| `packs/a11y-eu.json` | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), attribution "Kiekkist knowledge pack a11y-eu by Till Heidrich" |

Copyright (c) 2026 Till Heidrich. The MIT terms are those in `skill/kiekkist-agency/LICENSE`.

Sources cited inside a pack keep their own licences; the packs only name and link them. Entries marked "maintainer's research notes, not public" refer to the maintainer's private notes and have no public URL. Standards (WCAG, EN 301 549) and laws are referenced, not reproduced.

To correct an entry, open a "knowledge-pack correction" issue with a source, or send a pull request that changes the pack, bumps its `version` and runs `node scripts/gen-tells-md.mjs`.
