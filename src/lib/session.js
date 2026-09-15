// Session and auth hardening helpers.
//
// These are dependency-free and pure so they can be unit-tested. The React
// wiring lives in AuthContext.

export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_TICK_MS = 30 * 1000;

export function normalizeOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

// Origins allowed to receive an auth redirect. Configure
// VITE_ALLOWED_AUTH_ORIGINS (comma separated) for production; the origin the app
// is actually running on is always allowed so previews keep working.
export function allowedAuthOrigins(configured, currentOrigin) {
  const list = String(configured || '')
    .split(',')
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean);
  // When an allowlist is configured it is authoritative, so a copy of the app
  // served on another origin cannot use its own origin as a redirect target.
  // Only an unconfigured (local/preview) environment falls back to the origin
  // the app is actually running on.
  if (list.length) return [...new Set(list)];
  const current = normalizeOrigin(currentOrigin);
  return current ? [current] : [];
}

// Returns an allowlisted origin to send the user back to, or '' when nothing is
// trustworthy (the caller should then refuse the redirect rather than guess).
export function resolveAuthRedirect({ configured, currentOrigin, fallback } = {}) {
  const allowed = allowedAuthOrigins(configured, currentOrigin);
  if (!allowed.length) return '';
  const candidate = normalizeOrigin(currentOrigin) || normalizeOrigin(fallback);
  return allowed.includes(candidate) ? candidate : allowed[0];
}

// Auth errors must never echo tokens, raw URLs, or payloads into the UI or logs.
export function sanitizeAuthError(error, fallback = 'Sign-in could not be completed. Please try again.') {
  const raw = typeof error === 'string' ? error : error?.message;
  if (!raw) return fallback;
  const text = String(raw);
  if (/access_token|refresh_token|eyJ[A-Za-z0-9_-]|bearer\s|apikey|service_role/i.test(text)) return fallback;
  const cleaned = text.replace(/https?:\/\/\S+/g, '[link]').replace(/\s+/g, ' ').trim().slice(0, 160);
  return cleaned || fallback;
}

export function shouldSignOutForIdle({ lastActivityAt, now = Date.now(), timeoutMs = SESSION_IDLE_TIMEOUT_MS }) {
  if (!Number.isFinite(lastActivityAt)) return false;
  return now - lastActivityAt >= timeoutMs;
}

// Attach passive activity listeners and invoke onIdle once the clinician has
// been inactive for longer than the timeout. Returns a cleanup function.
export function watchIdle({
  onIdle,
  timeoutMs = SESSION_IDLE_TIMEOUT_MS,
  tickMs = IDLE_TICK_MS,
  target = typeof window !== 'undefined' ? window : null,
  events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'],
} = {}) {
  if (!target || typeof onIdle !== 'function') return () => {};
  let lastActivityAt = Date.now();
  let fired = false;
  const bump = () => { lastActivityAt = Date.now(); };
  const tick = () => {
    if (fired) return;
    if (shouldSignOutForIdle({ lastActivityAt, timeoutMs })) { fired = true; cleanup(); onIdle(); }
  };
  const cleanup = () => {
    events.forEach((event) => target.removeEventListener(event, bump));
    if (timer) clearInterval(timer);
  };
  events.forEach((event) => target.addEventListener(event, bump, { passive: true }));
  const timer = setInterval(tick, tickMs);
  return cleanup;
}
