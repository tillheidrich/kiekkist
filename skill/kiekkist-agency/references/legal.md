# Legal basics

**This is not legal advice.** It is a working summary for designers, written for German and EU law as of October 2026. Other jurisdictions differ. When a project depends on one of these questions, ask a lawyer.

## Inspiration versus copy

- **Ideas, styles and principles are free.** A layout principle, a density, "type-only first screen", a colour strategy: none of these is protected as such.
- **Concrete works are protected.** Texts, photos, illustrations, logos, and design works with enough originality are protected by copyright (§ 2 UrhG). Since the BGH's *Geburtstagszug* decision (13.11.2013, I ZR 143/12) applied art and design need no higher originality than other works, so a distinctive web design can be protected as a whole.
- **Simple photos** are protected even without artistic originality, for 50 years (§ 72 UrhG). Every screenshot of a third-party page contains protected material.
- **Adaptations** need consent unless the new work keeps a sufficient distance from the original (§ 23 Abs. 1 UrhG). This is the legal version of the similarity dial in `directions.md`: "recognisable influence" with changed composition, type, colour and content is the safe side; "close neighbour" is not.
- **Competition law** protects against imitations that deceive about origin or exploit reputation, even without copyright (§ 4 Nr. 3 UWG). Copying a competitor's distinctive look in the same market is the classic case.
- **Designs** can be protected as registered designs (DesignG) or, unregistered, for three years from first disclosure in the EU (EU design regulation, unregistered Community/Union design). Interfaces and page layouts can be designs.
- **Marks:** logos, names and slogans of others never go into client work (MarkenG).

The originality check in `directions.md` and the "do not take" notes in research exist to keep work on the inspiration side.

## Collecting references

- Capturing pages for **automated analysis** (extracting tokens, measuring layouts) is covered by the text and data mining exception (§ 44b UrhG) if the page was lawfully accessible and the owner has not reserved it in machine-readable form (§ 44b Abs. 3, for example in robots.txt or terms). Delete copies when they are no longer needed for the analysis.
- A **moodboard for human inspiration** is not clearly covered by an exception for commercial use. In practice the risk is low when the material stays internal: keep screenshots in the private reference library, link to the original, do not publish them.
- **Showing references to a client** in a closed presentation is not a public communication, but it is still a copy. Show what is needed, credit the source (URL), keep it out of anything public.
- **Measuring a reference** (kk spec, kk motion, kk fidelity: boxes, computed styles, timings, screenshots) is analysis. The tools never store a page's HTML, CSS or scripts; their output goes to a private working folder (`.kiekkist/fidelity/`). Rebuild principles and proportions with own code, never the page's code or assets (`fidelity.md`, distance rules).
- **Never** put third-party screenshots, page code or assets into a public repository, a public theme gallery or a portfolio (§ 19a UrhG, making available to the public). Add `.kiekkist/refs/` to `.gitignore`.
- Quoting a reference in a published case study is only possible within the right of quotation (§ 51 UrhG): the quote must serve your own argument, be limited in size and name the source.

## Images in client work

- Use the client's own photos or properly licensed images. Keep the licence and source for each.
- **People in photos** need their consent for publication (§ 22 KUG), with narrow exceptions (§ 23 KUG). Employees on the team page: written consent, revocable.
- **Generated images**: no copyright protection for purely machine-made output in most EU readings, so the client cannot stop others from reusing them. Photorealistic generated images that could pass as real people, places or events are "deep fakes" under the EU AI Act and must be disclosed (Art. 50 Abs. 4 AI Act, applicable since 2 August 2026). Do not present generated images as proof of real work.
- **Stock**: check the licence for the intended use (web, print, social, ads, templates for resale). Editorial-only images are not for marketing.

## Fonts

- Font files are licensed software. The licence decides what you may do: web embedding, app embedding, PDF embedding, logo use, number of page views.
- **SIL Open Font License 1.1** allows commercial use, embedding and modification; you may not sell the font on its own, and modified versions must not use Reserved Font Names. Ship the licence text with the files.
- Other free licences (for example the ITF Free Font License used by Fontshare) have their own terms. Read them.
- Commercial faces: the client buys the licence in their own name for their own use. A studio licence usually does not cover the client's website.
- **No font CDNs in client work.** The Regional Court of Munich (LG München I, judgment of 20.01.2022, 3 O 17493/20) awarded damages because a website loaded Google Fonts from Google's servers and passed the visitor's IP address without consent. Self-host fonts.

## Claims and proof

- Invented statistics, fake client logos, fake reviews and fake awards are misleading commercial practices (§ 5 UWG). Fake reviews and undisclosed paid reviews are blacklisted practices (Annex to § 3 Abs. 3 UWG, Nr. 23b and 23c).
- If the client shows reviews, say how they were collected and checked (§ 5b Abs. 3 UWG).
- Hence the rule in this skill: no invented proof, labelled gaps instead.

## Kiekkist and this skill

- This skill is MIT licensed. The ideas it borrows from other projects are credited in `credits.md`; no text was copied.
- Themes published as examples must contain only own work, own or freely licensed images and freely licensed fonts. Client themes stay private unless the client agrees in writing.
- Do not sell or publish DESIGN.md files that describe another company's brand.
