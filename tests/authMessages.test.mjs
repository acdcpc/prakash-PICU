import test from 'node:test';
import assert from 'node:assert/strict';
import { friendlyAuthMessage, isDuplicateEmailError } from '../src/lib/authMessages.js';

test('duplicate-email sign-up maps to a switch-to-sign-in message', () => {
  const msg = friendlyAuthMessage({ message: 'User already registered' });
  assert.match(msg, /already has an account/i);
  assert.equal(isDuplicateEmailError({ message: 'User already registered' }), true);
});

test('unconfirmed email gets a concrete next step', () => {
  assert.match(friendlyAuthMessage({ message: 'Email not confirmed' }), /not confirmed yet/i);
});

test('invalid credentials maps to a helpful retry message', () => {
  assert.match(friendlyAuthMessage({ message: 'Invalid login credentials' }), /incorrect/i);
});

test('disabled provider (Google button) maps to email/password guidance', () => {
  assert.match(friendlyAuthMessage({ message: 'Unsupported provider: provider is not enabled' }), /not enabled for this workspace/i);
});

test('rate limits map to a wait message', () => {
  assert.match(friendlyAuthMessage({ message: 'For security purposes, you can only request this after 50 seconds' }), /wait about a minute/i);
});

test('network failures map to a connection message', () => {
  assert.match(friendlyAuthMessage({ message: 'TypeError: Failed to fetch' }), /internet connection/i);
});

test('unknown errors fall through the scrubber and leak nothing', () => {
  const msg = friendlyAuthMessage({ message: 'boom at https://secret.example.org?x=1 eyJhbGciOiJI.abc.def' });
  assert.equal(msg.includes('http'), false);
  assert.equal(msg.includes('eyJ'), false);
});

test('empty error yields the fallback', () => {
  assert.equal(friendlyAuthMessage('', 'fallback message'), 'fallback message');
});
