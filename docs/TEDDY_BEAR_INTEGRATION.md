# Teddy Bear full-content integration

The institution has stated that it has permission to store and redistribute the full Teddy Bear reference content for its private clinical use. The repository therefore includes a private institutional Supabase table schema and a generated full-text seed file. The clinical team remains responsible for verifying every record before it is used in calculator data or bedside workflows.

## Included content

The supplied `Teddybear.pdf` was extracted with `pdftotext` into a private local workspace. The extraction produced **238 drug monographs** and approximately **3.42 million source characters**. The generated seed contains **238 non-overlapping source segments** associated with those headings. The compiler sorts source offsets before segmenting so content is not duplicated because of non-monotonic heading order.

The committed files are:

| File | Purpose |
|---|---|
| `sql/teddy_bear_monographs.sql` | Creates the private monograph table, review fields, indexes, RLS, and approval-gated update policy |
| `sql/teddy_bear_monographs_seed.sql` | Authorized full-text seed for the institution’s private Supabase database |
| `sql/teddy_bear_record_kind.sql` | Classifies the review queue into `monograph` / `section` / `reference` so clinicians can filter to drug monographs only |
| `scripts/ingest-teddy-bear.mjs` | Extracts a supplied authorized PDF into a private local source/index workspace |
| `scripts/compile-teddy-bear-sql.mjs` | Rebuilds the full-text SQL seed from the private source and index |
| `scripts/import-teddy-bear-seed.mjs` | Executes the large seed through private `psql` and verifies 238 rows with no empty content |
| `src/pages/drugReview/TeddyBearReview.jsx` | Authenticated full-text review and verification workspace |
| `src/data/teddyBearReviewIndex.js` | Metadata-only fallback index used while the private table is not installed |
| `src/pages/calculators/DrugCalc.jsx` | Pediatric dose workspace with structured starter calculations and the complete indexed Teddy Bear reference browser |

## Apply order

Run the base and security migrations first, then create the monograph table, and finally run the full-text seed. The institution should use a staging project before production. `sql/SETUP_ALL.sql` is intended for a first installation only; do not blindly rerun it on an existing production project because the base schema contains objects that are not all repeat-safe. Use the individual migrations and the production checklist for upgrades.

```text
sql/migration.sql
sql/subscriptions.sql
sql/security_hardening.sql
sql/teddy_bear_monographs.sql
sql/teddy_bear_monographs_seed.sql
sql/teddy_bear_record_kind.sql
```

The full-text seed is too large for the Supabase SQL Editor. After `sql/teddy_bear_monographs.sql` has been applied, execute it from a trusted terminal with `psql`:

```bash
DATABASE_URL='postgresql://...?...sslmode=require' \\
  npm run import:teddy-seed -- sql/teddy_bear_monographs_seed.sql
```

The importer stops on SQL errors and verifies that the database contains exactly 238 full monograph rows with zero empty-content rows. Keep `DATABASE_URL` private and do not place it in shell history, source control, frontend code, or chat messages.

Seed approved `unit_memberships` rows before opening the review route. The table is protected by RLS and is not intended to be accessible to public routes or unauthenticated users.

## Review workflow

Doctors open `/teddy-bear-review` after authentication and unit authorization. The page loads the full content from `teddy_bear_monographs`, supports heading search and pagination, displays the source segment, and provides structured fields for verified dose/regimen, unit, maximum dose, route/formulation, indication, renal/dialysis notes, and review notes.

Every record begins with `pending-clinical-verification`. Saving a review records the authenticated reviewer, review time, and structured fields. Checking the approval control sets the record to `approved` in the review table, but **does not automatically promote it into Emergency Mode or the structured starter `DRUGS` calculator data**. Promotion must be a separate, versioned clinical-governance action.

The `/calculators` drug workspace now exposes the complete **238 full-drug-monograph index** through a searchable Teddy Bear reference browser. Every indexed heading can open the authenticated review route, while the numeric dose panel remains limited to the explicitly structured starter reference set. This separation ensures that “all drugs are visible for review” does not become “all unverified prose is silently converted into a calculator.”

## Clinical verification requirements

The reviewing team should verify the exact formulation, concentration, route, indication, age and weight restrictions, neonatal status, renal/hepatic adjustments, dialysis implications, maximum dose, frequency, preparation, compatibility, administration rate, adverse effects, and local PICU protocol. The team should also decide whether a record is applicable in Nepal and whether it should be included in an institutional smart-pump library.

The review fields are intentionally editable only through the authenticated Supabase workflow. The client does not write names, patient data, or free-text clinical notes into analytics. Reviewers should not paste patient-specific information into the monograph table.

## Rebuilding the seed

With an authorized PDF available locally:

```bash
npm run ingest:drugs -- /path/to/authorized/Teddybear.pdf .clinical-private/drug-reference
npm run compile:drugs -- .clinical-private/drug-reference/source.txt .clinical-private/drug-reference/monograph-index.json .clinical-private/teddy_bear_monographs_seed.sql
cp .clinical-private/teddy_bear_monographs_seed.sql sql/teddy_bear_monographs_seed.sql
```

The private source extraction remains in `.clinical-private/`. The committed seed is institution-authorized content and must remain in the private repository with repository access restricted to approved users. Do not place it in public static hosting, client bundles, analytics, logs, screenshots, or public object storage.

## Verification status

The current seed was generated from the attached PDF and checked for 238 full drug monographs, non-overlapping source segmentation, and approximately 3.42 million covered source characters. Historical extraction audits may mention 1,561 headings; that larger number included front matter, references, abbreviations, and monograph subsections and is not the clinical drug-queue count. This verifies extraction integrity, not clinical correctness. Clinical approval must be recorded by the institution before any record is used for prescribing or medication administration.
