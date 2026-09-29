import test from 'node:test';
import assert from 'node:assert/strict';
import { buildErrorReport, scrubText } from '../src/lib/errorMonitoring.js';

test('error reports carry no identifiers or query strings', () => {
  const report = buildErrorReport(new Error('Failed at /patients/123e4567-e89b-12d3-a456-426614174000/notes?tab=all'), { route: '/patients/123e4567-e89b-12d3-a456-426614174000', action: 'save' });
  assert.match(report.message, /:id/);
  assert.doesNotMatch(report.message, /123e4567-e89b-12d3-a456-426614174000/);
  assert.doesNotMatch(report.message, /\?tab=/);
  assert.equal(report.context.route, '/patients/:id');
  assert.equal(report.context.action, 'save');
});

test('only allowlisted context keys are kept', () => {
  const report = buildErrorReport(new Error('boom'), { route: '/x', patientName: 'Ram', diagnosis: 'sepsis', weight: 12, notes: 'free text' });
  assert.deepEqual(Object.keys(report.context), ['route']);
});

test('scrubber is defensive and bounded', () => {
  assert.equal(scrubText(null), '');
  assert.equal(scrubText(undefined), '');
  assert.equal(scrubText('a'.repeat(500)).length, 300);
  assert.match(scrubText('id 123e4567-e89b-12d3-a456-426614174000 end'), /id :id end/);
});
