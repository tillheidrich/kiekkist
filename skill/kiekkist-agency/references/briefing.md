# Briefing

A brief is the cheapest place to be wrong. Every hour of design built on a guessed audience is thrown away later. The briefing exists to get the six facts that change the design, in as few questions as possible.

## Before you ask anything

Read what already exists, so you only ask about real gaps:

- The client's current website, social profiles, app store page.
- Brand book, logo files, font licences, colour specs, tone-of-voice notes.
- Sales material: offers, price lists, pitch decks, flyers. These contain the real promise and the real proof.
- Earlier decisions in Kiekkist (`kk_get_board` for earlier boards of this client) and the taste profile.

Then state what you already believe in two or three lines and ask the client to correct it. Asserting a likely reading and inviting correction is faster than an open questionnaire.

## Cadence

- At most **three questions per round**. Then stop and wait.
- One round is normal, two are common, a third only when an answer opened a real gap.
- Never repeat a settled fact as a question. Never turn an obvious fact into a menu.
- Never ask for CSS values, hex codes or "which style do you like". Style is the output of this process, not an input.
- Use the structured question tool when the harness offers one.

## The chain

Work through the chain in order. Each link depends on the previous one.

| Link | What you need | Good question | Answer you can design with |
|---|---|---|---|
| **Offer** | What is sold, in which form, at what price level | "What do people pay you for, and what is the one offer you want more of?" | "Roof renovation for detached houses, 15 to 40 k€, we want more full renovations and fewer repairs." |
| **Audience** | Who decides, in which situation and state of mind | "Who is on the page when it matters, and what just happened to them?" | "Homeowners 45+, usually after a storm damage or a bad quote from someone else; worried, comparing three firms." |
| **Core promise** | The one thing this client can claim that the neighbour cannot | "Why do customers pick you over the second-best option?" | "We send one fixed contact person and a written schedule; competitors don't." |
| **Proof** | Evidence for the promise that exists today | "What can we show that proves it: photos, numbers, names, certificates, reviews?" | "200 project photos, Meisterbrief, 4.8 on Google with 90 reviews, two architects who recommend us." |
| **Tone** | How the client sounds and must not sound | "If your company were a person at the door, how would they talk?" | "Direct, calm, no sales talk, uses 'Sie', explains in plain terms." |
| **Anti-references** | What it must not look like | "Which website in your industry would embarrass you if yours looked like it?" | "The franchise roofers with stock photos of smiling families and countdown offers." |

If the proof is thin, say so early. Design cannot invent proof; it can only present what exists honestly. Missing proof becomes a task for the client (collect reviews, photograph projects), not a fake stat block.

## Register: brand or product

Settle this before research, because it changes how much expression the design may spend.

| | Brand register | Product register |
|---|---|---|
| Examples | Landing page, company website, campaign, pitch deck, social post | Dashboard, booking flow, customer portal, internal tool, app screens used daily |
| Job | Win attention, build trust, move to action | Let people do a task fast and without errors |
| Visit pattern | Once or rarely, often skimming | Repeatedly, often under time pressure |
| Expression budget | High: one strong signature, bolder colour strategy, characterful display type | Low: workhorse type, restrained colour where colour carries meaning (status, selection, errors) |
| Typical failure | Generic, interchangeable, "could be anyone" | Decorated, slow, inconsistent states |

A project can contain both (a website plus a customer portal). Then the product surfaces inherit the brand's tokens but spend far less of them.

## Medium and context

Ask once, as part of a round:

- **Where will it live?** Website, deck, social feed, app, print, screens in a shop window.
- **Who presents or uses it, on what?** Phone in a car, laptop in a video call, projector in a bright room, printed A4.
- **What is the content reality?** How much text, how many photos, who maintains it later, which CMS or tool.
- **Constraints:** accessibility requirements (in the EU the Barrierefreiheitsstärkungsgesetz applies to many consumer-facing services since 28 June 2025), languages, hosting, performance, existing tech stack.

## Redesign specifics

For a redesign, add one question: **what must survive?** Logo, a colour customers recognise, a slogan, a URL structure, a photo series. Everything else is evidence of what the client is, not an authority over what the new design becomes. Lock what must survive before you start directions.

## When nobody answers

In an unattended run you cannot ask. Then:

1. Derive the brief from existing material, never from the prompt alone.
2. Mark every inferred fact `ASSUMED` in the brief.
3. Run Phases 2 to 4 as normal.
4. Stop at Phase 5 and present the directions with the list of assumptions. No decision without a human.

## Brief format

Write the brief into the board (`templates/board.md`, section "Brief"). Keep it short:

```
Client:          <name, place, size>
Register:        brand | product | both (which surfaces)
Media:           web, slides, social, app, print
Offer:           ...
Audience:        <who> in <situation>, <state of mind>
Core promise:    ...
Proof today:     ...
Tone:            sounds like ... / never sounds like ...
Anti-references: <names or URLs> because ...
Must survive:    ... (redesign only)
Constraints:     accessibility, languages, CMS, hosting, deadline
Open questions:  ...
Assumptions:     ASSUMED ... (only if unconfirmed)
```

Show it, get a "yes" or one correction round, then move on.
