import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ClipboardPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { adToNepali, isValidNepaliDate, nepaliToAd } from '../../lib/nepaliDate';
import { notifyError } from '../../lib/notifications';

export default function PatientForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [dateMode, setDateMode] = useState('ad');
  const [form, setForm] = useState({ date_of_birth: '', date_of_birth_bs: '', age: '', weight: '', diagnosis: '', encounter_date: today, source_type: 'OPD', sex: 'Male', height: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef(null);
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  function validate() {
    const next = {};
    if (form.age === '' || Number(form.age) < 0 || Number.isNaN(Number(form.age))) next.age = 'Enter the age in years (0 for a newborn).';
    if (form.weight === '' || Number(form.weight) <= 0 || Number.isNaN(Number(form.weight))) next.weight = 'Enter the current weight in kilograms.';
    if (dateMode === 'bs' && form.date_of_birth_bs && !isValidNepaliDate(form.date_of_birth_bs)) next.date_of_birth_bs = 'Enter a valid Nepali date (YYYY-MM-DD).';
    if (dateMode === 'ad' && form.date_of_birth && form.date_of_birth > today) next.date_of_birth = 'Date of birth cannot be in the future.';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      // Move focus to the summary so the errors are announced and reachable.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (!user?.id) { notifyError('Your session has expired. Sign in again to save this record.'); return; }
    const birthDateAd = dateMode === 'bs' ? nepaliToAd(form.date_of_birth_bs) : form.date_of_birth;
    setSaving(true);
    const { error } = await supabase.from('patients').insert({ created_by: user.id, age: Number(form.age), weight: Number(form.weight), diagnosis: form.diagnosis.trim() || null, admission_date: form.encounter_date || today, source_type: form.source_type, sex: form.sex, height: Number(form.height) || null, date_of_birth: birthDateAd || null, date_of_birth_bs: form.date_of_birth_bs || (birthDateAd ? adToNepali(birthDateAd) : null), active: true });
    setSaving(false);
    if (error) { notifyError(`Unable to save record: ${error.message}`); return; }
    navigate('/patients');
  }

  const errorList = Object.entries(errors).filter(([, message]) => message);
  const fieldProps = (name, label) => ({
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    'aria-label': errors[name] ? `${label}: ${errors[name]}` : undefined,
  });

  return (
    <div className="form-page">
      <div className="form-hero"><div className="form-hero-icon"><ClipboardPlus size={24} /></div><div><span className="eyebrow">Private pediatric record</span><h1>Add a child</h1><p>Capture the minimum useful context for an OPD, ward, clinic, referral, or follow-up encounter.</p></div></div>
      <div className="notice notice-info"><ShieldCheck size={18} /><span>Your record is owner-scoped. Other clinicians will not see it unless the database policy explicitly grants access.</span></div>
      <form className="card patient-form-card" onSubmit={handleSubmit} noValidate>
        <div className="card-head"><div><h3>Encounter details</h3><p className="text-muted">No bed assignment or occupancy information is required.</p></div><CalendarDays size={22} /></div>
        <div className="card-body">
          {errorList.length > 0 && (
            <div className="notice notice-danger" role="alert" tabIndex={-1} ref={summaryRef}>
              <AlertTriangle size={18} />
              <span>
                <strong>{errorList.length === 1 ? 'One field needs attention' : `${errorList.length} fields need attention`}</strong>
                <ul className="error-summary">{errorList.map(([name, message]) => <li key={name}><a href={`#field-${name}`}>{message}</a></li>)}</ul>
              </span>
            </div>
          )}
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label" htmlFor="field-source_type">Source of care *</label><select id="field-source_type" className="form-select" value={form.source_type} onChange={(e) => update('source_type', e.target.value)}><option>OPD</option><option>Ward</option><option>Clinic</option><option>Referral</option><option>Other</option></select></div>
            <div className="form-group"><label className="form-label" htmlFor="field-encounter_date">Encounter date</label><input id="field-encounter_date" className="form-input" type="date" value={form.encounter_date} onChange={(e) => update('encounter_date', e.target.value)} /></div>
            <div className="form-group"><label className="form-label" htmlFor="field-sex">Sex</label><select id="field-sex" className="form-select" value={form.sex} onChange={(e) => update('sex', e.target.value)}><option>Male</option><option>Female</option><option>Intersex / other</option><option>Not recorded</option></select></div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="field-age">Age (years) *</label>
              <input id="field-age" className="form-input" type="number" min="0" step="0.01" value={form.age} onChange={(e) => update('age', e.target.value)} placeholder="e.g. 4.5" {...fieldProps('age', 'Age')} />
              {errors.age && <span className="field-error" id="age-error">{errors.age}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="field-weight">Current weight (kg) *</label>
              <input id="field-weight" className="form-input" type="number" min="0.1" step="0.1" value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 16.2" {...fieldProps('weight', 'Weight')} />
              {errors.weight && <span className="field-error" id="weight-error">{errors.weight}</span>}
            </div>
            <div className="form-group"><label className="form-label" htmlFor="field-height">Height / length (cm)</label><input id="field-height" className="form-input" type="number" min="0" step="0.1" value={form.height} onChange={(e) => update('height', e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="form-group">
            <div className="date-mode-tabs"><button type="button" className={dateMode === 'ad' ? 'active' : ''} aria-pressed={dateMode === 'ad'} onClick={() => setDateMode('ad')}>AD / Gregorian DOB</button><button type="button" className={dateMode === 'bs' ? 'active' : ''} aria-pressed={dateMode === 'bs'} onClick={() => setDateMode('bs')}>BS / Nepali DOB</button></div>
            <label className="form-label" htmlFor={dateMode === 'ad' ? 'field-date_of_birth' : 'field-date_of_birth_bs'}>Date of birth</label>
            {dateMode === 'ad'
              ? <input id="field-date_of_birth" className="form-input" type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} {...fieldProps('date_of_birth', 'Date of birth')} />
              : <input id="field-date_of_birth_bs" className="form-input" type="text" value={form.date_of_birth_bs} onChange={(e) => update('date_of_birth_bs', e.target.value)} placeholder="YYYY-MM-DD · e.g. 2080-04-12" {...fieldProps('date_of_birth_bs', 'Nepali date of birth')} />}
            {(errors.date_of_birth || errors.date_of_birth_bs) && <span className="field-error" id={dateMode === 'ad' ? 'date_of_birth-error' : 'date_of_birth_bs-error'}>{errors.date_of_birth || errors.date_of_birth_bs}</span>}
            <p className="text-sm text-muted mt-1">{dateMode === 'ad' ? `Nepali date: ${adToNepali(form.date_of_birth) || '—'}` : `Converted AD date: ${nepaliToAd(form.date_of_birth_bs) || '—'}`}</p>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="field-diagnosis">Clinical reason / diagnosis</label><input id="field-diagnosis" className="form-input" value={form.diagnosis} onChange={(e) => update('diagnosis', e.target.value)} placeholder="Optional clinical context" /></div>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => navigate('/patients')}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create private record'}</button></div>
        </div>
      </form>
    </div>
  );
}
