const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_METADATA_KEYS = ['route', 'frequency', 'indication', 'reference', 'source', 'verification_stage'];

export function normalizeAuditPatientId(patientId) {
  return UUID_PATTERN.test(String(patientId || '')) ? patientId : null;
}

export function sanitizeAuditMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(metadata).filter(([key, value]) => typeof key === 'string' && value !== undefined && value !== null && SAFE_METADATA_KEYS.includes(key)));
}
