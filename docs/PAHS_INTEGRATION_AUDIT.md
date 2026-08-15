# PAHS high-risk infusion integration audit

## Audit result

The supplied `FINALHIghRiskInfusionsPAHS.docx` contains **29 infusion rows** across three tables. The repository dataset `src/data/highRiskInfusions.js` contains **29 entries**. A row-by-row comparison found no missing medication entry and no duplicate repository entry.

| PAHS section | Source rows | Repository coverage |
|---|---:|---:|
| Vasopressor / inotrope | 6 | 6/6 |
| Sedation / neuromuscular blockade | 7 | 7/7 |
| Miscellaneous drugs | 16 | 16/16 |
| **Total** | **29** | **29/29** |

The normalized names are:

| Source label | Repository record |
|---|---|
| Epinephrine | `epinephrine` |
| Norepinephrine | `norepinephrine` |
| Dopamine | `dopamine` |
| Dobutamine | `dobutamine` |
| Vasopressin | `vasopressin` |
| Milrinone | `milrinone` |
| Midazolam | `midazolam` |
| Morphine | `morphine` |
| Propofol | `propofol` |
| Ketamine | `ketamine` |
| Dexmedetomidine | `dexmedetomidine` |
| Fentanyl | `fentanyl` |
| Vecuronium | `vecuronium` |
| Amiodarone | `amiodarone` |
| Labetalol | `labetalol` |
| Potassium Chloride | `potassium-chloride` |
| Sodium Bicarbonate | `sodium-bicarbonate` |
| Calcium Gluconate | `calcium-gluconate` |
| Mannitol | `mannitol` |
| Hyper tonic saline 3% | `hypertonic-saline-3` |
| Heparin line infusion | `heparin-line` |
| Magnesium Sulphate | `magnesium-sulfate` |
| Insulin | `regular-insulin` |
| Lasix | `furosemide-infusion` |
| Nitroprusside | `nitroprusside` |
| Nicardipine | `nicardipine` |
| Octreotide | `octreotide` |
| Pantoprazole | `pantoprazole` |
| N-Acetylcystine | `n-acetylcysteine` |

## Exceptions and clinical-review flags

Completeness means that the source rows are represented; it does not mean that every source value is clinically validated. The dataset preserves source dilution and monitoring text and flags entries that need local review. Examples include neonatal-specific vasopressor preparations, a dexmedetomidine concentration transcription that must be checked against the product label, fixed unit-per-hour heparin instructions, the octreotide unit inconsistency, pantoprazole weight-tiering, and N-acetylcysteine without a supplied concentration or dilution.

The application therefore requires a verified final prepared concentration for non-volume-based pump-rate calculations and uses a doctor–nurse–independent-check workflow before administration. It does not silently convert ambiguous source text into an autonomous medication order.

## Source

The audit is based on the supplied document `FINALHIghRiskInfusionsPAHS.docx`, extracted into `research/high_risk_infusions_extracted.md`. The full source document is not redistributed by the application.
