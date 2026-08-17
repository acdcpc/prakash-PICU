import test from 'node:test';
import assert from 'node:assert/strict';
import { HIGH_RISK_INFUSIONS, getInfusionPreparation, getInfusionRate } from '../src/data/highRiskInfusions.js';

test('high-risk infusion records have safety metadata', () => {
  assert.equal(HIGH_RISK_INFUSIONS.length, 29);
  const expected = ['Epinephrine', 'Norepinephrine', 'Dopamine', 'Dobutamine', 'Vasopressin', 'Milrinone', 'Midazolam', 'Morphine', 'Propofol', 'Ketamine', 'Dexmedetomidine', 'Fentanyl', 'Vecuronium', 'Amiodarone', 'Labetalol', 'Potassium chloride', 'Sodium bicarbonate', 'Calcium gluconate 10%', 'Mannitol 20%', 'Hypertonic saline 3%', 'Heparin line infusion', 'Magnesium sulfate', 'Regular insulin', 'Furosemide continuous infusion', 'Nitroprusside', 'Nicardipine', 'Octreotide', 'Pantoprazole', 'N-acetylcysteine'];
  assert.deepEqual(HIGH_RISK_INFUSIONS.map((item) => item.name), expected);
  for (const infusion of HIGH_RISK_INFUSIONS) {
    assert.ok(infusion.id && infusion.name && infusion.category);
    assert.ok(infusion.doseUnit && Number.isFinite(infusion.min) && Number.isFinite(infusion.max));
    assert.ok(infusion.min > 0 && infusion.max >= infusion.min);
    assert.ok(infusion.preparation && infusion.monitoring);
  }
});

test('mcg/kg/min rate uses weight, minutes-to-hours conversion, and final concentration', () => {
  const norepinephrine = HIGH_RISK_INFUSIONS.find((item) => item.id === 'norepinephrine');
  const result = getInfusionRate(norepinephrine, 10, 0.1, 0.2);
  assert.equal(result.amountPerHour, 60);
  assert.equal(result.rateMlHr, 300);
  assert.equal(result.concentration, 0.2);
});

test('source-template dilution calculates drug and diluent volumes', () => {
  const morphine = HIGH_RISK_INFUSIONS.find((item) => item.id === 'morphine');
  const result = getInfusionPreparation(morphine, 20, 0.005);
  assert.equal(result.finalVolume, 24);
  assert.equal(result.amountPerHour, 0.1);
  assert.ok(Math.abs(result.requiredAmount - 2.4) < 1e-9);
  assert.ok(Math.abs(result.stockVolume - 2.4) < 1e-9);
  assert.ok(Math.abs(result.diluentVolume - 21.6) < 1e-9);
  assert.equal(result.templateRateMlHr, 1);
});

test('mg/kg/hr rate uses weight and final concentration', () => {
  const morphine = HIGH_RISK_INFUSIONS.find((item) => item.id === 'morphine');
  const result = getInfusionRate(morphine, '20', 0.005, 0.1);
  assert.equal(result.amountPerHour, 0.1);
  assert.equal(result.rateMlHr, 1);
});

test('volume-based infusion can calculate without a concentration entry', () => {
  const saline = HIGH_RISK_INFUSIONS.find((item) => item.id === 'hypertonic-saline-3');
  const result = getInfusionRate(saline, 10, 0.5);
  assert.equal(result.rateMlHr, 5);
  assert.equal(result.amountPerHour, 5);
});

test('non-volume high-risk infusion refuses to calculate without final concentration', () => {
  const insulin = HIGH_RISK_INFUSIONS.find((item) => item.id === 'regular-insulin');
  assert.equal(getInfusionRate(insulin, 10, 0.1), null);
  assert.equal(getInfusionRate(insulin, 0, 0.1, 1), null);
  assert.equal(getInfusionRate(insulin, 10, 0, 1), null);
});
