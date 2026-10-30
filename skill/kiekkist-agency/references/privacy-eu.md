# Privacy by default (EU, Germany)

**This is not legal advice.** It is a working rule set for designers and agents building websites for German and EU clients, as of **30 October 2026**. Where the law is unsettled it says so. When a project depends on one of these questions (shop, health, minors, employees, profiling, AI features), the client asks a lawyer or their data protection officer.

The goal is simple to state: **a visitor's browser talks only to the client's own server until the visitor decides otherwise.** Then most consent questions disappear, there is nothing to put in a cookie banner, and the privacy policy is short and true.

## The legal frame in five lines

- **Device access** (cookies, `localStorage`, fingerprinting, reading anything from the device) needs consent unless it is strictly necessary for a service the user asked for: **§ 25 TDDDG** (formerly TTDSG), implementing the ePrivacy Directive.
- **Personal data** (an IP address is treated as personal data in German practice) needs a legal basis under **Art. 6 GDPR**; for a website this is mostly legitimate interest (f) for operation and security, contract (b) for enquiries and orders, or consent (a).
- **Sending data to a third party** (a font CDN, a video host, a map tile server) is a disclosure that needs its own basis. The **LG München I** awarded EUR 100 in damages on **20.01.2022** (3 O 17493/20) because a site loaded Google Fonts from Google's servers and passed the visitor's dynamic IP without consent. The underlying questions (is a dynamic IP personal data for the site owner, is damage abusive when provoked) were referred to the CJEU by the **BGH on 28.08.2025 (VI ZR 258/24)**; the CJEU ruling was **pending** at the time of writing. Until then, treat third-party requests as needing consent.
- **Competitors can sue** over GDPR violations under unfair competition law: **CJEU 04.10.2024, C-21/23 (Lindenapotheke)**. A privacy flaw is therefore also a warning-letter risk, not only a regulator risk.
- **Consent management services** (PIMS) under the **Einwilligungsverwaltungsverordnung**, in force since **01.04.2025**, are meant to replace banners over time; no recognised service was widely in use at the time of writing. Do not design around them yet.

## Rule 1: no third-party requests without consent

The build makes **zero** requests to hosts other than the site's own origin on first load. `kk check` and `kk launch` measure this in a real browser and list every foreign host.

| Thing | Default | If the brief needs it |
|---|---|---|
| **Fonts** | self-hosted woff2 from the theme (`typography.md`) | never a font CDN, including "privacy-friendly" mirrors: still a third party |
| **Icons, CSS frameworks, JS libraries** | bundled or copied into the site | never cdnjs, jsDelivr, unpkg, Google Hosted Libraries at runtime |
| **Images** | served from the site | no hotlinking from stock sites or social media |
| **Video** (YouTube, Vimeo) | a **two-click facade**: a local poster image, the title, a short notice ("Loading this video connects you to YouTube/Google; see privacy policy"), a play button. The iframe is inserted only after the click. `youtube-nocookie.com` alone is not enough: it avoids some cookies on load but still connects to Google and stores data once played, and the iframe itself loads Google resources when it is in the page | self-host the video file (MP4/WebM, poster, captions) when the client owns it: no third party at all |
| **Maps** | a static map image made locally (with attribution if the data is OpenStreetMap, ODbL), the address as text, and a link "Open in OpenStreetMap / Google Maps" (`target` new tab) | an interactive map behind a two-click facade, or self-hosted tiles (for example a PMTiles file served from the site) |
| **Social feeds, share buttons, like buttons** | plain links to the profiles | none embedded; if needed, two-click |
| **Reviews widgets** (Google, ProvenExpert, Trustpilot) | a static excerpt with date and a link to the source; respect `§ 5b UWG` on how reviews were checked (`legal.md`) | widget behind two-click |
| **Chat widgets, booking widgets** | a link or a contact form | behind two-click; AI chatbots also need the AI Act notice (below) |
| **Captcha** | honeypot + time check + rate limit; **ALTCHA** self-hosted if needed (no cookies, no third party) | Friendly Captcha (EU, hosted: a processor with DPA, named in the policy); reCAPTCHA and hCaptcha only with consent |
| **Analytics** | none, or cookie-free and first-party (Rule 3) | anything with cookies or cross-site IDs needs consent and a consent tool |
| **Payment** | provider's checkout loaded only on the checkout step | name providers in the policy; Mollie, Stripe, PayPal scripts never site-wide |

**Two-click facade pattern** (part of the component inventory in `DESIGN.md`): placeholder with real dimensions (no layout shift), local poster, visible provider name, one-sentence notice with a link to the privacy section, a button that loads exactly one embed. Optional "remember for this visit" stored in `sessionStorage` after the click (the click is the consent; storing it is then covered). The facade must be keyboard operable and announce itself to screen readers.

## Rule 2: consent only when needed, and then properly

If the site sets nothing and loads nothing foreign, it needs **no cookie banner**. Do not add a banner "to be safe": it costs the first screen, trains visitors to click away, and often itself loads a third-party consent script.

When consent is needed (marketing pixels, Google Analytics, embeds without facade):

- equal "Accept" and "Reject" on the first layer, no pre-ticked boxes, no dark patterns (the German authorities and courts have repeatedly rejected banners without an equal reject option);
- nothing loads before consent; withdrawing is as easy as giving (a persistent link in the footer);
- the banner is designed as part of the system and checked on the first screen at 390 px (`web.md`, format traps);
- prefer a self-hosted open-source consent tool over a SaaS consent manager that is itself a third-party request.

## Rule 3: analytics without consent, carefully

- **Not covered by § 25 TDDDG** is the processing of data the browser sends anyway with the page request (IP, user agent, referrer), as long as nothing is stored on or read from the device (DSK Orientierungshilfe Telemedien, December 2021, p. 8; summarised by dr-datenschutz.de). The GDPR still applies to the IP address.
- **Defensible without consent** (legitimate interest), in the reading of most German practitioners: purely statistical reach measurement, no recognition of returning visitors across days, no profiles, no passing to third parties, IP addresses not stored (used transiently or hashed with a daily rotating salt), first-party hosting in the EU. Umami, Matomo (cookie-less mode) and Plausible are built for this; configure them that way and check it.
- **Not without consent:** cookies or `localStorage` IDs for analytics, fingerprinting, Google Analytics, Meta pixel, LinkedIn Insight, heatmap tools recording sessions.
- **Uncertain:** some authorities take stricter views on any server-side measurement involving IP addresses; the BGH referral above may change the IP question. Write the analytics section of the privacy policy precisely, offer an opt-out link, and keep the setup minimal.

## Rule 4: forms collect only what is needed

- Fields: what you need to answer. A phone number is optional unless the business only calls back. No date of birth, no salutation field "for marketing", no hidden tracking fields (UTM parameters only if the policy says so).
- No consent checkbox for a simple enquiry: the legal basis is answering the request (Art. 6 (1) (b) or (f) GDPR). A short line with a link to the privacy policy next to the button informs. A checkbox is needed for things beyond the enquiry (newsletter, which also needs double opt-in).
- Transport: HTTPS; the mail to the business goes through the client's own mail provider or an EU service with a DPA. No form SaaS outside the EU by default.
- Storage: if a database stores enquiries, set a deletion period (for example 6 months after the matter is closed, unless tax or commercial retention applies to resulting contracts) and implement it as a job, not a promise.
- Uploads (applications, photos): size limit, type check by content, strip EXIF location data, delete after the stated period.
- Special categories (health, religion, union membership) only with explicit need and explicit consent; a hairdresser's "allergies" field is health data.

## Rule 5: logs and retention

- Web server access logs contain IP addresses. Keep them short: a common practice is 7 to 14 days for security and error analysis, then delete or anonymise. There is no single statutory number; write the chosen period in the privacy policy and configure the host to match. Many shared hosts anonymise logs after a few days by default; check the panel.
- Error tracking (if any) self-hosted or EU, without IP addresses and without form contents in error payloads.
- Backups inherit the data they contain: their retention must not silently extend deletion periods beyond what the policy says.

## Rule 6: the processors list

Every service that processes personal data on the client's behalf is a **processor** (Art. 28 GDPR) and needs a data processing agreement (DPA, German "AVV"). Kiekkist keeps the list as data (`kk launch --processors`), generated from the build and the launch sheet:

| Field | Example |
|---|---|
| service | Hosting (webspace) |
| provider, country | ExampleHost GmbH, Germany |
| data | server logs (IP, user agent, time, URL), form mails |
| purpose | operation, security, delivery of enquiries |
| role | processor |
| DPA | signed 2026-11-03 in the customer panel |
| transfer outside EU/EEA | none |
| named in privacy policy | yes |

Typical rows for a small business site: hosting, DNS (if separate), mail provider, transactional mail service, form backend (if not on the webspace), analytics (if hosted by a third party), backup storage, CMS SaaS (Storyblok, Sanity), monitoring (if it receives personal data), payment providers (usually independent controllers, still named). A self-hosted tool on the client's own server is not a processor, but its hoster is.

For non-EU providers: name the transfer basis (EU-US Data Privacy Framework certification, checked on the DPF list; standard contractual clauses). Prefer EU providers; this is also the HD house rule.

## Rule 7: AI Act labelling on websites

Regulation (EU) 2024/1689, **Art. 50**, applies since **2 August 2026**. The Digital Omnibus on AI (Regulation (EU) 2026/1744, in force 27 July 2026) postponed the high-risk rules to December 2027 but **left the Art. 50 date unchanged**; the only relief is a grace period until **2 December 2026** for the providers' machine-readable marking duty for generative systems already on the market before 2 August 2026 (Baker Botts, September 2026). The Commission published final transparency guidelines and confirmed a code of practice in July 2026.

What it means for a site we build (deployer duties, plus the provider duty if the client runs its own AI system):

| On the site | Duty | How we build it |
|---|---|---|
| **Chatbot or AI assistant** | people must be told they interact with an AI, unless obvious (Art. 50 (1), provider duty, but the deployer's interface must carry it) | a visible line in the widget before the first message ("You are chatting with an AI assistant. Answers can be wrong."), plus the privacy policy section |
| **Photorealistic AI-generated or AI-manipulated image, video or audio** (team, workshop, interior, product in use) that could pass as real | disclose as artificially generated (Art. 50 (4), "deep fake" in the broad reading of the guidelines; applies without intent to deceive and without a real person depicted) | avoid them for proof of real work (also a `§ 5 UWG` issue). If used: a visible caption or overlay label near the image ("KI-generiertes Bild"), not only in the alt text or a footer |
| **Clearly stylised illustration** | no label (exception in the guidelines for evidently artistic or non-realistic content) | none required; a credit line is good practice |
| **Photo with AI retouching** | colour, light, minor cleanup: no label. Object removal, generative fill or expansion: borderline, label | the photo credit says "retouched" or "partly AI-generated" as needed |
| **AI-written text** | label only for text published to inform the public on matters of public interest, and not when a human has reviewed it and an editor takes responsibility (Art. 50 (4)) | service pages, landing pages and product texts: no label. A news blog with public-interest topics: name an author and editor (also `§ 18 MStV`) |
| **Machine-readable marking** | provider duty of the generating system (Art. 50 (2)) | do not strip provenance on purpose: the default image pipeline (Astro, sharp, Next) removes metadata including C2PA; for AI-generated images either keep a copy with metadata linked from the credit, or rely on the visible label. For real photos, stripping EXIF (location) is the privacy default |

Do not put a blanket "made with AI" banner on every page: the duty is limited to the cases above, and a blanket label misinforms (maintainer's research notes "Was Art. 50 für Marketing heißt", 11.08.2026).

## Rule 8: say what you checked, never "guaranteed compliant"

**We may say:**

> "Built privacy-by-default: no cookies, no third-party requests on load, fonts and videos self-hosted, analytics cookie-free and first-party. Checked on 2026-11-03 for third-party requests, cookies before interaction, legal page links and security headers (report attached)."

> „Datenschutzfreundlich gebaut: keine Cookies, keine Verbindungen zu Drittanbietern beim Laden, Schriften selbst gehostet. Am 03.11.2026 geprüft auf Drittanfragen, Cookies vor Einwilligung, Impressum- und Datenschutz-Links und Sicherheits-Header (Prüfbericht anbei).“

**We do not say:** „DSGVO-konform garantiert“, „100 % rechtssicher“, „abmahnsicher“, „DSGVO-zertifiziert“ (unless there is an actual certification under Art. 42 GDPR, which a website template never has).

**Why (UWG risk):**

1. **Misleading claim, § 5 UWG.** Whether a site is GDPR compliant depends on the operator's processing, contracts, policy text and behaviour, not on the theme. A guarantee the theme cannot keep is a false statement about an essential characteristic of the service.
2. **Advertising with self-evident features.** Compliance with a legal duty that applies to every provider, presented as a special advantage, can be misleading in itself (Werbung mit Selbstverständlichkeiten, § 5 UWG; for consumer rights explicitly blacklisted in No. 10 of the Annex to § 3 (3) UWG). Saying *what* was done and *that it is standard* avoids the impression.
3. **Competitors can enforce GDPR via UWG** (CJEU C-21/23, 2024). A shop or agency that advertises "guaranteed compliant" and is not invites exactly the warning letter it promised to prevent.
4. **Liability.** A guarantee can become a contractual warranty towards the client.

The same rule applies to accessibility: "built to WCAG 2.2 AA, checked with axe-core and keyboard on <date>" yes; "barrierefrei zertifiziert" or "BFSG-konform garantiert" no.

## What `kk` checks and what stays human

| Automatable (in `kk check` / `kk launch`) | Human judgement |
|---|---|
| foreign hosts requested on load, per page and per viewport | whether a listed foreign request is covered by consent or contract |
| cookies, `localStorage`, `sessionStorage`, IndexedDB written before any interaction | whether a stored item is strictly necessary |
| font files served from the site's origin | font licence (`typography.md`) |
| iframes present before click (should be none) | wording of the facade notice |
| legal page links on every page; no ODR link | content of Impressum and privacy policy |
| processors in the list named in the policy text | correctness of the list, DPAs signed |
| AI image metadata present (C2PA, IPTC "trainedAlgorithmicMedia") on images marked AI in the theme manifest, and a visible label near them | whether an image counts as a deep fake |

## Sources (checked 30.10.2026 unless dated otherwise)

- LG München I, judgment of 20.01.2022, 3 O 17493/20 (Google Fonts), e.g. via ra-plutte.de and gesetze-bayern.de.
- BGH, referral of 28.08.2025, VI ZR 258/24, to the CJEU (dynamic IP, abuse), summary by TCI Rechtsanwälte (tcilaw.de), status pending as of 05.11.2025; re-check before relying on it.
- CJEU, judgment of 04.10.2024, C-21/23 (Lindenapotheke), via IT-Recht Kanzlei.
- DSK, Orientierungshilfe für Anbieter von Telemedien (December 2021); dr-datenschutz.de on cookieless tracking (2022, older than later guidance: treat as background).
- e-recht24.de on YouTube/Vimeo embeds and two-click solutions.
- activeMind, guide to the EinwVO (updated 16.09.2025).
- Baker Botts, "EU AI Act Article 50 transparency obligations go live" (September 2026); maintainer's research notes "Was Art. 50 für Marketing heißt" (11.08.2026) with WBS Legal, Crispy Content and Greenberg Traurig as sources.
- IT-Recht Kanzlei, BFSG accessibility statement guide; Werbung mit Selbstverständlichkeiten.
- ALTCHA (altcha.org): MIT licence, no cookies, operated by BAU Software s.r.o., Czechia.
- IHK and WBS Legal notes on the shutdown of the EU ODR platform on 20.07.2025.

**Marked uncertain in this file:** IP addresses as personal data for the site owner (pending CJEU), analytics without consent when IPs are processed transiently (authority views differ), log retention period (no statutory number), Art. 50 borderline cases (generative fill, stylised but realistic images).
