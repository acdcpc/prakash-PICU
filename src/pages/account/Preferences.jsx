import { useEffect, useState } from 'react';
import { AlertTriangle, Baby, BookOpenCheck, Check, ClipboardList, HeartPulse, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loadPreferences, savePreferencesWithRetry, ONBOARDING_VERSION, SAFETY_NOTICE_VERSION } from '../../lib/onboarding';

const FOCUS_OPTIONS = [
  { id: 'general', title: 'General pediatrics', description: 'Everyday outpatient, ward, and referral care.', icon: Stethoscope },
  { id: 'acute', title: 'Acute & emergency care', description: 'Fast references for the moments that cannot wait.', icon: HeartPulse },
  { id: 'growth', title: 'Growth & development', description: 'Track milestones, growth patterns, and follow-up.', icon: Baby },
];
const TOOL_OPTIONS = [
  { id: 'dose', title: 'Drug doses', description: 'Weight-based references close at hand.', icon: BookOpenCheck },
  { id: 'scores', title: 'Scores & assessments', description: 'Structured pediatric assessment tools.', icon: ClipboardList },
  { id: 'growth', title: 'Child growth', description: 'WHO charts and Nepali-date entry.', icon: Baby },
];

export default function Preferences() {
  const { user } = useAuth();
  const [focus, setFocus] = useState('general');
  const [tools, setTools] = useState(['dose', 'scores', 'growth']);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { tone, message }

  useEffect(() => {
    let active = true;
    if (!user?.id) { setLoading(false); return undefined; }
    loadPreferences(user.id).then(({ preferences, error }) => {
      if (!active) return;
      setFocus(preferences.careFocus);
      setTools(preferences.quickTools);
      setLoadError(Boolean(error));
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  const toggleTool = (id) => setTools((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  async function save() {
    setSaving(true);
    setStatus(null);
    const { error } = await savePreferencesWithRetry(user.id, {
      careFocus: focus,
      quickTools: tools,
      onboardingStatus: 'completed',
      onboardingVersion: ONBOARDING_VERSION,
      safetyAckVersion: SAFETY_NOTICE_VERSION,
    });
    setSaving(false);
    setStatus(error
      ? { tone: 'danger', message: 'We could not save your preferences. Your selections are kept — retry when you have a connection.' }
      : { tone: 'success', message: 'Preferences saved to your account.' });
  }

  return (
    <div className="page-content">
      <div className="page-heading"><div><p className="eyebrow">Account</p><h1>Preferences</h1><p className="text-muted">Non-clinical workspace preferences stored to your account. They never affect what patient data you can access.</p></div><ShieldCheck size={26} /></div>
      {loadError && <div className="notice notice-warning" role="status"><AlertTriangle size={17} /><span>We could not load your saved preferences, so defaults are shown.</span></div>}
      {loading ? <p className="text-muted" role="status">Loading…</p> : (
        <div className="card"><div className="card-head"><div><span className="eyebrow">Workspace defaults</span><h3>Quick shelf and care focus</h3></div></div>
          <div className="card-body">
            <h4 className="mb-1">Care focus</h4>
            <div className="onboarding-options">{FOCUS_OPTIONS.map((option) => { const Icon = option.icon; return <button type="button" key={option.id} className={`onboarding-option ${focus === option.id ? 'selected' : ''}`} aria-pressed={focus === option.id} onClick={() => setFocus(option.id)}><span className="onboarding-option-icon teal"><Icon size={21} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span>{focus === option.id && <span className="onboarding-check"><Check size={15} /></span>}</button>; })}</div>
            <h4 className="mb-1 mt-3">Quick shelf</h4>
            <div className="onboarding-options">{TOOL_OPTIONS.map((option) => { const Icon = option.icon; const selected = tools.includes(option.id); return <button type="button" key={option.id} className={`onboarding-option ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => toggleTool(option.id)}><span className="onboarding-option-icon blue"><Icon size={21} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span>{selected && <span className="onboarding-check"><Check size={15} /></span>}</button>; })}</div>
            {status && <div className={`notice notice-${status.tone === 'success' ? 'success' : 'danger'}`} role={status.tone === 'success' ? 'status' : 'alert'}><span>{status.message}</span>{status.tone !== 'success' && <button type="button" className="btn btn-ghost btn-sm" onClick={save} disabled={saving}><RefreshCw size={14} /> Retry</button>}</div>}
            <div className="form-actions"><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button></div>
          </div></div>
      )}
      <p className="clinical-footnote">Onboarding and preferences are stored server-side as non-PHI data (care focus, quick-shelf tools, locale, onboarding status/version). No patient identifiers, diagnoses, weights, or notes are stored here.</p>
    </div>
  );
}
