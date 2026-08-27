import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const validateEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setInfo('');
    clearAuthError();
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');
    clearAuthError();
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your full name.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    } else if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const data = await signUp(email, password, fullName.trim());
        if (!data?.session) {
          setInfo('Account created. Check your email to confirm your account, then sign in.');
          switchMode('signin');
        }
      } else {
        await signIn(email, password);
      }
    } catch (authFailure) {
      setError(authFailure.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setInfo('');
    clearAuthError();
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (authFailure) {
      setError(authFailure.message || 'Google sign-in failed.');
      setLoading(false);
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    setError('');
    if (!validateEmail(magicEmail)) { setError('Please enter a valid email address.'); return; }
    setMagicLoading(true);
    try {
      await signInWithMagicLink(magicEmail);
      setMagicSent(true);
    } catch (authFailure) {
      setError(authFailure.message || 'Failed to send the magic link.');
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    setError('');
    if (!validateEmail(resetEmail)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setInfo('Password reset link sent. Check your email.');
      setShowForgot(false);
    } catch (authFailure) {
      setError(authFailure.message || 'Failed to send the reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Prakash Pediatrics introduction">
        <div className="auth-story-top"><span className="auth-story-mark"><Sparkles size={18} /></span><strong>Prakash Pediatrics</strong><span className="auth-story-nepali">बाल स्वास्थ्य</span></div>
        <div className="auth-story-art" aria-hidden="true"><div className="story-sun" /><div className="story-orbit story-orbit-one" /><div className="story-orbit story-orbit-two" /><div className="story-heart"><HeartShape /></div><div className="story-spark spark-a" /><div className="story-spark spark-b" /></div>
        <div className="auth-story-copy"><span className="eyebrow">A clearer next step</span><h1>Keep the<br /><em>care</em> moving.</h1><p>A calm clinical companion for pediatricians and every professional looking after children.</p></div>
        <div className="auth-story-trust"><ShieldCheck size={17} /><span>Private clinical workspace · made for Nepal</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-header"><div><span className="eyebrow">Welcome back</span><h2>{mode === 'signin' ? 'Sign in to continue' : 'Create your clinician account'}</h2><p className="text-muted">{mode === 'signin' ? 'Your tools and patient workspace are ready when you are.' : 'Set up a private workspace for pediatric care.'}</p></div><Stethoscope className="auth-panel-icon" size={25} /></div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {!error && authError && <div className="alert alert-danger" role="alert">{authError}</div>}
        {info && <div className="alert alert-success" role="status">{info}</div>}

        <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode"><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')} role="tab" aria-selected={mode === 'signin'}>Sign in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} role="tab" aria-selected={mode === 'signup'}>Create account</button></div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && <div className="form-group"><label className="form-label" htmlFor="fullname">Full name</label><input id="fullname" type="text" className="form-input" placeholder="Dr. Jane Smith" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></div>}
          <div className="form-group"><label className="form-label" htmlFor="email">Work email</label><div className="auth-input-wrap"><Mail size={17} /><input id="email" type="email" className="form-input" placeholder="you@hospital.org" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div></div>
          <div className="form-group"><div className="auth-label-row"><label className="form-label" htmlFor="password">Password</label>{mode === 'signin' && <button type="button" className="auth-inline-button" onClick={() => { setShowForgot(true); setResetEmail(email); setError(''); }}>Forgot password?</button>}</div><div className="auth-password-wrap"><input id="password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          {mode === 'signup' && <div className="form-group"><label className="form-label" htmlFor="confirm">Confirm password</label><input id="confirm" type="password" className="form-input" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div>}
          <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create my workspace'} <ArrowRight size={17} /></button>
        </form>

        <div className="auth-divider"><span>or continue with</span></div>
        <button type="button" onClick={handleGoogle} className="btn btn-ghost btn-block auth-provider" disabled={loading}><span className="google-letter">G</span> Continue with Google</button>
        <div className="auth-divider"><span>passwordless access</span></div>
        <form onSubmit={handleMagicLink} className="magic-form"><label className="form-label" htmlFor="magic-email">Send a magic link</label><div className="auth-input-wrap"><KeyRound size={17} /><input id="magic-email" type="email" className="form-input" placeholder="you@hospital.org" value={magicEmail} onChange={(event) => setMagicEmail(event.target.value)} /></div><button type="submit" className="btn btn-ghost btn-block auth-magic-button" disabled={magicLoading}>{magicLoading ? 'Sending…' : 'Email me a sign-in link'}</button></form>
        {magicSent && <div className="alert alert-success mt-2" role="status">Check your email for the sign-in link.</div>}
        <p className="auth-privacy-note"><ShieldCheck size={15} /> We keep onboarding and patient data separate. Your patient records are protected by authenticated Supabase policies.</p>
      </section>

      {showForgot && <div className="modal-overlay open" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowForgot(false); }}><div className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="modal-head"><h3 id="reset-title">Reset password</h3><button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowForgot(false)} aria-label="Close reset password dialog">×</button></div><div className="modal-body"><p className="text-sm text-muted mb-3">Enter your email and we’ll send you a secure reset link.</p><form onSubmit={handleForgot}><div className="form-group"><label className="form-label" htmlFor="reset-email">Email</label><input id="reset-email" type="email" className="form-input" placeholder="you@hospital.org" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} autoFocus required /></div><button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button></form></div></div></div>}
    </main>
  );
}

function HeartShape() {
  return <svg viewBox="0 0 100 100" width="88" height="88" fill="none"><path d="M50 83S18 64 18 39c0-11 8-19 19-19 7 0 12 4 16 10 4-6 9-10 16-10 11 0 19 8 19 19 0 25-32 44-32 44Z" fill="currentColor" opacity=".95" /><path d="M29 39c0-8 5-14 13-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".75" /></svg>;
}
