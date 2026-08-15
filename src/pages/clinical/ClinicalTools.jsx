import { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, HeartPulse, Search, ShieldCheck, Stethoscope, Star, Clock3 } from 'lucide-react';
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
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('picu-favorite-drugs') || '[]'));
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem('picu-recent-drugs') || '[]'));
  const letters = ['All', ...new Set(DRUGS.map((drug) => drug.letter))];
  const filtered = useMemo(() => DRUGS.filter((drug) => drug.name.toLowerCase().includes(query.toLowerCase()) && (letter === 'All' || drug.letter === letter)).sort((a, b) => Number(favorites.includes(b.name)) - Number(favorites.includes(a.name))), [favorites, letter, query]);
  const dose = selected ? calculateDrugDose(selected, context.weight) : null;
  const chooseDrug = (drug) => { setSelected(drug); const next = [drug.name, ...recent.filter((name) => name !== drug.name)].slice(0, 5); setRecent(next); localStorage.setItem('picu-recent-drugs', JSON.stringify(next)); };
  const toggleFavorite = (name) => { const next = favorites.includes(name) ? favorites.filter((item) => item !== name) : [...favorites, name]; setFavorites(next); localStorage.setItem('picu-favorite-drugs', JSON.stringify(next)); };
  return <>
    <div className="notice notice-warning"><AlertTriangle size={18} /><span><strong>Clinical safety:</strong> This is a reference and calculation aid, not a prescribing system. Verify concentration, indication, maximums, local antimicrobial policy, renal function, and pharmacy guidance before administration.</span></div>
    <div className="clinical-toolbar"><div className="search-field"><Search size={16} /><input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by drug, indication, route, or question" /></div><div className="letter-filter">{letters.map((item) => <button key={item} className={`chip ${letter === item ? 'active' : ''}`} onClick={() => setLetter(item)}>{item}</button>)}</div></div>
    <div className="drug-recents">{recent.length > 0 && <><Clock3 size={14} /><span>Recent:</span>{recent.map((name) => <button className="chip" key={name} onClick={() => chooseDrug(DRUGS.find((drug) => drug.name === name))}>{name}</button>)}</>}</div>
    <div className="clinical-grid">{filtered.map((drug) => <div className={`clinical-item drug-item ${selected?.name === drug.name ? 'selected' : ''}`} key={drug.name}><button className="drug-select" onClick={() => chooseDrug(drug)}><span className="letter-badge">{drug.letter}</span><span><strong>{drug.name}</strong><small>{drug.indication}</small><small>{drug.dose} {drug.unit} · {drug.route}</small></span></button><button className={`favorite-button ${favorites.includes(drug.name) ? 'is-favorite' : ''}`} aria-label={`${favorites.includes(drug.name) ? 'Remove' : 'Add'} ${drug.name} favorite`} onClick={() => toggleFavorite(drug.name)}><Star size={16} fill={favorites.includes(drug.name) ? 'currentColor' : 'none'} /></button></div>)}</div>
    {selected && <div className="card mt-3"><div className="card-head"><div><h3>{selected.name}</h3><p className="text-muted">{selected.indication}</p></div><span className="badge badge-teal">{selected.route}</span></div><div className="card-body"><div className="rbox"><div className="rrow"><span className="rlbl">Reference dose</span><span className="rval">{selected.dose} {selected.unit}</span></div><div className="rrow"><span className="rlbl">Calculated amount</span><span className="rval big-num">{dose ? `${dose.capped.toFixed(2)} mg${dose.cappedByMax ? ' (capped at listed maximum)' : ''}` : 'Enter weight'}</span></div><div className="rrow"><span className="rlbl">Frequency</span><span className="rval">{selected.frequency}</span></div><div className="rrow"><span className="rlbl">Maximum</span><span className="rval">{selected.max} mg</span></div><div className="rrow"><span className="rlbl">Renal / dialysis note</span><span className="rval">{context.renal === 'normal' ? selected.renal : selected.dialysis}</span></div><div className="rrow"><span className="rlbl">Data status</span><span className="rval">Starter reference · verify current local monograph</span></div><div className="rrow"><span className="rlbl">Formulation / interactions</span><span className="rval">Confirm concentration, formulation, allergies, interactions, and adverse-effect monitoring with pharmacy.</span></div></div><ReferenceLink id={selected.reference} /></div></div>}
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
  const [topic, setTopic] = useState(POCUS_TOPICS[0]);
  const [form, setForm] = useState({ indication: '', views: '', findings: '', limitations: '', supervisor: '', followUp: '' });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const saveDraft = () => { alert('POCUS draft retained in memory for this session only. Secure patient-bound storage and audit integration are required before clinical deployment.'); };
  return <div><div className="clinical-grid mb-3">{POCUS_TOPICS.map((item) => <button className={`clinical-item ${topic === item ? 'selected' : ''}`} key={item} onClick={() => setTopic(item)}><HeartPulse size={22} /><span><strong>POCUS {item}</strong><small>Choose study type</small></span></button>)}</div><div className="card"><div className="card-head"><div><h3>POCUS {topic} documentation</h3><p className="text-muted">Record indication, acquisition, interpretation, limitations, and supervision. This session draft is not persisted to the browser and must not contain patient identifiers.</p></div><span className="badge badge-amber">Draft workflow</span></div><div className="card-body form-grid-3"><div className="form-group"><label className="form-label">Indication</label><input className="form-input" value={form.indication} onChange={(e) => update('indication', e.target.value)} placeholder="Clinical question" /></div><div className="form-group"><label className="form-label">Views / protocol</label><input className="form-input" value={form.views} onChange={(e) => update('views', e.target.value)} placeholder="Views obtained" /></div><div className="form-group"><label className="form-label">Supervisor / credential</label><input className="form-input" value={form.supervisor} onChange={(e) => update('supervisor', e.target.value)} placeholder="If supervised" /></div><div className="form-group"><label className="form-label">Findings</label><textarea className="form-textarea" value={form.findings} onChange={(e) => update('findings', e.target.value)} placeholder="Structured findings" /></div><div className="form-group"><label className="form-label">Limitations / quality</label><textarea className="form-textarea" value={form.limitations} onChange={(e) => update('limitations', e.target.value)} placeholder="Technical limitations" /></div><div className="form-group"><label className="form-label">Follow-up / escalation</label><textarea className="form-textarea" value={form.followUp} onChange={(e) => update('followUp', e.target.value)} placeholder="Next step" /></div><div><button className="btn btn-primary" onClick={saveDraft}>Save draft</button></div></div></div></div>;
}

function AlgorithmsPanel({ context }) {
  const [open, setOpen] = useState(null);
  const [progress, setProgress] = useState({});
  const defaultSteps = ['Recognize severity and immediate threats', 'Stabilize ABCDE and obtain key measurements', 'Select local pathway, medication, and monitoring plan', 'Reassess response and escalate / consult if deteriorating'];
  const toggle = (title, index) => setProgress((current) => ({ ...current, [title]: { ...(current[title] || {}), [index]: !(current[title]?.[index]) } }));
  return <div className="clinical-grid">{ALGORITHMS.map((algorithm) => { const steps = progress[algorithm.title] || {}; const done = Object.values(steps).filter(Boolean).length; return <div className={`card clinical-topic algorithm-card ${open === algorithm.title ? 'expanded' : ''}`} key={algorithm.title}><div className="card-body"><div className="algorithm-card-head"><Stethoscope size={22} /><span className="badge badge-blue">{done}/{defaultSteps.length}</span></div><h3>{algorithm.title}</h3><p>{algorithm.description}</p><p className="text-muted">Patient context: {context.weight ? `${context.weight} kg` : 'weight not entered'}; {context.diagnosis || 'diagnosis not entered'}.</p><button className="btn btn-ghost" onClick={() => setOpen(open === algorithm.title ? null : algorithm.title)}>{open === algorithm.title ? 'Hide checklist' : 'Open checklist'}</button>{open === algorithm.title && <div className="algorithm-steps">{defaultSteps.map((step, index) => <label key={step} className={steps[index] ? 'done' : ''}><input type="checkbox" checked={Boolean(steps[index])} onChange={() => toggle(algorithm.title, index)} />{step}</label>)}<div className="notice notice-warning mt-2">If the child is deteriorating, activate local escalation and senior/critical-care consultation rather than continuing this checklist.</div></div>}<ReferenceLink id={algorithm.reference} /></div></div>; })}</div>;
}

export default function ClinicalTools() {
  const [activeTab, setActiveTab] = useState('drugs');
  const [context, setContext] = useState({ age: '', ageUnit: 'years', weight: '', sex: '', diagnosis: '', renal: 'normal' });
  return <div className="page-content clinical-page"><div className="page-heading"><div><p className="eyebrow">Expanded pediatric care workspace</p><h2>Clinical Tools</h2><p className="text-muted">Dosing, validated assessment prompts, point-of-care ultrasound topics, and guideline-linked pathways for children beyond the PICU.</p></div></div><PatientContext context={context} setContext={setContext} /><div className="clinical-tabs">{TABS.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</div><div className="clinical-panel">{activeTab === 'drugs' && <DrugPanel context={context} />}{activeTab === 'scores' && <ScalePanel type="COMFORT-B" context={context} />}{activeTab === 'pain' && <PainPanel context={context} />}{activeTab === 'delirium' && <DeliriumPanel context={context} />}{activeTab === 'pocus' && <PocusPanel />}{activeTab === 'algorithms' && <AlgorithmsPanel context={context} />}</div><div className="clinical-footnote"><strong>Verification is required.</strong> Clinical content must be reconciled with current institutional protocols, licensed references, patient-specific data, and the supervising clinician’s judgment. <span>References:</span> {CLINICAL_REFERENCES.map((reference) => <a key={reference.id} href={reference.url} target="_blank" rel="noreferrer">{reference.label}</a>)}</div></div>;
}
