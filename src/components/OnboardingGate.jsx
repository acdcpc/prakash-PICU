import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadPreferences, hasCompletedOnboarding, needsOnboarding, ONBOARDING_VERSION } from '../lib/onboarding';

// Onboarding is a preference flow, never an access-control decision. Access is
// governed by the authenticated session + Supabase RLS. This gate only decides
// whether to show the first-run flow; it never grants or removes data access.
export default function OnboardingGate({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(() => (hasCompletedOnboarding(user?.id) ? 'ok' : 'checking'));

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;
    loadPreferences(user.id).then(({ preferences, error }) => {
      if (!active) return;
      if (error) {
        // Never block the workspace on a preferences read failure.
        setState('ok');
        return;
      }
      const status = preferences?.onboardingStatus;
      const satisfied = status === 'completed' && preferences.onboardingVersion >= ONBOARDING_VERSION;
      const skipped = status === 'skipped';
      setState(satisfied || skipped || !needsOnboarding(preferences) ? 'ok' : 'needs');
    });
    return () => { active = false; };
  }, [user?.id]);

  if (state === 'checking') return <div className="loader"><div className="spinner" /> Checking your workspace…</div>;
  if (state === 'needs') return <Navigate to="/onboarding" replace />;
  return children;
}
