# Page topologies

The topology is the page's skeleton: what the first screen holds, how sections follow each other, how the reader moves. It is the axis models fall back to most often (hero left, image right, three cards, logo strip, testimonial, call to action). Each direction picks a **different topology from this list or invents one**, and the three must not share the first-screen arrangement (`kk_compare` checks this).

Each entry: id, sketch at 1440 px, what it suits, how it collapses at 390 px, how it fails. `axes.mjs` draws from these ids.

Rotation: topologies used in the last three builds (`.kiekkist/log.json`) are spent for the bold direction and discouraged for the others.

---

**T01 split-hero** (the convention)
```
[ H1 + lead + CTA ][   image   ]
[ card ][ card ][ card ]
```
Suits: almost anything; that is the problem. Phone: image under text. Fails: indistinguishable from every template. Allowed only as `safe`, and then executed better than the category.

**T02 full-bleed statement**
```
[        H1 over full-width photo        ]
[ narrow text column ]
```
Suits: one strong photo, hospitality, places. Phone: crop the photo deliberately (art direction, not centre crop). Fails: stock photo, text contrast on busy image.

**T03 broadsheet front page**
```
[ masthead / date line                    ]
[ lead story 2/3      ][ column of briefs ]
[ story ][ story ][ story ]  ruled columns
```
Suits: clients with many news or offers, editorial voice. Phone: lead story, then briefs as a list. Fails: becomes a card grid with rules.

**T04 index / table of contents**
```
[ 01  Service ........................ → ]
[ 02  Service ........................ → ]
[ 03  Service ........................ → ]
```
Suits: clear catalogue of services, consultancies, archives. Phone: natural. Fails: no hierarchy if every line weighs the same; give one line a reason.

**T05 timetable / sequence**
```
[ 08:00 | Stop name | what happens ]
[ 09:30 | Stop name | what happens ]
```
Suits: processes, onboarding, courses, events. Phone: time above stop. Fails: fake times; use real steps.

**T06 annotated document**
```
[ document image / page  ][ margin notes ]
   ① ② ③ markers on the document
```
Suits: auditors, consultants, reviewers, before/after. Phone: document full width, notes below with numbers. Fails: unreadable crop; notes as decoration.

**T07 single column essay**
```
      [ 60-70ch column, H1 as first line ]
      [ pull quote ] [ inline figure ]
```
Suits: personal brands, thinkers, writers, lawyers. Phone: natural. Fails: wall of text without entry points.

**T08 ledger / table-first**
```
[ column heads: item | for whom | result | time ]
[ row ]
[ row ]
```
Suits: price lists (where allowed), comparisons, technical products. Phone: rows become stacked definition lists. Fails: tables that scroll sideways.

**T09 catalogue grid with specimen**
```
[ specimen large ][ meta list ]
[ tile ][ tile ][ tile ][ tile ]
```
Suits: products, portfolios, fonts, real estate. Phone: specimen then two-up grid. Fails: equal tiles, no specimen.

**T10 asymmetric poster**
```
[ HUGE word ]
              [ small text block ]
       [ image offset into margin ]
```
Suits: brand surfaces with few words, culture, events. Phone: poster scales down, small text stays legible. Fails: H1 overflow, no information.

**T11 question-led / FAQ as structure**
```
[ The question your audience asks (H1) ]
[ answer ][ answer ][ answer ]  as Q → A blocks
```
Suits: advisers, health, legal, B2B with fears. Phone: natural. Fails: generic questions.

**T12 map / place-led**
```
[ map or floor plan with numbered points ]
[ 1 place  2 place  3 place ]
```
Suits: local businesses, estates, campuses, tourism. Phone: list first, map toggle. Fails: map tiles from US SaaS without consent; use a static drawn map.

**T13 pegboard / tool wall**
```
[ outlined tools on a grid, each labelled ]
```
Suits: trades, agencies with clear tools, software features. Phone: one tool per row. Fails: icon grid in disguise.

**T14 conversation / transcript**
```
Kunde:  question
Firma:  answer
Kunde:  objection
```
Suits: services sold through trust, coaching. Phone: natural. Fails: invented quotes; use real or clearly labelled sample dialogue.

**T15 split screen two worlds**
```
[ before / problem ][ after / solution ]  scroll in sync
```
Suits: transformation offers. Phone: alternating blocks. Fails: cliché before/after slider.

**T16 dossier / stacked sheets**
```
[ sheet 1: cover ]
  [ sheet 2: finding ]
    [ sheet 3: plan ]   offset, layered
```
Suits: consulting, investigations, reports. Phone: sheets stack vertically, offset reduced. Fails: skeuomorphic kitsch.

**T17 numbers-first board**
```
[ 1 big real figure ][ what it means ]
[ figure ][ figure ][ figure ]
```
Suits: clients with real, sourced numbers only. Phone: one figure per screen. Fails: invented statistics. Never with placeholder numbers.

**T18 gallery wall / exhibition**
```
[ work ]   [ work ]
     [ wall text ]
[ work ]        [ work ]
```
Suits: photographers, architects, makers. Phone: one work at a time with wall text. Fails: masonry grid.

**T19 letter**
```
[ place, date ]
[ Salutation, ]
[ letter body in the client's voice ]
[ signature ]
```
Suits: personal services, founders, local trades. Phone: natural. Fails: too long; keep a P.S. as the CTA.

**T20 programme / bill**
```
[ TONIGHT / THIS SEASON ]
[ act  ·  time  ·  place ]
[ act  ·  time  ·  place ]
```
Suits: events, venues, workshops, courses. Phone: natural. Fails: theatre costume for a non-event business.

---

## Inventing a topology

If a concept card (`concepts.md`) implies a structure not listed here, use it and give it a new id (T21+) in the log. Describe it with a sketch at 1440 and 390 before building. The best directions often need a topology that only that client's form could produce.

## First-screen rule

Within one set of three, no two directions may share:
- the position of H1 and the largest image in the first screen (left/centre/right × top/middle/bottom), and
- the sequence of section types after the first screen.

`kk_compare` measures both and the blink hash of the first screen.
