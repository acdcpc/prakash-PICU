import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { readCachedPreferences, loadPreferences, DEFAULT_PREFERENCES } from '../../lib/onboarding';
import { ArrowRight, Baby, Calculator, ClipboardPlus, Newspaper, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
import GrowthMotif from '../../components/GrowthMotif';

const QUICK_LINKS = [
  { id: 'patient', title: 'Add a patient', text: 'Start a private pediatric record from OPD, ward, clinic, or referral.', path: '/patients/new', icon: ClipboardPlus, tone: 'coral' },
  { id: 'dose', title: 'Drugs & scores', text: 'Use Teddy Bear-linked dosing and structured assessment scales.', path: '/calculators', icon: Calculator, tone: 'teal' },
  { id: 'growth', title: 'Child growth', text: 'Plot WHO growth measures and record Nepali dates.', path: '/child-growth', icon: Baby, tone: 'violet' },
];

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState(() => readCachedPreferences(user?.id) || DEFAULT_PREFERENCES);
  const preferredTools = preferences.quickTools || [];
  const quickLinks = [...QUICK_LINKS].sort((a, b) => {
    const aIndex = preferredTools.indexOf(a.id);
    const bIndex = preferredTools.indexOf(b.id);
    return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
  });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;
    supabase.from('patients').select('id,age,weight,diagnosis,source_type,created_at').eq('created_by', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (active) { setPatients(data || []); setLoading(false); }
    });
    return () => { active = false; };
  }, [user?.id]);

  // Preferences are server-backed (local cache is only a first-paint optimisation).
  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;
    loadPreferences(user.id).then(({ preferences: next }) => { if (active) setPreferences(next); });
    return () => { active = false; };
  }, [user?.id]);

  if (loading) return <div className="loader"><div className="spinner" /> Loading your workspace…</div>;

  return (
    <div className="dashboard-page">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="eyebrow"><Sparkles size={14} /> Pediatric clinical workspace</span>
          <h1>Good to see you, {profile?.full_name?.split(' ')[0] || 'clinician'}.</h1>
          <p>One calm place for pediatric patient records, weight-based references, structured scores, and growth follow-up.</p>
          <div className="welcome-actions"><button className="btn btn-primary btn-lg" onClick={() => navigate('/patients/new')}><Plus size={17} /> Add patient</button><button className="btn btn-ghost btn-lg" onClick={() => navigate('/pediatric-updates')}><Newspaper size={17} /> What's new in pediatrics</button></div>
        </div>
        <div className="welcome-art"><div className="orb orb-one" /><div className="orb orb-two" /><GrowthMotif className="welcome-motif" /></div>
      </section>

      <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Your everyday flow</span><h2>Start with what you need</h2></div><button className="text-button" onClick={() => navigate('/preferences')}>Edit quick shelf <ArrowRight size={14} /></button></div><div className="quick-launch-grid">{quickLinks.map(({ title, text, path, icon: Icon, tone }) => <button key={title} className={`launch-card launch-${tone}`} onClick={() => navigate(path)}><span className="launch-icon"><Icon size={22} /></span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={18} className="launch-arrow" /></button>)}</div></section>

      <section className="dashboard-columns"><div className="card dashboard-list-card"><div className="card-head"><div><span className="eyebrow">Private workspace</span><h3>Recent patients</h3></div><button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')}>View all <ArrowRight size={14} /></button></div><div className="card-body">{patients.length === 0 ? <div className="empty-state"><Users size={28} /><strong>Your patient list is ready</strong><p>Add a record to keep your clinical notes, medications, investigations, and follow-up in one place.</p><button className="btn btn-teal" onClick={() => navigate('/patients/new')}>Add first patient</button></div> : <div className="recent-patients">{patients.slice(0, 5).map((patient) => <button className="recent-patient" key={patient.id} onClick={() => navigate(`/patients/${patient.id}`)}><span className="patient-avatar"><Baby size={17} /></span><span><strong>{patient.diagnosis || 'Pediatric record'}</strong><small>{patient.age != null ? `${patient.age} years` : 'Age not recorded'} · {patient.weight != null ? `${patient.weight} kg` : 'Weight not recorded'} · {patient.source_type || 'Clinical encounter'}</small></span><ArrowRight size={16} /></button>)}</div>}</div></div><div className="card dashboard-trust-card"><div className="card-body"><div className="trust-icon"><ShieldCheck size={24} /></div><span className="eyebrow">Safety by design</span><h3>Reference first. Verify always.</h3><p>Clinical tools remain reference aids. Confirm indication, formulation, units, patient context, and local guidance before acting.</p><button className="text-button" onClick={() => navigate('/emergency')}>Open emergency reference <ArrowRight size={14} /></button></div></div></section>
    </div>
  );
}
