import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { notifyError } from '../../lib/notifications';

const VENT_OPTIONS = [
  { value: '', label: 'Spontaneous / Room air' },
  { value: 'hfnc', label: 'HFNC' },
  { value: 'mv_hum', label: 'MV with humidifier' },
  { value: 'mv_hme', label: 'MV with HME' },
];

export default function FluidBalance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(today);
  const [admWt, setAdmWt] = useState('');
  const [temp, setTemp] = useState('37');
  const [vent, setVent] = useState('');
  const [crrt, setCrrt] = useState('no');
  const [cumIn, setCumIn] = useState('0');
  const [cumOut, setCumOut] = useState('0');
  const [urine, setUrine] = useState('');
  const [stool, setStool] = useState('');
  const [inputs, setInputs] = useState([{ type: '', vol: '' }]);
  const [drains, setDrains] = useState([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: pt } = await supabase.from('patients').select('*').eq('id', id).single();
    setPatient(pt);
    if (pt) {
      setAdmWt(pt.admission_weight || pt.weight || '');
    }
    const { data: fb } = await supabase.from('fluid_balance').select('*').eq('patient_id', id).order('date', { ascending: false }).limit(14);
    setHistory(fb || []);
    setLoading(false);
  }

  function addInput() { setInputs([...inputs, { type: '', vol: '' }]); }
  function updateInput(i, field, val) {
    const n = [...inputs]; n[i][field] = val; setInputs(n);
  }
  function removeInput(i) { setInputs(inputs.filter((_, idx) => idx !== i)); }

  function addDrain() { setDrains([...drains, { type: '', vol: '' }]); }
  function updateDrain(i, field, val) {
    const n = [...drains]; n[i][field] = val; setDrains(n);
  }
  function removeDrain(i) { setDrains(drains.filter((_, idx) => idx !== i)); }

  function calcISL(age, wt, t, v, c) {
    let base;
    if (age < 0.083) base = 50;
    else if (age < 0.25) base = 35;
    else if (age < 1) base = 27.5;
    else if (age < 3) base = 22.5;
    else if (age < 6) base = 20;
    else if (age < 12) base = 16.5;
    else base = 14;
    const ventAdj = v === 'hfnc' ? -4 : v === 'mv_hum' ? -7 : v === 'mv_hme' ? -2.5 : 0;
    let isl = base + ventAdj;
    if (t > 37) isl += isl * 0.12 * (t - 37);
    if (c === 'yes') isl -= 5;
    isl = Math.max(0, isl);
    return { base: +base.toFixed(1), ventAdj, adjusted: +isl.toFixed(1), dailyML: Math.round(isl * wt) };
  }

  async function handleSave(e) {
    e.preventDefault();
    const age = patient?.age || 2;
    const wt = patient?.weight || parseFloat(admWt) || 10;
    const aWt = parseFloat(admWt) || wt;
    const t = parseFloat(temp) || 37;
    let totalIn = inputs.reduce((s, i) => s + (parseFloat(i.vol) || 0), 0);
    let totalOut = (parseFloat(urine) || 0) + (parseFloat(stool) || 0);
    totalOut += drains.reduce((s, d) => s + (parseFloat(d.vol) || 0), 0);
    const cI = parseFloat(cumIn) || 0;
    const cO = parseFloat(cumOut) || 0;
    const isl = calcISL(age, wt, t, vent, crrt);
    const fo = aWt > 0 ? ((cI - cO) / aWt) * 100 : 0;
    const foStatus = fo < 5 ? 'acceptable' : fo < 10 ? 'mild' : fo < 15 ? 'moderate' : 'severe';

    const fbData = {
      patient_id: id, date,
      inputs: inputs.filter(i => i.type), drains: drains.filter(d => d.type),
      urine: parseFloat(urine) || 0, stool: parseFloat(stool) || 0,
      total_input: totalIn, total_output: totalOut,
      net_balance: totalIn - totalOut,
      cum_input: cI, cum_output: cO,
      fluid_overload_pct: +fo.toFixed(2),
      isl: isl.adjusted, isl_daily: isl.dailyML,
      fo_status: foStatus,
      temp: t, vent: vent || null, crrt, admission_weight: aWt,
    };

    const { error } = await supabase.from('fluid_balance').upsert(fbData, { onConflict: 'patient_id,date' });
    if (error) { notifyError('Error: ' + error.message); return; }

    // Update patient's latest FO
    await supabase.from('patients').update({ latest_fo: +fo.toFixed(2) }).eq('id', id);

    setResult({ ...fbData, islCalc: isl, admWt: aWt });
    loadData();
  }

  if (loading) return <div className="loader"><div className="spinner"></div> Loading…</div>;
  if (!patient) return <div className="alert alert-warn">Patient not found.</div>;

  const fo = result?.fluid_overload_pct;
  const foClass = fo < 5 ? 'bg-green' : fo < 10 ? 'bg-amber' : 'bg-red';
  const foAlert = fo < 5 ? 'alert-success' : fo < 10 ? 'alert-warn' : 'alert-danger';
  const foMsg = fo < 5 ? '✅ Acceptable fluid balance — continue monitoring'
    : fo < 10 ? '⚠️ Mild fluid overload — consider fluid restriction'
    : fo < 15 ? '🔴 Moderate overload — diuresis indicated'
    : '🆘 SEVERE fluid overload — escalate immediately';

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/patients/${id}`)}>
        <ArrowLeft size={16} /> Back to Patient
      </button>
      <h3>Fluid Balance — Bed {patient.bed_number}</h3>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}} className="mt-3">
        <div>
          <div className="card">
            <div className="card-head"><h4>Today's Fluid Balance</h4></div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Admission Weight (kg)</label><input className="form-input" type="number" step="0.1" value={admWt} onChange={e => setAdmWt(e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Temperature (°C)</label><input className="form-input" type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Ventilation</label><select className="form-select" value={vent} onChange={e => setVent(e.target.value)}>{VENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">CRRT</label><select className="form-select" value={crrt} onChange={e => setCrrt(e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></div>
                  <div className="form-group"><label className="form-label">Cum. Input (mL)</label><input className="form-input" type="number" value={cumIn} onChange={e => setCumIn(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Cum. Output (mL)</label><input className="form-input" type="number" value={cumOut} onChange={e => setCumOut(e.target.value)} /></div>
                </div>

                <h4 className="mt-3 mb-2" style={{fontSize:'.9rem', fontFamily:'DM Sans'}}>Input Fluids</h4>
                {inputs.map((inp, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-c">
                    <input className="form-input" placeholder="Type (IVF, NG feed…)" value={inp.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{flex:1}} />
                    <input className="form-input sm" type="number" placeholder="mL" value={inp.vol} onChange={e => updateInput(i, 'vol', e.target.value)} style={{width:80}} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeInput(i)}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm mb-3" onClick={addInput}><Plus size={14} /> Add Input</button>

                <h4 className="mt-2 mb-2" style={{fontSize:'.9rem', fontFamily:'DM Sans'}}>Drains</h4>
                {drains.map((d, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-c">
                    <input className="form-input" placeholder="Drain type" value={d.type} onChange={e => updateDrain(i, 'type', e.target.value)} style={{flex:1}} />
                    <input className="form-input sm" type="number" placeholder="mL" value={d.vol} onChange={e => updateDrain(i, 'vol', e.target.value)} style={{width:80}} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDrain(i)}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm mb-3" onClick={addDrain}><Plus size={14} /> Add Drain</button>

                <div className="form-row">
                  <div className="form-group"><label className="form-label">Urine (mL)</label><input className="form-input" type="number" value={urine} onChange={e => setUrine(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Stool (mL)</label><input className="form-input" type="number" value={stool} onChange={e => setStool(e.target.value)} /></div>
                </div>

                <button type="submit" className="btn btn-teal btn-block mt-2">Calculate &amp; Save</button>
              </form>
            </div>
          </div>

          {result && (
            <div className="card mt-3">
              <div className="card-head"><h4>Result — {result.date}</h4></div>
              <div className="card-body">
                <div className="rbox">
                  <div className="rrow"><span className="rlbl">Base ISL (age-based)</span><span className="rval">{result.islCalc.base} mL/kg/day</span></div>
                  <div className="rrow"><span className="rlbl">Ventilation adjustment</span><span className="rval">{result.islCalc.ventAdj} mL/kg/day</span></div>
                  <div className="rrow"><span className="rlbl">Adjusted ISL</span><span className="rval">{result.islCalc.adjusted} mL/kg/day</span></div>
                  <div className="rrow"><span className="rlbl">Daily ISL Total</span><span className="rval" style={{color:'var(--teal)',fontSize:'1.1rem'}}>{result.islCalc.dailyML} mL/day</span></div>
                  <div className="rrow"><span className="rlbl">Today Input</span><span className="rval">{result.total_input} mL</span></div>
                  <div className="rrow"><span className="rlbl">Today Output</span><span className="rval">{result.total_output} mL</span></div>
                  <div className="rrow"><span className="rlbl">Net Balance</span><span className="rval">{result.net_balance > 0 ? '+' : ''}{result.net_balance} mL</span></div>
                  <div className="rrow"><span className="rlbl">Cumulative FO%</span><span className="rval"><span className={`badge ${foClass}`} style={{fontSize:14}}>{fo?.toFixed(1)}%</span></span></div>
                </div>
                <div className={`alert ${foAlert} mt-2`}>{foMsg}</div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <div className="card-head"><h4>History (Last 14 Days)</h4></div>
            <div className="card-body">
              {history.length === 0 ? <p className="text-muted">No records yet.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Net</th><th>ISL</th><th>FO%</th></tr></thead>
                    <tbody>
                      {history.map(fb => {
                        const bc = fb.fluid_overload_pct < 5 ? 'bg-green' : fb.fluid_overload_pct < 10 ? 'bg-amber' : 'bg-red';
                        return (
                          <tr key={fb.id}>
                            <td>{fb.date}</td><td>{fb.total_input}</td><td>{fb.total_output}</td>
                            <td>{fb.net_balance > 0 ? '+' : ''}{fb.net_balance}</td><td>{fb.isl_daily}</td>
                            <td><span className={`badge ${bc}`}>{fb.fluid_overload_pct?.toFixed(1)}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
