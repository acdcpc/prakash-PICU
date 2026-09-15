import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Baby, BookOpenCheck, Check, ClipboardList, HeartPulse, RefreshCw, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loadPreferences, savePreferencesWithRetry, ONBOARDING_VERSION, SAFETY_NOTICE_VERSION } from '../../lib/onboarding';

const FOCUS_OPTIONS = [
  { id: 'general', title: 'General pediatrics', description: 'Everyday outpatient, ward, and referral care.', icon: Stethoscope, tone: 'teal' },
  { id: 'acute', title: 'Acute & emergency care', description: 'Fast references for the moments that cannot wait.', icon: HeartPulse, tone: 'coral' },
  { id: 'growth', title: 'Growth & development', description: 'Track milestones, growth patterns, and follow-up.', icon: Baby, tone: 'violet' },
];

const TOOL_OPTIONS = [
  { id: 'dose', title: 'Drug doses', description: 'Keep weight-based references close at hand.', icon: BookOpenCheck },
  { id: 'scores', title: 'Scores & assessments', description: 'Open structured pediatric assessment tools quickly.', icon: ClipboardList },
  { id: 'growth', title: 'Child growth', description: 'Jump into WHO charts and Nepali-date entry.', icon: Baby },
];

const SAFETY_POINTS = [
  ['Reference and decision support, not an order', 'Dose and score tools show reference values only. They never create a medication order, prescription, or diagnosis on their own.'],
  ['Verify for this patient, every time', 'Confirm weight, age, indication, formulation, concentration, maximum dose, and local protocol before acting.'],
  ['Reviewed data is different from reference data', 'Only structured records the clinical team has reviewed become calculator inputs; unverified monographs stay read-only references.'],
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [focus, setFocus] = useState('general');
  const [tools, setTools] = useState(['dose', 'scores', 'growth']);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const progress = useMemo(() => `${Math.round((step / 3) * 100)}%`, [step]);

  useEffect(() => {
    let active = true;
    if (!user?.id) { setLoading(false); return undefined; }
    loadPreferences(user.id).then(({ preferences, error }) => {
      if (!active) return;
      setFocus(preferences.careFocus);
      setTools(preferences.quickTools);
      setAcknowledged(preferences.safetyAckVersion >= SAFETY_NOTICE_VERSION);
      setLoadError(Boolean(error));
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  function toggleTool(id) {
    setTools((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function next() {
    if (step < 3) setStep((current) => current + 1);
  }

  async function persist(status) {
    setSaving(true);
    setSaveError('');
    const { error } = await savePreferencesWithRetry(user.id, {
      careFocus: focus,
      quickTools: tools,
      onboardingStatus: status,
      onboardingVersion: ONBOARDING_VERSION,
      safetyAckVersion: status === 'completed' ? SAFETY_NOTICE_VERSION : 0,
    });
    setSaving(false);
    if (error) {
      setSaveError('We could not save your preferences. Your choices are kept — retry when you have a connection.');
      return false;
    }
    return true;
  }

  async function finish() {
    if (!user?.id || !acknowledged) return;
    if (await persist('completed')) navigate('/dashboard', { replace: true });
  }

  async function skip() {
    if (!user?.id) { navigate('/dashboard', { replace: true }); return; }
    await persist('skipped');
    // Skipping never traps the clinician: access is session-based, not onboarding-based.
    navigate('/dashboard', { replace: true });
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-visual" aria-label="Prakash Pediatrics introduction">
        <div className="onboarding-brand"><span className="onboarding-brand-mark"><Sparkles size={18} /></span><span>Prakash Pediatrics</span></div>
        <div className="onboarding-orbit orbit-one" />
        <div className="onboarding-orbit orbit-two" />
        <div className="onboarding-visual-copy">
          <span className="eyebrow">A calmer clinical start</span>
          <h1>Less searching.<br /><em>More caring.</em></h1>
          <p>Set up your pediatric workspace once, then move from a child’s story to a confident next step.</p>
        </div>
        <div className="onboarding-visual-footer"><ShieldCheck size={17} /><span>Private by design · built for clinicians in Nepal</span></div>
      </section>

      <section className="onboarding-panel">
        <div className="onboarding-panel-top"><span className="step-label">Step {step} of 3</span><button className="onboarding-skip" type="button" onClick={skip} disabled={saving}>Skip for now</button></div>
        <div className="onboarding-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((step / 3) * 100)} aria-label={`Onboarding progress: ${progress}`}><span style={{ width: progress }} /></div>

        {loading && <p className="text-muted" role="status">Loading your saved preferences…</p>}

        {!loading && loadError && <div className="notice notice-warning" role="status"><AlertTriangle size={17} /><span>We could not reach your saved preferences, so we loaded sensible defaults. You can continue and save again.</span></div>}

        {!loading && step === 1 && <div className="onboarding-step">
          <span className="step-kicker">Make it yours</span>
          <h2>What kind of pediatric care fills your day?</h2>
          <p className="text-muted">This only shapes your shortcuts. You can change your mind anytime in Preferences.</p>
          <div className="onboarding-options">{FOCUS_OPTIONS.map((option) => { const Icon = option.icon; return <button type="button" key={option.id} className={`onboarding-option ${focus === option.id ? 'selected' : ''}`} aria-pressed={focus === option.id} onClick={() => setFocus(option.id)}><span className={`onboarding-option-icon ${option.tone}`}><Icon size={21} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span>{focus === option.id && <span className="onboarding-check"><Check size={15} /></span>}</button>; })}</div>
          <button type="button" className="btn btn-primary btn-lg onboarding-next" onClick={next}>Continue <ArrowRight size={17} /></button>
        </div>}

        {!loading && step === 2 && <div className="onboarding-step">
          <span className="step-kicker">Your quick shelf</span>
          <h2>What should be one tap away?</h2>
          <p className="text-muted">Choose the tools you reach for most. Everything remains available from the menu.</p>
          <div className="onboarding-options">{TOOL_OPTIONS.map((option) => { const Icon = option.icon; const selected = tools.includes(option.id); return <button type="button" key={option.id} className={`onboarding-option ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => toggleTool(option.id)}><span className="onboarding-option-icon blue"><Icon size={21} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span>{selected && <span className="onboarding-check"><Check size={15} /></span>}</button>; })}</div>
          <div className="onboarding-actions"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn-primary btn-lg onboarding-next" onClick={next}>Continue <ArrowRight size={17} /></button></div>
        </div>}

        {!loading && step === 3 && <div className="onboarding-step">
          <span className="step-kicker">Before you begin</span>
          <h2>A short safety orientation</h2>
          <p className="text-muted">Thirty seconds now prevents a wrong assumption later.</p>
          {SAFETY_POINTS.map(([title, body]) => <div className="onboarding-promise" key={title}><div><ShieldCheck size={22} /></div><span><strong>{title}</strong><small>{body}</small></span></div>)}
          <label className="review-verify-control"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I understand these tools are reference and decision support, and that every dose needs patient-specific verification.</label>
          {saveError && <div className="notice notice-danger" role="alert"><AlertTriangle size={17} /><span>{saveError}</span><button type="button" className="btn btn-ghost btn-sm" onClick={finish} disabled={saving || !acknowledged}><RefreshCw size={14} /> Retry save</button></div>}
          <div className="onboarding-actions"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(2)}>Back</button><button type="button" className="btn btn-primary btn-lg onboarding-next" onClick={finish} disabled={saving || !acknowledged}>{saving ? 'Saving…' : 'Open my workspace'} <ArrowRight size={17} /></button></div>
        </div>}
        <p className="onboarding-footnote">No patient details are collected during onboarding. Preferences are non-clinical and stored to your account.</p>
      </section>
    </main>
  );
}
