# Teddy Bear unit-candidate cross-check against open pediatric guidance

This report documents a focused cross-check of the five curated Emergency Mode drugs that were associated with structural findings in the imported Teddy Bear text audit: **ceftriaxone, gentamicin, midazolam, norepinephrine, and vancomycin**.

> This is a **structural and reference cross-check**, not clinical validation. It does not establish a Nepal PICU protocol, does not replace review of the authorized Teddy Bear monograph, and does not authorize automatic promotion of any record into prescribing or calculator data.

The review was performed on 16 August 2026 against openly accessible sources from the American Academy of Pediatrics, Royal Children’s Hospital Melbourne, and UCSF Benioff Children’s Hospitals. The Indian Academy of Pediatrics public recommendations page and IAP Pediatric Emergency Medicine chapter were also checked, but the accessible pages did not expose drug-specific dose tables for these five medicines; therefore no IAP-specific numerical claim is made here. The PICU team should add an IAP or Nepal institutional source if it has access to a controlled formulary or local protocol.

## Cross-check summary

| Drug | Current Emergency Mode entry | Open reference dose/unit | Interpretation of Teddy Bear structural finding | Proposed repository action |
|---|---|---|---|---|
| **Ceftriaxone** | 50 mg/kg/dose, IV/IM; frequency is indication-specific | RCH lists 50 mg/kg IV daily in several pediatric infections. UCSF lists 50 mg/kg/dose IV q24h, or q12h for meningitis, with a 2,000 mg/dose maximum [1][2]. | The flagged `CefTRIAXone Sodium` record has no parseable dose expression, while an adjacent `Additives` fragment contains dose-like values. This is a heading/table-fragment association, not evidence that the prescribing unit is missing. | **Do not automatically change the numeric entry.** Keep the unit as mg/kg/dose, retain indication-specific frequency, and keep neonatal restrictions, meningitis frequency, maximum dose, formulation, and local protocol pending PICU review. |
| **Gentamicin** | 2.5 mg/kg/dose, IV/IM; interval and duration must follow local protocol | RCH commonly lists once-daily treatment regimens of 5–7.5 mg/kg depending on age and indication, and separately lists a 1 mg/kg q8h synergy regimen [1]. UCSF lists 5 mg/kg q24h for treatment in younger infants, 7 mg/kg q24h for treatment in older infants/children, and 3 mg/kg q24h for synergy [2]. | The Teddy Bear `multiple-dose-unit-families` finding is driven by extracted reference/table material. However, the app’s 2.5 mg/kg/dose value is **not interchangeable** with contemporary once-daily treatment regimens and cannot be interpreted without indication and frequency. | **Do not silently replace the dose.** Add a visible governance warning that 2.5 mg/kg/dose is a local/divided-dose placeholder requiring indication-specific protocol and therapeutic drug monitoring; contemporary once-daily treatment regimens may differ. |
| **Midazolam** | 0.05 mg/kg/dose, maximum 5 mg, IV/IM/IN | AAP lists IV sedation/anxiolysis at 0.05–0.10 mg/kg over 2–3 minutes, maximum single dose 5 mg; it lists different doses for intubation, seizures, and refractory status epilepticus [3]. | The finding occurs at the monograph heading/segment boundary and reports no parseable dose. It is not evidence that the monograph’s dose unit is absent. | **No numeric correction.** Preserve the indication-limited entry and its maximum, with route, titration, respiratory monitoring, and local approval remaining explicit. |
| **Norepinephrine** | 0.05 mcg/kg/min starting value, maximum 2 mcg/kg/min, IV infusion | AAP lists IV/IO 0.1–2.0 μg/kg/min titrated to effect [3]. The unit is a rate unit and is correct; the app’s 0.05 starting value is a cautious local starting choice below the AAP range, not an AAP-endorsed starting dose. | The Teddy Bear finding is a heading/segment extraction artifact. Concentration and infusion text were not normalized reliably by the structural parser. | **No automatic correction.** Keep the rate unit, clearly label 0.05 as the app’s starting reference, and require local PICU review of titration, standard concentrations, access route, and extravasation response. |
| **Vancomycin** | 15 mg/kg/dose, maximum 2,000 mg, IV; interval and dose must follow AUC/level-based local protocol | RCH lists 15 mg/kg IV q6h in multiple severe-infection contexts [1]. UCSF’s initial regimens vary by age: 15 mg/kg q6h at 1–2 months, 17.5 mg/kg q6h from 3 months to <12 years, and 15 mg/kg q6h at ≥12 years; UCSF emphasizes AUC 400–600 mg·h/L and patient-specific monitoring [2][4]. | The Teddy Bear finding occurs at the monograph segment boundary and contains no parseable dose expression. It is not evidence that the app unit is missing. | **No automatic correction.** Retain 15 mg/kg as a supported initial reference in some populations, but preserve the explicit age, renal-function, indication, and AUC/TDM limitations. |

## Findings and corrections

The four non-gentamicin flags do not justify changing the app’s numeric dose or unit. The extracted source contains recognizable monograph headings followed by text that the structural parser could not reliably associate with a dose expression. In ceftriaxone, for example, an adjacent `Additives` fragment was classified as part of the dose context. In midazolam, norepinephrine, and vancomycin, the flagged segment begins at a heading or carries preparation/infusion material rather than a normalized prescribing expression. These are review candidates, not confirmed dose errors.

Gentamicin requires a stronger user-facing boundary. The application currently displays **2.5 mg/kg/dose** without claiming a universal interval, which is safer than presenting it as a once-daily regimen; however, a clinician could still read the number as a complete treatment recommendation. The recommended change is therefore not a silent dose substitution. It is a prominent warning that the value is a local/divided-dose placeholder and that current open pediatric antimicrobial references commonly use age- and indication-specific once-daily regimens around 5–7.5 mg/kg, with synergy regimens also differing. The treating doctor must select the local regimen and arrange renal-function and therapeutic-drug-monitoring review.

No Teddy Bear full text, patient information, credentials, or private source files are added to this report. The complete authorized monograph content remains in the private Supabase workflow and must remain behind authentication, row-level security, and the doctor review gate.

## IAP and local Nepal validation boundary

The public IAP recommendations page and the IAP Pediatric Emergency Medicine chapter were checked as part of the requested AAP/IAP comparison. The pages establish IAP’s guideline and educational resources but did not expose an openly accessible, drug-specific table for these five medicines. This report therefore avoids attributing numerical doses to IAP. A future clinical governance pass should attach the institution’s available IAP formulary, Nepal national guideline, or PAHS protocol and record the exact version and access date.

## Required PICU review before release

The PICU team should verify each drug against the authorized monograph and the locally approved protocol, including the exact indication, formulation and concentration, route, age and weight restrictions, neonatal applicability, maximum dose, interval, renal/hepatic adjustment, dialysis considerations, infusion rate, compatibility, monitoring, and availability in Nepal. Until that review is recorded in the authenticated Teddy Bear review workflow, these entries remain **pending verification** and must not be treated as independently validated prescribing instructions.

## References

[1]: https://www.rch.org.au/clinicalguide/guideline_index/antibiotics/ "Royal Children’s Hospital Melbourne: Antimicrobial guidelines"
[2]: https://idmp.ucsf.edu/pediatric-antimicrobial-dosing-benioff-childrens-hospitals "UCSF Benioff Children’s Hospitals: Pediatric Antimicrobial Dosing"
[3]: https://publications.aap.org/pediatrics/article/121/2/433/68719/Preparing-for-Pediatric-Emergencies-Drugs-to "AAP Committee on Drugs: Preparing for Pediatric Emergencies: Drugs to Consider"
[4]: https://idmp.ucsf.edu/content/pediatric-vancomycin-dosing-and-monitoring-recommendations "UCSF: Pediatric vancomycin dosing and monitoring recommendations"

Additional IAP pages reviewed for source availability:

- [IAP Recommendations and Guidelines](https://iapindia.org/publication-recommendations-and-guidelines/)
- [IAP OPENPediatrics](https://iapindia.org/open-pediatrics/)
- [IAP Chapter on Pediatric Emergency Medicine](https://iappem.org/)
