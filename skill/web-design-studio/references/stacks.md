# Stacks: one design, several targets

A theme is built once: `DESIGN.md`, `tokens.json` (W3C DTCG), `tokens.css`, `pages/*.html`, `assets/fonts/` and `assets/img/`. This file says how that same theme is delivered to **Astro** (default), **WordPress** (block theme), **Next.js** and **plain HTML**, what the client can edit in each, and where each runs inside the EU. Webflow and Framer are listed at the end as "later, unverified".

Read this in Phase 7 when the brief names a target other than plain pages, and before `kk export`. Facts were checked on 2026-10-30; versions move, so re-check the version line of each target before you promise anything to a client.

## Rules that hold for every target

1. **The pages are the specification.** The exported site must look like `pages/*.html` at 390, 768 and 1440 px. Run `kk check` on the export and compare first screens with `kk compare --themes`; a target that cannot reproduce the design is reported, not silently degraded.
2. **Tokens are generated, never retyped.** Every target gets its token file from `tokens.json` by the exporter. A hand-edited colour in `theme.json` or `@theme` is token drift.
3. **Privacy defaults travel with the theme** (`privacy-eu.md`): self-hosted fonts and scripts, no CDN, no embed without a two-click facade, no analytics unless the brief asks and then cookie-free. A target whose ecosystem pulls third-party requests by default (WordPress plugins, Elementor, Next.js image CDNs) gets those switched off in the export.
4. **Content model first.** Each top-level `<section>` in `pages/*.html` gets a name: `data-section="hero|services|proof|process|contact|…"`, otherwise its `id`, otherwise the id its `aria-labelledby` points to. Add `data-section` when you build pages in Phase 7 if the theme may be exported. The exporter maps each named section to a component (Astro, Next.js), a block pattern (WordPress) or a partial (HTML). Repeated children inside a section (cards, rows, list items with the same structure) become a content collection. If a section has no name, the exporter asks instead of guessing.
5. **Editability is a decision, not a feature.** Most small-business clients never edit their site themselves; the honest default is no CMS plus a care plan (agency practice, r/astrojs consensus; wiki "Research: Client-editierbare Astro-Sites", June 2026). Ask in the briefing: who changes what, how often, and with how much technical comfort. Then pick the target and the editor from the matrix below.

## Choosing the target

| Situation | Target | Why |
|---|---|---|
| New site, nobody edits, or edits a few times a year | **Astro, no CMS** (Markdown/MDX in the repo) | fastest, nothing to patch, agents edit files directly |
| New site, client edits texts and news regularly | **Astro + a Git CMS** (Sveltia, Decap, Pages CMS, Keystatic) | content stays in the repo, no database |
| Client wants to edit visually on the page | **Astro + Directus visual editing** (self-host) or **Storyblok** (EU SaaS), or **WordPress block theme** | real in-context editing; trade-offs below |
| Existing WordPress with an editorial team or many plugins they rely on | **WordPress block theme** | do not force a migration as part of a design job |
| Existing Elementor site the client will keep | **Elementor kit structure** (honest path below) | lowest friction for them, highest maintenance for everyone |
| App-like site, logged-in areas, React team in place | **Next.js** | only when the client's developers already work in React |
| One-pager, campaign page, landing page with a form | **plain HTML** | no build step, any webspace |

When two rows fit, prefer the one with less to operate. Say the trade-off to the client in one sentence ("WordPress lets you edit everything yourself; it also needs monthly updates and costs more to keep fast").

## Token mapping

Source: DTCG Format Module **2025.10** (first stable version, 2025-10-28; supports OKLCH and all CSS Color 4 spaces, aliases with `{group.token}`). Kiekkist writes colours as `{"colorSpace":"oklch","components":[L,C,H],"hex":"#…"}`; the `hex` fallback is the sRGB gamut-mapped value for targets that cannot store OKLCH.

### DTCG → CSS custom properties (Astro, Next.js, HTML)

| DTCG path | `$type` | CSS | Note |
|---|---|---|---|
| `color.ink` | color | `--c-ink: oklch(23% 0.025 255);` | OKLCH as written; no hex in CSS (baseline support in all current browsers) |
| `font.display` | fontFamily | `--font-display: 'Name', fallback, serif;` | fallback stack from DESIGN.md |
| `type.display-xl.fontSize` | dimension / fluid | `--fs-display-xl: clamp(…);` | fluid values are stored as strings with `$extensions.kiekkist.fluid` |
| `type.*.fontWeight`, `lineHeight`, `letterSpacing` | fontWeight, number, dimension | `--fw-*`, `--lh-*`, `--ls-*` | one property per role |
| `space.md` | dimension | `--s-md: 1.5rem;` | |
| `radius.sm` | dimension | `--r-sm: 2px;` | |
| `shadow.*` | shadow | `--shadow-*: …;` | |
| `motion.duration.*`, `motion.easing.*` | duration, cubicBezier | `--dur-*`, `--ease-*` | always paired with a `prefers-reduced-motion` rule |
| alias `{color.ink}` | any | `var(--c-ink)` | aliases stay aliases, never resolved to a copy |

This is what `tokens.css` already contains. Astro, Next.js and HTML import it unchanged.

### DTCG → WordPress `theme.json` (schema version 3)

theme.json version 3 is the current living schema (introduced with WordPress 6.6; still v3 in the Block Editor Handbook as of October 2026). WordPress stores palette colours as strings and outputs them as CSS custom properties `--wp--preset--color--<slug>`.

| DTCG | theme.json | Output in CSS |
|---|---|---|
| `color.<name>` | `settings.color.palette[] {slug, name, color}` | `--wp--preset--color--<slug>` |
| colour value | `"color": "oklch(23% 0.025 255)"` | WordPress passes the string through; the colour picker shows it, older admin UIs may not preview it. Put the `hex` in `name` for editors ("Ink #151e29") |
| `font.*` + files | `settings.typography.fontFamilies[] {slug, name, fontFamily, fontFace[{src:["file:./assets/fonts/x.woff2"], fontWeight, fontStyle}]}` | `--wp--preset--font-family--<slug>`; files are served from the theme, no Google request |
| `type.*.fontSize` (fluid) | `settings.typography.fontSizes[] {slug, size, fluid:{min,max}}` or `size` with the `clamp()` string and `fluid:false` | `--wp--preset--font-size--<slug>`. Use our own `clamp()` to keep the design exact |
| `space.*` | `settings.spacing.spacingSizes[] {slug, size}`; `settings.spacing.defaultSpacingSizes:false` | `--wp--preset--spacing--<slug>` |
| `radius.*`, `motion.*`, anything without a preset | `settings.custom.<group>.<name>` | `--wp--custom--<group>--<name>` |
| `shadow.*` | `settings.shadow.presets[]`, `settings.shadow.defaultPresets:false` | `--wp--preset--shadow--<slug>` |
| layout `content-max`, wide | `settings.layout.contentSize`, `wideSize` | |
| component styles (button, link, heading) | `styles.elements.button|link|heading|h1…` and `styles.blocks["core/…"]` | reference presets: `var:preset|color|ink` |

Lock what the client must not drift: `settings.color.custom:false`, `customGradient:false`, `defaultPalette:false`, `defaultGradients:false`, `settings.typography.customFontSize:false`, `defaultFontSizes:false`, `settings.typography.fontFamilies` limited to the theme's own. The client then picks from the system, not from a rainbow.

### DTCG → Tailwind CSS v4 `@theme`

Only when the client's team insists on Tailwind. Tailwind v4 reads design tokens from CSS (`@theme { … }`) and turns every `--color-*`, `--font-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--ease-*` variable into utilities and plain CSS variables.

| DTCG | `@theme` variable | Utility |
|---|---|---|
| `color.ink` | `--color-ink: oklch(23% 0.025 255);` | `text-ink`, `bg-ink`, `border-ink` |
| `font.display` | `--font-display: 'Name', serif;` | `font-display` |
| `type.display-xl.fontSize` | `--text-display-xl: clamp(…);` plus `--text-display-xl--line-height: 0.92;`, `--text-display-xl--letter-spacing: -0.02em;`, `--text-display-xl--font-weight: 300;` | `text-display-xl` |
| `space.md` | `--spacing-md: 1.5rem;` (named) — keep Tailwind's numeric scale only if DESIGN.md uses a 4 px base | `p-md`, `gap-md` |
| `radius.sm` | `--radius-sm: 2px;` | `rounded-sm` |
| `motion.easing.out` | `--ease-out-soft: cubic-bezier(…);` | `ease-out-soft` |

Start the file with `@theme { --color-*: initial; --font-*: initial; }` so Tailwind's default palette and fonts are removed; otherwise `bg-blue-500` sneaks back in and `kk check` reports token drift. Components still read `var(--color-ink)`, so the CSS stays portable if Tailwind is dropped later.

### DTCG → Elementor global settings

Elementor stores **Global Colors** and **Global Fonts** in the kit's site settings (`system_colors`, `custom_colors`, `system_typography`, `custom_typography`). Colours are stored as **hex**: use the `hex` fallback, never invent a second palette. Map `ink → Primary text`, `accent → Accent`, `ground → (custom) Background`, type roles `display / text / utility → Primary / Text / Secondary / Accent typography`. Fluid sizes do not exist there; set desktop, tablet and mobile sizes from the `clamp()` min, mid and max. That is a loss of fidelity: say so.

## Astro (recommended)

**Version line (checked 2026-10-30):** the current major is **Astro 7** (7.0.0 on 2026-06-22, 7.4.4 on 2026-10-30; check `npm view astro version engines` before promising a Node version). Kiekkist exports target `astro ^7`. The notes below on the 6.0 break still apply when upgrading older projects: Astro 6.0 was released on 2026-03-10. It needs **Node 22.12 or newer**, uses Vite 7 and Zod 4, removed the legacy content collections (`content.config.ts` with the Content Layer API is mandatory), removed `Astro.glob()` (use `import.meta.glob()`) and `<ViewTransitions />` (use `<ClientRouter />`). The CSP API and Live Content Collections are stable; a built-in Fonts API exists. Sources: Astro blog "Astro 6", Astro docs "Upgrade to v6".

**Scaffold the exporter writes:**

```
astro.config.mjs        site, output static by default, i18n if needed, CSP on
src/styles/tokens.css   copied from the theme, unchanged
src/styles/site.css     the theme's site.css, split per component only if it is large
src/layouts/Base.astro  <html lang>, head (title, meta, OG, canonical, JSON-LD), header, footer
src/components/<Section>.astro   one per data-section, props for every text and image
src/content.config.ts   collections for repeatable content (services, projects, posts, team)
src/content/<collection>/*.md    real content extracted from the pages
src/pages/index.astro, impressum.astro, datenschutz.astro, 404.astro, [...slug].astro if needed
public/fonts/*.woff2 + LICENSE files, public/favicon.svg, public/robots.txt, public/llms.txt (if decided)
```

- **Fonts:** copy the theme's woff2 files and `fonts.css`. Do not hand the font to the Fonts API with a Google provider unless you verify the build output contains no remote URL; the theme already has licensed, subset files. `<link rel="preload">` only for the one display face of the first screen.
- **Images:** `astro:assets` `<Image>`/`<Picture>` with AVIF/WebP, width and height. The optimiser strips metadata; for AI-generated images that must keep machine-readable provenance, see `privacy-eu.md`, "AI Act".
- **JavaScript:** zero by default. Islands only for real interaction (menu toggle can be CSS plus a few lines of inline script). No framework runtime for a brochure site.
- **CSP:** enable Astro's CSP so inline scripts get hashes; it doubles as proof that nothing third-party loads.
- **Forms:** with a static build, post to a small endpoint (Astro SSR route, a PHP mailer on the webspace, or the client's existing form backend). See `launch.md`, L5.
- **Sitemap:** `@astrojs/sitemap`; `robots.txt` pointing to it.

**Client editing options for Astro** (from the maintainer's CMS comparison, 45 systems, and the CMS decision guide; licences and hosting re-checked where marked):

| Option | How the client edits | Hosting / data | Fits | Watch out |
|---|---|---|---|---|
| **No CMS** (Markdown/MDX in the repo) | sends changes to the agency or asks an agent; agency edits files | repo only | default for brochure sites | client cannot publish alone |
| **Sveltia CMS** | browser UI on `/admin`, fields per collection | Git (GitHub, GitLab, Gitea/Forgejo), no server, no DB | small teams on self-hosted Forgejo/Gitea (agency default) | field-based, no visual page building; HD felt that gap on tostedt-entdecken.de |
| **Decap CMS** | same model as Sveltia | Git, needs an OAuth helper | larger widget ecosystem | older UX |
| **Pages CMS** | email login, one YAML config | GitHub only | non-technical editors on GitHub | GitHub is US (Microsoft) |
| **Keystatic** | local or cloud UI | online mode GitHub only | dev-near teams on GitHub | not for self-hosted Git |
| **Directus** (self-host) | admin app plus visual editing on the live page | own server, SQL database | client wants in-context editing, data stays in the EU | a server to patch; licence: free under a revenue threshold, check the current BSL terms for clients above it |
| **Storyblok** (SaaS) | best visual editor, live preview of the Astro site | SaaS, EU data region selectable | marketing teams, several editors | subscription, vendor lock-in |
| **ApostropheCMS** | on-page editing | self-host, Node + MongoDB | visual building without SaaS | another stack to run |
| **Statamic / Kirby** (headless) | mature PHP panels | self-host, flat files or DB | agencies with PHP skills | two systems |
| **Payload** | admin generated from code, blocks, live preview | self-host, Node + DB | complex models, a developer on call | every schema change needs a developer |

Default order for a German small business: no CMS → Sveltia on the client's or agency's Forgejo → Directus self-hosted → Storyblok (EU region) when visual editing is the deciding wish.

## WordPress (block theme)

**Version line:** WordPress 7.0 "Armstrong" shipped on 2026-05-20 (minimum PHP 7.4; real-time collaboration was cut twelve days before release; new AI Client and a Connectors screen with Anthropic, Google and OpenAI as default providers, **nothing enabled by default**). theme.json schema version 3. Interactivity API in core since 6.5. Sources: DreamHost "WordPress 7.0 Armstrong", developer.wordpress.org theme.json reference.

**Deliver a block theme, not a classic theme and not a page builder.** Structure:

```
style.css                 theme header (Theme Name, Text Domain, Requires at least: 6.6, License)
theme.json                version 3, generated from tokens (mapping above), locks on
templates/index.html, front-page.html, page.html, single.html, archive.html, 404.html, search.html
parts/header.html, footer.html
patterns/<section>.php    one pattern per data-section, with real default content
styles/<variation>.json   optional style variations (dark band, alternative accent) from the same tokens
assets/fonts/*.woff2 + licences, assets/css/site.css (only what theme.json cannot express)
functions.php             minimal: enqueue site.css, register pattern category, remove emoji script, no external requests
readme.txt, LICENSE
```

- **Sections become patterns.** Each `data-section` from the pages turns into a pattern made of core blocks (Group, Columns, Heading, Paragraph, Image, Buttons, Details). Use `"templateLock": "contentOnly"` on patterns whose structure should not change: the client edits text and images, not the layout. Patterns in `patterns/` are registered automatically.
- **Exact styling** goes through `theme.json` `styles` and block style variations; raw CSS in `site.css` only for what blocks cannot express (signature element, grain, special rules). Each class there is a token consumer.
- **Interactivity:** small behaviours (menu, accordions beyond `details`, filters) with the Interactivity API, not jQuery or a slider plugin.
- **Privacy switches in `functions.php`:** remove the emoji script and DNS prefetch to `s.w.org`; no Google Fonts (theme.json `fontFace` from local files); do not enable the AI Connectors without a documented decision and a processor agreement; no Gravatar on comments (disable comments if unused).
- **Plugins:** as few as possible, each one named in the handover with its purpose and maintainer. Forms: a form plugin that stores nothing it does not need, with an EU-friendly spam check (ALTCHA has a WordPress plugin) instead of reCAPTCHA. No "all-in-one" SEO/security suites that phone home without need.
- **Editability:** the client changes texts, images, menus, posts, and picks from the locked palette and type scale in the Site Editor. Templates and patterns are locked or documented as "agency changes only".

### When Elementor is the client's reality

Be honest in the offer: Elementor sites are heavier, fidelity to the design drops (no OKLCH, no fluid type, wrapper markup), and every update of Elementor, Elementor Pro and add-ons is a maintenance item. If the client keeps Elementor anyway:

1. **Deliver the global layer for sure:** Global Colors and Global Fonts mapped from tokens (hex fallback), container widths and breakpoints from DESIGN.md, a style-guide page that shows every component.
2. **Deliver section templates only if they are proven.** Elementor exports a **kit** as a zip containing site settings, templates and content; the CLI is `wp elementor kit export <file.zip> [--include=site-settings,templates,content]` and the matching `wp elementor kit import` (developers.elementor.com, checked 2026-10-30). The internal JSON format of elements is not a documented, stable public schema. So the exporter writes Elementor JSON only together with a test: import the kit into a disposable WordPress (local Docker or wp-env), screenshot the pages, run `kk check` and `kk compare` against the theme. If the test cannot run, deliver the global layer and the style-guide page, and state that sections are rebuilt by hand.
3. **Never** ship third-party Elementor add-on widgets in the kit; never enable Elementor's Google Fonts loading (Elementor setting "Google Fonts: Disable" plus local fonts).

## Next.js

**Version line:** Next.js 16 (released 2025-10-21; Turbopack default bundler, explicit caching with Cache Components and `"use cache"`, `proxy.ts` replaces `middleware.ts` on the Node runtime, needs **Node 20.9+**, React 19.2 features). Source: Next.js 16 release coverage; static export docs on nextjs.org.

Use it only when the client already works in React. Otherwise it adds a runtime and a dependency tree to a site that does not need them.

**Two modes:**

- **Static export** (`output: 'export'` in `next.config`): a folder of HTML/CSS/JS for any webspace. Not available in this mode: server actions, ISR, `cookies()`/`headers()`, rewrites/redirects/headers from config, `proxy.ts`, the default image optimiser (set `images.unoptimized: true` or ship pre-sized images). Set `trailingSlash: true` for plain webspaces.
- **Server** (`output: 'standalone'` in a Docker image) on the client's EU host or Coolify, when forms, auth or dynamic content need it.

**Scaffold:** `app/layout.tsx` (lang, metadata API for title/description/OG, JSON-LD in a `<script type="application/ld+json">`), `app/page.tsx`, `app/(legal)/impressum/page.tsx`, `datenschutz`, `not-found.tsx`, `app/sitemap.ts`, `app/robots.ts`; `components/<Section>.tsx` with props; `styles/tokens.css` imported in the root layout; component styles as **CSS Modules** that read the token variables. No CSS-in-JS runtime.

- **Fonts:** `next/font/local` with the theme's woff2 files. `next/font/google` downloads at build time and self-hosts, which avoids runtime requests, but it bypasses the theme's licensed subset files; use local.
- **Tailwind:** only on request, with the `@theme` file generated above.
- **Images:** pre-sized AVIF/WebP via the exporter in static mode; never a third-party image CDN loader by default.
- **Hosting:** static output anywhere in the EU; standalone server on a German or French host. Vercel is the framework's home but a US provider; do not make it the default.

## Plain HTML

The theme's `pages/*.html` plus `tokens.css`, `site.css`, fonts and images, cleaned for production:

- shared header and footer kept identical across pages (the exporter checks the hash of both);
- every page gets its own `<title>`, description, canonical, OG tags;
- `sitemap.xml`, `robots.txt`, `404.html`, `favicon.svg` plus `apple-touch-icon.png`;
- forms post to a small endpoint (PHP on the webspace, or the client's existing backend);
- `.htaccess` (Apache) or a `_headers` file template with the security headers from `launch.md`, L10.

Editable only by someone who edits HTML, or by an agent. Fine for one-pagers and campaign pages; for more than about five pages or regular changes, use Astro.

## Later, unverified: Webflow and Framer

Both have design variables and component systems, and both can export or import parts of a site, but neither imports arbitrary HTML into an editable, component-based project in a way we have tested. Until a test exists: deliver tokens as their variable format by hand (documented list), and the pages as a visual reference. Both are US SaaS; for German clients this is an informed choice, not our default. Do not promise "one-click Webflow import".

## Editability matrix

What the client can change without the agency, once launched.

| Can the client … | Astro, no CMS | Astro + Git CMS | Astro + Directus / Storyblok | WordPress block theme | Elementor | Next.js | Plain HTML |
|---|---|---|---|---|---|---|---|
| fix a typo, change a price | no (ask agency or agent) | yes | yes | yes | yes | no | no |
| add a news post, project, job | no | yes, in defined collections | yes | yes | yes | no, unless a CMS is attached | no |
| swap a photo | no | yes | yes, with focal point | yes | yes | no | no |
| add a new page from existing sections | no | limited (if a "pages" collection with section blocks exists) | yes | yes, from patterns | yes | no | no |
| change colours, fonts | no | no | no (by design) | only within the locked palette and scale | yes, globally (risk of drift) | no | no |
| change layout of a section | no | no | limited (block options) | only unlocked patterns | yes (risk of drift) | no | no |
| break the design | hard | hard | possible within blocks | possible in unlocked areas | easy | hard | hard |
| install software | no | no | no | yes (plugins: main risk) | yes (add-ons) | no | no |

## Hosting per target (EU)

All named providers are EU-based; check each one's current data processing agreement before signing (`privacy-eu.md`, processors). Contract and account in the **client's name** (`launch.md`, L1).

| Target | Needs | EU options (examples, not endorsements) |
|---|---|---|
| Astro static, plain HTML, Next.js static export | static files, TLS, custom headers | shared webspace at German hosts (for example All-Inkl, Hetzner Webhosting, netcup, IONOS, Strato, Mittwald), Uberspace; a VPS with Caddy or nginx; Coolify on a Hetzner Cloud server (HD's own setup); Codeberg Pages (non-profit, Berlin) for non-commercial projects |
| Astro SSR, Next.js server, Directus, Payload | Node runtime or Docker, a database, backups | Hetzner Cloud or netcup VPS with Coolify; Scaleway or OVHcloud (France) managed containers; Mittwald for agencies |
| WordPress | PHP 8.x, MySQL/MariaDB, daily backups, updates | managed WordPress at German hosts (for example Raidboxes, Mittwald, All-Inkl, IONOS); self-managed on a VPS only with a care plan |
| CDN in front (only if needed) | edge cache | bunny.net (Slovenia); usually unnecessary for a regional business with a fast host |
| Storyblok, Sanity (SaaS CMS) | their cloud | select the EU data region and sign their DPA; both are non-EU companies (Storyblok Austria/US operations, Sanity US/Norway): name them in the privacy policy |

When the client already pays for a host, use it unless it fails the checks in `launch.md` (TLS, headers, PHP version, backups).

## What the exporter must never do

- Load anything from a CDN (fonts, icons, scripts, CSS frameworks).
- Add analytics, tag managers, chat widgets or embeds the brief did not ask for.
- Resolve token aliases into copies, or write a colour that is not in `tokens.json`.
- Claim a target is "done" when `kk check` on the exported build has hard failures or third-party requests.
