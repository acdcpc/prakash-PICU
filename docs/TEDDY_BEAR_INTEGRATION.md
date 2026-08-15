# Teddy Bear full-content integration

The institution has stated that it has permission to store and redistribute the full Teddy Bear reference content for its private clinical use. The repository therefore includes a private institutional Supabase table schema and a generated full-text seed file. The clinical team remains responsible for verifying every record before it is used in calculator data or bedside workflows.

## Included content

The supplied `Teddybear.pdf` was extracted with `pdftotext` into a private local workspace. The extraction produced **1,561 indexed headings** and approximately **3.42 million source characters**. The generated seed contains **1,561 non-overlapping source segments** associated with those headings. The compiler sorts source offsets before segmenting so content is not duplicated because of non-monotonic heading order.

The committed files are:

| File | Purpose |
|---|---|
| `sql/teddy_bear_monographs.sql` | Creates the private monograph table, review fields, indexes, RLS, and approval-gated update policy |
| `sql/teddy_bear_monographs_seed.sql` | Authorized full-text seed for the institution’s private Supabase database |
| `scripts/ingest-teddy-bear.mjs` | Extracts a supplied authorized PDF into a private local source/index workspace |
| `scripts/compile-teddy-bear-sql.mjs` | Rebuilds the full-text SQL seed from the private source and index |
| `src/pages/drugReview/TeddyBearReview.jsx` | Authenticated full-text review and verification workspace |
| `src/data/teddyBearReviewIndex.js` | Metadata-only fallback index used while the private table is not installed |

## Apply order

Run the base and security migrations first, then create the monograph table, and finally run the full-text seed. The institution should use a staging project before production:

```text
sql/migration.sql
sql/subscriptions.sql
sql/security_hardening.sql
sql/teddy_bear_monographs.sql
sql/teddy_bear_monographs_seed.sql
```

Seed approved `unit_memberships` rows before opening the review route. The table is protected by RLS and is not intended to be accessible to public routes or unauthenticated users.

## Review workflow

Doctors open `/teddy-bear-review` after authentication and unit authorization. The page loads the full content from `teddy_bear_monographs`, supports heading search and pagination, displays the source segment, and provides structured fields for verified dose/regimen, unit, maximum dose, route/formulation, indication, renal/dialysis notes, and review notes.

Every record begins with `pending-clinical-verification`. Saving a review records the authenticated reviewer, review time, and structured fields. Checking the approval control sets the record to `approved` in the review table, but **does not automatically promote it into Emergency Mode or the starter `DRUGS` calculator data**. Promotion must be a separate, versioned clinical-governance action.

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

The current seed was generated from the attached PDF and checked for 1,561 records, non-overlapping source segmentation, and approximately 3.42 million covered source characters. This verifies extraction integrity, not clinical correctness. Clinical approval must be recorded by the institution before any record is used for prescribing or medication administration.
