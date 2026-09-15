# Accessibility checklist (WCAG 2.2 AA target)

Implemented in code:

- **Skip link** to `#main-content` in both layouts; `<main>` landmark with `tabIndex={-1}`.
- **Landmarks**: `<header>`, `<nav>` (sidebar), `<main>`; sidebar is a labelled nav.
- **One `<h1>` per route** (the topbar title) and a unique `document.title`
  (`<Route> · Prakash Pediatrics`).
- **Visible focus**: `:focus-visible` outline (3 px coral, 2 px offset) for every
  interactive element; skip link becomes visible on focus.
- **Announced feedback**: global notice stack — `role="alert"` for errors,
  `role="status"` for info/success, with a labelled dismiss button. Every
  `alert()` call has been removed.
- **Forms**: visible labels tied to inputs with `htmlFor`/`id`, `noValidate` with
  a server-independent validator, an error summary (`role="alert"`, focused on
  submit) linking to the fields, per-field messages, `aria-invalid` and
  `aria-describedby`.
- **Reduced motion**: `prefers-reduced-motion` disables transitions/animations
  and smooth scrolling.
- **Status is never colour-only**: notices, badges and errors pair colour with
  text/icons.

Manual keyboard / screen-reader checks to run for the high-risk routes
(login, onboarding, dashboard, patient list/detail/form, Emergency Mode,
High-Risk Infusions, formulary review, export, admin):

| Check | How |
|---|---|
| Tab order reaches skip link, nav, primary action | Tab from the top of each route |
| No focus trap outside dialogs | Tab through; focus returns after closing |
| Errors announced | Submit an invalid form with a screen reader; confirm the summary is read |
| Notices announced | Trigger a failed save; confirm the message is announced |
| Escape closes overlays | Open the mobile menu, press Escape |
| Touch targets ≥ 44 × 44 px | Inspect buttons/links at 320–430 px |
| Text contrast | Spot-check coral/teal/gold text on ivory and on navy |

Institution-dependent: run an automated axe/Lighthouse pass in CI against the
deployed build, and confirm the target conformance level with the clinical
governance group.
