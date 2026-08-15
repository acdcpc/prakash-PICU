import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUGS, calculateDrugDose } from '../src/lib/clinicalTools.js';

const AGE_BANDS = [
  { name: 'extremely preterm reference', ageYears: 0, weights: [0.3, 0.5, 0.9] },
  { name: 'term neonate', ageYears: 0.01, weights: [1.5, 2.5, 4] },
  { name: 'young infant', ageYears: 0.25, weights: [3, 5, 8] },
  { name: 'older infant', ageYears: 0.75, weights: [6, 8, 12] },
  { name: 'toddler', ageYears: 2, weights: [8, 10, 15] },
  { name: 'school age', ageYears: 7, weights: [15, 22, 35] },
  { name: 'early adolescent', ageYears: 12, weights: [30, 45, 60] },
  { name: 'late adolescent', ageYears: 17, weights: [45, 70, 100, 150] },
];

const SIMULATION_WEIGHTS = AGE_BANDS.flatMap((band) => band.weights.map((weight) => ({ ...band, weight })));

test('Emergency Mode produces finite, positive, bounded doses across all age and weight bands', () => {
  let cases = 0;
  for (const band of SIMULATION_WEIGHTS) {
    for (const drug of DRUGS) {
      const result = calculateDrugDose(drug, band.weight);
      assert.ok(result, `${drug.name} should calculate at ${band.name}, ${band.weight} kg`);
      assert.ok(Number.isFinite(result.raw) && result.raw > 0, `${drug.name} raw dose must be finite and positive`);
      assert.ok(Number.isFinite(result.capped) && result.capped > 0, `${drug.name} capped dose must be finite and positive`);
      if (Number.isFinite(Number(drug.max)) && Number(drug.max) > 0) {
        assert.ok(result.capped <= Number(drug.max), `${drug.name} exceeds max at ${band.weight} kg`);
      }
      cases += 1;
    }
  }
  assert.equal(cases, SIMULATION_WEIGHTS.length * DRUGS.length);
});

test('Emergency Mode remains monotonic until a maximum cap is reached', () => {
  for (const drug of DRUGS) {
    let previous = 0;
    for (const weight of [0.3, 1, 2.5, 5, 10, 20, 40, 80, 150]) {
      const result = calculateDrugDose(drug, weight);
      assert.ok(result);
      assert.ok(result.capped >= previous, `${drug.name} is not monotonic at ${weight} kg`);
      previous = result.capped;
    }
  }
});

test('Emergency Mode rejects unsafe weight and drug inputs', () => {
  for (const drug of DRUGS) {
    for (const weight of [undefined, null, '', 0, -0.1, -10, NaN, Infinity, 'not-a-weight']) {
      assert.equal(calculateDrugDose(drug, weight), null, `${drug.name} accepted invalid weight ${String(weight)}`);
    }
  }
  for (const weight of [1, 10, 70]) {
    assert.equal(calculateDrugDose(null, weight), null);
    assert.equal(calculateDrugDose({}, weight), null);
    assert.equal(calculateDrugDose({ dose: 0 }, weight), null);
    assert.equal(calculateDrugDose({ dose: 'not-a-dose' }, weight), null);
  }
});
