import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const SUBROUTES = [
  'src/pages/investigations/Investigations.jsx',
  'src/pages/drugs/DrugLibrary.jsx',
  'src/pages/notes/ClinicalNotes.jsx',
  'src/pages/fluidBalance/FluidBalance.jsx',
  'src/pages/notes/Images.jsx',
];

test('every patient subroute shows an explicit patient context header', () => {
  for (const file of SUBROUTES) {
    assert.match(read(file), /<PatientContextHeader patientId=\{id\} \/>/, `${file} should render the patient context header`);
  }
});

test('the context header states access and empty/pending conditions', () => {
  const cmp = read('src/components/PatientContextHeader.jsx');
  assert.match(cmp, /role="region"/);
  assert.match(cmp, /aria-label="Patient context"/);
  assert.match(cmp, /Not inside a patient context/);
  assert.match(cmp, /do not have access to this patient record/);
  assert.match(cmp, /Loading patient context/);
  assert.match(cmp, /Patient context unavailable/);
  assert.match(cmp, /select\('id,age,weight,diagnosis,source_type,sex'\)/);
});

test('reference tools are separated from ordering and results expose verification', () => {
  const drugCalc = read('src/pages/calculators/DrugCalc.jsx');
  const infusion = read('src/pages/highRiskInfusions/HighRiskInfusions.jsx');
  assert.match(drugCalc, /Approval boundary/);
  assert.match(drugCalc, /not auto-calculated/);
  assert.match(infusion, /Never start from a calculated rate alone/);
  assert.match(infusion, /Same-doctor two-step confirmation/);
});

test('session expiry is explained rather than silently discarded', () => {
  const auth = read('src/context/AuthContext.jsx');
  const form = read('src/pages/patients/PatientForm.jsx');
  assert.match(auth, /signed out after \$\{IDLE_MINUTES\} minutes of inactivity/);
  assert.match(form, /session has expired/);
});
