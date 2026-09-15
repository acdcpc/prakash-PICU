import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { notifyError } from '../../lib/notifications';
import PatientContextHeader from '../../components/PatientContextHeader';

export default function Investigations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [patient, setPatient] = useState(null);
  const [labs, setLabs] = useState([]);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([{ name: '', value: '', unit: '' }]);

  useEffect(() => {
    supabase.from('patients').select('*').eq('id', id).single().then(({ data }) => setPatient(data));
    loadLabs();
  }, [id]);

  async function loadLabs() {
    const { data } = await supabase.from('investigations').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(50);
    setLabs(data || []);
  }

  function addRow() { setRows([...rows, { name: '', value: '', unit: '' }]); }
  function updateRow(i, field, val) { const n = [...rows]; n[i][field] = val; setRows(n); }
  function removeRow(i) { setRows(rows.filter((_, idx) => idx !== i)); }

  async function handleSave(e) {
    e.preventDefault();
    const labValues = {};
    rows.forEach(r => { if (r.name && r.value) labValues[r.name] = { value: parseFloat(r.value), unit: r.unit || '' }; });
    if (Object.keys(labValues).length === 0) { notifyError('Add at least one test.'); return; }
    await supabase.from('investigations').insert({ patient_id: id, date, lab_values: labValues });
    setRows([{ name: '', value: '', unit: '' }]);
    loadLabs();
  }

  return (
    <div>
      <PatientContextHeader patientId={id} />
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/patients/${id}`)}><ArrowLeft size={16} /> Back</button>
      <h3>Investigations — Bed {patient?.bed_number || '—'}</h3>

      <div className="card mt-3" style={{maxWidth: 560}}>
        <div className="card-head"><h4>Add Investigation</h4></div>
        <div className="card-body">
          <form onSubmit={handleSave}>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2 mb-2 items-c">
                <input className="form-input" placeholder="Test" value={r.name} onChange={e => updateRow(i, 'name', e.target.value)} style={{flex:1}} />
                <input className="form-input sm" type="number" step="0.01" placeholder="Value" value={r.value} onChange={e => updateRow(i, 'value', e.target.value)} style={{width:90}} />
                <input className="form-input sm" placeholder="Unit" value={r.unit} onChange={e => updateRow(i, 'unit', e.target.value)} style={{width:70}} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm mb-3" onClick={addRow}><Plus size={14} /> Add Test</button>
            <button type="submit" className="btn btn-teal btn-block">Save</button>
          </form>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-head"><h4>History</h4></div>
        <div className="card-body">
          {labs.length === 0 ? <p className="text-muted">No investigations.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Test</th><th>Value</th><th>Unit</th></tr></thead>
              <tbody>{labs.flatMap(lab => Object.entries(lab.lab_values || {}).map(([name, v]) => (
                <tr key={`${lab.id}-${name}`}><td>{lab.date}</td><td>{name}</td><td><strong>{v.value}</strong></td><td>{v.unit || '—'}</td></tr>
              )))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
