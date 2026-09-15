import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAnalyticsPath, sanitizeAnalyticsParams } from '../src/lib/analyticsPrivacy.js';

test('analytics paths never carry patient identifiers', () => {
  assert.equal(sanitizeAnalyticsPath('/patients/123e4567-e89b-12d3-a456-426614174000/notes'), '/patients/:id/notes');
  assert.equal(sanitizeAnalyticsPath('/patients/123e4567-e89b-12d3-a456-426614174000?tab=vitals'), '/patients/:id');
  assert.equal(sanitizeAnalyticsPath('/export/1234567890'), '/export/:n');
  assert.equal(sanitizeAnalyticsPath('/dashboard'), '/dashboard');
  assert.equal(sanitizeAnalyticsPath(undefined), '');
});

test('analytics params drop PHI keys and identifier-shaped values', () => {
  const safe = sanitizeAnalyticsParams({ page: '/patients', patientId: 'x', patientName: 'Ram', diagnosis: 'sepsis', weight: 12, route: 'IV', ref: '123e4567-e89b-12d3-a456-426614174000' });
  assert.deepEqual(safe, { page: '/patients', route: 'IV', ref: ':id' });
});

test('analytics params keep only primitive, non-PHI values', () => {
  const safe = sanitizeAnalyticsParams({ count: 3, ok: true, nested: { a: 1 }, page: '/x' });
  assert.deepEqual(safe, { count: 3, ok: true, page: '/x' });
});
