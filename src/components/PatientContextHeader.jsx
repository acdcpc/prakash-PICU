import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import supabase from '../lib/supabase';

// Compact, always-visible patient context for patient subroutes. Shows only the
// minimum permitted information (no free-text identifiers are introduced here),
// plus an explicit state when the clinician is not inside a patient context or
// cannot access the record.
export default function PatientContextHeader({ patientId, patient: provided = null }) {
  const [patient, setPatient] = useState(provided);
  const [state, setState] = useState(() => {
    if (provided) return 'ready';
    return patientId ? 'loading' : 'no-context';
  });

  useEffect(() => {
    if (provided) { setPatient(provided); setState('ready'); return undefined; }
    if (!patientId) { setPatient(null); setState('no-context'); return undefined; }
    let active = true;
    setState('loading');
    supabase.from('patients').select('id,age,weight,diagnosis,source_type,sex').eq('id', patientId).single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) { setState(error?.code === 'PGRST116' ? 'denied' : 'error'); return; }
        setPatient(data);
        setState('ready');
      });
    return () => { active = false; };
  }, [patientId, provided]);

  return (
    <div className="patient-context" role="region" aria-label="Patient context">
      <Link to={patientId ? `/patients/${patientId}` : '/patients'} className="patient-context-back">
        <ArrowLeft size={15} /> {patientId ? 'Patient record' : 'All patients'}
      </Link>
      {state === 'loading' && <span className="text-muted" role="status">Loading patient context…</span>}
      {state === 'no-context' && <span className="patient-context-warn"><AlertTriangle size={14} /> Not inside a patient context</span>}
      {state === 'denied' && <span className="patient-context-warn"><Lock size={14} /> You do not have access to this patient record</span>}
      {state === 'error' && <span className="patient-context-warn"><AlertTriangle size={14} /> Patient context unavailable — reopen from the patient list</span>}
      {state === 'ready' && patient && (
        <>
          <span className="patient-context-chip">{patient.source_type || 'Encounter'}</span>
          <span className="patient-context-chip">{patient.sex || 'Sex —'}</span>
          <span className="patient-context-chip">{patient.age != null ? `${patient.age} yr` : 'Age —'}</span>
          <span className="patient-context-chip">{patient.weight != null ? `${patient.weight} kg` : 'Weight —'}</span>
          <strong className="patient-context-title">{patient.diagnosis || 'Pediatric record'}</strong>
        </>
      )}
    </div>
  );
}
