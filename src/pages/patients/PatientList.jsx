import { useEffect, useState } from 'react';
import { Baby, Eye, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { deletePatientRecord } from '../../lib/patientRecords';

export default function PatientList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  async function loadPatients() {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.from('patients').select('id,age,weight,diagnosis,source_type,admission_date,created_at,sex').eq('created_by', user.id).order('created_at', { ascending: false });
    setPatients(data || []);
    setLoading(false);
  }
  useEffect(() => { loadPatients(); }, [user?.id]);

  async function removePatient(id) {
    if (!confirm('Delete this private patient record and its associated clinical files? This cannot be undone.')) return;
    setDeleting(id);
    const { error } = await deletePatientRecord(id);
    setDeleting(null);
    if (error) { alert(`Unable to delete record: ${error.message}`); return; }
    setPatients((current) => current.filter((patient) => patient.id !== id));
  }

  if (loading) return <div className="loader"><div className="spinner" /> Loading your patient records…</div>;
  return <div className="patients-page"><div className="page-heading"><div><p className="eyebrow">Private workspace</p><h1>My Patients</h1><p className="text-muted">Records you create from OPD, ward, clinic, referral, or follow-up care.</p></div><button className="btn btn-primary btn-lg" onClick={() => navigate('/patients/new')}><Plus size={17} /> Add patient</button></div>{patients.length === 0 ? <div className="empty-state card"><Baby size={34} /><h3>Your patient list is empty</h3><p>Create a private record to begin documenting pediatric care.</p><button className="btn btn-teal" onClick={() => navigate('/patients/new')}><Plus size={16} /> Add first patient</button></div> : <div className="patient-card-grid">{patients.map((patient) => <article className="patient-card card" key={patient.id}><div className="patient-card-top"><span className="patient-avatar"><Baby size={18} /></span><span className="badge badge-teal">{patient.source_type || 'Clinical encounter'}</span></div><h3>{patient.diagnosis || 'Pediatric record'}</h3><p className="text-muted">{patient.age != null ? `${patient.age} years` : 'Age not recorded'} · {patient.weight != null ? `${patient.weight} kg` : 'Weight not recorded'}</p><div className="patient-card-meta"><span>Encounter</span><strong>{patient.admission_date || '—'}</strong></div><div className="patient-card-actions"><button className="btn btn-blue btn-sm" onClick={() => navigate(`/patients/${patient.id}`)}><Eye size={14} /> Open</button><button className="btn btn-ghost btn-sm danger-action" disabled={deleting === patient.id} onClick={() => removePatient(patient.id)}><Trash2 size={14} /> {deleting === patient.id ? 'Deleting…' : 'Delete'}</button></div></article>)}</div>}</div>;
}
