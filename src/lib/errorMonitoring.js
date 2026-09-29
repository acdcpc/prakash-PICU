// Error monitoring with PHI exclusion.
//
// The policy is: never send patient identifiers, clinical free text, or URLs
// containing identifiers to an error-monitoring service. Reports carry only an
// error name/message, an allowlisted context, and a timestamp. Nothing is sent
// unless VITE_ERROR_MONITORING_DSN is configured; in development it is logged.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ALLOWED_CONTEXT = ['route', 'action', 'component', 'code'];

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

export function captureError(error, context = {}) {
  const report = buildErrorReport(error, context);
  const dsn = import.meta.env?.VITE_ERROR_MONITORING_DSN;
  if (!dsn) {
    if (import.meta.env?.DEV) console.warn('[error-monitoring] unconfigured', report);
    return report;
  }
  try {
    const body = JSON.stringify(report);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) navigator.sendBeacon(dsn, body);
    else fetch(dsn, { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch {
    /* monitoring must never break the clinical workflow */
  }
  return report;
}
