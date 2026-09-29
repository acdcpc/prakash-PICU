import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedAuthOrigins, resolveAuthRedirect, sanitizeAuthError, shouldSignOutForIdle, normalizeOrigin, isLocalDevOrigin } from '../src/lib/session.js';

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

test('origin normalisation refuses non-http schemes and userinfo tricks', () => {
  assert.equal(normalizeOrigin('javascript:alert(1)'), '');
  assert.equal(normalizeOrigin('ftp://app.example.org'), '');
  assert.equal(normalizeOrigin('data:text/html,<script>'), '');
  assert.equal(normalizeOrigin('//evil.com'), '');
  assert.equal(normalizeOrigin(''), '');
  assert.equal(normalizeOrigin('https://app.example.org@evil.com'), 'https://evil.com');
  assert.equal(normalizeOrigin('https://app.example.org/'), 'https://app.example.org');
  assert.equal(normalizeOrigin('https://APP.example.org'), 'https://app.example.org');
  assert.equal(normalizeOrigin('https://app.example.org/path?x=1#f'), 'https://app.example.org');
});

test('a detected deployment origin outranks the running origin', () => {
  const detected = 'https://picu.netlify.app';
  assert.equal(resolveAuthRedirect({ configured: '', currentOrigin: 'https://evil.com', detectedOrigin: detected }), detected);
  assert.equal(allowedAuthOrigins('', 'https://evil.com', detected).join(), detected);
  // only a bare local build with nothing configured falls back to itself
  assert.deepEqual(allowedAuthOrigins('', 'http://localhost:3000', ''), ['http://localhost:3000']);
});

test('an unconfigured public origin no longer falls back to itself', () => {
  assert.deepEqual(allowedAuthOrigins('', 'https://picu.netlify.app', ''), []);
  assert.equal(resolveAuthRedirect({ configured: '', currentOrigin: 'https://picu.vercel.app' }), '');
});

test('loopback and private-network origins still work as development surfaces', () => {
  assert.deepEqual(allowedAuthOrigins('', 'http://192.168.1.50:3000', ''), ['http://192.168.1.50:3000']);
  assert.deepEqual(allowedAuthOrigins('', 'http://10.0.0.8:5173', ''), ['http://10.0.0.8:5173']);
  assert.deepEqual(allowedAuthOrigins('', 'https://ipad.local:3000', ''), ['https://ipad.local:3000']);
});

test('isLocalDevOrigin classifies hosts precisely', () => {
  assert.equal(isLocalDevOrigin('http://localhost:5173'), true);
  assert.equal(isLocalDevOrigin('http://127.0.0.1:3000'), true);
  assert.equal(isLocalDevOrigin('https://picu.vercel.app'), false);
  assert.equal(isLocalDevOrigin('https://app.example.org.np'), false);
  assert.equal(isLocalDevOrigin(''), false);
});
