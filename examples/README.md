# Example themes

Four finished themes for invented German small and mid-sized companies. They show what Kiekkist keeps for every design: `DESIGN.md`, DTCG `tokens.json`, OKLCH `tokens.css`, pages, slides, social cards and (for two of them) app screens.

| Theme | Sector | Pages |
|---|---|---|
| `beratung-studio-elbe` | strategy consultancy | home, service, Impressum, Datenschutz, Barrierefreiheit |
| `harms-praezisionstechnik` | CNC and precision engineering | home, production, legal pages |
| `kanzlei-brandt-weller` | law and tax firm | home, succession, legal pages |
| `nordlicht-immobilien` | estate agency | home, selling, legal pages |

Every page passes `kk check --profile bfsg` without hard errors. The legal pages are scaffolds: fields the owner must provide are marked `[eintragen: …]`, and `kk launch` reports each one until it is filled. They are not legal advice.

```bash
kk check examples/themes/nordlicht-immobilien/pages/index.html
kk check --theme nordlicht-immobilien --pages all --profile bfsg
kk export examples/themes/nordlicht-immobilien --target astro --out ./site
```

## Licences

- **Code, markup, styles, tokens and copy:** CC BY 4.0 (see `LICENSE` in this folder).
- **Photos © Till Heidrich. Licensed only for use within these examples; not for other use.** Replace them before you build a real site from a theme.
- **Fonts:** SIL Open Font License 1.1, licence files next to the font files.
