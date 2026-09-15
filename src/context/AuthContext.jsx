import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { resolveAuthRedirect, sanitizeAuthError, watchIdle, SESSION_IDLE_TIMEOUT_MS } from '../lib/session';
import { clearCachedPreferences } from '../lib/onboarding';

const DEEP_LINK = 'com.ourpicu.app://auth/callback';

// Auth redirects are restricted to an allowlist (VITE_ALLOWED_AUTH_ORIGINS).
// When unset (local/preview) the app falls back to its own origin.
const WEB_REDIRECT = resolveAuthRedirect({
  configured: import.meta.env.VITE_ALLOWED_AUTH_ORIGINS,
  currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
});
const IDLE_MINUTES = Math.round(SESSION_IDLE_TIMEOUT_MS / 60000);

const AuthContext = createContext(null);

// Extract OAuth tokens / errors from either the query string or the hash fragment.
function extractAuthParams(url) {
  const params = new URLSearchParams();
  const add = (s) => {
    if (!s) return;
    const clean = s.replace(/^[?#]/, '');
    new URLSearchParams(clean).forEach((v, k) => params.set(k, v));
  };
  const q = url.indexOf('?');
  const h = url.indexOf('#');
  if (q !== -1) add(url.slice(q + 1, h === -1 ? url.length : h));
  if (h !== -1) add(url.slice(h + 1));
  return params;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
    return data;
  }, []);

  // Session bootstrap
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Deep link handler (native only) — picks up OAuth/magic-link redirects.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = async (url) => {
      if (!url || !url.startsWith(DEEP_LINK)) return;

      const params = extractAuthParams(url);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const error = params.get('error');
      const error_description = params.get('error_description');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token }).catch(() => {});
        setAuthError('');
      } else if (error || error_description) {
        setAuthError(sanitizeAuthError(error_description || error, 'Sign-in was cancelled or denied.'));
      }
      await Browser.close().catch(() => {});
    };

    // Cold start: app was opened directly by the deep link (listener not yet mounted).
    App.getLaunchUrl().then(({ url }) => handleUrl(url)).catch(() => {});
    // Warm start / while running.
    const sub = App.addListener('appUrlOpen', ({ url }) => handleUrl(url));

    return () => { sub.then((h) => h && h.remove()).catch(() => {}); };
  }, []);

  const isAdmin = profile?.role === 'admin';

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative ? DEEP_LINK : WEB_REDIRECT,
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    if (data?.url) {
      if (isNative) {
        await Browser.open({ url: data.url, windowName: '_self' });
      } else {
        window.location.href = data.url;
      }
    }
  };

  const signInWithMagicLink = async (email) => {
    const redirectTo = Capacitor.isNativePlatform() ? DEEP_LINK : WEB_REDIRECT;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const redirectTo = Capacitor.isNativePlatform() ? DEEP_LINK : WEB_REDIRECT;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  };

  // Explicit sign-out: end the session, drop cached non-PHI preferences, and
  // clear any auth error so nothing carries over to the next user.
  const signOut = async (reason = '') => {
    await supabase.auth.signOut().catch(() => {});
    clearCachedPreferences(user?.id);
    setProfile(null);
    setUser(null);
    setAuthError(reason);
  };
  const clearAuthError = () => setAuthError('');

  // Inactivity timeout: sign the clinician out rather than leaving a live PHI
  // session unattended on a shared device.
  useEffect(() => {
    if (!user?.id) return undefined;
    return watchIdle({ onIdle: () => { signOut(`You were signed out after ${IDLE_MINUTES} minutes of inactivity.`); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = {
    user, profile, loading, isAdmin, authError,
    signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword, signOut, clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
