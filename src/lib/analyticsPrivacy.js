// Privacy filters for analytics payloads.
//
// Analytics must never receive patient identifiers or clinical free text. These
// helpers are deliberately dependency-free (no firebase import) so they can be
// unit-tested and reused anywhere a payload leaves the app.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const PHI_KEY_RE = /patient|name|email|phone|diagnosis|address|note|weight|dob|birth|\bid\b/i;
const LONG_NUMBER_RE = /\/\d{6,}/g;

// Strip query strings, replace identifier-shaped segments, and cap the length.
export function sanitizeAnalyticsPath(path) {
  if (typeof path !== 'string') return '';
  return path
    .split(/[?#]/)[0]
    .replace(UUID_RE, ':id')
    .replace(LONG_NUMBER_RE, '/:n')
    .slice(0, 120);
}

export function sanitizeAnalyticsParams(params = {}) {
  if (!params || typeof params !== 'object') return {};
  return Object.fromEntries(Object.entries(params)
    .filter(([key, value]) => typeof key === 'string' && !PHI_KEY_RE.test(key))
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value !== 'string') return [key, typeof value === 'number' || typeof value === 'boolean' ? value : null];
      const cleaned = value.replace(UUID_RE, ':id').slice(0, 80);
      return [key, cleaned];
    })
    .filter(([, value]) => value !== null));
}
