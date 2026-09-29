// Error monitoring with PHI exclusion.
//
// Policy: never send patient identifiers, clinical free text, or URLs carrying
// identifiers to a monitoring service. A report carries an error name/message,
// an allowlisted context, and a timestamp — nothing else. There is no user,
// request, breadcrumb, or session data, and no stack trace, by construction.
//
// Nothing leaves the browser until a destination is configured:
//   VITE_ERROR_MONITORING_DSN       a Sentry-compatible DSN, or
//   VITE_ERROR_MONITORING_ENDPOINT  any HTTPS endpoint accepting the JSON report.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ALLOWED_CONTEXT = ['route', 'action', 'component', 'code'];
const SENTRY_CLIENT = 'prakash-picu/1.0';

export function scrubText(value, maxLength = 300) {
  if (value === null || value === undefined) return '';
  return String(value)
    .split(/[?#]/)[0]
    .replace(UUID_RE, ':id')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// Build the only shape that is ever allowed to leave the app.
export function buildErrorReport(error, context = {}) {
  const safeContext = {};
  for (const key of ALLOWED_CONTEXT) {
    if (context[key] !== undefined && context[key] !== null) safeContext[key] = scrubText(context[key]);
  }
  return {
    name: scrubText(error?.name || 'Error', 80),
    message: scrubText(error?.message || error || 'Unknown error'),
    context: safeContext,
    at: new Date().toISOString(),
  };
}

// A Sentry DSN looks like https://<publicKey>@<host>/<projectId>.
// The key is public by design: it can only submit events, never read them.
export function parseDsn(dsn) {
  const match = /^https:\/\/([0-9a-f]{16,})@([^/\s]+)\/(\d+)\/?$/i.exec(String(dsn || '').trim());
  if (!match) return null;
  const [, publicKey, host, projectId] = match;
  return { publicKey, host, projectId, endpoint: `https://${host}/api/${projectId}/store/` };
}

// Sentry "store" payload. Deliberately omits user, request, breadcrumbs, extra
// and exception stacks so no clinical context can travel with an error.
export function sentryEvent(report, { environment = 'production', release } = {}) {
  const event = {
    event_id: randomEventId(),
    timestamp: report.at,
    platform: 'javascript',
    level: 'error',
    logger: 'prakash-picu',
    message: { formatted: `${report.name}: ${report.message}` },
    tags: { ...report.context },
    environment,
  };
  if (release) event.release = release;
  return event;
}

function randomEventId() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function captureError(error, context = {}) {
  const report = buildErrorReport(error, context);
  const dsn = import.meta.env?.VITE_ERROR_MONITORING_DSN;
  const endpoint = import.meta.env?.VITE_ERROR_MONITORING_ENDPOINT;

  try {
    if (dsn) {
      const parsed = parseDsn(dsn);
      if (parsed) {
        const payload = sentryEvent(report, {
          environment: import.meta.env?.MODE || 'production',
          release: import.meta.env?.VITE_APP_VERSION,
        });
        // X-Sentry-Auth must be a header, so a beacon cannot be used here.
        if (typeof fetch === 'function') {
          fetch(parsed.endpoint, {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=${SENTRY_CLIENT}, sentry_key=${parsed.publicKey}`,
            },
            body: JSON.stringify(payload),
          }).catch(() => {});
        }
      }
    } else if (endpoint) {
      const body = JSON.stringify(report);
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) navigator.sendBeacon(endpoint, body);
      else if (typeof fetch === 'function') fetch(endpoint, { method: 'POST', keepalive: true, body }).catch(() => {});
    } else if (import.meta.env?.DEV) {
      console.warn('[error-monitoring] unconfigured', report);
    }
  } catch {
    /* monitoring must never break the clinical workflow */
  }
  return report;
}
