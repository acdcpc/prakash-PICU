// Patient-image storage path rules.
//
// Every object in the private `patient-images` bucket MUST live at
//   patients/<patient-uuid>/<timestamp>_<safe-file-name>
// The database storage policies derive the patient id from the second path
// segment, so the client must produce — and must refuse to sign — anything that
// does not match this shape. Nothing here is a substitute for server-side RLS:
// these helpers keep malformed/traversal/cross-patient paths out of the client.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;

export function isPatientId(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

// Trim a user-supplied file name down to a safe, single-segment leaf name.
export function sanitizeFileName(name) {
  const leaf = String(name ?? '').split(/[/\\]/).pop() || '';
  const cleaned = leaf
    .replace(CONTROL_RE, '')
    .replace(/\.{2,}/g, '.')       // collapse traversal-ish dots
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^[.\-]+/, '')        // no leading dot/dash
    .slice(0, 80);
  return cleaned || 'image.jpg';
}

export function buildPatientImagePath(patientId, fileName, timestamp = Date.now()) {
  if (!isPatientId(patientId)) throw new Error('A valid patient id is required for an image path.');
  return `patients/${patientId}/${timestamp}_${sanitizeFileName(fileName)}`;
}

// Returns { patientId, fileName } for a well-formed path, otherwise null.
export function parsePatientImagePath(path) {
  if (typeof path !== 'string' || !path) return null;
  if (path.startsWith('/') || path.includes('\\')) return null;
  if (path.split('/').some((segment) => segment === '..' || segment === '.')) return null;
  if (path.includes('..')) return null;
  const parts = path.split('/');
  if (parts.length !== 3) return null;
  if (parts[0] !== 'patients') return null;
  if (!isPatientId(parts[1])) return null;
  if (!parts[2]) return null;
  return { patientId: parts[1], fileName: parts[2] };
}

// True only when the stored path belongs to the patient the clinician is viewing.
export function isPathForPatient(path, patientId) {
  const parsed = parsePatientImagePath(path);
  return Boolean(parsed && parsed.patientId === patientId);
}
