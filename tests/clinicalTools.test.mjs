import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUGS, calculateDrugDose } from '../src/lib/clinicalTools.js';

const WEIGHTS = [0.1, 0.5, 1, 2, 3.5, 5, 10, 20, 30, 50, 70, 100];

test('all Emergency Mode drugs have complete bounded dose metadata', () => {
  assert.ok(DRUGS.length >= 10);
  for (const drug of DRUGS) {
    assert.equal(typeof drug.name, 'string');
    assert.equal(typeof drug.dose, 'number');
    assert.ok(Number.isFinite(drug.dose) && drug.dose > 0, `${drug.name} dose`);
    assert.equal(typeof drug.max, 'number');
    assert.ok(Number.isFinite(drug.max) && drug.max > 0, `${drug.name} max`);
  }
});

test('dose calculation is finite, positive, and never exceeds the configured maximum', () => {
  for (const drug of DRUGS) {
    for (const weight of WEIGHTS) {
      const result = calculateDrugDose(drug, weight);
      assert.ok(result, `${drug.name} should calculate at ${weight} kg`);
      assert.equal(result.raw, drug.dose * weight);
      assert.ok(Number.isFinite(result.raw));
      assert.ok(Number.isFinite(result.capped));
      assert.ok(result.raw > 0 && result.capped > 0);
      assert.ok(result.capped <= drug.max, `${drug.name} exceeded maximum at ${weight} kg`);
      assert.equal(result.cappedByMax, result.raw > drug.max);
    }
  }
});

test('string weights are accepted because browser inputs return strings', () => {
  const drug = DRUGS.find((item) => item.name === 'Adrenaline (epinephrine)');
  const result = calculateDrugDose(drug, '10');
  assert.deepEqual(result, { raw: 0.1, capped: 0.1, cappedByMax: false });
});

test('maximum-dose capping is exact and explicit', () => {
  const drug = DRUGS.find((item) => item.name === 'Ceftriaxone');
  const result = calculateDrugDose(drug, 100);
  assert.equal(result.raw, 5000);
  assert.equal(result.capped, 2000);
  assert.equal(result.cappedByMax, true);
});

test('invalid, missing, zero, negative, and non-finite weights return null', () => {
  const drug = DRUGS[0];
  for (const value of [undefined, null, '', 'abc', 0, -1, NaN, Infinity, 'Infinity']) {
    assert.equal(calculateDrugDose(drug, value), null, `expected null for ${String(value)}`);
  }
});

test('missing or invalid drug returns null', () => {
  for (const drug of [undefined, null, {}, { dose: 'abc' }]) {
    assert.equal(calculateDrugDose(drug, 10), null);
  }
});

test('drugs without a maximum still calculate without an artificial cap', () => {
  const drug = { dose: 2 };
  const result = calculateDrugDose(drug, 12.5);
  assert.deepEqual(result, { raw: 25, capped: 25, cappedByMax: false });
});
