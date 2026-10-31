// The visual-fidelity workflow as data: served by get_workflow / kk_get_workflow and written into FIDELITY.md.
// Source of truth for the wording is skill/kiekkist-agency/references/fidelity.md; test/fidelity/workflow.test.js
// keeps both in step. The gallery server (kiekkist-site server/workflow.js) carries a copy of this file.

export const WORKFLOW_VERSION = '2026-10-31';

export const CHECKLIST = [
  { id: 'proportions', q: 'Proportions: section heights, column ratios and the hero split match the spec (fidelity table, no CHECK left unexplained).' },
  { id: 'positions', q: 'Positions: h1, navigation, first button and first-screen media sit where the spec says (dx/dy within 12 px).' },
  { id: 'type', q: 'Type sizes and line breaks: every role within 6 % of the spec, the same number of lines for h1 and the big statements at 1440 and 390.' },
  { id: 'crops', q: 'Image formats and crops: same named ratios per slot, subject placed like the reference, no stretched or letterboxed image.' },
  { id: 'rhythm', q: 'Vertical rhythm: section paddings and gaps follow the measured steps; nothing collapsed or doubled.' },
  { id: 'unusual', q: 'Unusual layout decisions are implemented (sticky panels, overlaps, asymmetric columns, peeking carousels), not flattened.' },
  { id: 'motion', q: 'Motion works: each OBSERVED behaviour is rebuilt or deliberately replaced; reduced motion, no-JS and snapshot states are finished.' },
  { id: 'no-standard', q: 'No standard component slipped in where the reference has an individual solution (SaaS hero, three equal cards, bento, icon row, uniform cards).' },
];

export const BANS = [
  'Standard SaaS hero (centred claim, subline, two buttons, product shot or blob below).',
  'Three equal feature cards in a row.',
  'Bento grid as a filler layout.',
  'Generic gradients (purple-to-blue, mesh blobs, radial halo behind the headline).',
  'Interchangeable icon rows (icon, two words, one line, times four).',
  'The same card layout for every section of the page.',
];

export const DISTANCE = [
  'Layout principles, proportions, rhythm and interaction ideas may follow the reference closely: measure them and hit the numbers.',
  'Always own: brand name, logo, copy, images, colours, icons and illustrations, and every distinctive signature element (custom artwork, a logo-like device, a unique illustration). Replace each with an alternative of equal quality and record it in LEGAL.md.',
  'Commercial templates (Webflow, Framer, Showit, Squarespace and similar are sold products): composition-level inspiration only. Change the hero composition AND the section order; kk check --compare against the template must say distinct.',
  'Fonts: OFL or otherwise licensed for the client, self-hosted. Pick the closest match by measuring (x-height, width, contrast) and record it.',
  'Never store or ship third-party HTML, CSS, scripts or assets. kk spec, kk motion and kk fidelity measure and screenshot into a private working folder (.kiekkist/); screenshots of third-party pages are never committed or published.',
];

export const MEDIA = [
  'The hero opener (image or video) is unique: one opener belongs to one design only. Check the hero registry before choosing; reuse further down a page is fine.',
  'Choose images by composition, perspective, colour and format for the slot measured in the spec (named ratio, crop, subject position).',
  'No filler images: if nothing fits, an honest placeholder plus an exact generation prompt with file name and aspect ratio (IMAGE-PROMPTS.md).',
  'Video: muted, short (header loops at most 8 s), poster first, pause control, no autoplay under reduced motion.',
];

export const MOTION = [
  'Translate the effect, not the technique: CSS scroll-driven animations (animation-timeline view()/scroll()), cross-document View Transitions, clip-path and mask reveals, transitions on hover and focus.',
  'No heavy libraries (GSAP, Lenis, Locomotive, Barba, three.js): rebuild the visible effect or replace it; one small passive script at most.',
  'prefers-reduced-motion: everything off, content in its finished state.',
  'Snapshot-safe: without JS, in print and with ?static every element shows its finished state (no text at opacity 0, no unrevealed images).',
  'Keep OBSERVED timings and easings where they serve; mark every INFERRED value as such in MOTION.md.',
];

const NEW = [
  { id: 'pick', title: 'Pick the reference', do: 'Choose one primary reference per direction (search_references / kk_search_references by industry, cluster or mood, or the moodboard). Prefer references with desktop and phone screenshots and a reachable live URL. Note why this one: the composition you want, in one sentence.' },
  { id: 'measure', title: 'Measure it', do: 'kk spec <url> (1440, 1024, 768, 390 + breakpoint sweep) and kk motion <url>. Look at every screenshot and frame yourself; the numbers do not replace looking.' },
  { id: 'spec', title: 'Write SPEC.md and MOTION.md', do: 'From SPEC.draft.md and MOTION.draft.md: numbers for container, grid, type scale with ratios, line breaks, positions, image formats, section geometry, spacing, breakpoints, motion (OBSERVED vs INFERRED). "Generous whitespace" is not a spec; "section padding 128/96/64 at 1440/1024/390" is. Add LEGAL.md: what is taken as principle, what is own, which signature elements are replaced and by what.' },
  { id: 'build', title: 'Build to the spec', do: 'New brand, own copy, own images, own code. Hero first, then section by section. Hard bans apply; when something is hard to build, solve it concretely instead of falling back to a standard component.' },
  { id: 'fidelity', title: 'Compare and correct (at least two rounds)', do: 'kk fidelity <spec dir or url> <build>: montages 1440/390 (first screen + full page), section, type and position deltas. Fix every CHECK that is not a deliberate deviation, run again. Log the rounds (FIDELITY-log.md, COMPARE.md).' },
  { id: 'checklist', title: 'Checklist and checker', do: 'Go through the checklist with the montages open. Then kk check --profile bfsg --perf on every page (0 hard errors) and kk check --compare <reference> (record the similarity; templates must be distinct).' },
  { id: 'honest', title: 'Report honestly', do: 'Reference, build and montages side by side; what matches, what is deliberately different, what is still off (gap list).' },
];

const POLISH = [
  { id: 'audit', title: 'Audit the current site', do: 'kk improve <url>: measures geometry, type scale, colours, sections and motion, runs the checker (accessibility/BFSG, privacy and third parties, mobile lab) and lists slop signals and weak spots in IMPROVE.md (keep / fix / redesign).' },
  { id: 'scope', title: 'Agree the scope', do: 'Polish keeps the structure, URLs, content and brand. Show the keep / fix list to the client; nothing SEO-relevant (URLs, titles, headings, body text, structured data, internal links) changes without their say.' },
  { id: 'fix', title: 'Fix in the existing stack', do: 'Type scale (clear ratios), spacing rhythm, contrast, image crops and formats, motion (reduced motion, no layout shift), performance and accessibility. Brand colours stay unless they fail contrast; then adjust lightness only and say so.' },
  { id: 'before-after', title: 'Before and after', do: 'kk fidelity <before url or spec dir> <after> with labels before/after: montages and deltas with numbers. kk check on both; the after report must not regress.' },
  { id: 'deliver', title: 'Deliver back to their stack', do: 'Changes as a patch, theme update or kk export (WordPress, Astro, HTML, …) plus a short change list with numbers.' },
];

const REDESIGN = [
  { id: 'audit', title: 'Audit the current site', do: 'kk improve <url> with --refs: IMPROVE.md with keep / fix / redesign lists, a target spec draft that keeps the brand and content, and two or three matching references from the library.' },
  { id: 'inventory', title: 'Inventory what must survive', do: 'URLs and redirects, titles, headings, body text, structured data, forms, legal pages, logo, brand colours and fonts. These are inputs, not suggestions.' },
  { id: 'reference', title: 'Reference to spec', do: 'Pick one reference for the new composition; kk spec + kk motion; SPEC.md with numbers, LEGAL.md. The client brand replaces the reference brand completely.' },
  { id: 'build', title: 'Build the new composition', do: 'Client content and brand into the measured composition; hard bans apply. Every old URL still resolves (same path or a 301).' },
  { id: 'fidelity', title: 'Two loops', do: 'kk fidelity <reference spec> <build> (composition, at least two rounds) and kk fidelity <old site> <build> --labels before,after (what changed, with numbers).' },
  { id: 'deliver', title: 'Check and deliver', do: 'kk check --profile bfsg --perf on every template, no SEO regression (titles, headings, text, links), export to their stack (kk export --target wordpress|astro|…), change list with numbers.' },
];

export const MODES = { new: NEW, polish: POLISH, redesign: REDESIGN };

export function getWorkflow(mode = 'new') {
  if (!MODES[mode]) throw new Error('mode must be one of: ' + Object.keys(MODES).join(', '));
  return {
    version: WORKFLOW_VERSION, mode,
    phase: mode === 'new' ? 'Reference to spec (mandatory before building)' : mode === 'polish' ? 'Existing site: polish (same structure)' : 'Existing site: redesign (new composition, brand and content kept)',
    steps: MODES[mode], checklist: CHECKLIST, hard_bans: BANS, distance_rules: DISTANCE, media_rules: MEDIA, motion_translation: MOTION,
    tools: { spec: 'kk spec <url> | kk_spec', motion: 'kk motion <url> | kk_motion', fidelity: 'kk fidelity <ref> <build> | kk_fidelity', improve: 'kk improve <url> | improve_site', references: 'search_references / kk_search_references, get_reference_spec / kk_get_reference_spec' },
    skill_file: 'references/fidelity.md',
  };
}
