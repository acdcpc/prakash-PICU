import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import PatientContextHeader from '../../components/PatientContextHeader';

const NOTE_TYPES = [
  { value: 'progress', label: 'Progress Note' },
  { value: 'ward_round', label: 'Ward Round' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'nursing', label: 'Nursing' },
];

export default function ClinicalNotes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [type, setType] = useState('progress');

  useEffect(() => {
    supabase.from('patients').select('*').eq('id', id).single().then(({ data }) => setPatient(data));
    loadNotes();
  }, [id]);

  async function loadNotes() {
    const { data } = await supabase.from('patient_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(30);
    setNotes(data || []);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await supabase.from('patient_notes').insert({ patient_id: id, text: text.trim(), type });
    setText('');
    loadNotes();
  }

  const labels = { progress: 'Progress', ward_round: 'Ward Round', procedure: 'Procedure', nursing: 'Nursing' };

  return (
    <div>
      <PatientContextHeader patientId={id} />
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/patients/${id}`)}><ArrowLeft size={16} /> Back</button>
      <h3>Clinical Notes — Bed {patient?.bed_number || '—'}</h3>

      <div className="card mt-3" style={{maxWidth: 600}}>
        <div className="card-head"><h4>Add Note</h4></div>
        <div className="card-body">
          <form onSubmit={handleSave}>
            <div className="form-group"><label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Note</label>
              <textarea className="form-textarea" value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Write your clinical note…" /></div>
            <button type="submit" className="btn btn-teal btn-block" disabled={!text.trim()}>Save Note</button>
          </form>
        </div>
      </div>

      <div className="mt-3">
        {notes.length === 0 ? <p className="text-muted">No notes yet.</p> : notes.map(n => (
          <div key={n.id} className="note-card">
            <div className="flex jc-between items-c mb-2">
              <span className="badge bg-blue">{labels[n.type] || n.type}</span>
              <span className="text-sm text-muted">{new Date(n.created_at).toLocaleString('en-GB')}</span>
            </div>
            <p className="note-text">{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
