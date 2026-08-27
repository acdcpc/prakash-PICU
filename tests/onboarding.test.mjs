import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('onboarding preferences are local, user-scoped, and non-PHI', () => {
  const helper = read('src/lib/onboarding.js');
  const onboarding = read('src/pages/auth/Onboarding.jsx');
  assert.match(helper, /prakash-pediatrics-onboarding-v1/);
  assert.match(helper, /onboardingStorageKey\(userId\)/);
  assert.match(onboarding, /saveOnboardingState\(user\.id/);
  assert.match(onboarding, /No patient details are collected during onboarding/);
  assert.doesNotMatch(onboarding, /patientId|diagnosis|date_of_birth/);
});

test('authenticated routing gates first-run users through onboarding', () => {
  const app = read('src/App.jsx');
  assert.match(app, /path="\/onboarding"/);
  assert.match(app, /hasCompletedOnboarding\(user\?\.id\)/);
  assert.match(app, /Navigate to="\/onboarding"/);
});

test('login preserves password, Google, magic-link, and reset paths', () => {
  const login = read('src/pages/auth/Login.jsx');
  for (const marker of ['signIn(', 'signUp(', 'signInWithGoogle(', 'signInWithMagicLink(', 'resetPassword(']) {
    assert.match(login, new RegExp(marker.replace(/[()]/g, '\\$&')));
  }
  assert.match(login, /aria-label=\{showPassword/);
  assert.match(login, /role="tablist"/);
});

test('dashboard consumes onboarding quick-shelf preferences', () => {
  const dashboard = read('src/pages/dashboard/Dashboard.jsx');
  assert.match(dashboard, /readOnboardingState\(user\?\.id\)/);
  assert.match(dashboard, /quickLinks/);
});
