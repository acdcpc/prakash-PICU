// Session and auth hardening helpers.
//
// These are dependency-free and pure so they can be unit-tested. The React
// wiring lives in AuthContext.

export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_TICK_MS = 30 * 1000;

// Only http(s) origins are ever acceptable as an auth redirect target: other
// schemes (javascript:, data:, ftp:, custom app schemes) must never come back
// out of an allowlist comparison.
const ALLOWED_ORIGIN_PROTOCOLS = ['http:', 'https:'];

export function normalizeOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    if (!ALLOWED_ORIGIN_PROTOCOLS.includes(url.protocol)) return '';
    if (!url.host) return '';
    // url.host is the real host: the userinfo trick (https://good@evil.com)
    // resolves to evil.com rather than being mistaken for the trusted name.
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

// Origins allowed to receive an auth redirect. Configure
// VITE_ALLOWED_AUTH_ORIGINS (comma separated) for production; the origin the app
// is actually running on is always allowed so previews keep working.
// The origin this build was produced for, injected by vite.config.js from the
// hosting platform's build environment. Undefined outside a configured build.
const BUILD_SITE_ORIGIN = typeof __BUILD_SITE_ORIGIN__ !== 'undefined' ? __BUILD_SITE_ORIGIN__ : '';

export function allowedAuthOrigins(configured, currentOrigin, detectedOrigin = BUILD_SITE_ORIGIN) {
  const list = String(configured || '')
    .split(',')
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean);
  // An explicit allowlist is authoritative, so a copy of the app served on
  // another origin cannot use its own origin as a redirect target.
  if (list.length) return [...new Set(list)];
  // Otherwise a build that knows the deployment it was made for locks redirects
  // to that domain, which is the production case.
  const detected = normalizeOrigin(detectedOrigin);
  if (detected) return [detected];
  // Only a build with no allowlist and no detected origin falls back to the
  // origin it is running on, and only when that origin is a local development
  // surface. A publicly routable origin with no configuration must stay
  // fail-closed: set VITE_SITE_ORIGIN or VITE_ALLOWED_AUTH_ORIGINS instead.
  const current = normalizeOrigin(currentOrigin);
  return isLocalDevOrigin(current) ? [current] : [];
}

// Loopback and private-network addresses are development surfaces, so a build
// served from one of them may trust its own origin. Publicly routable hosts
// never qualify: they must be declared through configuration or detection.
export function isLocalDevOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  let hostname;
  try {
    hostname = new URL(normalized).hostname;
  } catch {
    return false;
  }
  if (hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.local')) return true;
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hostname);
  if (ipv4) {
    const [first, second] = [Number(ipv4[1]), Number(ipv4[2])];
    if (first === 127) return true;
    if (first === 10) return true;
    if (first === 192 && second === 168) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 169 && second === 254) return true;
  }
  return false;
}

// Returns an allowlisted origin to send the user back to, or '' when nothing is
// trustworthy (the caller should then refuse the redirect rather than guess).
export function resolveAuthRedirect({ configured, currentOrigin, fallback, detectedOrigin } = {}) {
  const allowed = allowedAuthOrigins(configured, currentOrigin, detectedOrigin);
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
