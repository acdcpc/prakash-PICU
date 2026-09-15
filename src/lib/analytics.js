import { sanitizeAnalyticsPath, sanitizeAnalyticsParams } from './analyticsPrivacy';

// Firebase Analytics is loaded lazily so it never lands in the main bundle
// (it is only needed after the app has rendered and analytics is configured).
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
  analyticsPromise = (async () => {
    try {
      const [{ initializeApp }, analytics] = await Promise.all([import('firebase/app'), import('firebase/analytics')]);
      if (!(await analytics.isSupported())) return null;
      return { instance: analytics.getAnalytics(initializeApp(config)), logEvent: analytics.logEvent };
    } catch {
      return null;
    }
  })();
  return analyticsPromise;
}

export async function trackEvent(name, params = {}) {
  const analytics = await getClinicalAnalytics();
  if (!analytics) return false;
  analytics.logEvent(analytics.instance, name, sanitizeAnalyticsParams(params));
  return true;
}

export function trackPageView(page) {
  // Route paths can contain patient identifiers (e.g. /patients/<uuid>/notes).
  return trackEvent('page_view', { page: sanitizeAnalyticsPath(page) });
}
