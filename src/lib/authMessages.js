import { sanitizeAuthError } from './session.js';

// Supabase returns terse provider errors. For the known cases below this module
// maps them to short, actionable UI messages; everything else falls through to
// the PHI scrubber in sanitizeAuthError.
//
// Ported from the alisha kit's auth playbook:
// - duplicate-email sign-up is not a bug: explain it and route to Sign in
// - check the confirmation flow before promising it (mailer_autoconfirm)
// - never echo raw provider payloads into the UI
const KNOWN = [
  { test: /already registered|already exists|user already|already been registered/i, message: 'This email already has an account. Use Sign in — or “Forgot password?” if you cannot remember the password.' },
  { test: /email not confirmed|not confirmed/i, message: 'This email is not confirmed yet. Check your inbox for the confirmation link; if it never arrived, ask the workspace owner to confirm your account.' },
  { test: /invalid login credentials|invalid_grant/i, message: 'Email or password is incorrect. Check for typos, or use “Forgot password?”.' },
  { test: /provider is not enabled|unsupported provider/i, message: 'That sign-in provider is not enabled for this workspace yet — use email and password instead.' },
  { test: /for security purposes|rate limit|too many requests|only request this/i, message: 'Too many attempts just now. Wait about a minute, then try again.' },
  { test: /password should be|weak password|password.*at least/i, message: 'Choose a password with at least 6 characters.' },
  { test: /failed to fetch|networkerror|network request failed|load failed/i, message: 'Could not reach the server. Check your internet connection and try again.' },
];

export function friendlyAuthMessage(error, fallback = 'Sign-in could not be completed. Please try again.') {
  const raw = (typeof error === 'string' ? error : error?.message) || '';
  for (const rule of KNOWN) {
    if (rule.test.test(raw)) return rule.message;
  }
  return sanitizeAuthError(error, fallback);
}

export function isDuplicateEmailError(error) {
  const raw = (typeof error === 'string' ? error : error?.message) || '';
  return /already registered|already exists|user already|already been registered/i.test(raw);
}
