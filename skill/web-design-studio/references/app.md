# App screens

App screens are product register: people use them repeatedly, often in a hurry, with one thumb. The brand shows in a few places; everywhere else the system gets out of the way.

## Canvas

- Author screens at **390×844** CSS px, the logical size of a common current iPhone class. Check one smaller width (375) and one larger (430) for overflow.
- Respect safe areas: status bar and camera cutout at the top, home indicator at the bottom. In HTML mockups use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` with a mock frame; in a real native build use the platform's safe-area layout. Do not hard-code inset values from memory; read them from the simulator or the platform documentation for the target devices.
- One file per screen (`app/home.html`, `app/booking-step-2.html`), linking `../tokens.css`.

## Platform conventions first

Users bring habits from every other app on their phone. Break a convention only when the brief has a reason.

- Navigation: a tab bar for three to five top-level sections (Apple Human Interface Guidelines), a navigation bar with back action for hierarchy, sheets for focused tasks.
- Touch targets: at least **44×44 pt** (Apple HIG) or **48×48 dp** (Material Design). WCAG 2.2 sets 24×24 CSS px as the absolute minimum for the web.
- Text: support the platform's dynamic text sizes. Layouts must survive the largest accessibility size without clipping; test it.
- System fonts (SF Pro on iOS, Roboto on Android) are legitimate in the product register. A brand face is for a few places: onboarding, empty states, headers. If a brand face is used for body text, it must have the weights and the legibility to carry dense UI.

## States

Design every state, not only the happy path. For each screen, list and build the ones that apply:

| State | What it needs |
|---|---|
| First run | what this screen is for, one clear first action |
| Empty | an invitation to act, not a mood illustration |
| Loading | skeleton or progress that keeps the layout stable |
| Error | what went wrong, in plain words, and how to fix it |
| Offline | what still works, what will sync later |
| Success | confirmation that names what happened ("Appointment booked for Tue 14:00") |
| Long content | the longest realistic names, prices and lists |
| Permissions | why the app asks, before the system dialog |

## From the system

- Colour strategy usually "one accent" plus status colours. Colour carries meaning here (selected, error, success); decoration dilutes it.
- Spacing and radius tokens from DESIGN.md; components in the inventory get mobile variants (list rows, segmented controls, bottom sheets, steppers).
- The signature element appears once, where it helps recognition (onboarding, a header, an empty state), not on every screen.
- Dark appearance: design it if the platform setting will apply. Raised surfaces lighter than the ground, lower chroma accents, contrast checked in both modes.

## Format traps

| Trap | Fix |
|---|---|
| Content under the home indicator or camera cutout | safe-area insets |
| Keyboard covers the active field | scroll the field into view; check every form screen with the keyboard open |
| Text truncated at large dynamic type | allow wrapping, test the largest size |
| Tab bar with six or more items | group or move to a "more" pattern |
| Gesture-only actions | visible alternative for every swipe action |
| Web mockup looks right, native build differs | name native components in DESIGN.md (`Components`) so the builder maps them |

## Check

Render each screen at 390×844 and at the largest text size you can simulate. Run the check for overflow and contrast. Then walk one real task through the screens in order (for example "book an appointment") and count taps; every unnecessary step is a finding.

## Canvas size for Kiekkist

Put the canvas size in the head of every file, so Kiekkist renders the screenshot at the right size: `<meta name="kk:size" content="WIDTHxHEIGHT">`, for example `1920x1080` (slide), `1080x1350` or `1200x630` (social), `390x844` (app).
