# Memory

Without memory every build starts from the same defaults and ends in the same place. A studio remembers two things: what this person likes and rejects, and what it built last time. The first is the taste profile, the second is the structure log.

## The taste profile

Source: `kk_profile` (Markdown) or `.kiekkist/profile.md`. Kiekkist builds it from judgments, decisions and notes; it never invents entries. Sections:

- **Keeps choosing**: mechanisms, structures, type and colour approaches that were rated `love` or `like` or chosen in decisions.
- **Rejects**: what was rated `no` or turned down, with the reason.
- **Mechanisms that work**: mechanism sentences from references and directions that were chosen.
- **Notes in his words**: verbatim notes. These matter most; they are the only place where the person speaks directly.
- **Recently decided directions**: the last decisions with dates.

### How to read it

- **Priors, not commands.** The profile shifts probabilities; it does not override the brief, brand rules or a decision. A client in a different industry may need what the person usually rejects. Then say so.
- **Read "Rejects" and the verbatim notes first.** A rejected mechanism offered again costs more trust than a missed preference.
- **Do not overfit.** One `love` is a data point. Two or more in the same direction, across projects, is a preference.
- **Profiles describe the studio owner's taste, not the client's.** When they conflict, the client's brief and brand rules win; the profile then informs how you present the options.

### How to write to it

You never edit the profile directly. You record judgments and decisions; Kiekkist derives the profile.

- After a theme, ask for a verdict (`kk_judge`, `kind: "theme"`): `love`, `like`, `meh` or `no`, plus one sentence why.
- After the decision, ask for a short comment on the rejected directions if the person wants to give one (`kind: "direction"`).
- References can be judged at any time (`kind: "ref"`).
- **Copy the note verbatim.** No paraphrase, no grammar fixes, no translation. "Zu glatt, sieht aus wie jede Agentur" is the record; "too polished" is your interpretation and loses information.
- No verdict given? Record nothing. Never write a judgment on someone's behalf.

### Local fallback

Without Kiekkist, append to `.kiekkist/judgments.md`:

```
2026-10-29 | theme | nordlicht-immobilien | like | "Ruhig, aber die Startseite könnte mutiger sein."
```

and maintain `.kiekkist/profile.md` by hand with the same five sections, updated only from these lines. Promote something into "Keeps choosing" or "Rejects" only when at least two resolved judgments support it, or when the person explicitly says it should carry forward.

Do not promote:

- one-off client constraints ("client insisted on their old blue"),
- choices forced by missing assets or time,
- anything accepted with hesitation.

## The structure log

`.kiekkist/log.json` in the project root (and in the Kiekkist data directory if you work across projects from one place). Newest entry first, one entry per finished theme:

```json
[
  {
    "date": "2026-10-29",
    "client": "Nordlicht Immobilien",
    "theme": "nordlicht-immobilien",
    "direction": "middle",
    "topology": "index list, then catalogue grid",
    "nav": "top bar, text links, phone number right",
    "first_screen": "statement plus current listing count, no photo",
    "footer": "full contact block with office hours",
    "type_pair": "Albert Sans / Source Serif 4",
    "colour_strategy": "owned colour",
    "signature": "sold-property ledger with year and district",
    "outcome": "like"
  }
]
```

Keep the last 40 entries; older ones can be archived.

### Rotation rules

Before Phase 4, read the last three entries:

1. The **bold** direction must not repeat the topology, the type pair or the signature of any of the last three.
2. **No direction** repeats the type pair of the last build.
3. If a structure appears in two of the last three, it is not allowed as the bold direction and needs a reason anywhere else.
4. Exception: the client's existing brand or theme requires it. Then state it in the rotation note.

Say the rotation in two lines on the board before building (see `directions.md`). Writing it down is what breaks the habit; deciding it silently does not.

### Outcomes

Fill `outcome` when the verdict arrives (`love`, `like`, `meh`, `no`, or `pending`). Over time this shows which structures keep working. Use it only as a tie-breaker between candidates that already pass rotation, never to justify repeating a structure. A handful of outcomes is noise, not evidence.

## Local folder layout

```
.kiekkist/
  profile.md            # taste profile (fallback)
  judgments.md          # verbatim verdicts (fallback)
  log.json              # structure log (always)
  refs.md               # references with mechanism sentences (fallback)
  refs/                 # screenshots: <n>-desktop.jpg, <n>-mobile.jpg
  board.md              # brief, clusters, axis table, rotation note
  directions/<slug>/    # index.html, direction.json, probe pages, assets
  decision.md           # the decision record
  themes/<slug>/        # finished theme in the Theme format
```

The Theme format is the same as Kiekkist's: `theme.json`, `DESIGN.md`, `tokens.json`, `tokens.css`, `pages/index.html`, optional `pages/`, `slides/`, `social/`, `app/`, `assets/`. A local theme can be imported into Kiekkist later without changes.

Third-party screenshots in `refs/` are internal working material. Add `.kiekkist/refs/` to `.gitignore` in any repository that is or may become public (`legal.md`).
