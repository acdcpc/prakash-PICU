# AGENT_HANDOFF.md — prakash-PICU maintainer guide

This file is the operational handoff for any future coding agent or maintainer working on `acdcpc/prakash-PICU`. Read it before changing clinical content, medication calculations, payment workflows, analytics, database policy, or patient-data handling.

## Mission and product context

prakash-PICU is a React/Vite + Supabase pediatric intensive-care platform originally developed for Patan Academy of Health Sciences in Nepal. The product is intended primarily for doctors and PICU clinicians. It combines patient management, clinical calculators, bedside reference tools, child-health workflows, evidence updates, documentation, exports, and administrative configuration.

The application is **not** an autonomous prescribing system or certified medical device. Any agent changing clinical formulas, medication ranges, dilution information, clinical pathways, or scores must treat the change as safety-sensitive. Never silently “correct” a dose from memory. Identify the source, date, units, route, population, concentration, maximum, monitoring, and approval status.

## Repository and current branch

The GitHub repository is private and is available at:

```text
https://github.com/acdcpc/prakash-PICU
```

The active working directory used by the development workflow is `/home/ubuntu/PICU`. The primary branch is `main`. Always inspect `git status`, review the diff, run tests/build/lint, and push only intentional changes.

## Technology and commands

The application uses React 19, Vite 6, React Router 7, Supabase, Firebase Web SDK for optional analytics, Lucide icons, SheetJS, and native Node.js tests.

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
npm run ingest:drugs -- /authorized/path/Teddybear.pdf
```

`npm test` runs every `tests/*.test.mjs` file. At the current handoff point, 23 tests pass, including 325 age-band and weight simulation cases, signed-URL and clinical-audit constraint checks, and Teddy Bear full-content seed/review integrity checks. `npm run build` passes. `npm run lint` passes with zero errors and existing warnings in older files. Do not describe warnings as errors, but do not increase their number without reason.

## Application architecture

`src/App.jsx` owns lazy-loaded routes and the private/public route boundary. `src/components/AppLayout.jsx` and `src/components/Sidebar.jsx` own authenticated navigation. `src/index.css` is the shared design system and responsive layout stylesheet. `src/context/AuthContext.jsx` provides authentication and role state. `src/lib/supabase.js` initializes the Supabase client. `src/lib/analytics.js` is an opt-in Firebase Analytics adapter designed to exclude PHI.

The major feature areas are:

| Area | Main location | Route |
|---|---|---|
| Dashboard | `src/pages/dashboard/Dashboard.jsx` | `/dashboard` |
| Patients | `src/pages/patients/` | `/patients`, `/patients/:id` |
| Fluid balance | `src/pages/fluidBalance/FluidBalance.jsx` | patient route |
| Drug library | `src/pages/drugs/DrugLibrary.jsx` | patient route |
| Calculators | `src/pages/calculators/` | `/calculators` |
| Clinical Tools | `src/pages/clinical/ClinicalTools.jsx` | `/clinical-tools` |
| Emergency Mode | `src/pages/emergency/EmergencyMode.jsx` | `/emergency` |
| High-Risk Infusions | `src/pages/highRiskInfusions/HighRiskInfusions.jsx` | `/high-risk-infusions` |
| Child Health | `src/pages/childHealth/ChildHealth.jsx` | `/child-health` |
| Pediatric Updates | `src/pages/updates/PediatricUpdates.jsx` | `/pediatric-updates` |
| Subscription | `src/pages/subscription/Subscription.jsx` | `/subscription` |
| Admin | `src/pages/admin/AdminPanel.jsx` | `/admin` |

## Completed implementation

### Clinician-first UX

The dashboard has quick actions and an evidence-watch shortcut. Emergency Mode uses a high-contrast, rapid-scanning layout. Clinical Tools supports shared context and searchable tools. Drug lookup has favorites and recently used drugs. Interactive algorithm cards have progress checklists and escalation warnings.

### Emergency Mode

Emergency Mode stores the current weight only in React memory for the active session; it no longer persists that context in browser storage, provides rapid drug selection and a calculated reference amount, links to PALS equipment, Clinical Tools, High-Risk Infusions, and evidence updates, and includes a safety acknowledgement. It must remain clearly labeled as reference-only.

The code in `src/lib/clinicalTools.js` exports `calculateDrugDose(drug, weight)`. It rejects missing, non-positive, non-finite, or malformed inputs and enforces an optional maximum. The Emergency Mode display distinguishes dose units such as `mg/dose` from infusion units such as `mcg/min`.

### High-Risk Infusions

`src/data/highRiskInfusions.js` contains 29 records extracted from the supplied `FINALHIghRiskInfusionsPAHS.docx`. `src/pages/highRiskInfusions/HighRiskInfusions.jsx` provides category/search navigation, weight and target-dose inputs, final prepared-concentration entry, range warnings, calculated pump rate, source preparation text, monitoring prompts, ambiguity flags, and a doctor-only two-step confirmation.

The current signoff model is intentionally:

1. One prescribing doctor enters their identity and completes the first check, confirming indication, target dose, concentration, route, duration, and monitoring.
2. The same prescribing doctor completes a separate final re-check immediately before starting or changing the infusion, reconfirming patient identity, weight, allergies, final concentration, pump rate, route, line, and monitoring.
3. No nurse signoff and no second-doctor signoff are required by the current product requirement.

The selected infusion reset clears the doctor identity and both confirmations. The readiness state cannot become ready unless the calculation is valid, the dose is in range, the doctor is identified, and both checks are checked.

Do not remove this deliberate separation between the first and final checks without an explicit product and clinical-governance decision. A same-doctor re-check is a workflow requirement from the product owner, not a claim that it is universally equivalent to independent double-checking by a second clinician.

### PAHS completeness

The extracted source has 29 rows: six vasopressor/inotrope rows, seven sedation/neuromuscular-blockade rows, and 16 miscellaneous rows. All 29 are represented in the dataset and asserted by `tests/highRiskInfusions.test.mjs`.

The completeness audit is in `docs/PAHS_INTEGRATION_AUDIT.md`. The source extraction is in `research/high_risk_infusions_extracted.md`. The audit confirms row coverage only; it does not validate the clinical accuracy of every source value.

Known source-review flags include neonatal-specific vasopressor preparation, possible dexmedetomidine concentration transcription, heparin fixed-unit instructions, octreotide unit inconsistency, pantoprazole weight-tiering, and N-acetylcysteine without a supplied dilution. The UI flags these rather than silently normalizing them.

### Concentration-aware calculation safety

`getInfusionRate(infusion, weight, targetDose, finalConcentration)` in `src/data/highRiskInfusions.js` requires a verified final prepared concentration for non-volume-based dose units. This is intentional. Do not change the calculator to use the source ampoule concentration as the final bag/syringe concentration by default.

Volume-based entries such as `mL/kg/hr` can calculate without a concentration field. All other entries should refuse to calculate until the final prepared concentration is entered. If adding a new unit, add a specific test for its conversion and display.

## Clinical references and licensing

The repository links to AHA/AAP CPR/PALS, SCCM PANDEM, the 2026 Surviving Sepsis Campaign pediatric guideline, Nepal MoHP ARDS guidance, NEPAS updates, WHO growth standards, Nepal immunization data, NICE, AAP/IAP/NEPAS hubs, and ASHP Teddy Bear information.

The institution has stated that it has permission to store and redistribute the full Teddy Bear content privately. The repository now contains `sql/teddy_bear_monographs.sql`, the generated `sql/teddy_bear_monographs_seed.sql`, and the authenticated `/teddy-bear-review` route. Keep the seed in the private repository only; never place it in public static hosting, client bundles, analytics, logs, screenshots, or public object storage. Every row remains pending clinical verification and must be reviewed before any promotion into calculator data.

## Patient privacy and security rules

`sql/teddy_bear_monographs.sql` must be applied after `sql/security_hardening.sql`, followed by the authorized `sql/teddy_bear_monographs_seed.sql` import. `sql/security_hardening.sql` is the optional production-hardening migration. Follow `docs/SUPABASE_PRODUCTION_MIGRATION.md` before applying it; the checklist covers staging, backups, unit membership seeding, legacy image migration, signed-URL expiry, negative RLS tests, audit constraints, rollout, and rollback. It adds `unit_memberships`, a required `patients.unit_name`, unit-scoped policies for patient records, a private `patient-images` bucket with signed-URL policies, and the append-only `clinical_audit_events` table. The institution must review and seed approved unit memberships before applying it. Existing public image objects and legacy `storage_url` rows require a reviewed migration.

`src/lib/clinicalAudit.js` writes PHI-minimized events for Emergency Mode calculations, Emergency Mode self-rechecks, and High-Risk Infusions same-doctor final re-checks. Events are written only for authenticated users and accept only a UUID-shaped optional patient identifier. The audit helper deliberately whitelists metadata fields and must not be expanded to accept names, free text, diagnoses, or other PHI.


Never put names, patient IDs, diagnoses, phone numbers, email addresses, images, or clinical narratives into analytics events, URLs, public logs, tests, screenshots, fixtures, or committed files. Local storage is not an appropriate long-term patient record. The only current browser-persisted values are non-PHI drug favorites and recent-drug preferences; POCUS drafts and Emergency Mode weight are session-memory only. Any feature that moves clinical content from local storage into Supabase needs explicit patient binding, audit logging, access controls, and privacy review. Patient images now use `storage_path` and one-hour `createSignedUrl` URLs; do not reintroduce `getPublicUrl` for the patient-images bucket.

Supabase RLS is the security boundary. Do not rely only on React route guards. Do not commit `.env`, service-role keys, payment secrets, passwords, or administrator credentials. Payment credentials must never be collected or stored by the frontend.

## Database and integrations

`sql/migration.sql` defines the core application schema and RLS. `sql/subscriptions.sql` defines subscription plans, subscriptions, payment requests, policies, indexes, and an activation RPC. The current payment UI is a manual-review foundation; it is not a complete live payment processor. Live checkout and webhook logic require a server-side integration, provider credentials, signature verification, idempotency, refunds, reconciliation, audit trails, and institutional/legal review.

Firebase Analytics is optional. It must remain disabled until explicit Firebase environment configuration and institutional privacy/consent approval exist. Keep all event payloads non-identifying.

## Documentation map

| File | What it contains |
|---|---|
| `README.md` | User-facing project guide and current capability/limitation summary |
| `AGENT_HANDOFF.md` | This maintainer and future-agent guide |
| `docs/PRODUCT_FEATURES.md` | Product setup, payment architecture, analytics privacy, and production boundaries |
| `docs/PRODUCT_BENCHMARK.md` | Worldwide pediatric-app benchmark and rationale for UX improvements |
| `docs/EMERGENCY_GUIDELINES.md` | Emergency guidance sources, dates, Nepal/global status, and governance notes |
| `docs/PAHS_INTEGRATION_AUDIT.md` | 29-row source-to-dataset coverage audit |
| `docs/TEDDY_BEAR_INTEGRATION.md` | Full authorized Teddy Bear extraction, import order, review workflow, and promotion safeguards |
| `docs/TEDDY_BEAR_DOSAGE_AUDIT.md` | Structural dosage/unit audit results and clinical-validation boundaries |
| `docs/PEDIATRIC_UPDATES.md` | Editorial notes for the pediatric research/news feed |
| `research/high_risk_infusions_extracted.md` | Extracted PAHS source text for auditability |
| `research/emergency_guideline_sources.md` | Verified emergency-guidance research notes |
| `src/data/highRiskInfusions.js` | Structured high-risk infusion records and rate function |
| `sql/security_rls_hardening.sql` | Blocks profile role/unit escalation; least-privilege grants; pinned search_path |
| `sql/storage_path_hardening.sql` | Strict `patients/<uuid>/<file>` storage path parsing |
| `sql/audit_hardening.sql` | Append-only audit; allowlisted metadata keys; field caps |
| `sql/payments_hardening.sql` | Payment submissions cannot be self-approved |
| `src/lib/session.js` | Auth redirect allowlist, idle sign-out, auth-error sanitising |
| `src/lib/notifications.js` + `src/components/Notifications.jsx` | Accessible global notice stack (replaces alert()) |
| `src/components/PatientContextHeader.jsx` | Explicit patient context on every patient subroute |
| `docs/PRODUCTION_SECURITY.md`, `docs/ACCESSIBILITY_CHECKLIST.md`, `docs/VISUAL_REVIEW.md` | Production, a11y and visual-review checklists |
| `sql/onboarding_preferences.sql` | Server-backed non-PHI onboarding preferences (care focus, quick shelf, locale, status/version) with self-only RLS |
| `src/lib/onboarding.js` | Server-backed preferences: versioned, retryable, local cache is optimisation only |
| `src/components/OnboardingGate.jsx` | First-run routing gate — never grants data access (session + RLS own that) |
| `src/pages/account/Preferences.jsx` | Edit quick shelf / care focus later without repeating onboarding |
| `src/data/teddyBearReviewIndex.js` | Metadata-only fallback for 238 monograph headings |
| `src/data/emergencyGuidance.js` | Dated Nepal/global emergency-guidance cards |
| `src/lib/clinicalTools.js` | Drug records, scores, algorithms, references, and dose calculator |
| `tests/clinicalTools.test.mjs` | Drug dose calculation tests |
| `tests/highRiskInfusions.test.mjs` | Infusion calculation and 29-entry completeness tests |
| `scripts/ingest-teddy-bear.mjs` | Extracts an authorized PDF to private local text and heading index |
| `scripts/compile-teddy-bear-sql.mjs` | Compiles private full text into the authorized Supabase seed |
| `scripts/audit-teddy-doses.mjs` | Scans all extracted segments for missing units and suspicious dose/concentration patterns |
| `sql/teddy_bear_monographs.sql` | Private monograph schema, review fields, RLS, and approval gate |
| `sql/teddy_bear_monographs_seed.sql` | Authorized full-text seed for private institutional Supabase use |
| `src/pages/drugReview/TeddyBearReview.jsx` | Authenticated full-text monograph review workflow |

## Required workflow for future changes

Before changing clinical behavior, read the relevant source and current local hospital protocol. If guidance is current or time-sensitive, research the authoritative source and save the URL, publication date, and summary in the appropriate `research/` or `docs/` file. Update the UI metadata and tests together.

For every new calculation, add tests for normal weights, decimal weights, string browser input, zero, negative, missing, non-finite, maximum caps, unit conversions, and missing concentration. For Teddy Bear content, run `npm run audit:drugs` and treat every structural finding as a clinical-review candidate, never as an automatic correction. For every new route, update `App.jsx`, `Sidebar.jsx`, title mappings, and documentation.

After code changes, run:

```bash
npm test
npm run build
npm run lint
git diff --check
git status --short
```

Review the diff for PHI, credentials, copyrighted text, accidental package changes, and stale clinical wording. Commit with a specific message, push to `main` only when requested, and report exactly what was verified and what remains unvalidated.

## Prioritized next work

The next agent should not start by adding more drug rows. The highest-value work is:

1. Create a clinical editorial governance model with named owners, version dates, approval status, source links, change history, and rollback support.
2. Store doctor prescription and same-doctor final re-check events as auditable, patient-bound records rather than transient UI state; add explicit timestamps and user IDs while protecting access with RLS.
3. Reconcile every PAHS infusion concentration, unit, preparation, and range against current institution-approved monographs and smart-pump library values.
4. Add a real clinical content management workflow for controlled updates, review, expiration, and emergency rollback.
5. Complete server-side payment integrations only after provider, compliance, and organization requirements are supplied.
6. Add privacy-reviewed analytics consent and non-PHI event governance.
7. Perform usability testing with Nepal PICU doctors using realistic emergency scenarios.
8. Address existing lint warnings, add accessibility tests, and add end-to-end authenticated route tests.
9. Evaluate PWA/offline behavior, but never cache patient data or sensitive clinical documents without an explicit security design.
10. Complete deployment security controls, backup/restore, audit monitoring, dependency scanning, and incident response.

## Non-negotiable safety rules

Do not describe the product as clinically validated, certified, or production-ready solely because it builds or passes tests. Do not infer a dose from a nearby medication or source. Do not remove safety warnings to improve visual simplicity. Do not use live patient information in development. Do not commit proprietary clinical reference text. Do not expose secrets. Do not silently change a unit, concentration, route, or maximum.
