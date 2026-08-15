# prakash-PICU worldwide product benchmark

## Benchmark scope

The comparison focused on pediatric emergency references, medication dosing and calculation systems, evidence-linked clinical decision support, growth and child-health tools, and point-of-care workflows. The benchmark included Pedi STAT, Children’s Mercy PedsGuide, PEDeDose, and MDCalc.

## Comparison

| Capability | Benchmark pattern | prakash-PICU before | Change implemented |
|---|---|---|---|
| Emergency speed | Pediatric-first emergency mode with rapid dose and equipment lookup, offline/read-only resilience, and high-stress usability | General Clinical Tools workspace | Added `/emergency` with persistent local weight, rapid dose selection, verification acknowledgement, checklist, and links to tools/pathways |
| Interactive algorithms | Step-by-step checklists, decision trees, severe-illness risk prompts, consult/escalation actions | Static algorithm cards | Added expandable algorithm checklists with progress, reassessment, and escalation warning |
| Dose safety | Source, indication, route/formulation, max, renal/hepatic adjustment, interactions, adverse effects, recommendation metadata | Dose, route, frequency, renal/dialysis note, source | Added starter-data status, formulation/interaction verification prompts, better search language, favorites, recents, and persistent verification warnings |
| Workflow integration | Patient context is carried into tools but must not silently transfer between patients | Shared context fields | Added explicit emergency verification and local-storage messaging; production version should add patient-bound context and audit history |
| Discoverability | Favorites, recent tools, specialty/purpose filtering | Search and alphabetic filter | Added favorite and recent drug controls, plus quick-access emergency navigation |
| Governance | Expert data management, traceability, versioning, grading, and clinical-device governance | Source links and safety disclaimer | Added benchmark documentation and stronger visible “starter reference / verify local monograph” status; full governance remains a production requirement |
| Reference access | Offline capability and organization customization | Web application | Added local-only draft behavior and architecture notes; true offline/PWA packaging remains a later implementation step |

## Implemented priority rationale

The highest-value changes were selected for **time-to-safe-action**, not feature count. The first priority was emergency mode because a busy clinician needs a short path from verified weight to a bounded reference dose, with a visible stop-and-check moment. The second priority was interactive algorithms because static cards do not support progress, reassessment, or escalation. The third priority was favorites, recent tools, and richer dose metadata because they reduce search time and make safety information visible at the point of selection.

## Sources

The benchmark used public product and academic descriptions. Pedi STAT documents rapid pediatric dosing, equipment sizing, resuscitation workflows, offline capability, and customization [1]. Children’s Mercy describes PedsGuide’s step-by-step decision support, risk checklists, weight/age tools, algorithms, and quick-call feature [2]. The PEDeDose paper describes pediatric dosing error risk, integrated calculation, clinical data governance, metadata, workflow integration, and certified medical-device software considerations [3]. MDCalc demonstrates trending/favorites/specialty discovery, content quality framing, and explicit clinical-judgment disclaimers [4].

These products are comparators rather than clinical authorities. Their content, licensing, validation status, and regulatory claims do not automatically transfer to prakash-PICU.

### References

[1]: https://www.pedi-stat.com/pedistat "Pedi STAT — Pediatric Clinical Reference"
[2]: https://www.childrensmercy.org/health-care-providers/refer-or-manage-a-patient/provider-resources/apps-for-providers/PedsGuide-app/ "Children’s Mercy — PedsGuide App"
[3]: https://pmc.ncbi.nlm.nih.gov/articles/PMC8821055/ "PEDeDose — Clinical decision support tool with integrated dose calculator for paediatrics"
[4]: https://www.mdcalc.com/ "MDCalc — Medical calculators, equations, scores, and guidelines"
