import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

let analyticsPromise;

function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

export async function getClinicalAnalytics() {
  if (analyticsPromise) return analyticsPromise;
  const config = firebaseConfig();
  const configured = Object.values(config).every(Boolean);
  if (!configured || typeof window === 'undefined') return null;
  analyticsPromise = isSupported().then((supported) => {
    if (!supported) return null;
    return getAnalytics(initializeApp(config));
  }).catch(() => null);
  return analyticsPromise;
}

export async function trackEvent(name, params = {}) {
  const analytics = await getClinicalAnalytics();
  if (!analytics) return false;
  const safeParams = Object.fromEntries(Object.entries(params).filter(([key]) => !/patient|name|email|phone|diagnosis|address|id/i.test(key)));
  logEvent(analytics, name, safeParams);
  return true;
}

export function trackPageView(page) {
  return trackEvent('page_view', { page });
}
