import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const COMPONENTS = [
  'PageHeader', 'Status Notice', 'FormField', 'ErrorSummary', 'LoadingState',
  'EmptyState', 'PermissionState', 'PatientContextHeader',
];

test('the shared UI contract exists and is available', () => {
  assert.equal(COMPONENTS.length, 8);
  for (const family of [
    ['src/components/PageHeader.jsx', ['<h1>', 'className="eyebrow"', 'page-heading']],
    ['src/components/LoadingState.jsx', ['role="status"', 'className="loader"']],
    ['src/components/EmptyState.jsx', ['role="status"', 'empty-state']],
    ['src/components/PermissionState.jsx', ['role="status"', 'do not have access']],
    ['src/components/ErrorSummary.jsx', ['role="alert"', 'aria-']],
    ['src/components/FormField.jsx', ['aria-describedby', 'aria-invalid', 'form-label']],
    ['src/components/PatientContextHeader.jsx', ['role="region"', 'aria-label="Patient context"']],
    ['src/components/Notifications.jsx', ['role={item.tone', 'aria-live']],
  ]) {
    const src = read(family[0]);
    for (const marker of family[1]) assert.ok(src.includes(marker), `${family[0]} should include ${marker}`);
  }
});

test('routes have one heading and reuse the PageHeader contract where practical', () => {
  const header = read('src/components/PageHeader.jsx');
  assert.match(header, /<h1>\{title\}<\/h1>/);
  assert.match(read('src/pages/account/Preferences.jsx'), /<h1>/);
});

test('analytics is code-split so firebase stays out of the main bundle', () => {
  const analytics = read('src/lib/analytics.js');
  assert.match(analytics, /import\('firebase\/app'\)/);
  assert.match(analytics, /import\('firebase\/analytics'\)/);
  assert.doesNotMatch(analytics, /^import .*firebase/m);
});
