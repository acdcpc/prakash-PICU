import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, Search, ShieldCheck } from 'lucide-react';
import { TEDDY_BEAR_REVIEW_INDEX, TEDDY_BEAR_REVIEW_SOURCE } from '../../data/teddyBearReviewIndex';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';

const PAGE_SIZE = 40;
const REVIEW_FIELDS = [
  ['verified_dose', 'Verified dose / regimen'],
  ['dose_unit', 'Dose unit'],
  ['maximum_dose', 'Maximum dose'],
  ['route_formulation', 'Route / formulation'],
  ['indication', 'Indication'],
  ['renal_dialysis_notes', 'Renal / dialysis notes'],
  ['review_notes', 'Review notes'],
];

function fromRow(row) {
  return { ...row, id: row.source_id, verified: row.review_status === 'approved' };
}

export default function TeddyBearReview() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('source_id');
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('monograph');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(TEDDY_BEAR_REVIEW_INDEX[0]?.id);
  const [draft, setDraft] = useState({});
  const [dbState, setDbState] = useState('loading');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.from('teddy_bear_monographs').select('*').order('name').limit(2000);
      if (!active) return;
      if (error) {
        setDbState('migration-required');
        const fallback = TEDDY_BEAR_REVIEW_INDEX.map((item) => ({ ...item, content: '' }));
        setRecords(fallback);
        if (requestedId && fallback.some((item) => item.id === requestedId)) setSelectedId(requestedId);
        return;
      }
      setDbState('ready');
      const nextRecords = (data || []).map(fromRow);
      setRecords(nextRecords);
      if (requestedId && nextRecords.some((item) => item.id === requestedId)) setSelectedId(requestedId);
    }
    load();
    return () => { active = false; };
  }, []);

  const kindFiltered = useMemo(() => (kindFilter === 'all' ? records : records.filter((item) => (item.record_kind || 'monograph') === kindFilter)), [records, kindFilter]);
  const filtered = useMemo(() => kindFiltered.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [kindFiltered, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = records.find((item) => item.id === selectedId) || visible[0];
  const selectedDraft = selected ? { ...selected, ...(draft[selected.id] || {}) } : null;
  const updateField = (key, value) => selected && setDraft((current) => ({ ...current, [selected.id]: { ...(current[selected.id] || {}), [key]: value } }));
  const markVerified = () => updateField('verified', !selectedDraft?.verified);
  const saveReview = async (statusOverride = null) => {
    if (!selected || dbState !== 'ready' || !user?.id) return;
    const nextStatus = statusOverride || (selectedDraft.verified ? 'approved' : 'in-review');
    const payload = Object.fromEntries(REVIEW_FIELDS.map(([key]) => [key, selectedDraft[key] || null]));
    payload.review_status = nextStatus;
    payload.reviewer_id = user.id;
    payload.reviewed_at = new Date().toISOString();
    const { data, error } = await supabase.from('teddy_bear_monographs').update(payload).eq('source_id', selected.source_id).select('*').single();
    if (error) { setSaveMessage(`Save failed: ${error.message}`); return; }
    setRecords((current) => current.map((item) => item.id === selected.id ? fromRow(data) : item));
    setDraft((current) => ({ ...current, [selected.id]: {} }));
    setSaveMessage('Review saved under the authenticated doctor account.');
  };
  const selectPage = (nextPage) => setPage(Math.min(totalPages, Math.max(1, nextPage)));
  return <div className="page-content clinical-page"><div className="page-heading"><div><p className="eyebrow">Licensed-reference review queue</p><h2>Teddy Bear Drug Review</h2><p className="text-muted">Full authorized monograph content is available only after the private Supabase table is installed and the doctor has approved unit access.</p></div><BookOpen size={28} /></div><div className="notice notice-warning"><AlertTriangle size={18} /><span><strong>Pending clinical verification:</strong> No record becomes approved calculator data automatically. Check the licensed monograph, current formulation, local PICU protocol, indication, age/weight restrictions, renal/hepatic adjustments, and maximum doses.</span></div><div className="card review-source-card"><div className="card-body review-source-grid"><div><span className="text-muted">Source file</span><strong>{TEDDY_BEAR_REVIEW_SOURCE.source}</strong></div><div><span className="text-muted">Records</span><strong>{records.length || TEDDY_BEAR_REVIEW_INDEX.length}</strong></div><div><span className="text-muted">Access</span><strong>{dbState === 'ready' ? 'Authenticated Supabase review' : dbState === 'migration-required' ? 'Migration required' : 'Loading secure table…'}</strong></div><div><span className="text-muted">Review status</span><strong>{records.filter((item) => item.review_status === 'approved' || item.verified).length} approved · {records.length - records.filter((item) => item.review_status === 'approved' || item.verified).length} pending</strong></div></div></div><div className="review-layout"><aside className="card review-list"><div className="card-head"><h3>Monograph headings</h3><span className="badge badge-amber">{filtered.length}</span></div><div className="card-body"><div className="kind-filter"><select className="form-input" value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setPage(1); }} aria-label="Filter by record type"><option value="monograph">Drug monographs</option><option value="section">Monograph sections</option><option value="reference">Reference & abbreviations</option><option value="all">All headings</option></select></div><div className="search-field"><Search size={16} /><input className="form-input" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search headings" /></div><div className="review-index-list">{visible.map((item) => <button key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span>{item.name}</span><small>{item.review_status === 'approved' || item.verified ? 'Approved review' : 'Pending verification'}</small></button>)}</div><div className="review-pagination"><button className="btn btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => selectPage(currentPage - 1)}><ChevronLeft size={15} /> Previous</button><span>Page {currentPage} of {totalPages}</span><button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages} onClick={() => selectPage(currentPage + 1)}>Next <ChevronRight size={15} /></button></div></div></aside><section className="card review-detail"><div className="card-head"><div><span className={`badge ${selectedDraft?.verified ? 'badge-teal' : 'badge-amber'}`}>{selectedDraft?.verified ? 'Team-approved review' : 'Pending verification'}</span><h3>{selected?.name || 'Select a heading'}</h3><p className="text-muted">Source offset: {selected?.source_offset ?? selected?.sourceOffset ?? '—'} · Record ID: {selected?.id || '—'}</p></div><ShieldCheck size={22} /></div>{selected && <div className="card-body"><div className="notice notice-info"><ClipboardCheck size={18} /><span>{dbState === 'ready' ? 'Full text is loaded from the authenticated private Supabase table.' : 'The secure table is not installed yet. Apply sql/teddy_bear_monographs.sql and the authorized seed file before reviewing full text.'}</span></div>{selected.content && <details className="monograph-content" open><summary>Open full monograph content</summary><pre>{selected.content}</pre></details>}<div className="review-fields">{REVIEW_FIELDS.map(([key, label]) => <div className="form-group" key={key}><label className="form-label">{label}</label><textarea className="form-textarea" rows={key === 'review_notes' ? 4 : 3} value={selectedDraft[key] || ''} onChange={(e) => updateField(key, e.target.value)} placeholder="Enter after clinical review" /></div>)}</div><label className="review-verify-control"><input type="checkbox" checked={Boolean(selectedDraft.verified)} onChange={markVerified} /> I have checked this record against the authorized monograph and current local PICU protocol.</label><div className="review-quick-actions"><button className="btn btn-success" disabled={dbState !== 'ready' || !user?.id} onClick={() => saveReview('approved')}>Approve reviewed record</button><button className="btn btn-danger" disabled={dbState !== 'ready' || !user?.id} onClick={() => saveReview('in-review')}>Flag for clinical review</button></div>{saveMessage && <p className="text-muted mt-2">{saveMessage}</p>}<p className="text-muted mt-3">Approval here records review metadata only. A separate governed promotion process is required before any verified dose is copied into the Emergency Mode or Clinical Tools calculator datasets.</p></div>}</section></div><div className="clinical-footnote"><strong>Institutional private use:</strong> Full text is served only through authenticated Supabase RLS. Do not expose it through public routes, public storage, analytics, logs, screenshots, or unauthenticated application bundles.</div></div>;
}
