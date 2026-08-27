export const ONBOARDING_STORAGE_PREFIX = 'prakash-pediatrics-onboarding-v1';

export function onboardingStorageKey(userId) {
  return `${ONBOARDING_STORAGE_PREFIX}:${userId}`;
}

export function readOnboardingState(userId) {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(onboardingStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasCompletedOnboarding(userId) {
  return Boolean(readOnboardingState(userId)?.completedAt);
}

export function saveOnboardingState(userId, state) {
  if (!userId || typeof window === 'undefined') return;
  window.localStorage.setItem(onboardingStorageKey(userId), JSON.stringify({ ...state, completedAt: new Date().toISOString() }));
}
