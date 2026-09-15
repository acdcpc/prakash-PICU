# Neonate full-content integration (Harriet Lane)

The institution has stated that it has permission to store and redistribute the
Harriet Lane Handbook formulary for its private clinical use. The repository
therefore includes a private institutional Supabase table schema and a generated
full-text seed file for the **Neonate** reference (drug dosing for infants
&lt;1 month), complementing the Teddy Bear reference (children &gt;1 month).

## Scope split

| Reference | Population | Source | Table |
|---|---|---|---|
| Teddy Bear Review | Children greater than 1 month | *Pediatric Injectable Drugs* (Teddy Bear Book) | `teddy_bear_monographs` |
| Neonate Formulary | Neonates less than 1 month | *The Harriet Lane Handbook*, Part IV Formulary (Ch. 31 Drug Dosages) | `harriet_lane_monographs` |

## Included content

The supplied Harriet Lane PDF was extracted with `pdftotext` into a private
local workspace. The extractor detects drug monograph headings (ALL-CAPS lines
in the Part IV Formulary, page 840 onward, up to Chapter 32) and produces
**458 drug monograph entries** covering the full Chapter 31 drug dosage
monographs. Entries include full dosing text (including neonatal/preterm and
term-specific dosing where given), indications, and precautions.

The committed files are:

| File | Purpose |
|---|---|
| `sql/harriet_lane_monographs.sql` | Creates the private Neonate monograph table, review fields, indexes, RLS, and approval-gated update policy |
| `sql/harriet_lane_monographs_seed.sql` | Authorized full-text seed for the institution's private Supabase database |
| `scripts/ingest-harriet-lane.mjs` | Extracts the authorized PDF into a private local source/index workspace |
| `scripts/compile-harriet-lane-sql.mjs` | Rebuilds the full-text SQL seed from the private source and index |
| `src/pages/drugReview/HarrietLaneReview.jsx` | Authenticated full-text review and verification workspace (Neonate tab) |
| `src/data/harrietLaneReviewIndex.js` | Metadata-only fallback index used while the private table is not installed |

## Apply order

Run the base and security migrations first, then create the monograph table, and
finally run the full-text seed. The full-text seed (~1.6 MB) is too large for
the SQL Editor and is applied separately (chunked import or `psql`).

```text
sql/migration.sql
sql/subscriptions.sql
sql/security_hardening.sql
sql/teddy_bear_monographs.sql
sql/teddy_bear_monographs_seed.sql
sql/teddy_bear_record_kind.sql
sql/harriet_lane_monographs.sql
sql/harriet_lane_monographs_seed.sql
sql/pediatric_clinician_workflow.sql
```

Seed approved `unit_memberships` rows before opening the review route. The table
is protected by RLS and is not intended to be accessible to public routes or
unauthenticated users.

## Review workflow

Doctors open **/neonate-review** (Neonate Formulary in the sidebar) after
authentication and unit authorization. The page loads the full content from
`harriet_lane_monographs`, supports search and pagination, displays the source
segment, and provides structured fields for verified neonatal dose/regimen,
unit, maximum dose, route/formulation, indication, renal/dialysis notes,
neonatal (preterm/term) notes, and review notes.

Every record begins with `pending-clinical-verification`. Saving a review
records the authenticated reviewer, review time, and structured fields.
Approval **does not automatically promote** a record into calculator data;
promotion must be a separate, versioned clinical-governance action.

## Clinical verification requirements

The reviewing team should verify the exact formulation, concentration, route,
indication, **gestational age and postnatal age**, weight-based dosing,
preterm vs term status, renal/hepatic adjustments, maximum dose, frequency,
preparation, compatibility, and local NICU protocol before any record is used.

## Rebuilding the seed

With the authorized PDF available locally:

```bash
npm run ingest:neonate -- /path/to/authorized/HarrietLane.pdf .clinical-private/harriet-lane
npm run compile:neonate -- .clinical-private/harriet-lane/source.txt .clinical-private/harriet-lane/monograph-index.json .clinical-private/harriet-lane/teddy_bear_monographs_seed.sql
npm run build:neonate-index -- .clinical-private/harriet-lane/monograph-index.json src/data/harrietLaneReviewIndex.js
cp .clinical-private/harriet-lane/teddy_bear_monographs_seed.sql sql/harriet_lane_monographs_seed.sql
```

To import the seed into a hosted project through `psql` (recommended), reuse
the shared importer with the Neonate seed file:

```bash
DATABASE_URL='postgresql://...?...sslmode=require' \
  node scripts/import-teddy-bear-seed.mjs sql/harriet_lane_monographs_seed.sql
```

The private source extraction remains in `.clinical-private/`. The committed
seed is institution-authorized content and must remain in the private repository
with repository access restricted to approved users. Do not place it in public
static hosting, client bundles, analytics, logs, screenshots, or public object
storage. The authorized PDF must not be committed.
