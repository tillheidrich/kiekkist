# Credits

This skill was written from scratch. No passages were copied. The ideas below were taken from other open-source projects and reworked in our own words; each is listed with its source and licence. Repositories were read in their state of October 2026.

| Idea in this skill | Where it is used | Source | Licence |
|---|---|---|---|
| Interview in rounds of two or three questions; never synthesise a brief from the prompt alone; assert a likely reading and invite correction | `SKILL.md` Phase 1, `briefing.md` | impeccable (`skill/reference/shape.md`, `new-work.md`), github.com/pbakaus/impeccable | Apache-2.0 |
| Register split between brand and product surfaces with different expression budgets | `briefing.md` | impeccable (brand and product references; visitor modes in `new-work.md`) | Apache-2.0 |
| Scene sentence that decides light or dark; colour strategy chosen before colours (four levels of colour commitment) | `SKILL.md` Phase 3, `color.md` | impeccable (`new-work.md`, section on committing the world) | Apache-2.0 |
| Reflex fonts as a dated list that requires a reason; second-order reflexes | `typography.md`, `tells.md` | impeccable (`new-work.md`) | Apache-2.0 |
| Two isolated reviewers that do not see the build; degraded single-context marker; P0 to P3 priorities | `critique.md`, `SKILL.md` Phase 8 | impeccable (`skill/reference/critique.md`) | Apache-2.0 |
| DESIGN.md written from the built result, not before | `SKILL.md` Phase 6 | impeccable (`new-work.md`, section 5) | Apache-2.0 |
| Calibration list of current AI design clusters (cream and serif with clay accent, near-black with acid accent, broadsheet hairlines, SaaS card kit, template chrome); "the brief's own words always win"; review the plan against "what would I do for any similar page"; spend boldness in one place | `tells.md`, `typography.md`, `directions.md` | Anthropic skills, `skills/frontend-design/SKILL.md`, github.com/anthropics/skills | Apache-2.0 |
| Reference board with lanes including adjacent products and anti-references; web search is mandatory when tools exist | `research.md` | tastemaker (`references/reference-intelligence.md`), github.com/codeswithroh/tastemaker | MIT |
| Structure log per build, cross-project history, rotation against the last builds, stating the rotation out loud, outcome as tie-breaker only | `memory.md`, `directions.md`, `layout.md` | tastemaker (`references/diversification.md`) | MIT |
| Named page skeletons as a separate axis from colour and type; story beats before shape | `layout.md` | tastemaker (`references/macrostructures.md`, `narrative-arc.md`) | MIT |
| Critique axes show-don't-tell, philosophy, hierarchy, specificity, restraint, variety (adapted to stance, hierarchy, execution, specificity, restraint, variance) | `critique.md` | tastemaker (`references/anti-slop-checklist.md`) | MIT |
| Profile promotion rules: only resolved decisions, two or more occurrences, never one-off client constraints | `memory.md` | tastemaker (`references/taste-memory.md`) | MIT |
| Bias, not bans; reflex test "would I propose this for another brand in this sector"; "feels premium is not a reason"; measured sector defaults for fonts and palettes | `tells.md`, `typography.md`, `color.md` | brand-identity-skill (`references/ai-defaults.md`), github.com/fatihaydost/brand-identity-skill | MIT |
| Sets placed on decision axes and required to differ on several; one mechanism per set; mixing parts of sets on request | `directions.md`, `client-presentation.md` | brand-identity-skill (`SKILL.md`, section 3) | MIT |
| Evidence tags on every claim; no overall score; "a clean audit means nothing is measurably broken, not that it is good" | `tells.md`, `critique.md` | brand-identity-skill (`references/critique.md`) | MIT |
| Show three visual previews instead of asking abstract style questions; fixed 1920×1080 stage scaled as a whole; density modes; split slides instead of shrinking; no internal labels on previews | `SKILL.md` Phase 4, `slides.md` | frontend-slides (`SKILL.md`), github.com/zarazhangrui/frontend-slides | MIT |
| Three directions from clearly different schools, each with named anchors; never three from the same school | `directions.md` | garden-skills, `skills/web-design-engineer/SKILL.md` (Design Direction Advisor), github.com/ConardLi/garden-skills | MIT |
| Similarity dial expressed as intent levels, not measurements; protected signature elements | `directions.md` | Meng To Skills, `agent-skills/codex/generate-reference-inspired-brand-worlds/SKILL.md`, github.com/MengTo/Skills | MIT |
| Originality audit: evidence hierarchy, combinations of distinctive elements versus common patterns, "severity is not a legal conclusion" | `directions.md`, `legal.md` | Meng To Skills, `agent-skills/codex/audit-reference-originality/` | MIT |
| DESIGN.md format: YAML front matter with tokens, fixed section order, unknown sections preserved | `templates/DESIGN.md`, `SKILL.md` Phase 6 | design.md (`docs/spec.md`), github.com/google-labs-code/design.md | Apache-2.0 |
| Design token file format | `color.md`, Phase 6 | W3C Design Tokens Community Group, Format Module 2025.10, designtokens.org | W3C Community Final Specification |

## Facts and studies cited

| Fact | Where | Source |
|---|---|---|
| Viewers rate AI-generated ads as more annoying, boring and confusing; weaker memory activation | `tells.md` | NielsenIQ press release, 2024, "NIQ research uncovers hidden consumer attitudes toward AI-generated ads" (vendor study, limited detail) |
| Measured model defaults for fonts and palettes | `typography.md`, `tells.md` | brand-identity-skill, `references/ai-defaults.md` (own experiment, 30 briefs, 180 answers, 2026-10-02) |
| Font licences | `typography.md` | Fontsource API, checked 29.10.2026 |
| Gallery status and URL patterns | `sources.md` | own HTTP checks, 29.10.2026 |
| Core Web Vitals thresholds | `web.md` | web.dev, Google |
| Contrast, reflow, target size, line length | `tells.md`, `color.md`, `web.md` | W3C, WCAG 2.2 |
| Touch targets, tab bar | `app.md` | Apple Human Interface Guidelines; Material Design |
| Google Fonts ruling | `legal.md`, `typography.md` | LG München I, 20.01.2022, 3 O 17493/20 |

## Licence of this skill

MIT. See the LICENSE file in this skill folder. The companion tool Kiekkist is licensed separately under AGPL-3.0 (https://github.com/tillheidrich/kiekkist).

## Added in v2 (29.10.2026)

- **Concept cards from real-world forms**: studio practice of starting from a found form (document, object, space) instead of a layout; worked example from the maintainer's own website rounds.
- **House rules, content model, hero-first art bible, finish gate, positive test**: distilled from the maintainer's internal agency playbooks (Anti-Slop playbook, R1 Gestaltungsgesetz, Website-Konzept "Inhalt zuerst", Benchmark visuelle Kommunikation).
- **Direct labels and no decoration**: Mayer & Fiorella, multimedia learning principles (spatial contiguity, coherence), as cited in the maintainer's research dossier of 16.09.2026.
- **Distance check (`kk_compare`)**: difference hash (dHash) of the first screen plus structural signals; thresholds are house values.
