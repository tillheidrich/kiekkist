# Launch: the complete package (optional)

Some users only want the design. Others want to sell or launch a professional website and need what Squarespace, Webflow or a one-page builder bundle: domain, hosting, editor, forms, mail, legal pages, analytics, search basics, backups, monitoring, a handover. This phase gives them that, **optionally and step by step**. Never push it; offer it once after Phase 8 (Review) passes:

> "The design is done. Do you also want help putting it live (domain, hosting, forms, legal pages, analytics)? I can do most of it; a few decisions and sign-ups have to be yours."

If the answer is no, stop after Phase 9 (Filing). If yes, run the steps below in order. Skip a step only when the user says so or it does not apply, and record the skip in the launch sheet.

**This is not legal advice.** The legal steps prepare inputs and catch mechanical gaps. The site owner is responsible for the content of the Impressum and privacy policy; for anything unusual (shop, health data, minors, regulated profession) recommend a lawyer or a paid generator service with liability. Privacy rules: `privacy-eu.md`. Stack details: `stacks.md`.

## Ground rules

- **Everything in the client's name.** Domain, hosting, mail, analytics, CMS, Git repository, payment and processor agreements are registered to the client (or the site owner), with the client's email as owner. The agency or the user gets a separate admin or collaborator login. A site whose domain sits in the agency's account is a hostage, not a handover.
- **The agent never signs, pays or accepts terms.** It prepares, explains, fills drafts and verifies. The human creates accounts, enters payment details, accepts terms and agreements, and approves DNS changes.
- **Secrets never go into the repo, the chat log or a public page.** Put them in the client's password manager (or the agency's vault with a client share) and write only *where* they are into the launch sheet.
- **Every step ends with a check.** `kk launch` runs the automatic ones (see "Checklist runner" at the end); the manual ones are ticked by a human in the launch sheet with date and name.
- **Work in blocks, not days.** No effort estimates in person-days.

## The launch sheet

`.kiekkist/launch/<site>.md` (or `kk_launch_sheet`). One table per step: decision, who did it, date, where the credentials live, check result. It becomes the handover document in L13. Template headings: Domain · DNS · Hosting · Deploy · Editor · Forms · Mail · Legal pages · Analytics · Search · Performance · Security headers · Backups · Monitoring · Handover · Care.

---

## L1. Domain

| | |
|---|---|
| **Agent** | Proposes two or three domain options (short, no hyphens unless the brand has them, `.de` for a German local business, the brand's existing domain first). Checks availability via RDAP/WHOIS where possible. Explains registrar choice. |
| **Human** | Registers the domain **in the client's name** at an EU registrar or the chosen host (many German hosts include domains). Decides on extra spellings and redirects. Confirms the owner contact (DENIC requires a real holder). |
| **Auto-check** | Domain resolves; registrar and holder are not the agency (manual confirm); `www` and apex both answer, one redirects to the other with 301. |

## L2. DNS

| | |
|---|---|
| **Agent** | Writes the exact record set as a table: `A`/`AAAA` or `CNAME` for web, `MX` for mail, `TXT` for SPF, `DKIM` selector records, `_dmarc` TXT, `CAA` allowing only the CA in use (e.g. Let's Encrypt), verification records for search consoles. TTL 300 during the switch, 3600 afterwards. |
| **Human** | Enters or approves the records at the DNS provider. Keeps the old records written down for rollback. |
| **Auto-check** | Presence and syntax: A/AAAA or CNAME for apex and `www`; MX if mail is used; SPF exactly one `v=spf1` record with at most 10 lookups; DKIM record for the named selector; DMARC record with at least `p=none` and a `rua` address; CAA present. DNSSEC status reported (recommended, not required). |

## L3. Hosting

| | |
|---|---|
| **Agent** | Recommends one host per target from `stacks.md` ("Hosting per target"), based on what the client already pays for. Lists what the plan must include: TLS (Let's Encrypt), HTTP/2 or 3, custom headers, PHP 8.x if WordPress, daily backups with restore, EU data centre, a DPA (AVV). |
| **Human** | Orders the plan in the client's name, signs the host's DPA in the customer panel (most German hosts offer it there), stores credentials. |
| **Auto-check** | TLS valid, certificate covers apex and `www`, expires in more than 14 days; HTTP redirects to HTTPS; server location by IP geolocation reported as information (not proof); response time of the first byte measured. |

## L4. Deploy and editor

| | |
|---|---|
| **Agent** | Runs `kk export --target …`, creates the repository (client's Git or the agency's with client access), sets up the deploy (Coolify, Git-to-FTP action, host's Git deploy, or manual upload for plain HTML). Installs and configures the chosen editor (`stacks.md`, editing options): collections, field labels in German, previews, roles. Writes a one-page editor guide with screenshots of the real admin. |
| **Human** | Decides who may edit what. Attends a 30-minute walk-through (screen share) and makes one real edit while the agent watches. |
| **Auto-check** | Build passes; deployed site equals the export (hash of `index.html` or a sample of pages); editor login page reachable only over HTTPS; a test edit appears on the site after publish (manual confirm). |

## L5. Forms (without US services) and spam protection

| | |
|---|---|
| **Agent** | Builds the form with **data minimisation**: only fields that are needed to answer (name, contact, message; phone optional), visible labels, a link to the privacy policy next to the submit button (information, not a consent checkbox, when the legal basis is the enquiry itself). Backend in this order: (1) Astro/Next server route or a small PHP mailer on the client's own webspace that sends via the client's SMTP; (2) a self-hosted form or automation tool on the client's or agency's EU server (for example n8n, Formbricks); (3) an EU form service with a DPA. Spam protection without tracking: honeypot field + minimum fill time + server-side rate limit, and if spam persists **ALTCHA** (MIT, proof-of-work, no cookies, self-hostable; operator in Czechia) or **Friendly Captcha** (German company, proof-of-work; hosted service, needs a DPA). No reCAPTCHA or hCaptcha by default: both are third-party requests that need consent in practice. Confirmation mail to the sender only if the client wants it (it can be abused for spam; never echo the message body). |
| **Human** | Names the inbox that receives enquiries; decides retention (how long enquiries are kept in the mailbox and any database); for newsletters, chooses an EU newsletter tool and confirms double opt-in. |
| **Auto-check** | Form endpoint answers a test POST with success; the test message arrives (manual confirm in the inbox; this is the finish gate in `web.md`); form page makes no third-party request; honeypot present; `autocomplete` attributes set; labels linked to inputs; error messages in text. |

## L6. Transactional mail

| | |
|---|---|
| **Agent** | Chooses the sending path: the client's mailbox provider via SMTP (simplest for form mails), or an EU transactional service (for example Brevo, France; Mailjet, France; Lettermint, Netherlands; Scaleway Transactional Email, France) for shops and apps. Configures SPF/DKIM/DMARC alignment for the sending domain. Uses a `From` on the client's domain and a real `Reply-To`. |
| **Human** | Creates the mailbox or service account in the client's name, signs the DPA, approves DNS records. |
| **Auto-check** | SPF includes the sender; DKIM selector resolves; DMARC present; a test mail passes SPF and DKIM (read the `Authentication-Results` header of the received test, manual paste). |

## L7. Legal pages

| | |
|---|---|
| **Agent** | Creates `/impressum` and `/datenschutz` pages and links both from **every** page footer (and from the form). Fills the **Impressum** from the client's data per **§ 5 DDG** (Digitale-Dienste-Gesetz, in force since 14 May 2024, replacing § 5 TMG): name and address where the provider can be served (no PO box); for legal entities the legal form and authorised representatives; fast electronic contact, at least email plus a second direct channel (phone or contact form); register court and number if registered; VAT ID (USt-IdNr.) or business ID (W-IdNr.) if one exists; supervisory authority if the activity needs a licence; for regulated professions the chamber, the professional title and the state that granted it, and where the professional rules can be read (in the trades: Handwerkskammer and title for licensed trades; check with the chamber). Adds **§ 18 Abs. 2 MStV** (responsible person for editorial content) if the site has journalistic-editorial content such as a news blog. Adds a consumer dispute resolution statement (§ 36 VSBG) where required: businesses with more than ten employees that have a website or use terms with consumers must state whether they take part. **Removes any link to the EU ODR platform**: it was shut down on 20 July 2025. Prepares the **privacy policy inputs** (list below) and either fills a template the client supplies or hands the list to the generator the client chooses. If the BFSG applies, adds the **accessibility information** page and links it in the footer. |
| **Human** | Confirms every Impressum fact (the agent never invents a register number or title). Chooses how the privacy policy is produced (own lawyer, a generator such as those by eRecht24, Dr. Schwenke's datenschutz-generator.de, IT-Recht Kanzlei or activeMind, or the client's DPO) and approves the final text. Decides whether the BFSG applies (see below). |
| **Auto-check** | On every page: a link whose text or `href` matches Impressum and Datenschutz, reachable within two clicks; legal pages return 200, are indexable or not as decided, contain no lorem ipsum or placeholder brackets; Impressum contains an email address and a street address pattern; no link to `ec.europa.eu/consumers/odr`; if the processors list (`privacy-eu.md`) contains a service, its name appears in the privacy policy text. |

**Privacy policy inputs** (the agent fills this from the build, never from memory):

1. Controller: name, address, contact; data protection officer if one is appointed.
2. Hosting provider and the server log practice: which fields, retention period, legal basis (Art. 6 (1) (f) GDPR, security and operation).
3. Every processor and every third party that receives data, with purpose, location, and the transfer basis for non-EU recipients (adequacy decision, EU-US Data Privacy Framework certification, standard contractual clauses). Generated from `kk launch --processors`.
4. Contact form and email: fields, purpose, legal basis (Art. 6 (1) (b) for enquiries about a contract, otherwise (f)), retention.
5. Analytics: tool, cookie-free or not, what is measured, retention, whether IP addresses are stored or only used transiently, legal basis; opt-out if offered.
6. Fonts: "self-hosted, no connection to third parties" (say it, since visitors look for it).
7. Embeds and maps: which, two-click mechanism, what happens after the click.
8. Newsletter (if any): provider, double opt-in, revocation.
9. Shop and payment (if any): payment providers as independent controllers or processors.
10. Rights of data subjects (Art. 15 to 21 GDPR), right to complain to a supervisory authority, revocation of consent.
11. Whether the provision of data is required; automated decision-making (normally none).
12. AI features on the site (chatbot, AI search): provider, what is sent, labelling.

**BFSG (accessibility) in one paragraph:** since 28 June 2025 the Barrierefreiheitsstärkungsgesetz covers "services in electronic commerce": websites and apps through which a **consumer** can conclude a contract (shop, booking, paid sign-up). Pure presentation sites without booking or payment are not covered; micro-enterprises providing services (fewer than ten employees **and** turnover or balance sheet total of at most EUR 2 million) are exempt. Covered sites must meet the requirements (in practice WCAG 2.1 AA via EN 301 549, our build targets WCAG 2.2 AA anyway) and publish information on how they meet them, including the market surveillance authority (§ 14 BFSG). Source: IT-Recht Kanzlei, BFSG statement guide (checked 2026-10-30).

## L8. Analytics (cookie-free, only if wanted)

| | |
|---|---|
| **Agent** | Asks first whether the client will look at numbers at all. If not: no analytics, server log summary on request. If yes: a cookie-free, EU-hosted or self-hosted tool (for example Umami or Matomo self-hosted, Plausible with EU hosting) loaded **from the client's own domain** (first-party path or proxy), no cross-site identifiers, IP addresses not stored, events only for meaningful actions (phone tap, mail tap, form sent). No Google Analytics, no tag manager, no Meta pixel by default. Writes the matching privacy policy section. |
| **Human** | Decides yes or no and who gets the report. If the client insists on Google Analytics or ad pixels: that requires a consent banner and a consent tool; the agent builds it as part of the system and warns about the first-screen cost (`web.md`, format traps). |
| **Auto-check** | No request to known tracker hosts; the analytics script loads from the site's own origin; no cookie or `localStorage` key set before interaction (other than a documented, strictly necessary one); the tool appears in the privacy policy. |

## L9. Search and AI visibility basics

| | |
|---|---|
| **Agent** | Unique `<title>` (about 50 to 60 characters) and meta description (about 140 to 160) per page; one `h1`; canonical URLs; `lang`; Open Graph and Twitter card tags with a 1200×630 image from the social roll-out; `sitemap.xml` and `robots.txt` with the sitemap line; JSON-LD where it fits (Organization or LocalBusiness subtype with address, geo, opening hours; WebSite; BreadcrumbList; Service; Person for owners; FAQPage only for real FAQs, knowing Google shows FAQ rich results only for a few authority sites); a real `404` page; clean URLs without dates or IDs; redirects from old URLs on a relaunch (301 map). **llms.txt** is a decision, not a default: it is not a Google ranking signal; it costs little and some AI assistants read it. Offer it, write it short (15 to 25 important URLs), and say plainly what it does and does not do. AI crawler policy in `robots.txt` (allow or block GPTBot, ClaudeBot, PerplexityBot and others) is the client's choice. |
| **Human** | Approves titles and descriptions (they are copy); decides on llms.txt and AI crawlers; verifies the site in Google Search Console and Bing Webmaster Tools with their own accounts (US services, used only by the owner, no script on the site); claims and updates the Google Business Profile for local businesses. |
| **Auto-check** | Per page: title present, unique, length in range; description present, unique; exactly one `h1`; canonical present and self-referencing; `og:title`, `og:description`, `og:image` (image reachable, 1200×630); JSON-LD parses and has `@context` and `@type`; `sitemap.xml` reachable, valid XML, lists only 200 URLs of the site; `robots.txt` reachable, does not block the whole site, names the sitemap; `/404-test-<random>` returns status 404 with the custom page; favicon and `apple-touch-icon` present; `llms.txt` reachable if decided; old URL map: every entry returns 301 to a 200. |

## L10. Performance budget and security headers

| | |
|---|---|
| **Agent** | Holds the budget from `web.md`: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile (Google's documented thresholds). House budget for a brochure page: HTML+CSS ≤ 100 KB compressed, JavaScript ≤ 50 KB (zero is normal), fonts ≤ 4 files and ≤ 200 KB, first-screen image ≤ 200 KB in AVIF/WebP. Sets caching (`immutable` for hashed assets) and compression. Sets security headers: `Strict-Transport-Security` (start with `max-age=31536000`, add `includeSubDomains` only when every subdomain is HTTPS), `Content-Security-Policy` (self only; Astro's CSP hashes help), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera, microphone, geolocation unless used, `frame-ancestors 'self'` in CSP. |
| **Human** | Accepts or adjusts the budget if the brief needs video or heavy imagery; runs one test on a real phone on mobile data. |
| **Auto-check** | Lab measurement with the headless browser at 390 px on throttled network (LCP, CLS, total transfer, request count, JS bytes) against the budget; response headers present and sane (HSTS max-age ≥ 15552000, CSP without `unsafe-eval`, no `Server` version banner as information); no mixed content. Field data (CrUX) is reported only when it exists; lab numbers are labelled as lab. |

## L11. Backups

| | |
|---|---|
| **Agent** | Static sites: the Git repository is the backup of code and content; add a mirror (second remote) and keep build artefacts reproducible. Sites with a database or uploads (WordPress, Directus): daily automated backups to a **different** provider or location in the EU, retention for example 14 daily and 8 weekly, encrypted; a written restore procedure; **one test restore before launch**. |
| **Human** | Owns the backup storage account; confirms the restore test result. |
| **Auto-check** | Repository has a second remote (if accessible); backup job's last run within 26 hours (if the host exposes it); restore test date recorded in the launch sheet (manual). |

## L12. Monitoring

| | |
|---|---|
| **Agent** | Sets up uptime monitoring for the home page and the form endpoint (for example a self-hosted Uptime Kuma, or the host's monitor), certificate expiry warning at 14 days, domain expiry reminder, a monthly `kk launch --recheck` run (headers, third-party requests, legal links, broken links). Alerts go to the client's chosen contact and the care provider. |
| **Human** | Names who receives alerts and who acts on them. |
| **Auto-check** | Monitor exists (manual confirm or API); certificate expiry > 14 days; broken links: none on internal pages. |

## L13. Handover

The launch sheet becomes the handover document. The agent fills it; the human signs it off with the client.

- **Accounts table:** service, purpose, account owner (must be the client), admin logins of the agency (named, removable), where credentials are stored, renewal date and cost, DPA signed (yes/date).
- **Domain and DNS:** registrar, record table as live, rollback values.
- **Site:** target, repository URL and access, how to deploy, how to roll back, versions (framework, CMS, PHP/Node).
- **Editing guide:** what the client can change (from the editability matrix in `stacks.md`), with screenshots; what to ask the agency for.
- **Legal:** where Impressum and privacy policy come from, who must update them when something changes (new tool, new staff, new address); the processors list.
- **Operations:** backups (where, how to restore, last test), monitoring (who gets alerts), update schedule.
- **Design system:** `DESIGN.md`, tokens, font licences, image licences and photo consents (`legal.md`).
- **Agent file:** a short `AGENTS.md`/`CLAUDE.md` in the repository so the next agent can work on the site immediately: stack, commands, content locations, rules (tokens only, no third-party requests, legal pages linked everywhere).

**Auto-check:** every account row names an owner that is not the agency; every service in the processors list has "DPA: yes" or a reason; the sheet has no empty required cells.

## L14. Care plan options

Offer, do not push. Three shapes cover most cases; prices are the user's own:

| Shape | Contains | Suits |
|---|---|---|
| **None** | handover only; client or their IT runs the site | technical clients, static sites with no CMS |
| **Basic** | hosting supervision, updates (framework, CMS, plugins), backups with quarterly restore test, monitoring, monthly `kk launch --recheck`, small text changes | most small businesses |
| **Plus** | Basic plus content updates on request, SEO/visibility care (titles, structured data, Google Business Profile), quarterly report in plain language, annual design check against the system | businesses that use the site to sell |

Write into the offer what is **not** included (new pages, new features, legal advice) and a price adjustment clause.

---

## Checklist runner: what `kk launch` can verify automatically

| Area | Automatic | Manual (human confirms in the sheet) |
|---|---|---|
| Domain / DNS | records present and syntactically valid, apex/www, SPF lookups, DKIM, DMARC, CAA, DNSSEC info | holder is the client, registrar account |
| TLS / HTTP | certificate validity and expiry, HTTPS redirect, HSTS, security headers, mixed content | — |
| Privacy | third-party requests on every page (none allowed unless listed with consent), cookies and storage before interaction, fonts self-hosted, embeds behind a facade | the privacy policy text is correct |
| Legal links | Impressum and Datenschutz linked on every page, reachable, no placeholders, no ODR link, processors named in the policy | Impressum facts are true |
| Search | titles, descriptions, h1, canonical, OG, JSON-LD parse, sitemap, robots, 404 status, favicon, llms.txt (if decided), redirect map | titles read well; Search Console verified |
| Forms | endpoint answers a test POST, honeypot present, labels, no third-party request on the form page | test message arrived |
| Performance | lab LCP/CLS, bytes, request count against the budget | real phone test |
| Accessibility | `kk check` hard failures (contrast, targets, alt text, overflow) plus axe-core findings | keyboard walk-through, screen reader spot check |
| Operations | monitor reachable (if API), backup last run (if exposed) | restore test, alert recipient |
| Handover | sheet completeness, account owners not the agency | sign-off |

Passing `kk launch` means nothing mechanical is missing. It does not mean the site is legally compliant. Say that out loud when reporting.
