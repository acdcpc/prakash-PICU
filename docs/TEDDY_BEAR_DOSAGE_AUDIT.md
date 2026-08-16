# Teddy Bear dosage and unit structural audit

The imported Teddy Bear content was audited on 16 August 2026 using `scripts/audit-teddy-doses.mjs`. The audit reads the authorized private extraction and its monograph index, identifies dose-like expressions, and flags text requiring review.

> This audit is a **structural text check**, not a clinical validation. It can identify missing-unit candidates, inconsistent-looking unit families, concentration patterns, and high-alert rate units. It cannot determine whether a dose is clinically correct for a specific indication, age, weight, formulation, renal function, or local protocol.

## Results

| Metric | Result |
|---|---:|
| Indexed segments scanned | 1,561 |
| Segments with dose-like expressions | 842 |
| Likely drug-monograph segments | 829 |
| Likely monographs with structural findings | 608 |
| All segments with findings, including index/table fragments | 770 |
| Missing-unit candidates | 214 |
| Dose keywords without a parseable dose expression | 251 |
| Multiple concentration patterns | 6 |
| Multiple dose-unit families in one segment | 453 |
| High-alert rate-unit review candidates | 81 |

The counts are **review candidates**, not confirmed errors. A monograph may legitimately contain multiple units, such as mg, mg/kg, mg/m², percentages, concentrations, or dose forms, and a heading segment may contain preparation information rather than a prescribing dose.

## What the audit checks

The script detects dose-like numbers paired with common units such as mg, mcg, g, mEq, mmol, units, IU, mL, L, and percentages. It also looks for weight-, surface-area-, time-, frequency-, infusion-, and concentration-related context. Segments are classified as likely monographs when they have sufficient text and multiple clinical section signals; shorter headings, indexes, tables, and glossary fragments remain in the complete machine-readable output but are not treated as primary monograph findings.

The audit does not normalize drug names, infer missing units, compare a dose against a guideline, calculate a patient-specific dose, or decide which of multiple preparations is correct. It also does not replace a pharmacist or pediatrician review. The final clinical process must review all records, including records with no structural flags.

## Review workflow

The authenticated `/teddy-bear-review` route now provides two rapid actions for doctors:

| Action | Meaning |
|---|---|
| **Approve reviewed record** | Saves the doctor’s structured verification fields, reviewer identity, timestamp, and `approved` status after the doctor confirms the monograph and local protocol |
| **Flag for clinical review** | Saves the doctor’s review fields and changes the record to `in-review` so a dose, unit, formulation, concentration, or source issue can be investigated |

Approval remains a review-table status only. It does not automatically add the record to Emergency Mode, Clinical Tools, or any prescribing calculator. A separate versioned promotion process must copy only clinically approved records into calculator data.

## Re-running the audit

With the authorized PDF extracted locally:

```bash
npm run ingest:drugs -- /path/to/authorized/Teddybear.pdf .clinical-private/drug-reference
npm run audit:drugs -- .clinical-private/drug-reference/source.txt .clinical-private/drug-reference/monograph-index.json .clinical-private/teddy-audit
```

The private output contains `audit.json` for machine processing and `audit.md` for review. The complete findings are intentionally not copied into the public frontend bundle. The committed report contains aggregate results only.

## Required team validation

The PICU review team should work through every record and confirm the exact drug identity, formulation, route, indication, age and weight restrictions, neonatal applicability, renal/hepatic adjustments, dialysis considerations, dose unit, maximum dose, frequency, preparation, concentration, dilution, compatibility, administration rate, monitoring requirements, and local protocol alignment. Any record with a flagged unit or concentration should remain out of calculator data until explicitly resolved.

The current result is therefore: **the imported text is structurally present and auditable, but the audit cannot conclude that every dose is correct.** Clinical correctness requires your team’s final verification against the authorized source and current institutional standards.
