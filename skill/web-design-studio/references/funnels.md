# Funnels, landing pages, one-pagers, pop-ups and CTAs

Read this before building a quiz or lead funnel, a single landing page, a one-pager, or anything that interrupts the page (pop-up, slide-in, sticky bar). The full design process still applies; this file adds the rules that make these formats work without a funnel SaaS.

## Why no SaaS is needed

A funnel is a form split into steps plus a result page. Static HTML, a little JavaScript and one form endpoint on the client's own server do the job. What a SaaS adds (editor, step statistics, A/B tests, ad-platform pixels) has to be named honestly as missing when the client needs it. For trades and SMEs with little ad spend it rarely matters; for performance marketers running Meta ads it is a deal-breaker, so say so in the brief.

## Landing page and one-pager

- One page, one job: a single primary action, repeated at the end and at most once in between. Secondary actions are text links.
- The first screen answers three questions in plain words: what is it, for whom, what happens when I click. The headline is the client's own promise, not a slogan formula.
- Proof sits next to the claim it proves (a number with source and date, a named customer, a real photo), not in a logo strip at the bottom.
- Sections follow the visitor's doubts in order: what it is, does it work for me, what does it cost or take, who is behind it, how do I start. Use the brief's audience and objections to set that order.
- Navigation: on a campaign landing page, either none or anchors only. On a one-pager that is the whole site, anchors plus legal links.
- Price or effort is visible before the final call to action, or the page says honestly that it is set in a conversation.

## Funnel build checklist (15 points)

1. Every question is a `fieldset` with a `legend`; every answer is a real `input` inside a `label`. No clickable `div`s.
2. Without JavaScript the funnel is one complete, submittable form.
3. On each step change, focus moves to the new step's legend. Progress is text inside the legend ("Question 2 of 5"), not only a bar. No extra `aria-live` announcing the same thing.
4. Auto-advance only for pointer input, and only if announced above the first question. Always a Back button. Enter advances, it never submits early.
5. Hidden conditional steps are `disabled` (not just hidden with CSS), so they are neither sent nor validated. Skipped answers never end up in the result or the URL.
6. Errors: visible text inside the step, `aria-invalid`, `aria-describedby`, focus on the first invalid field.
7. Contact step with at most three or four fields, correct `autocomplete` values, `type=tel` and `type=email`, no strict patterns.
8. Before submitting, a summary of the answers with "change" links.
9. No pre-ticked marketing consent. A privacy note with a link right at the submit button.
10. Honeypot instead of CAPTCHA.
11. Never put name, phone or email into the URL. Insert values into the DOM only with `textContent`.
12. No request to third-party domains: fonts, images and videos are local. Check the network tab.
13. No `localStorage`, `sessionStorage` or cookies. Check with `grep`.
14. Target sizes at least 24 × 24 px (WCAG 2.5.8). Fixed bars never cover the focus (2.4.11). Text contrast at least 4.5:1.
15. Trust elements only with source and date. No countdown timers, no badges, no conversion figures without the client's own measurement.

The result page shows what the answers mean for this visitor (a recommendation, a price range, a next step), restates the answers in one line, and has exactly one action.

## Pop-ups, slide-ins, sticky bars

- Never on load and never on mobile entry pages as a full-screen cover (search engines penalise intrusive interstitials, and people leave). Triggers: exit intent on desktop, a scroll depth that shows interest (for example 60 percent of an article), or a click.
- At most once per visit, remembered without cookies or storage (for example only for the current page view) unless the client runs a consent tool that covers it.
- Close is obvious: a visible close button at least 24 px, Esc closes, clicking the backdrop closes, focus returns to where it was. While open, focus stays inside (`dialog` element with `showModal()`).
- It offers something concrete (a checklist, a price list, a callback), never "Sign up for our newsletter" alone.
- Reduced motion: no slide or scale, just appear.
- A sticky call-to-action bar on mobile is fine if it is slim, leaves the content readable and does not cover focused elements.

## Copy

Write the copy for the client from the brief. Never reuse a reference's headline formula or sentence shape (for example "<Brand> is a global … studio", two short halves around a glyph). Next to the original it reads as a knock-off even with different words.

## Honest limits to tell the client

No editor (someone must touch HTML or the CMS), no step statistics without an added tool, no ad pixels, the form endpoint, lead storage, confirmation mail and spam check must exist on their side, and nobody can promise a conversion rate.
