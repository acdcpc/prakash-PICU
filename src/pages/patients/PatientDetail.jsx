import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { deletePatientRecord } from '../../lib/patientRecords';
import { ArrowLeft, Droplets, Pill, FlaskConical, StickyNote, Image, Calculator, LogOut } from 'lucide-react';
import { notifyError } from '../../lib/notifications';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'fluid', label: 'Fluid Balance', icon: Droplets },
  { id: 'drugs', label: 'Drugs', icon: Pill },
  { id: 'labs', label: 'Investigations', icon: FlaskConical },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'calcs', label: 'Calculators', icon: Calculator },
];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [fbHistory, setFbHistory] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [labs, setLabs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => { loadPatient(); }, [id]);

  async function loadPatient() {
    const { data } = await supabase.from('patients').select('*').eq('id', id).single();
    setPatient(data);
    setLoading(false);
    if (data) {
      loadFBHistory();
      loadDrugs();
      loadLabs();
      loadNotes();
      loadImages();
    }
  }

  async function loadFBHistory() {
    const { data } = await supabase.from('fluid_balance').select('*').eq('patient_id', id).order('date', { ascending: false }).limit(14);
    setFbHistory(data || []);
  }
  async function loadDrugs() {
    const { data } = await supabase.from('patient_drugs').select('*').eq('patient_id', id).order('created_at', { ascending: false });
    setDrugs(data || []);
  }
  async function loadLabs() {
    const { data } = await supabase.from('investigations').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(50);
    setLabs(data || []);
  }
  async function loadNotes() {
    const { data } = await supabase.from('patient_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(30);
    setNotes(data || []);
  }
  async function loadImages() {
    const { data } = await supabase.from('patient_images').select('*').eq('patient_id', id).order('created_at', { ascending: false });
    setImages(data || []);
  }

  async function handleDelete() {
    if (!confirm('Delete this private patient record and its associated clinical files? This cannot be undone.')) return;
    const { error } = await deletePatientRecord(id);
    if (error) { notifyError(`Unable to delete record: ${error.message}`); return; }
    navigate('/patients');
  }

  if (loading) return <div className="loader"><div className="spinner"></div> Loading…</div>;
  if (!patient) return <div className="alert alert-warn">Patient not found.</div>;

  return (
    <div>
      <div className="flex jc-between items-c mb-3 flex-wrap gap-2">
        <div className="flex items-c gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')}><ArrowLeft size={16} /> Back</button>
          <h3>{patient.diagnosis || 'Pediatric record'}</h3>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}><LogOut size={14} /> Delete record</button>
      </div>

      <div className="flex gap-4 mb-3 flex-wrap">
        {[
          ['Source', patient.source_type || 'Clinical encounter'], ['Age', patient.age != null ? patient.age + ' years' : '—'], ['Weight', patient.weight != null ? patient.weight + ' kg' : '—'],
          ['Diagnosis', patient.diagnosis || '—'], ['Encounter', patient.admission_date || '—'], ['Sex', patient.sex || '—']
        ].map(([label, value]) => (
          <div key={label} className="stat-card" style={{minWidth: 120, padding: '12px 16px'}}>
            <div className="stat-label" style={{fontSize: '.7rem'}}>{label}</div>
            <div style={{fontWeight: 600, fontSize: '.95rem', marginTop: 2}}>{value}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tbtn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.icon && <t.icon size={14} style={{marginRight: 4}} />}{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="flex jc-between items-c mb-3">
            <h4>Quick Actions</h4>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <Link to={`/patients/${id}/fluid-balance`} className="btn btn-teal"><Droplets size={16} /> Fluid Balance</Link>
            <Link to={`/patients/${id}/drugs`} className="btn btn-blue"><Pill size={16} /> Drugs</Link>
            <Link to={`/patients/${id}/investigations`} className="btn btn-ghost"><FlaskConical size={16} /> Investigations</Link>
            <Link to={`/patients/${id}/notes`} className="btn btn-ghost"><StickyNote size={16} /> Notes</Link>
            <Link to={`/patients/${id}/images`} className="btn btn-ghost"><Image size={16} /> Images</Link>
            <Link to="/calculators" className="btn btn-ghost"><Calculator size={16} /> Calculators</Link>
          </div>

          {fbHistory.length > 0 && (
            <div className="card mb-3">
              <div className="card-head"><h4>Recent Fluid Balance</h4></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Input</th><th>Output</th><th>Net</th><th>ISL</th><th>FO%</th><th>Status</th></tr></thead>
                  <tbody>
                    {fbHistory.slice(0, 5).map(fb => {
                      const bc = fb.fluid_overload_pct < 5 ? 'bg-green' : fb.fluid_overload_pct < 10 ? 'bg-amber' : 'bg-red';
                      return (
                        <tr key={fb.id}><td>{fb.date}</td><td>{fb.total_input}</td><td>{fb.total_output}</td>
                          <td>{fb.net_balance > 0 ? '+' : ''}{fb.net_balance}</td><td>{fb.isl_daily}</td>
                          <td><span className={`badge ${bc}`}>{fb.fluid_overload_pct?.toFixed(1)}%</span></td>
                          <td><span className="badge bg-navy" style={{fontSize:'10px'}}>{fb.fo_status || '—'}</span></td></tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'fluid' && (
        <div>
          <Link to={`/patients/${id}/fluid-balance`} className="btn btn-teal mb-3">Open Full Fluid Balance</Link>
          {fbHistory.length === 0 ? <p className="text-muted">No fluid balance records.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Input</th><th>Output</th><th>Net</th><th>ISL</th><th>FO%</th></tr></thead>
              <tbody>{fbHistory.map(fb => (
                <tr key={fb.id}><td>{fb.date}</td><td>{fb.total_input}</td><td>{fb.total_output}</td>
                  <td>{fb.net_balance}</td><td>{fb.isl_daily}</td>
                  <td><span className={`badge ${fb.fluid_overload_pct < 5 ? 'bg-green' : fb.fluid_overload_pct < 10 ? 'bg-amber' : 'bg-red'}`}>{fb.fluid_overload_pct?.toFixed(1)}%</span></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {activeTab === 'drugs' && (
        <div>
          <Link to={`/patients/${id}/drugs`} className="btn btn-blue mb-3">Manage Drugs</Link>
          {drugs.length === 0 ? <p className="text-muted">No drugs added.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Drug</th><th>Dose</th><th>Max</th><th>Freq</th><th>Route</th><th>Start</th></tr></thead>
              <tbody>{drugs.map(d => (
                <tr key={d.id}><td><strong>{d.drug_name}</strong>{d.notes && <div className="text-sm text-muted">{d.notes}</div>}</td>
                  <td>{d.dose_override || d.dose_per_kg || '—'}</td><td>{d.max_dose || '—'}</td>
                  <td>{d.frequency || '—'}</td><td>{d.route || '—'}</td><td>{d.start_date || '—'}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {activeTab === 'labs' && (
        <div>
          <Link to={`/patients/${id}/investigations`} className="btn btn-ghost mb-3">Add Investigations</Link>
          {labs.length === 0 ? <p className="text-muted">No investigations.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Test</th><th>Value</th><th>Unit</th></tr></thead>
              <tbody>{labs.flatMap(lab => 
                Object.entries(lab.lab_values || {}).map(([name, v]) => (
                  <tr key={`${lab.id}-${name}`}><td>{lab.date}</td><td>{name}</td><td><strong>{v.value}</strong></td><td>{v.unit || '—'}</td></tr>
                ))
              )}</tbody>
            </table></div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div>
          <Link to={`/patients/${id}/notes`} className="btn btn-ghost mb-3">Add Note</Link>
          {notes.length === 0 ? <p className="text-muted">No notes yet.</p> : (
            notes.map(n => {
              const labels = { progress: 'Progress', ward_round: 'Ward Round', procedure: 'Procedure', nursing: 'Nursing' };
              return (
                <div key={n.id} className="note-card">
                  <div className="flex jc-between items-c mb-2">
                    <span className="badge bg-blue">{labels[n.type] || n.type}</span>
                    <span className="text-sm text-muted">{new Date(n.created_at).toLocaleString('en-GB')}</span>
                  </div>
                  <p className="note-text">{n.text}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'images' && (
        <div>
          <Link to={`/patients/${id}/images`} className="btn btn-ghost mb-3">Upload Image</Link>
          {images.length === 0 ? <p className="text-muted">No images uploaded.</p> : (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12}}>
              {images.map(img => (
                <div key={img.id} style={{textAlign: 'center'}}>
                  <a href={img.storage_url} target="_blank" rel="noreferrer">
                    <img src={img.storage_url} alt={img.description} style={{width:'100%', borderRadius: 8, border: '1px solid var(--border)'}} loading="lazy" />
                  </a>
                  <p className="text-sm text-muted mt-2">{img.type}: {img.description || ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calcs' && (
        <div>
          <Link to="/calculators" className="btn btn-teal mb-3">Open Calculators</Link>
          <p className="text-muted">Use the calculators page for PELOD-2, PRISM-IV, Phoenix, PALS, and more.</p>
        </div>
      )}
    </div>
  );
}
