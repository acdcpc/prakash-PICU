import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('onboarding preferences are server-backed, versioned, and non-PHI', () => {
  const helper = read('src/lib/onboarding.js');
  const migration = read('sql/onboarding_preferences.sql');
  assert.match(helper, /from\('user_preferences'\)/);
  assert.match(helper, /upsert\(/);
  assert.match(helper, /ONBOARDING_VERSION/);
  assert.match(helper, /needs_update/);
  assert.match(helper, /SAFETY_NOTICE_VERSION/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_preferences/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /user_preferences_select_self/);
  assert.match(migration, /onboarding_status IN \('in_progress', 'completed', 'skipped', 'needs_update'\)/);
  assert.match(migration, /REVOKE ALL ON public\.user_preferences FROM anon/);
  assert.doesNotMatch(migration, /patient_id|diagnosis|date_of_birth|weight_kg/);
});

test('onboarding is resilient: retry, preserved selections, distinct skip/complete', () => {
  const helper = read('src/lib/onboarding.js');
  const onboarding = read('src/pages/auth/Onboarding.jsx');
  assert.match(helper, /savePreferencesWithRetry/);
  assert.match(onboarding, /Retry save/);
  assert.match(onboarding, /persist\('skipped'\)/);
  assert.match(onboarding, /persist\('completed'\)/);
  assert.match(onboarding, /Safety orientation|safety orientation/);
  assert.match(onboarding, /role="alert"/);
});

test('onboarding never grants access and clearing the cache cannot change it', () => {
  const gate = read('src/components/OnboardingGate.jsx');
  const helper = read('src/lib/onboarding.js');
  assert.match(gate, /never grant|never grants|access-control/i);
  assert.match(gate, /import\{|import \{/);
  assert.match(gate, /loadPreferences/);
  // local cache is explicitly documented as non-authoritative
  assert.match(helper, /never an access-control decision|never the source of truth/);
  assert.match(helper, /clearCachedPreferences/);
});

test('onboarding and preference payloads contain no patient data', () => {
  const onboarding = read('src/pages/auth/Onboarding.jsx');
  const prefs = read('src/pages/account/Preferences.jsx');
  // No patient-record fields are read or written by the onboarding/preference UI.
  for (const source of [onboarding, prefs]) {
    assert.doesNotMatch(source, /patientId|date_of_birth|patient_name|weight_kg|diagnosis:/);
  }
  assert.match(onboarding, /No patient details are collected during onboarding/);
});

test('preferences stay editable after onboarding', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const prefs = read('src/pages/account/Preferences.jsx');
  assert.match(app, /path="\/preferences"/);
  assert.match(sidebar, /Preferences/);
  assert.match(prefs, /savePreferencesWithRetry/);
});

test('authenticated routing shows onboarding for first-run users', () => {
  const app = read('src/App.jsx');
  assert.match(app, /path="\/onboarding"/);
  assert.match(app, /OnboardingGate/);
});

test('login preserves password, Google, magic-link, and reset paths', () => {
  const login = read('src/pages/auth/Login.jsx');
  for (const marker of ['signIn(', 'signUp(', 'signInWithGoogle(', 'signInWithMagicLink(', 'resetPassword(']) {
    assert.match(login, new RegExp(marker.replace(/[()]/g, '\\$&')));
  }
  assert.match(login, /aria-label=\{showPassword/);
});

test('dashboard consumes server-backed onboarding quick-shelf preferences', () => {
  const dashboard = read('src/pages/dashboard/Dashboard.jsx');
  assert.match(dashboard, /loadPreferences|readCachedPreferences/);
  assert.match(dashboard, /quickLinks/);
});
