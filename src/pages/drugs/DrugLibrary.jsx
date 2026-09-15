import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { notifyError } from '../../lib/notifications';
import PatientContextHeader from '../../components/PatientContextHeader';

const DEFAULT_DRUGS = [
  { name:'Morphine', dose:'0.1 mg/kg', max:'10 mg', freq:'2-4h PRN', route:'IV/SC/PO', prep:'Dilute to 1 mg/mL in NS' },
  { name:'Fentanyl', dose:'1-2 mcg/kg', max:'100 mcg/dose', freq:'Infusion/PRN', route:'IV', prep:'Infusion: 10 mcg/kg in 50 mL' },
  { name:'Midazolam', dose:'0.05-0.1 mg/kg', max:'5 mg', freq:'PRN/Continuous', route:'IV', prep:'Infusion: 0.5 mg/kg in 50 mL' },
  { name:'Dopamine', dose:'5-20 mcg/kg/min', max:'20 mcg/kg/min', freq:'Continuous', route:'IV central', prep:'3 mg/kg in 50 mL D5W' },
  { name:'Dobutamine', dose:'5-20 mcg/kg/min', max:'20 mcg/kg/min', freq:'Continuous', route:'IV central', prep:'3 mg/kg in 50 mL D5W' },
  { name:'Adrenaline', dose:'0.01-1 mcg/kg/min', max:'1 mcg/kg/min', freq:'Continuous', route:'IV central', prep:'0.3 mg/kg in 50 mL' },
  { name:'Noradrenaline', dose:'0.05-1 mcg/kg/min', max:'2 mcg/kg/min', freq:'Continuous', route:'IV central', prep:'0.3 mg/kg in 50 mL' },
  { name:'Furosemide', dose:'1 mg/kg', max:'40 mg', freq:'BD-TDS', route:'IV/PO', prep:'Undiluted or dilute in NS' },
  { name:'Ceftriaxone', dose:'50-100 mg/kg', max:'4 g/day', freq:'24h/BD', route:'IV/IM', prep:'Dilute in NS; infuse over 30 min' },
  { name:'Vancomycin', dose:'15 mg/kg', max:'500 mg', freq:'6-8h', route:'IV', prep:'Dilute to 5 mg/mL; infuse ≥60 min' },
  { name:'Paracetamol', dose:'15 mg/kg', max:'1000 mg', freq:'4-6h', route:'PO/IV/PR', prep:'Max 75 mg/kg/day' },
  { name:'Adenosine', dose:'0.1 mg/kg', max:'6 mg', freq:'SVT: repeat 0.2 mg/kg', route:'Rapid IV', prep:'Push closest port; flush with NS' },
  { name:'Amiodarone', dose:'5 mg/kg', max:'300 mg', freq:'Loading; maintenance 10-15 mg/kg/day', route:'IV central', prep:'Dilute in D5W; photosensitive' },
  { name:'Atropine', dose:'0.02 mg/kg', max:'0.5 mg', freq:'PRN; may repeat', route:'IV/IO/ETT', prep:'Min dose 0.1 mg' },
  { name:'Insulin (regular)', dose:'0.05-0.1 U/kg/hr', max:'Per protocol', freq:'Continuous', route:'IV', prep:'1 unit/mL in NS' },
];

export default function DrugLibrary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [drugs, setDrugs] = useState([]);
  const [selDrug, setSelDrug] = useState('');
  const [doseOverride, setDoseOverride] = useState('');
  const [note, setNote] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    supabase.from('patients').select('*').eq('id', id).single().then(({ data }) => setPatient(data));
    loadDrugs();
  }, [id]);

  async function loadDrugs() {
    const { data } = await supabase.from('patient_drugs').select('*').eq('patient_id', id).order('created_at', { ascending: false });
    setDrugs(data || []);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!selDrug) { notifyError('Select a drug.'); return; }
    const drug = DEFAULT_DRUGS.find(d => d.name === selDrug);
    await supabase.from('patient_drugs').insert({
      patient_id: id, drug_name: selDrug,
      dose_per_kg: drug?.dose, max_dose: drug?.max, frequency: drug?.freq,
      route: drug?.route, prep: drug?.prep,
      dose_override: doseOverride, notes: note, start_date: startDate,
    });
    setSelDrug(''); setDoseOverride(''); setNote('');
    loadDrugs();
  }

  return (
    <div>
      <PatientContextHeader patientId={id} />
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/patients/${id}`)}><ArrowLeft size={16} /> Back</button>
      <h3>Drug Library — Bed {patient?.bed_number || '—'}</h3>

      <div className="card mt-3" style={{maxWidth: 500}}>
        <div className="card-head"><h4>Add Medication</h4></div>
        <div className="card-body">
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label">Drug</label>
              <select className="form-select" value={selDrug} onChange={e => setSelDrug(e.target.value)}>
                <option value="">Select drug…</option>
                {DEFAULT_DRUGS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Dose Override</label><input className="form-input" value={doseOverride} onChange={e => setDoseOverride(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={note} onChange={e => setNote(e.target.value)} /></div>
            <button type="submit" className="btn btn-blue btn-block">Add Drug</button>
          </form>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-head"><h4>Active Medications</h4></div>
        <div className="card-body">
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
      </div>
    </div>
  );
}
