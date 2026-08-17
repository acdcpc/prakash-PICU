import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Calculator, ExternalLink, Search, ShieldCheck, Star } from 'lucide-react';
import supabase from '../../lib/supabase';
import { DRUGS, calculateDrugDose, getReference } from '../../lib/clinicalTools';
import { TEDDY_BEAR_REVIEW_INDEX, TEDDY_BEAR_REVIEW_SOURCE } from '../../data/teddyBearReviewIndex';

const REVIEW_PAGE_SIZE = 48;

function ReferenceLink({ id }) {
  const reference = getReference(id);
  return <a className="clinical-reference" href={reference.url} target="_blank" rel="noreferrer">Source: {reference.label} <ExternalLink size={13} /></a>;
}

function StarterCalculator() {
  const [weight, setWeight] = useState('');
  const [selectedName, setSelectedName] = useState(DRUGS[0]?.name || '');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('pediatric-favorite-drugs') || '[]'));
  const selected = DRUGS.find((drug) => drug.name === selectedName) || DRUGS[0];
  const dose = selected ? calculateDrugDose(selected, weight) : null;
  const visible = useMemo(() => DRUGS.filter((drug) => drug.name.toLowerCase().includes(query.toLowerCase()) || drug.indication.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(favorites.includes(b.name)) - Number(favorites.includes(a.name))), [favorites, query]);
  const toggleFavorite = (name) => {
    const next = favorites.includes(name) ? favorites.filter((item) => item !== name) : [...favorites, name];
    setFavorites(next);
    localStorage.setItem('pediatric-favorite-drugs', JSON.stringify(next));
  };

  return <div className="drug-calculator-pane">
    <div className="notice notice-warning"><ShieldCheck size={18} /><span><strong>Approval boundary:</strong> This calculator contains structured starter references only. Teddy Bear monographs that have not completed clinical review are shown in the reference browser and are not auto-calculated.</span></div>
    <div className="drug-calculator-grid">
      <div className="card drug-picker-card"><div className="card-head"><div><span className="eyebrow">Structured reference set</span><h3>Choose a medicine</h3></div><Calculator size={22} /></div><div className="card-body"><div className="search-field mb-3"><Search size={16} /><input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medicine or indication" /></div><div className="drug-choice-list">{visible.map((drug) => <div key={drug.name} className={`drug-choice ${selected?.name === drug.name ? 'selected' : ''}`}><button onClick={() => setSelectedName(drug.name)}><span className="letter-badge">{drug.letter}</span><span><strong>{drug.name}</strong><small>{drug.indication}</small><small>{drug.dose} {drug.unit}</small></span></button><button className={`favorite-button ${favorites.includes(drug.name) ? 'is-favorite' : ''}`} aria-label={`${favorites.includes(drug.name) ? 'Remove' : 'Add'} ${drug.name} favorite`} onClick={() => toggleFavorite(drug.name)}><Star size={15} fill={favorites.includes(drug.name) ? 'currentColor' : 'none'} /></button></div>)}</div></div></div>
      {selected && <div className="card drug-result-card"><div className="card-head"><div><span className="eyebrow">Teddy Bear-linked starter reference</span><h3>{selected.name}</h3><p className="text-muted">{selected.indication}</p></div><span className="badge badge-teal">{selected.route}</span></div><div className="card-body"><div className="form-group"><label className="form-label">Verified weight (kg)</label><input className="form-input dose-weight" type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Enter weight" /></div><div className="rbox"><div className="rrow"><span className="rlbl">Reference dose</span><span className="rval">{selected.dose} {selected.unit}</span></div><div className="rrow"><span className="rlbl">Calculated amount</span><span className="rval big-num">{dose ? `${dose.capped.toFixed(2)} ${selected.unit.startsWith('mcg') ? 'mcg/min' : 'mg/dose'}${dose.cappedByMax ? ' · capped at maximum' : ''}` : 'Enter weight'}</span></div><div className="rrow"><span className="rlbl">Maximum</span><span className="rval">{selected.max} mg</span></div><div className="rrow"><span className="rlbl">Frequency</span><span className="rval">{selected.frequency}</span></div><div className="rrow"><span className="rlbl">Renal / dialysis</span><span className="rval">{selected.renal}</span></div></div><ReferenceLink id={selected.reference} /><p className="text-muted mt-3">Confirm formulation, concentration, route, indication, age limits, interactions, monitoring, and local protocol before administration.</p></div></div>}
    </div>
  </div>;
}

function TeddyBearBrowser() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [approved, setApproved] = useState(new Map());
  const filtered = useMemo(() => TEDDY_BEAR_REVIEW_INDEX.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || (status === 'approved' ? approved.has(item.id) : !approved.has(item.id)))), [approved, query, status]);
  const visible = filtered.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / REVIEW_PAGE_SIZE));

  useEffect(() => {
    let active = true;
    supabase.from('teddy_bear_monographs').select('source_id,review_status').eq('review_status', 'approved').limit(2000).then(({ data }) => {
      if (active && data) setApproved(new Map(data.map((row) => [row.source_id, row.review_status])));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => setPage(1), [query, status]);

  return <div className="card teddy-catalog-card"><div className="card-head"><div><span className="eyebrow">Complete authorized index</span><h3>All Teddy Bear monographs</h3><p className="text-muted">{TEDDY_BEAR_REVIEW_INDEX.length.toLocaleString()} indexed headings from {TEDDY_BEAR_REVIEW_SOURCE.source}. Some indexed headings are front matter or reference sections and require review classification.</p></div><BookOpen size={24} /></div><div className="card-body"><div className="notice notice-info"><BookOpen size={17} /><span>Every authorized heading is visible here. Full text remains authenticated in Supabase. Only records explicitly verified by the clinical team may be promoted into a numeric calculator.</span></div><div className="catalog-toolbar"><div className="search-field"><Search size={16} /><input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all Teddy Bear headings" /></div><select className="form-select catalog-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All indexed records</option><option value="approved">Approved review</option><option value="pending">Pending review</option></select></div><div className="catalog-summary"><span>{filtered.length.toLocaleString()} matching records</span><span className="text-muted">Page {page} of {totalPages}</span></div><div className="teddy-catalog-list">{visible.map((item) => <a className="teddy-catalog-row" key={item.id} href={`/teddy-bear-review?source_id=${encodeURIComponent(item.id)}`}><span className="catalog-icon"><BookOpen size={15} /></span><span><strong>{item.name}</strong><small>{approved.has(item.id) ? 'Approved review · open authenticated monograph' : 'Pending clinical verification · review required before calculation'}</small></span><ArrowRight size={16} /></a>)}</div><div className="catalog-pagination"><button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div><a className="btn btn-primary mt-3" href="/teddy-bear-review">Open full authenticated review workspace <ArrowRight size={15} /></a></div></div>;
}

export default function DrugCalc() {
  const [mode, setMode] = useState('calculator');
  return <div className="teddy-drug-workspace"><div className="teddy-mode-tabs"><button className={mode === 'calculator' ? 'active' : ''} onClick={() => setMode('calculator')}><Calculator size={16} /> Dose calculator</button><button className={mode === 'reference' ? 'active' : ''} onClick={() => setMode('reference')}><BookOpen size={16} /> Complete Teddy Bear reference</button></div>{mode === 'calculator' ? <StarterCalculator /> : <TeddyBearBrowser />}</div>;
}
