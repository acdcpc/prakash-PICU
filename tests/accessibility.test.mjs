import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const css = read('src/index.css');
const appLayout = read('src/components/AppLayout.jsx');
const publicLayout = read('src/components/PublicLayout.jsx');
const notifications = read('src/components/Notifications.jsx');

test('every layout offers a skip link and main landmark', () => {
  assert.match(appLayout, /<SkipLink \/>/);
  assert.match(appLayout, /<main id="main-content" tabIndex=\{-1\}/);
  assert.match(publicLayout, /<SkipLink \/>/);
  assert.match(publicLayout, /<main id="main-content" tabIndex=\{-1\}>/);
  assert.match(css, /\.skip-link:focus/);
});

test('each route sets a unique document title and a single top-level heading', () => {
  assert.match(appLayout, /document\.title = `\$\{title\} · Prakash Pediatrics`/);
  assert.match(appLayout, /<h1 className="topbar-title">\{title\}<\/h1>/);
});

test('focus is always visible for keyboard users', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline: 3px solid var\(--coral\)/);
});

test('feedback is announced to assistive technology, never alert()', () => {
  let jsx = '';
  try { jsx = execFileSync('grep', ['-rl', 'alert(', 'src', '--include=*.jsx'], { encoding: 'utf8' }).trim(); } catch { jsx = ''; }
  assert.equal(jsx, '', 'alert() must not be used for feedback');
  assert.match(notifications, /role=\{item\.tone === 'danger' \? 'alert' : 'status'\}/);
  assert.match(notifications, /aria-live="polite"/);
  assert.match(notifications, /aria-label="Dismiss message"/);
});

test('reduced-motion and form error semantics are handled', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.field-error/);
  assert.match(css, /\[aria-invalid="true"\]/);
  const form = read('src/pages/patients/PatientForm.jsx');
  const summary = read('src/components/ErrorSummary.jsx');
  assert.match(summary, /role="alert"/);
  assert.match(summary, /error-summary/);
  assert.match(form, /<ErrorSummary/);
  assert.match(form, /aria-invalid/);
  assert.match(form, /aria-describedby/);
  assert.match(form, /summaryRef\.current\?\.focus\(\)/);
});
