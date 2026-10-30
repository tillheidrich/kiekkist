# kiekkist-agency

A Claude Code skill that makes AI agents work like a small design studio: brief, research, moodboard, three directions, a human decision, a design system, roll-out to web, slides, social graphics and app screens, then measured checks and an independent critique. Everything that was decided is remembered, so the next project does not look like the last one.

Most design skills are lists of rules that steer the model away from its defaults. That helps, but it does not produce taste, and banned defaults are quickly replaced by new ones. This skill adds what an agency actually does: look at real work, show distinct options as real pages with the client's content, let a person choose, write the choice down, and keep a memory across projects.

## What it does

| Phase | Output |
|---|---|
| 0 Memory | taste profile, earlier themes, brand rules loaded |
| 1 Briefing | a confirmed brief (questions in rounds of at most three) |
| 2 Research | 12 to 20 real references with screenshots and one-sentence mechanisms |
| 3 Moodboard | clusters with mechanism, material, temperature, density, scene sentence |
| 4 Directions | exactly three (safe, middle, bold) as real HTML pages, distinct on at least three of six axes (topology, type, density, imagery, colour, grid rhythm) |
| 5 Decision | the human chooses, combinations allowed, dated and recorded |
| 6 System | DESIGN.md, DTCG tokens.json, OKLCH tokens.css, type roles, component inventory |
| 7 Roll-out | pages, slides (1920×1080), social (1080×1080, 1080×1350, 1200×630), app (390×844) |
| 8 Review | measured check (counted signals, contrast, overflow, drift) and a critique by a separate sub-agent |
| 9 Filing | theme saved, verdict recorded verbatim, structure logged for rotation |

## Install

On claude.ai: upload `dist/kiekkist-agency-skill.zip` from the Kiekkist repository (or build it there with `npm run skill:zip`) under Settings, Capabilities, Skills.

In Claude Code:

Copy the folder into your skills directory:

```bash
# for one project
mkdir -p .claude/skills && cp -r kiekkist-agency .claude/skills/

# for all projects
mkdir -p ~/.claude/skills && cp -r kiekkist-agency ~/.claude/skills/
```

The skill triggers on design, redesign, moodboard, theme, design system, slide, social graphic and app screen requests.

## With or without Kiekkist

The skill works in two modes with the same file formats:

- **With [Kiekkist](https://github.com/tillheidrich/kiekkist)**, the self-hosted companion tool: reference capture with screenshots, boards, directions, decisions, a theme gallery, the check and the taste profile, all through MCP tools (`kk_*`). Connect it in Claude Code:

  ```bash
  # remote server (Streamable HTTP)
  claude mcp add --transport http kiekkist https://<your-host>/mcp --header "Authorization: Bearer $KK_TOKEN"

  # local checkout (stdio)
  claude mcp add kiekkist -- node /path/to/kiekkist/cli/kk.js mcp
  ```

- **Without it**, the skill keeps everything in a `.kiekkist/` folder in your project: `profile.md`, `refs.md`, `board.md`, `directions/`, `decision.md`, `themes/`, `log.json`. Themes saved locally can be imported into Kiekkist later.

`scripts/check.mjs` runs the check through the API (`KK_URL`, `KK_TOKEN`), a local checkout (`KIEKKIST_HOME`), `kk` on your PATH, or an installed `kiekkist` package. If none is available, it says so and points to the manual checklist.

## Other design skills

If you also have aesthetic skills installed that prescribe fixed fonts, colours or effects, they will compete with this process. This skill treats them as suppliers of one direction's starting lane at most, never as the default. For predictable results, disable skills that trigger on the same requests or invoke this one explicitly.

## Files

```
SKILL.md                    the process (read first)
references/                 one file per topic, loaded when needed
  briefing.md research.md sources.md directions.md client-presentation.md
  typography.md color.md layout.md
  web.md slides.md social.md app.md
  tells.md critique.md memory.md legal.md credits.md
templates/                  direction-page.html, DESIGN.md, board.md, decision.md
scripts/check.mjs           wrapper for the Kiekkist check
```

## Principles

- Real content, no lorem ipsum, no invented proof.
- References inspire; their shape is never copied. Originality is checked against each anchor.
- Self-hosted, freely licensed fonts in client work.
- Signals of autopilot design are counted, not banned, and the evidence behind each is stated honestly.
- A passing check means nothing is measurably broken, not that the design is good.

## Credits and licence

MIT. Ideas taken from impeccable, Anthropic's frontend-design skill, tastemaker, brand-identity-skill, frontend-slides, garden-skills, Meng To's skills and the design.md format are credited in `references/credits.md`. No text was copied.

Built by Till Heidrich, [Heidrich Digital](https://heidrich-digital.de).
