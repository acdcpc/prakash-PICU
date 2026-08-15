# Pediatric product benchmark notes

## Pedi STAT
Source: https://www.pedi-stat.com/pedistat
Key features: pediatric-first emergency reference; rapid weight-based medication dosing; airway and procedural equipment sizing; resuscitation workflows; age-based vital signs; common procedures; offline capability; customization and organization branding. Product positioning emphasizes speed during high-stress emergency care.

## Children’s Mercy PedsGuide
Source: https://www.childrensmercy.org/health-care-providers/refer-or-manage-a-patient/provider-resources/apps-for-providers/PedsGuide-app/
Key features: step-by-step interactive clinical decision support; checklists for basic history and severe-illness risk; flow algorithms; weight/age-based resuscitation, medication, cardiovascular drip, RSI, burn, fluids, and GCS tools; visual risk aids; febrile infant, DKA, and BRUE pathways; quick-call consult feature.

## PEDeDose academic CDS description
Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC8821055/
Key findings: medication errors, especially dosing errors, are a major pediatric safety concern; CDS is safer when integrated into workflow. PEDeDose includes age, weight, height, prematurity, indication, route, galenic form, source, recommendation grade, renal/hepatic adjustment, interactions, adverse effects, traceability, expert data management, and an integration API. The paper describes certified medical-device software governance and active clinician acceptance of the result.

## MDCalc
Source: https://www.mdcalc.com/
Key features: trending and featured tools, favorites, specialty and purpose filters, broad calculator library, content quality grading, and explicit re-check/clinical-judgment disclaimer.

## Benchmark implications for prakash-PICU
1. Add a one-screen emergency mode with persistent patient context, rapid dose/equipment lookup, and clear “verify before administration” acceptance.
2. Add tool metadata: source, version/date, recommendation grade, indication, route/formulation, renal/hepatic adjustment, interactions, adverse effects, and contraindications.
3. Add favorites/recent tools and search by drug, indication, diagnosis, or clinical question.
4. Expand algorithm cards into step-based checklists with progress, stop/transfer points, and an escalation/consult action.
5. Add offline/read-only fallback for reference tools and an explicit stale-content indicator.
6. Add audit/version information and a clinical-content governance workflow rather than presenting static starter data as fully validated protocol.
7. Add patient-context carry-forward controls that require explicit confirmation to avoid accidental cross-patient data transfer.
