import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Baby, BookOpenCheck, Check, ClipboardList, HeartPulse, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingState } from '../../lib/onboarding';

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

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [focus, setFocus] = useState('general');
  const [tools, setTools] = useState(['dose', 'scores', 'growth']);
  const [saving, setSaving] = useState(false);

  const progress = useMemo(() => `${Math.round((step / 3) * 100)}%`, [step]);

  function toggleTool(id) {
    setTools((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function next() {
    if (step < 3) setStep((current) => current + 1);
  }

  function finish() {
    if (!user?.id) return;
    setSaving(true);
    saveOnboardingState(user.id, { focus, tools });
    navigate('/dashboard', { replace: true });
  }

  function skip() {
    if (user?.id) saveOnboardingState(user.id, { skipped: true });
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
        <div className="onboarding-panel-top"><span className="step-label">Step {step} of 3</span><button className="onboarding-skip" type="button" onClick={skip}>Skip for now</button></div>
        <div className="onboarding-progress" aria-label={`Onboarding progress: ${progress}`}><span style={{ width: progress }} /></div>

        {step === 1 && <div className="onboarding-step">
          <span className="step-kicker">Make it yours</span>
          <h2>What kind of pediatric care fills your day?</h2>
          <p className="text-muted">This only shapes your shortcuts. You can change your mind anytime.</p>
          <div className="onboarding-options">{FOCUS_OPTIONS.map((option) => { const Icon = option.icon; return <button type="button" key={option.id} className={`onboarding-option ${focus === option.id ? 'selected' : ''}`} onClick={() => setFocus(option.id)}><span className={`onboarding-option-icon ${option.tone}`}><Icon size={21} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span>{focus === option.id && <span className="onboarding-check"><Check size={15} /></span>}</button>; })}</div>
          <button type="button" className="btn btn-primary btn-lg onboarding-next" onClick={next}>Continue <ArrowRight size={17} /></button>
        </div>}

        {step === 2 && <div className="onboarding-step">
          <span className="step-kicker">Your quick shelf</span>
          <h2>What should be one tap away?</h2>
          <p className="text-muted">Choose the tools you reach for most. Everything remains available from the menu.</p>
          <div className="onboarding-options">{TOOL_OPTIONS.map((option) => { const Icon = option.icon; const selected = tools.includes(option.id); return <button type="button" key={option.id} className={`onboarding-option ${selected ? 'selected' : ''}`} onClick={() => toggleTool(option.id)}><span className="onboarding-option-icon blue"><Icon size={21} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span>{selected && <span className="onboarding-check"><Check size={15} /></span>}</button>; })}</div>
          <div className="onboarding-actions"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn-primary btn-lg onboarding-next" onClick={next}>Continue <ArrowRight size={17} /></button></div>
        </div>}

        {step === 3 && <div className="onboarding-step">
          <span className="step-kicker">A clear promise</span>
          <h2>Ready for a more human clinical workspace?</h2>
          <p className="text-muted">Prakash Pediatrics keeps your clinical tools close while respecting the boundaries around patient information.</p>
          <div className="onboarding-promise"><div><ShieldCheck size={22} /></div><span><strong>Your patient records stay yours</strong><small>Your account sees only records allowed by Supabase ownership and security policies.</small></span></div>
          <div className="onboarding-promise"><div><BookOpenCheck size={22} /></div><span><strong>References remain transparent</strong><small>Teddy Bear monographs are references first; only reviewed structured records become calculator data.</small></span></div>
          <div className="onboarding-promise"><div><HeartPulse size={22} /></div><span><strong>Designed for the next decision</strong><small>Use a tool, document a finding, and return to the child’s story without clutter.</small></span></div>
          <div className="onboarding-actions"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(2)}>Back</button><button type="button" className="btn btn-primary btn-lg onboarding-next" onClick={finish} disabled={saving}>{saving ? 'Setting up…' : 'Open my workspace'} <ArrowRight size={17} /></button></div>
        </div>}
        <p className="onboarding-footnote">No patient details are collected during onboarding.</p>
      </section>
    </main>
  );
}
