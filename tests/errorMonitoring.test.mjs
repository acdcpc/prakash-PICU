import test from 'node:test';
import assert from 'node:assert/strict';
import { buildErrorReport, parseDsn, scrubText, sentryEvent } from '../src/lib/errorMonitoring.js';

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

test('a Sentry DSN is parsed into its store endpoint', () => {
  const parsed = parseDsn('https://abc123def456abc123def456abc12345@o4505.ingest.sentry.io/4510');
  assert.equal(parsed.host, 'o4505.ingest.sentry.io');
  assert.equal(parsed.projectId, '4510');
  assert.equal(parsed.endpoint, 'https://o4505.ingest.sentry.io/api/4510/store/');
  assert.equal(parseDsn('not-a-dsn'), null);
  assert.equal(parseDsn(''), null);
  assert.equal(parseDsn(undefined), null);
});

test('the Sentry payload carries no user, request, breadcrumbs or stack', () => {
  const report = buildErrorReport(new Error('boom at /patients/123e4567-e89b-12d3-a456-426614174000'), { route: '/patients/123e4567-e89b-12d3-a456-426614174000', action: 'save', patientName: 'Ram' });
  const event = sentryEvent(report, { environment: 'production', release: '1.2.3' });
  const keys = Object.keys(event).sort();
  assert.deepEqual(keys, ['environment', 'event_id', 'level', 'logger', 'message', 'platform', 'release', 'tags', 'timestamp']);
  assert.equal(event.user, undefined);
  assert.equal(event.request, undefined);
  assert.equal(event.breadcrumbs, undefined);
  assert.equal(event.exception, undefined);
  assert.equal(event.tags.route, '/patients/:id');
  assert.equal(event.tags.patientName, undefined);
  assert.match(event.event_id, /^[0-9a-f]{32}$/);
});
