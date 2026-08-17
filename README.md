# prakash-PICU — Pediatric Intensive Care Unit Platform

**prakash-PICU** is a React/Vite and Supabase application for pediatric intensive-care documentation, bedside reference, clinical calculations, child-health workflows, and clinician education. It was originally developed for Patan Academy of Health Sciences in Nepal and has been expanded into a doctor-centered PICU platform with Emergency Mode, high-risk infusion reference workflows, source-linked pediatric updates, and structured clinical documentation.

> **Clinical safety boundary:** This application is a clinical reference and documentation aid. It is not an autonomous prescribing system, a substitute for a signed clinical order, a pharmacy monograph, a local hospital protocol, or professional judgment. Clinical content must be versioned, reviewed, approved, and maintained by the responsible institution before bedside deployment.

## Current status

The current implementation is pushed to the private repository [acdcpc/prakash-PICU](https://github.com/acdcpc/prakash-PICU). The latest completed change is the same-doctor two-step confirmation workflow for high-risk infusions.

| Area | Current state |
|---|---|
| Frontend | React 19 + Vite 6 single-page application |
| Backend | Supabase Auth, PostgreSQL, Storage, RLS, and SQL migrations |
| Primary users | Doctors and PICU clinicians; high-risk infusion signoff is doctor-only |
| Clinical tools | Drug dosing, scores, POCUS documentation, pathways, Emergency Mode, and High-Risk Infusions |
| Child health | Milestones, Nepal immunization, growth links, M-CHAT prompts, and disease-library metadata |
| Evidence updates | Dated, source-linked “What’s New in Pediatrics” feed for Nepal and global sources |
| Tests | `npm test` currently passes 23 tests, including 325 Emergency Mode simulation cases and Teddy Bear seed/review integrity checks |
| Build | `npm run build` passes |
| Lint | `npm run lint` passes with 0 errors and existing warnings |

## Core capabilities

### Patient and PICU management

The authenticated application supports patient admission and discharge, bed assignment, patient detail views, fluid-balance tracking, medication records, laboratory investigations, clinical notes, procedures, image metadata, and Excel exports. Fluid-balance workflows include insensible fluid loss, ventilation adjustment, fever correction, CRRT adjustment, daily input/output recording, cumulative fluid-overload percentage, history tables, and alert colors.

### Clinical calculators

The calculator centre includes ISL, drug dose, ventilator settings, PELOD-2, Renal Angina Index, nutrition, PALS emergency preparation, PRISM-IV, Phoenix Sepsis Score, and growth-chart tools. The calculators run client-side and display clinical safety disclaimers. They should be validated against current local protocols before clinical use.

### Clinical Tools workspace

`/clinical-tools` provides shared pediatric context for age, weight, sex, diagnosis, renal status, and dialysis/CRRT status. It contains a searchable starter drug-reference set with maximum-dose caps, renal/dialysis prompts, Teddy Bear reference links, scoring prompts for sedation, delirium, and pain, guideline-linked algorithms, and POCUS topic documentation.

Drug lookup supports favorites and recents. Dose calculations reject invalid or non-finite weights, enforce maximum-dose caps, and show route, frequency, source, and safety notes. The application does not copy the full copyrighted Teddy Bear book into the repository. The private ingestion utility can index a supplied local PDF for authorized local use.

### Emergency Mode

`/emergency` is optimized for rapid scanning under pressure. It provides persistent local weight context, rapid dose selection, equipment and pathway links, a forced verification acknowledgement, a four-step emergency checklist, and current source-linked Nepal/global guidance. It also links directly to High-Risk Infusions.

### PICU High-Risk Infusions

`/high-risk-infusions` contains the fully audited high-risk infusion dataset extracted from the supplied `FINALHIghRiskInfusionsPAHS.docx` reference.

The source contains 29 rows, and all 29 are represented in `src/data/highRiskInfusions.js`. Coverage includes vasopressors/inotropes, sedation/neuromuscular blockade, miscellaneous high-alert drugs, electrolytes, metabolic agents, neurocritical therapies, and endocrine infusions.

The workflow is tailored for this doctor-only application:

1. The prescribing doctor enters their name/designation and completes the **first check**, confirming indication, target dose, concentration, route, duration, and monitoring.
2. Immediately before starting the infusion or changing the rate, the same prescribing doctor completes a separate **final re-check**, reconfirming patient identity, weight, allergies, final concentration, pump rate, route, line, and monitoring.
3. The page remains in **Signoff required** state until the calculation is valid, the dose is within range, the prescribing doctor is identified, and both checks are confirmed.

There is no nurse signoff and no second-doctor requirement in the current workflow. For non-volume-based infusions, a pharmacy- or protocol-verified **final prepared concentration** must be entered; the stock ampoule concentration is not silently treated as the final pump concentration. Entries with ambiguity, neonatal-specific preparation, incomplete dilution, or possible unit transcription issues are visibly flagged.

The completeness audit is documented in [`docs/PAHS_INTEGRATION_AUDIT.md`](docs/PAHS_INTEGRATION_AUDIT.md), and the extracted source is retained in [`research/high_risk_infusions_extracted.md`](research/high_risk_infusions_extracted.md).

### POCUS documentation

The POCUS workflow supports structured drafts for lung, heart, cranium, VExUS, bronchoscopy, vascular access, and transcranial Doppler studies. Drafts include indication, views/protocol, findings, limitations, supervision, and follow-up. Current POCUS drafts are held in memory for the active session only and do not constitute a validated image archive or diagnostic report system.

### Child Health and Kapoori-ka parity

`/child-health` includes milestone content, Nepal routine and delayed immunization data, growth-chart links, M-CHAT screening prompts, WHO growth references, and disease-library metadata. The content is organized as clinician support and must be checked against current national and institutional guidance.

### What’s New in Pediatrics

`/pediatric-updates` provides a dated, source-linked feed with Nepal and global filters, category filters, search, concise clinical relevance, and direct source links. The current feed includes verified updates from NEPAS, UNICEF Nepal, WHO, AAP, and other open institutional or research sources. The feed is manually reviewed and statically versioned; it is not an unsupervised live search or automatic clinical protocol importer.

### Subscription and payments

`/subscription` provides a Supabase-backed subscription and payment system modeled on Kapoori-ka: a single NPR 2,500/year plan, external wallet/bank payment with screenshot submission from a hosted payment page, manual administrator verification, one-time activation-code redemption (SHA-256 hashed and rate-limited), and administrator activation. The repository includes `sql/subscriptions.sql` (plans, payments, activation codes, subscriptions, RLS, and the `redeem_activation_code` / `admin_void_codes` RPCs) plus `public/payment.html` for the hosted payment page.

Live provider checkout, signed webhooks, refunds, reconciliation, idempotency, and payment compliance require organization-owned provider accounts and server-side integration. No card credentials should be collected by the client application.

### Analytics

Firebase Analytics is optional and disabled unless explicit environment configuration is present. Route and product events are designed to exclude patient names, identifiers, diagnosis, contact details, and other patient-identifying data. Analytics consent, institutional privacy review, and retention policy are required before activation.

## Routes

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/education` | Public education page |
| `/about` | Public about page |
| `/dashboard` | Authenticated PICU dashboard |
| `/patients` | Patient list |
| `/patients/new` | Add a patient |
| `/patients/:id` | Patient detail |
| `/patients/:id/fluid-balance` | Patient fluid balance |
| `/patients/:id/drugs` | Patient medications |
| `/patients/:id/investigations` | Patient investigations |
| `/patients/:id/notes` | Clinical notes |
| `/patients/:id/images` | Patient images |
| `/calculators` | Medical calculator centre |
| `/clinical-tools` | Clinical tools workspace |
| `/emergency` | Rapid pediatric Emergency Mode |
| `/high-risk-infusions` | PAHS high-risk infusion reference and same-doctor two-step confirmation |
| `/subscription` | Subscription and payment-request workflow |
| `/child-health` | Kapoori-ka parity child-health workspace |
| `/pediatric-updates` | Nepal/global pediatric evidence and news feed |
| `/education-hub` | Private education hub |
| `/export` | Excel export centre |
| `/admin` | Admin-only management panel |

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6 |
| Routing | React Router 7 |
| Backend | Supabase PostgreSQL, Auth, Storage, and RLS |
| Analytics | Optional Firebase Web SDK adapter |
| Export | SheetJS (`xlsx`) |
| Icons | Lucide React |
| Styling | Project design tokens and responsive CSS in `src/index.css` |
| Testing | Node.js native test runner |
| Drug ingestion | Node.js private local indexing utility |

## Project structure

```text
prakash-PICU/
├── docs/
│   ├── EMERGENCY_GUIDELINES.md
│   ├── PAHS_INTEGRATION_AUDIT.md
│   ├── PRODUCT_BENCHMARK.md
│   ├── PRODUCT_FEATURES.md
│   └── PEDIATRIC_UPDATES.md
├── research/
│   ├── emergency_guideline_sources.md
│   ├── high_risk_infusions_extracted.md
│   ├── pediatric_updates_sources.md
│   └── product_benchmark_sources.md
├── scripts/
│   └── ingest-teddy-bear.mjs
├── sql/
│   ├── migration.sql
│   └── subscriptions.sql
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   │   ├── emergencyGuidance.js
│   │   ├── highRiskInfusions.js
│   │   └── pediatricUpdates.js
│   ├── lib/
│   │   ├── analytics.js
│   │   ├── clinicalTools.js
│   │   ├── diseaseLibrary.js
│   │   └── supabase.js
│   ├── pages/
│   │   ├── calculators/
│   │   ├── childHealth/
│   │   ├── clinical/
│   │   ├── emergency/
│   │   ├── highRiskInfusions/
│   │   ├── pediatricUpdates/
│   │   ├── subscription/
│   │   └── ...
│   ├── App.jsx
│   └── index.css
├── tests/
│   ├── clinicalTools.test.mjs
│   └── highRiskInfusions.test.mjs
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Getting started

### Prerequisites

Use Node.js 18 or newer and an organization-controlled Supabase project. Node.js 22 is used in the current development environment.

### Install and run

```bash
git clone https://github.com/acdcpc/prakash-PICU.git
cd prakash-PICU
npm install
cp .env.example .env
npm run dev
```

The development server uses the Vite configuration in the repository. The exact local port is printed by Vite when the server starts.

### Environment variables

Copy `.env.example` to `.env` and supply only organization-controlled values.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous key |
| `VITE_FIREBASE_API_KEY` | Optional Firebase Analytics configuration |
| `VITE_FIREBASE_AUTH_DOMAIN` | Optional Firebase Analytics configuration |
| `VITE_FIREBASE_PROJECT_ID` | Optional Firebase Analytics configuration |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional Firebase configuration |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional Firebase configuration |
| `VITE_FIREBASE_APP_ID` | Optional Firebase Analytics configuration |
| `VITE_PAYMENT_PROVIDER` | Legacy optional provider-status configuration (manual review is the active flow) |
| `VITE_PAYMENT_PUBLIC_KEY` | Legacy optional provider-status configuration |
| `VITE_PAYMENT_WEB_URL` | URL of the hosted payment page (`public/payment.html`) that "Buy Premium" opens |

Never commit `.env`, service-role keys, private payment keys, passwords, patient data, or extracted copyrighted monograph text.

## Supabase setup

1. Create a Supabase project controlled by the institution.
2. Copy the project URL and anonymous key into `.env`.
3. Run `sql/migration.sql` in the Supabase SQL Editor.
4. Run `sql/subscriptions.sql` after the base migration (payment system: plans, payments, activation codes, subscriptions, RLS, and redemption RPCs).
5. Review and run `sql/security_hardening.sql` with the institution’s Supabase administrator. Seed approved `unit_memberships` rows for each doctor and PICU unit.
6. Enable the required Auth providers under Supabase Authentication (Email, plus Google if using Google sign-in).
7. Confirm that `patient-images` is private and that patient image paths use the `patients/<patient-uuid>/...` convention; the application requests one-hour signed URLs.
8. Create the private `payment-screenshots` storage bucket and allow anonymous uploads to it (see `SETUP_GUIDE.md`). Deploy `public/payment.html` and set `VITE_PAYMENT_WEB_URL` in `.env`.
9. Create an administrator through the normal organization-controlled signup process and promote the approved user by UUID in the SQL Editor.

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<approved-user-uuid>';
```

Do not place administrator credentials in source code, SQL comments, documentation, seed files, or test fixtures.

## Database and permissions

The core migration contains profiles, education, patients, fluid balance, patient drugs, investigations, clinical notes, patient images, calculator results, and the drug library. Subscription tables are defined separately in `sql/subscriptions.sql`. The optional `sql/security_hardening.sql` migration adds unit memberships, unit-scoped patient-child-record policies, a private patient-image bucket with signed-URL policy support, and the append-only `clinical_audit_events` table.

The existing role model includes `admin`, `doctor`, `nurse`, and `viewer` for database permissions. The current high-risk infusion page itself is intentionally a doctor-centered reference workflow and does not require nurse signoff. The hardening migration scopes patient data and image objects to active unit membership and provides audit-event policies. RLS remains the source of truth for data access; UI checks are not sufficient security controls.

## Clinical content and source governance

The repository uses source links and dated metadata for AHA/AAP resuscitation references, the 2026 Surviving Sepsis Campaign pediatric guideline, Nepal’s Ministry of Health ARDS guidance, NEPAS updates, WHO growth standards, Nepal immunization schedules, NICE guidance, AAP/IAP/NEPAS hubs, and ASHP Teddy Bear reference information.

The PAHS high-risk infusion document is fully represented as 29 structured records, but the records should not be considered clinically validated merely because they are parsed. The application visibly flags source ambiguities and requires verification of local concentrations, dose ranges, routes, compatibility, pump-library values, monitoring, and escalation procedures.

The authorized full Teddy Bear workflow is run with:

```bash
npm run ingest:drugs -- /authorized/path/Teddybear.pdf .clinical-private/drug-reference
npm run compile:drugs -- .clinical-private/drug-reference/source.txt .clinical-private/drug-reference/monograph-index.json .clinical-private/teddy_bear_monographs_seed.sql
npm run audit:drugs -- .clinical-private/drug-reference/source.txt .clinical-private/drug-reference/monograph-index.json .clinical-private/teddy-audit
cp .clinical-private/teddy_bear_monographs_seed.sql sql/teddy_bear_monographs_seed.sql
```

With the institution’s stated permission, the private repository now contains the full-text SQL seed for the 238 extracted records and the `teddy_bear_monographs` table migration. The authenticated `/teddy-bear-review` route loads the full content through Supabase RLS. All records begin as pending clinical verification and are not automatically promoted into calculator data. See [`docs/TEDDY_BEAR_INTEGRATION.md`](docs/TEDDY_BEAR_INTEGRATION.md) for the apply order and team review process.

## Testing and quality checks

Run all checks before committing:

```bash
npm test
npm run build
npm run lint
```

The current suite includes weight-based drug dose boundary tests, maximum-dose tests, malformed-input tests, high-risk infusion metadata coverage, minute-to-hour conversions, final-concentration safeguards, and volume-based infusion calculations.

The current repository has **23 passing tests**, including the Emergency Mode age/weight simulation, Teddy Bear full-content seed/review integrity checks, a passing production build, and zero lint errors. Existing lint warnings in older application files remain technical-debt items and should be addressed before a regulated production release.

## Security and privacy

Patient data must remain in institution-controlled Supabase infrastructure. The hardening migration changes patient images to a private bucket and the application uses one-hour signed URLs rather than public URLs. Existing public image objects and legacy rows require an institution-reviewed migration before production use. Do not place patient-identifying data in analytics, local-storage drafts, source code, test fixtures, public URLs, or screenshots. POCUS drafts and Emergency Mode weight context are held in memory for the active session only; they are not encrypted browser storage and are not a substitute for secure patient-bound persistence. Favorites and recent-drug preferences are the only current browser-persisted data and contain drug names rather than patient information. These behaviors still require institutional privacy review before production use.

Emergency dose calculations, Emergency Mode self-rechecks, and High-Risk Infusions same-doctor final re-checks now write PHI-minimized `clinical_audit_events` when the user is authenticated and the hardening migration has been applied. Production deployment should still add audit review screens, retention policy, session timeout, device controls, backup/restore procedures, access reviews, secure headers, dependency scanning, error monitoring without PHI, and a formal incident-response plan.

## Deployment

Build the static frontend with:

```bash
npm run build
```

Deploy `dist/` to an institution-approved static host such as Vercel, Netlify, Cloudflare Pages, or equivalent. Supabase remains an external backend service. Production configuration must use environment variables, HTTPS, domain allowlists, reviewed Auth redirect URLs, and institutional privacy/security approval.

## Known limitations and required next work

The current implementation is a strong clinician-reference and documentation foundation but is not a certified medical device. The highest-priority remaining work is clinical governance and production hardening: establish a pediatric editorial board, version every clinical record, create an approval and rollback process, reconcile all drug values with current local monographs and smart-pump libraries, implement auditable doctor order and re-check records, validate the payment provider server-side, add privacy-approved analytics consent, and complete security and usability testing with representative Nepal PICU clinicians.

The application does not yet provide a fully validated offline PWA, signed medication orders, smart-pump integration, live payment webhooks, complete EHR interoperability, a validated diagnostic POCUS archive, or automatic guideline ingestion. These should be implemented only with appropriate clinical, legal, security, licensing, and institutional review.

## Supporting documentation

| Document | Purpose |
|---|---|
| [`docs/PRODUCT_FEATURES.md`](docs/PRODUCT_FEATURES.md) | Product setup, analytics, payment architecture, drug ingestion, and production boundaries |
| [`docs/PRODUCT_BENCHMARK.md`](docs/PRODUCT_BENCHMARK.md) | Worldwide pediatric-tool benchmark and design decisions |
| [`docs/EMERGENCY_GUIDELINES.md`](docs/EMERGENCY_GUIDELINES.md) | Nepal/global emergency-guideline source review and integration status |
| [`docs/PAHS_INTEGRATION_AUDIT.md`](docs/PAHS_INTEGRATION_AUDIT.md) | 29-row PAHS parsing and repository coverage audit |
| [`docs/PHI_SECURITY_REVIEW.md`](docs/PHI_SECURITY_REVIEW.md) | Emergency simulation, RLS review, storage findings, and remediation recommendations |
| [`docs/TEDDY_BEAR_INTEGRATION.md`](docs/TEDDY_BEAR_INTEGRATION.md) | Full authorized Teddy Bear extraction, private seed, review workflow, and clinical promotion safeguards |
| [`docs/TEDDY_BEAR_DOSAGE_AUDIT.md`](docs/TEDDY_BEAR_DOSAGE_AUDIT.md) | Structural dose/unit audit results and clinical-review limits |
| [`sql/security_hardening.sql`](sql/security_hardening.sql) | Unit-scoped RLS, private image storage, signed-URL policies, and clinical audit events |
| [`docs/SUPABASE_PRODUCTION_MIGRATION.md`](docs/SUPABASE_PRODUCTION_MIGRATION.md) | Production migration, signed-URL, RLS, audit verification, and rollback checklist |
| [`docs/PEDIATRIC_UPDATES.md`](docs/PEDIATRIC_UPDATES.md) | Pediatric research/news feed editorial notes |
| [`AGENT_HANDOFF.md`](AGENT_HANDOFF.md) | Detailed instructions for future agents and maintainers |

## License and clinical use

The software license and the licenses of all incorporated datasets, references, media, and clinical content must be reviewed independently. The Teddy Bear reference is copyrighted and must not be redistributed without authorization. Clinical deployment requires institutional approval, clinical governance, privacy/security review, and local legal/regulatory review.

Built for pediatric critical-care teams, with initial context from Patan Academy of Health Sciences, Nepal.
