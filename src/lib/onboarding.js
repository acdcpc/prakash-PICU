import supabase from './supabase';

// Bump to trigger a targeted re-entry / re-orientation for existing users.
export const ONBOARDING_VERSION = 1;
// Bump when the first-use safety orientation text changes materially.
export const SAFETY_NOTICE_VERSION = 1;

// Local cache is an optimisation only. It is never an access-control decision
// and never the source of truth — the Supabase row is authoritative.
export const ONBOARDING_STORAGE_PREFIX = 'prakash-pediatrics-onboarding-v1';

export const DEFAULT_PREFERENCES = {
  careFocus: 'general',
  quickTools: ['dose', 'scores', 'growth'],
  locale: 'en',
  onboardingStatus: 'in_progress',
  onboardingVersion: 0,
  safetyAckVersion: 0,
};

export function onboardingStorageKey(userId) {
  return `${ONBOARDING_STORAGE_PREFIX}:${userId}`;
}

function safeStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readCachedPreferences(userId) {
  if (!userId) return null;
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(onboardingStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCachedPreferences(userId, preferences) {
  if (!userId) return;
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(onboardingStorageKey(userId), JSON.stringify(preferences));
  } catch {
    /* cache is best-effort */
  }
}

export function clearCachedPreferences(userId) {
  if (!userId) return;
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(onboardingStorageKey(userId));
  } catch {
    /* ignore */
  }
}

// Map a Supabase row into the client shape, applying the version rule so that a
// stale completed record becomes needs_update instead of silently passing.
export function normalizePreferences(row) {
  if (!row) return { ...DEFAULT_PREFERENCES };
  const version = Number(row.onboarding_version ?? 0);
  let status = row.onboarding_status || 'in_progress';
  if (status === 'completed' && version < ONBOARDING_VERSION) status = 'needs_update';
  return {
    careFocus: row.care_focus || 'general',
    quickTools: Array.isArray(row.quick_tools) && row.quick_tools.length ? row.quick_tools : DEFAULT_PREFERENCES.quickTools,
    locale: row.locale || 'en',
    onboardingStatus: status,
    onboardingVersion: version,
    safetyAckVersion: Number(row.safety_ack_version ?? 0),
  };
}

export function isOnboardingSatisfied(preferences) {
  return Boolean(preferences)
    && preferences.onboardingStatus === 'completed'
    && preferences.onboardingVersion >= ONBOARDING_VERSION;
}

// Onboarding is a preference/UX flow, never an access gate. A clinician who has
// completed OR deliberately skipped is not forced back into the flow; only a
// fresh or outdated record prompts it. Access itself stays session + RLS based.
export function needsOnboarding(preferences) {
  const status = preferences?.onboardingStatus || 'in_progress';
  if (status === 'in_progress') return true;
  if (status === 'needs_update') return true;
  if (status === 'completed') return preferences.onboardingVersion < ONBOARDING_VERSION;
  return false;
}

// Fast local hint used only for the first paint / immediate redirect decision.
export function hasCompletedOnboarding(userId) {
  return isOnboardingSatisfied(readCachedPreferences(userId));
}

// Authoritative read from Supabase. Falls back to the local cache on failure so
// a clinician keeps their non-sensitive selections, but reports the error.
export async function loadPreferences(userId) {
  if (!userId) return { preferences: { ...DEFAULT_PREFERENCES }, error: null, source: 'none' };
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    return { preferences: readCachedPreferences(userId) || { ...DEFAULT_PREFERENCES }, error, source: 'cache' };
  }
  const preferences = normalizePreferences(data);
  writeCachedPreferences(userId, preferences);
  return { preferences, error: null, source: data ? 'server' : 'default' };
}

export function toPreferencesPayload(userId, patch) {
  return {
    user_id: userId,
    care_focus: patch.careFocus ?? DEFAULT_PREFERENCES.careFocus,
    quick_tools: patch.quickTools ?? DEFAULT_PREFERENCES.quickTools,
    locale: patch.locale ?? DEFAULT_PREFERENCES.locale,
    onboarding_status: patch.onboardingStatus ?? 'in_progress',
    onboarding_version: patch.onboardingVersion ?? ONBOARDING_VERSION,
    safety_ack_version: patch.safetyAckVersion ?? SAFETY_NOTICE_VERSION,
  };
}

// Idempotent upsert keyed on user_id, so duplicate submissions are safe.
export async function savePreferences(userId, patch) {
  if (!userId) return { preferences: null, error: new Error('Not signed in.') };
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(toPreferencesPayload(userId, patch), { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) return { preferences: null, error };
  const preferences = normalizePreferences(data);
  writeCachedPreferences(userId, preferences);
  return { preferences, error: null };
}

// Retry with backoff for slow/flaky networks. Never throws; returns the last
// error so the UI can offer a retry action while preserving selections.
export async function savePreferencesWithRetry(userId, patch, { attempts = 3, delayMs = 500 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await savePreferences(userId, patch);
    if (!result.error) return result;
    lastError = result.error;
    if (attempt < attempts) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return { preferences: null, error: lastError };
}
