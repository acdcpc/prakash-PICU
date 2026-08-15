import { useMemo, useState } from 'react';
import { ExternalLink, Filter, Globe2, Newspaper, RefreshCw } from 'lucide-react';
import { PEDIATRIC_UPDATES, PEDIATRIC_UPDATES_LAST_REVIEWED } from '../../data/pediatricUpdates';

const FILTERS = ['All', 'Nepal', 'Global'];

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function PediatricUpdates() {
  const [region, setRegion] = useState('All');
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');
  const types = useMemo(() => ['All', ...new Set(PEDIATRIC_UPDATES.map((item) => item.type))], []);
  const updates = useMemo(() => PEDIATRIC_UPDATES.filter((item) => (region === 'All' || item.region === region) && (type === 'All' || item.type === type) && `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query, region, type]);
  const featured = updates[0];
  return <div className="page-content updates-page"><div className="updates-hero"><div><p className="eyebrow">Evidence watch</p><h2>What’s New in Pediatrics</h2><p>Fast, source-linked updates for busy clinicians. This feed provides context for practice and research discussion; it is not a substitute for a current guideline or bedside assessment.</p></div><div className="updates-review"><RefreshCw size={18} /><span>Last reviewed<br /><strong>{formatDate(PEDIATRIC_UPDATES_LAST_REVIEWED)}</strong></span></div></div><div className="updates-controls"><div className="search-field"><Filter size={16} /><input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search updates, topics, or sources" /></div><div className="filter-group">{FILTERS.map((item) => <button className={`chip ${region === item ? 'active' : ''}`} key={item} onClick={() => setRegion(item)}>{item}</button>)}</div><select className="form-select update-type" value={type} onChange={(e) => setType(e.target.value)}>{types.map((item) => <option key={item}>{item}</option>)}</select></div>{featured && <div className="updates-feature card"><div className="card-body"><div className="update-kicker"><span className="badge badge-teal">Featured · {featured.region}</span><span>{formatDate(featured.date)}</span></div><h3>{featured.title}</h3><p>{featured.summary}</p><a className="btn btn-primary" href={featured.url} target="_blank" rel="noreferrer">Read source <ExternalLink size={14} /></a></div></div>}<div className="updates-grid">{updates.slice(1).map((item) => <article className="card update-card" key={item.id}><div className="card-body"><div className="update-meta"><span className={`badge ${item.region === 'Nepal' ? 'badge-amber' : 'badge-blue'}`}>{item.region}</span><span>{formatDate(item.date)}</span></div><div className="update-source"><Newspaper size={15} /> {item.source}</div><h3>{item.title}</h3><p>{item.summary}</p><div className="update-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><a className="clinical-reference" href={item.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={13} /></a></div></article>)}</div>{updates.length === 0 && <div className="card empty-state"><div className="card-body"><Globe2 size={24} /><h3>No updates match these filters</h3><p className="text-muted">Try another region, category, or search term.</p></div></div>}<div className="clinical-footnote"><strong>Editorial policy:</strong> Updates are manually reviewed and source-linked. Before the feed is used operationally, assign an owner, review cadence, correction process, and institutional policy for how research/news may influence local clinical protocols.</div></div>;
}
