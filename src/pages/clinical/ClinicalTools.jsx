import { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, HeartPulse, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import { ALGORITHMS, CLINICAL_REFERENCES, DRUGS, POCUS_TOPICS, SCORE_DEFINITIONS, calculateDrugDose, getReference } from '../../lib/clinicalTools';

const TABS = [
  ['drugs', 'Drug dosing'],
  ['scores', 'Sedation scales'],
  ['pain', 'Pain scales'],
  ['delirium', 'Delirium'],
  ['pocus', 'POCUS'],
  ['algorithms', 'Algorithms'],
];

function PatientContext({ context, setContext }) {
  const update = (key, value) => setContext((current) => ({ ...current, [key]: value }));
  return (
    <div className="card clinical-context">
      <div className="card-head"><div><h3>Patient context</h3><p className="text-muted">Enter the minimum context once. It is shared across dosing and assessment tools.</p></div><ShieldCheck size={20} /></div>
      <div className="card-body form-grid-3">
        <div className="form-group"><label className="form-label">Age</label><input className="form-input" type="number" min="0" step="0.1" value={context.age} onChange={(e) => update('age', e.target.value)} placeholder="e.g. 4" /></div>
        <div className="form-group"><label className="form-label">Age unit</label><select className="form-select" value={context.ageUnit} onChange={(e) => update('ageUnit', e.target.value)}><option value="years">Years</option><option value="months">Months</option><option value="days">Days</option></select></div>
        <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" min="0" step="0.1" value={context.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 12" /></div>
        <div className="form-group"><label className="form-label">Sex</label><select className="form-select" value={context.sex} onChange={(e) => update('sex', e.target.value)}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex / other</option></select></div>
        <div className="form-group"><label className="form-label">Diagnosis / indication</label><input className="form-input" value={context.diagnosis} onChange={(e) => update('diagnosis', e.target.value)} placeholder="e.g. septic shock" /></div>
        <div className="form-group"><label className="form-label">Renal status</label><select className="form-select" value={context.renal} onChange={(e) => update('renal', e.target.value)}><option value="normal">No AKI / not known</option><option value="aki">AKI / kidney injury</option><option value="dialysis">On dialysis / CRRT</option></select></div>
      </div>
    </div>
  );
}

function ReferenceLink({ id }) {
  const reference = getReference(id);
  return <a className="clinical-reference" href={reference.url} target="_blank" rel="noreferrer">Source: {reference.label} <ExternalLink size={13} /></a>;
}

function DrugPanel({ context }) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('All');
  const [selected, setSelected] = useState(null);
  const letters = ['All', ...new Set(DRUGS.map((drug) => drug.letter))];
  const filtered = useMemo(() => DRUGS.filter((drug) => drug.name.toLowerCase().includes(query.toLowerCase()) && (letter === 'All' || drug.letter === letter)), [letter, query]);
  const dose = selected ? calculateDrugDose(selected, context.weight) : null;
  return <>
    <div className="notice notice-warning"><AlertTriangle size={18} /><span><strong>Clinical safety:</strong> This is a reference and calculation aid, not a prescribing system. Verify concentration, indication, maximums, local antimicrobial policy, renal function, and pharmacy guidance before administration.</span></div>
    <div className="clinical-toolbar"><div className="search-field"><Search size={16} /><input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drug by name" /></div><div className="letter-filter">{letters.map((item) => <button key={item} className={`chip ${letter === item ? 'active' : ''}`} onClick={() => setLetter(item)}>{item}</button>)}</div></div>
    <div className="clinical-grid">{filtered.map((drug) => <button className={`clinical-item ${selected?.name === drug.name ? 'selected' : ''}`} key={drug.name} onClick={() => setSelected(drug)}><span className="letter-badge">{drug.letter}</span><span><strong>{drug.name}</strong><small>{drug.indication}</small><small>{drug.dose} {drug.unit} · {drug.route}</small></span></button>)}</div>
    {selected && <div className="card mt-3"><div className="card-head"><div><h3>{selected.name}</h3><p className="text-muted">{selected.indication}</p></div><span className="badge badge-teal">{selected.route}</span></div><div className="card-body"><div className="rbox"><div className="rrow"><span className="rlbl">Reference dose</span><span className="rval">{selected.dose} {selected.unit}</span></div><div className="rrow"><span className="rlbl">Calculated amount</span><span className="rval big-num">{dose ? `${dose.capped.toFixed(2)} mg${dose.cappedByMax ? ' (capped at listed maximum)' : ''}` : 'Enter weight'}</span></div><div className="rrow"><span className="rlbl">Frequency</span><span className="rval">{selected.frequency}</span></div><div className="rrow"><span className="rlbl">Maximum</span><span className="rval">{selected.max} mg</span></div><div className="rrow"><span className="rlbl">Renal / dialysis note</span><span className="rval">{context.renal === 'normal' ? selected.renal : selected.dialysis}</span></div></div><ReferenceLink id={selected.reference} /></div></div>}
  </>;
}

function ScalePanel({ type, context }) {
  const definition = SCORE_DEFINITIONS[type];
  const [scores, setScores] = useState({});
  const total = Object.values(scores).reduce((sum, value) => sum + Number(value || 0), 0);
  return <div className="card"><div className="card-head"><div><h3>{definition.title}</h3><p className="text-muted">{definition.interpretation}</p></div><span className="badge badge-blue">{definition.range}</span></div><div className="card-body"><div className="score-context">{context.age ? `${context.age} ${context.ageUnit}` : 'Age not entered'} · {context.weight ? `${context.weight} kg` : 'Weight not entered'} · {context.sex || 'sex not specified'}</div>{definition.items.map((item, index) => <div className="score-row" key={item}><label>{index + 1}. {item}</label><input className="form-input score-input" type="number" min="0" max="5" value={scores[index] || ''} onChange={(e) => setScores((current) => ({ ...current, [index]: e.target.value }))} placeholder="0" /></div>)}<div className="score-total"><span>Total recorded score</span><strong>{total}</strong></div><ReferenceLink id={definition.reference} /></div></div>;
}

function DeliriumPanel({ context }) {
  const [type, setType] = useState('CAPD');
  return <><div className="form-group compact-select"><label className="form-label">Delirium tool</label><select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>{['CAPD', 'pCAM-ICU', 'SOS-PD'].map((item) => <option key={item}>{item}</option>)}</select></div><ScalePanel type={type} context={context} /></>;
}

function PainPanel({ context }) {
  const ageYears = context.ageUnit === 'years' ? Number(context.age) : context.ageUnit === 'months' ? Number(context.age) / 12 : Number(context.age) / 365;
  const options = ageYears < 1 ? ['NIPS', 'CRIES'] : ageYears < 8 ? ['FLACC', 'FACES'] : ['FACES'];
  const [type, setType] = useState(options[0]);
  return <><div className="card pain-choice"><div className="card-body"><strong>Suggested tools by age:</strong> {options.join(' or ')}. Select the instrument that matches developmental status and ability to self-report.<select className="form-select mt-2" value={type} onChange={(e) => setType(e.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select></div></div><ScalePanel type={type} context={context} /></>;
}

function PocusPanel() {
  return <div className="clinical-grid">{POCUS_TOPICS.map((topic) => <div className="card clinical-topic" key={topic}><div className="card-body"><HeartPulse size={22} /><h3>POCUS {topic}</h3><p className="text-muted">Structured learning and documentation area for image acquisition, interpretation, limitations, and supervision notes.</p><span className="badge badge-amber">Reference pathway</span></div></div>)}</div>;
}

function AlgorithmsPanel({ context }) {
  return <div className="clinical-grid">{ALGORITHMS.map((algorithm) => <div className="card clinical-topic" key={algorithm.title}><div className="card-body"><Stethoscope size={22} /><h3>{algorithm.title}</h3><p>{algorithm.description}</p><p className="text-muted">Patient context: {context.weight ? `${context.weight} kg` : 'weight not entered'}; {context.diagnosis || 'diagnosis not entered'}.</p><ReferenceLink id={algorithm.reference} /></div></div>)}</div>;
}

export default function ClinicalTools() {
  const [activeTab, setActiveTab] = useState('drugs');
  const [context, setContext] = useState({ age: '', ageUnit: 'years', weight: '', sex: '', diagnosis: '', renal: 'normal' });
  return <div className="page-content clinical-page"><div className="page-heading"><div><p className="eyebrow">Expanded pediatric care workspace</p><h2>Clinical Tools</h2><p className="text-muted">Dosing, validated assessment prompts, point-of-care ultrasound topics, and guideline-linked pathways for children beyond the PICU.</p></div></div><PatientContext context={context} setContext={setContext} /><div className="clinical-tabs">{TABS.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</div><div className="clinical-panel">{activeTab === 'drugs' && <DrugPanel context={context} />}{activeTab === 'scores' && <ScalePanel type="COMFORT-B" context={context} />}{activeTab === 'pain' && <PainPanel context={context} />}{activeTab === 'delirium' && <DeliriumPanel context={context} />}{activeTab === 'pocus' && <PocusPanel />}{activeTab === 'algorithms' && <AlgorithmsPanel context={context} />}</div><div className="clinical-footnote"><strong>Verification is required.</strong> Clinical content must be reconciled with current institutional protocols, licensed references, patient-specific data, and the supervising clinician’s judgment. <span>References:</span> {CLINICAL_REFERENCES.map((reference) => <a key={reference.id} href={reference.url} target="_blank" rel="noreferrer">{reference.label}</a>)}</div></div>;
}
