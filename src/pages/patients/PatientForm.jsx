import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { adToNepali, isValidNepaliDate, nepaliToAd } from '../../lib/nepaliDate';

export default function PatientForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [dateMode, setDateMode] = useState('ad');
  const [form, setForm] = useState({ date_of_birth: '', date_of_birth_bs: '', age: '', weight: '', diagnosis: '', encounter_date: today, source_type: 'OPD', sex: 'Male', height: '' });
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const birthDateAd = dateMode === 'bs' ? nepaliToAd(form.date_of_birth_bs) : form.date_of_birth;
    if (!user?.id || !form.age || !form.weight) { alert('Age and weight are required.'); return; }
    if (dateMode === 'bs' && form.date_of_birth_bs && !isValidNepaliDate(form.date_of_birth_bs)) { alert('Enter a valid Nepali date in YYYY-MM-DD format.'); return; }
    setSaving(true);
    const { error } = await supabase.from('patients').insert({ created_by: user.id, age: Number(form.age), weight: Number(form.weight), diagnosis: form.diagnosis.trim() || null, admission_date: form.encounter_date || today, source_type: form.source_type, sex: form.sex, height: Number(form.height) || null, date_of_birth: birthDateAd || null, date_of_birth_bs: form.date_of_birth_bs || (birthDateAd ? adToNepali(birthDateAd) : null), active: true });
    setSaving(false);
    if (error) { alert(`Unable to save record: ${error.message}`); return; }
    navigate('/patients');
  }

  return <div className="form-page"><div className="form-hero"><div className="form-hero-icon"><ClipboardPlus size={24} /></div><div><span className="eyebrow">Private pediatric record</span><h1>Add a child</h1><p>Capture the minimum useful context for an OPD, ward, clinic, referral, or follow-up encounter.</p></div></div><div className="notice notice-info"><ShieldCheck size={18} /><span>Your record is owner-scoped. Other clinicians will not see it unless the database policy explicitly grants access.</span></div><form className="card patient-form-card" onSubmit={handleSubmit}><div className="card-head"><div><h3>Encounter details</h3><p className="text-muted">No bed assignment or occupancy information is required.</p></div><CalendarDays size={22} /></div><div className="card-body"><div className="form-grid-3"><div className="form-group"><label className="form-label">Source of care *</label><select className="form-select" value={form.source_type} onChange={(e) => update('source_type', e.target.value)}><option>OPD</option><option>Ward</option><option>Clinic</option><option>Referral</option><option>Other</option></select></div><div className="form-group"><label className="form-label">Encounter date</label><input className="form-input" type="date" value={form.encounter_date} onChange={(e) => update('encounter_date', e.target.value)} /></div><div className="form-group"><label className="form-label">Sex</label><select className="form-select" value={form.sex} onChange={(e) => update('sex', e.target.value)}><option>Male</option><option>Female</option><option>Intersex / other</option><option>Not recorded</option></select></div></div><div className="form-grid-3"><div className="form-group"><label className="form-label">Age (years) *</label><input className="form-input" type="number" min="0" step="0.01" required value={form.age} onChange={(e) => update('age', e.target.value)} placeholder="e.g. 4.5" /></div><div className="form-group"><label className="form-label">Current weight (kg) *</label><input className="form-input" type="number" min="0.1" step="0.1" required value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 16.2" /></div><div className="form-group"><label className="form-label">Height / length (cm)</label><input className="form-input" type="number" min="0" step="0.1" value={form.height} onChange={(e) => update('height', e.target.value)} placeholder="Optional" /></div></div><div className="form-group"><div className="date-mode-tabs"><button type="button" className={dateMode === 'ad' ? 'active' : ''} onClick={() => setDateMode('ad')}>AD / Gregorian DOB</button><button type="button" className={dateMode === 'bs' ? 'active' : ''} onClick={() => setDateMode('bs')}>BS / Nepali DOB</button></div><label className="form-label">Date of birth</label>{dateMode === 'ad' ? <input className="form-input" type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} /> : <input className="form-input" type="text" value={form.date_of_birth_bs} onChange={(e) => update('date_of_birth_bs', e.target.value)} placeholder="YYYY-MM-DD · e.g. 2080-04-12" />}<p className="text-sm text-muted mt-1">{dateMode === 'ad' ? `Nepali date: ${adToNepali(form.date_of_birth) || '—'}` : `Converted AD date: ${nepaliToAd(form.date_of_birth_bs) || '—'}`}</p></div><div className="form-group"><label className="form-label">Clinical reason / diagnosis</label><input className="form-input" value={form.diagnosis} onChange={(e) => update('diagnosis', e.target.value)} placeholder="Optional clinical context" /></div><div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => navigate('/patients')}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create private record'}</button></div></div></form></div>;
}
