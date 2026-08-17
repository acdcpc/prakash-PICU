export const CLINICAL_REFERENCES = [
  { id: 'aha-pals-2025', label: 'AHA/AAP CPR, BLS, and PALS 2025', url: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines' },
  { id: 'sccm-pandem', label: 'SCCM PANDEM Guidelines for Infants and Children', url: 'https://www.sccm.org/clinical-resources/guidelines/guidelines/pandem-guidelines-for-infants-and-children' },
  { id: 'sccm-ped-sepsis', label: 'Surviving Sepsis Campaign: Children 2026', url: 'https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-the-management-of-sepsis-and-septic-shock-in' },
  { id: 'nepal-ards-2021', label: 'Nepal National ARDS Guideline 2021 — revision status required', url: 'https://heoc.mohp.gov.np/guidelines-publications/national-guideline-on-acute-respiratory/download' },
  { id: 'who-growth', label: 'WHO Child Growth Standards', url: 'https://www.who.int/tools/child-growth-standards' },
  { id: 'nepal-immunization', label: 'Nepal routine and delayed immunization schedules', url: 'https://fwd.gov.np/gallery-detail/routine-immunization-and-delayed-immunization-schedule-1751942697' },
  { id: 'nice-asthma', label: 'NICE asthma guidance', url: 'https://www.nice.org.uk/guidance/ng80' },
  { id: 'teddy-bear', label: 'Pediatric Injectable Drugs (The Teddy Bear Book), 11th ed.', url: 'https://www.ashp.org/products-and-services/pediatric-injectable-drugs' },
];

export const DRUGS = [
  { name: 'Adrenaline (epinephrine)', letter: 'A', dose: 0.01, unit: 'mg/kg/dose', max: 1, route: 'IV/IO', frequency: 'Every 3–5 minutes during resuscitation', indication: 'Cardiac arrest / severe anaphylaxis', renal: 'No routine renal adjustment; verify indication and concentration.', dialysis: 'No routine dialysis adjustment.', reference: 'aha-pals-2025' },
  { name: 'Amikacin', letter: 'A', dose: 15, unit: 'mg/kg/dose', max: 1500, route: 'IV/IM', frequency: 'Interval must follow local therapeutic drug monitoring protocol', indication: 'Serious susceptible bacterial infection', renal: 'Renal dose and interval adjustment is essential; use local protocol and levels.', dialysis: 'Dialysis-specific dosing and post-dialysis supplementation require pharmacy review.', reference: 'teddy-bear' },
  { name: 'Ceftriaxone', letter: 'C', dose: 50, unit: 'mg/kg/dose', max: 2000, route: 'IV/IM', frequency: 'Usually every 12–24 hours depending on indication', indication: 'Susceptible bacterial infection', renal: 'Usually no isolated renal adjustment, but verify hepatic/renal dysfunction and indication.', dialysis: 'Confirm with local antimicrobial/pharmacy protocol.', reference: 'teddy-bear' },
  { name: 'Dexamethasone', letter: 'D', dose: 0.15, unit: 'mg/kg/dose', max: 10, route: 'IV/PO', frequency: 'Indication-specific', indication: 'Airway inflammation / selected inflammatory conditions', renal: 'No routine renal adjustment; indication and duration are critical.', dialysis: 'No routine dialysis adjustment.', reference: 'teddy-bear' },
  { name: 'Furosemide', letter: 'F', dose: 1, unit: 'mg/kg/dose', max: 40, route: 'IV/PO', frequency: 'Indication-specific; monitor response', indication: 'Fluid overload / edema', renal: 'Renal dysfunction may alter response; titrate to urine output, electrolytes, and fluid status.', dialysis: 'Do not use as a substitute for dialysis; discuss with nephrology.', reference: 'teddy-bear' },
  { name: 'Gentamicin', letter: 'G', dose: 2.5, unit: 'mg/kg/dose', max: 160, route: 'IV/IM', frequency: 'Divided-dose placeholder; interval must follow local protocol', indication: 'Serious susceptible bacterial infection', renal: 'Mandatory interval adjustment and therapeutic drug monitoring.', dialysis: 'Use dialysis-specific dosing and levels.', reviewNote: 'Do not interpret 2.5 mg/kg/dose as a universal once-daily treatment regimen. Confirm indication, age, renal function, local divided/once-daily protocol, and levels before administration.', reference: 'teddy-bear' },
  { name: 'Hydrocortisone', letter: 'H', dose: 2, unit: 'mg/kg/dose', max: 100, route: 'IV', frequency: 'Indication-specific', indication: 'Adrenal crisis / refractory shock adjunct where indicated', renal: 'No routine renal adjustment; monitor sodium, glucose, and infection risk.', dialysis: 'No routine dialysis adjustment.', reference: 'teddy-bear' },
  { name: 'Levetiracetam', letter: 'L', dose: 20, unit: 'mg/kg/dose', max: 4500, route: 'IV/PO', frequency: 'Loading dose; maintenance is indication- and renal-function-specific', indication: 'Seizure / status epilepticus', renal: 'Maintenance dose reduction may be required in renal impairment.', dialysis: 'Dialysis can remove drug; verify supplemental dosing with pharmacy.', reference: 'teddy-bear' },
  { name: 'Midazolam', letter: 'M', dose: 0.05, unit: 'mg/kg/dose', max: 5, route: 'IV/IM/IN', frequency: 'Titrate to indication and monitoring', indication: 'Seizure / procedural sedation', renal: 'Active metabolites may accumulate; reduce/titrate cautiously in organ dysfunction.', dialysis: 'Use specialist protocol; monitor for prolonged sedation.', reference: 'sccm-pandem' },
  { name: 'Morphine', letter: 'M', dose: 0.05, unit: 'mg/kg/dose', max: 5, route: 'IV', frequency: 'Titrate to validated pain score and respiratory monitoring', indication: 'Moderate–severe pain', renal: 'Active metabolites may accumulate; reduce dose/extend interval and monitor.', dialysis: 'Specialist/pharmacy review required.', reference: 'sccm-pandem' },
  { name: 'Norepinephrine', letter: 'N', dose: 0.05, unit: 'mcg/kg/min', max: 2, route: 'IV infusion', frequency: 'Titrate continuously to perfusion targets', indication: 'Shock with vasoplegia', renal: 'No standard renal adjustment; titrate to physiology.', dialysis: 'No routine dialysis adjustment.', reference: 'sccm-ped-sepsis' },
  { name: 'Phenobarbital', letter: 'P', dose: 20, unit: 'mg/kg/dose', max: 1000, route: 'IV/PO', frequency: 'Loading; maintenance requires specialist protocol', indication: 'Seizure / status epilepticus', renal: 'Use specialist guidance; monitor levels and sedation.', dialysis: 'Dialysis and levels may affect dosing; pharmacy review.', reference: 'teddy-bear' },
  { name: 'Salbutamol (albuterol)', letter: 'S', dose: 0.15, unit: 'mg/kg/dose', max: 5, route: 'Nebulized', frequency: 'Indication-specific; monitor heart rate and potassium', indication: 'Acute bronchospasm', renal: 'No routine renal adjustment.', dialysis: 'No routine dialysis adjustment.', reference: 'nice-asthma' },
  { name: 'Vancomycin', letter: 'V', dose: 15, unit: 'mg/kg/dose', max: 2000, route: 'IV', frequency: 'Interval and dose must follow AUC/level-based local protocol', indication: 'Serious susceptible gram-positive infection', renal: 'Mandatory renal function and therapeutic drug monitoring.', dialysis: 'Dialysis-specific dosing and post-dialysis levels required.', reference: 'teddy-bear' },
];

export const SCORE_DEFINITIONS = {
  'COMFORT-B': { title: 'COMFORT-B Scale', range: '6–30', interpretation: 'Score each domain 1–5. Higher scores indicate greater distress; use local threshold and serial trend.', items: ['Alertness', 'Calmness/agitation', 'Respiratory response', 'Physical movement', 'Muscle tone', 'Facial tension'], min: 1, max: 5, reference: 'sccm-pandem' },
  'SOS-PD': { title: 'SOS-PD / withdrawal and delirium screen', range: 'Use validated local scoring sheet', interpretation: 'This screen supports structured observation and does not replace clinical assessment.', items: ['Sleep disturbance', 'Consolability', 'Autonomic signs', 'Behavioral change', 'Perceptual disturbance'], reference: 'sccm-pandem' },
  PSSS: { title: 'Pediatric Sedation State Scale', range: '1–5', interpretation: 'Select the single observed sedation state and compare it with the prescribed target.', options: [{ value: 1, label: 'Fully awake / alert' }, { value: 2, label: 'Drowsy, easily roused' }, { value: 3, label: 'Asleep, responds to voice or gentle touch' }, { value: 4, label: 'Deep sedation, responds only to physical stimulation' }, { value: 5, label: 'Unresponsive' }], reference: 'sccm-pandem' },
  SBS: { title: 'State Behavioral Scale', range: '-3 to +2', interpretation: 'Select the best-fit behavioral state and reassess after intervention.', options: [{ value: 2, label: 'Agitated, danger to self or staff' }, { value: 1, label: 'Difficult to calm, uncomfortable' }, { value: 0, label: 'Awake and calm' }, { value: -1, label: 'Responsive to gentle touch or voice' }, { value: -2, label: 'Responsive only to repeated noxious stimulation' }, { value: -3, label: 'Unresponsive' }], reference: 'sccm-pandem' },
  RASS: { title: 'Richmond Agitation–Sedation Scale', range: '+4 to -5', interpretation: 'Positive values indicate agitation; negative values indicate deeper sedation.', options: [{ value: 4, label: 'Combative' }, { value: 3, label: 'Very agitated' }, { value: 2, label: 'Agitated' }, { value: 1, label: 'Restless' }, { value: 0, label: 'Alert and calm' }, { value: -1, label: 'Drowsy' }, { value: -2, label: 'Light sedation' }, { value: -3, label: 'Moderate sedation' }, { value: -4, label: 'Deep sedation' }, { value: -5, label: 'Unarousable' }], reference: 'sccm-pandem' },
  NIPS: { title: 'Neonatal Infant Pain Scale', range: '0–7', interpretation: 'Higher scores indicate more pain; use in conjunction with clinical context.', items: ['Facial expression', 'Cry', 'Breathing pattern', 'Arms', 'Legs', 'State of arousal'], reference: 'sccm-pandem' },
  CRIES: { title: 'CRIES neonatal postoperative pain scale', range: '0–10', interpretation: 'Use in appropriate neonatal postoperative contexts and follow institutional thresholds.', items: ['Crying', 'Requires oxygen', 'Increased vital signs', 'Expression', 'Sleeplessness'], reference: 'sccm-pandem' },
  FLACC: { title: 'FLACC Pain Scale', range: '0–10', interpretation: 'Behavioral pain assessment for children who cannot reliably self-report.', items: ['Face', 'Legs', 'Activity', 'Cry', 'Consolability'], reference: 'sccm-pandem' },
  FACES: { title: 'Faces Pain Scale', range: '0–10', interpretation: 'Use self-report where developmentally appropriate; explain the scale neutrally.', items: ['Child-selected face rating'], reference: 'sccm-pandem' },
  CAPD: { title: 'Cornell Assessment of Pediatric Delirium', range: '0–32', interpretation: 'Higher scores suggest delirium risk; use the validated full instrument and local threshold.', items: ['Awareness', 'Communication', 'Sleep', 'Activity', 'Consolability', 'Perceptual changes', 'Affect', 'Response latency'], reference: 'sccm-pandem' },
  'pCAM-ICU': { title: 'Pediatric CAM-ICU', range: 'Feature-based', interpretation: 'Requires trained assessment of acute change, inattention, altered consciousness, and disorganized thinking.', items: ['Acute change/fluctuation', 'Inattention', 'Altered level of consciousness', 'Disorganized thinking'], reference: 'sccm-pandem' },
};

export const POCUS_TOPICS = ['Lung', 'Heart', 'Cranium', 'Venous excess (VExUS)', 'Bronchoscopy', 'Vascular access', 'Transcranial Doppler'];

export const ALGORITHMS = [
  { title: 'PALS emergency algorithms', description: 'Weight-based emergency preparation, arrest, bradycardia, tachycardia, and post-arrest workflow.', reference: 'aha-pals-2025' },
  { title: 'Pediatric septic shock', description: 'Recognition, perfusion assessment, antimicrobials, fluids, vasoactive support, and reassessment prompts.', reference: 'sccm-ped-sepsis' },
  { title: 'Pediatric ARDS', description: 'Structured severity, respiratory support, monitoring, and escalation checklist for local protocol adaptation.', reference: 'nepal-ards-2021' },
  { title: 'Asthma exacerbation', description: 'Severity assessment, bronchodilator/steroid pathway, response reassessment, and escalation prompts.', reference: 'nice-asthma' },
  { title: 'Seizure and refractory seizure', description: 'Time-based seizure response checklist with weight-based medication lookup and specialist escalation.', reference: 'aha-pals-2025' },
  { title: 'Shock pathways', description: 'Hypovolemic, distributive, cardiogenic, obstructive, and mixed shock assessment prompts.', reference: 'sccm-ped-sepsis' },
];

export function getReference(id) {
  return CLINICAL_REFERENCES.find((reference) => reference.id === id) || CLINICAL_REFERENCES[0];
}

export function calculateDrugDose(drug, weight) {
  const numericWeight = Number(weight);
  const numericDose = Number(drug?.dose);
  const numericMax = Number(drug?.max);
  if (!drug || !Number.isFinite(numericWeight) || numericWeight <= 0 || !Number.isFinite(numericDose) || numericDose <= 0) return null;
  const amount = numericDose * numericWeight;
  const hasMaximum = Number.isFinite(numericMax) && numericMax > 0;
  const capped = hasMaximum ? Math.min(amount, numericMax) : amount;
  return { raw: amount, capped, cappedByMax: hasMaximum && capped < amount };
}
