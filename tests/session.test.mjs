import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedAuthOrigins, resolveAuthRedirect, sanitizeAuthError, shouldSignOutForIdle, normalizeOrigin } from '../src/lib/session.js';

test('auth redirects are limited to allowlisted origins', () => {
  const allowed = allowedAuthOrigins('https://app.example.org,https://staging.example.org', 'https://app.example.org');
  assert.deepEqual(allowed.sort(), ['https://app.example.org', 'https://staging.example.org']);
  assert.equal(resolveAuthRedirect({ configured: 'https://app.example.org', currentOrigin: 'https://evil.example.net', fallback: 'https://evil.example.net' }), 'https://app.example.org');
  assert.equal(resolveAuthRedirect({ configured: 'https://app.example.org', currentOrigin: 'https://app.example.org' }), 'https://app.example.org');
  assert.equal(resolveAuthRedirect({ configured: '', currentOrigin: '' }), '');
  assert.equal(normalizeOrigin('not a url'), '');
});

test('auth errors never leak tokens or raw links', () => {
  assert.equal(sanitizeAuthError('Access denied'), 'Access denied');
  assert.match(sanitizeAuthError('Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc'), /Sign-in could not be completed/);
  assert.match(sanitizeAuthError('failed redirect to https://x.supabase.co/auth?access_token=abc'), /Sign-in could not be completed/);
  assert.equal(sanitizeAuthError(null), 'Sign-in could not be completed. Please try again.');
});

test('idle sessions are detected after the timeout only', () => {
  const now = 1_000_000;
  assert.equal(shouldSignOutForIdle({ lastActivityAt: now - 1000, now, timeoutMs: 60_000 }), false);
  assert.equal(shouldSignOutForIdle({ lastActivityAt: now - 60_001, now, timeoutMs: 60_000 }), true);
  assert.equal(shouldSignOutForIdle({ lastActivityAt: NaN, now }), false);
});
