import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Users, Bed, AlertTriangle, TrendingUp, Plus, Pill, Activity, Newspaper, Baby } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const beds = profile?.beds || 10;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase.from('patients').select('*').eq('active', true).order('bed_number');
    setPatients(data || []);
    setLoading(false);
  }

  const active = patients.length;
  const alerts = patients.filter(p => (p.latest_fo || 0) > 10).length;
  const occupancy = beds ? Math.round((active / beds) * 100) : 0;

  if (loading) return <div className="loader"><div className="spinner"></div> Loading dashboard…</div>;

  return (
    <div>
      <div className="dashboard-welcome"><div><p className="eyebrow">Clinician command centre</p><h2>{profile?.unit_name || 'Pediatric Care'} overview</h2><p className="text-muted">Start with the patient list, a rapid calculator, or the latest evidence watch.</p></div><div className="quick-actions"><button className="btn btn-primary" onClick={() => navigate('/clinical-tools')}><Activity size={15} /> Clinical Tools</button><button className="btn btn-ghost" onClick={() => navigate('/pediatric-updates')}><Newspaper size={15} /> What’s New</button></div></div>
      <div className="quick-launch-grid"><button className="quick-launch" onClick={() => navigate('/patients/new')}><Plus size={18} /><span><strong>Add patient</strong><small>Start a bedside record</small></span></button><button className="quick-launch" onClick={() => navigate('/clinical-tools')}><Pill size={18} /><span><strong>Drug & scores</strong><small>Shared age / weight context</small></span></button><button className="quick-launch" onClick={() => navigate('/child-health')}><Baby size={18} /><span><strong>Child health</strong><small>Growth, vaccines, milestones</small></span></button></div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num">{active}</div>
          <div className="stat-label">Active Patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{beds}</div>
          <div className="stat-label">PICU Beds</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{color: alerts > 0 ? 'var(--danger)' : 'var(--green)'}}>{alerts}</div>
          <div className="stat-label">FO Alerts (&gt;10%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{occupancy}%</div>
          <div className="stat-label">Occupancy</div>
        </div>
      </div>

      <div className="flex jc-between items-c mb-3">
        <h3>Active Patients</h3>
        <button className="btn btn-teal" onClick={() => navigate('/patients/new')}>
          <Plus size={16} /> Add Patient
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="card"><div className="card-body text-muted text-center p-4">No active patients. Click "Add Patient" to begin.</div></div>
      ) : (
        <div className="bed-grid">
          {patients.map(p => {
            const fo = p.latest_fo || 0;
            const cls = fo > 10 ? 'fo-danger' : fo > 5 ? 'fo-warn' : '';
            const dotCls = fo > 10 ? 'dot-red' : fo > 5 ? 'dot-amber' : 'dot-green';
            return (
              <div key={p.id} className={`bed-card ${cls}`} onClick={() => navigate(`/patients/${p.id}`)}>
                <div className="bed-num">Bed {p.bed_number}</div>
                <div className="bed-diag">{p.diagnosis || '—'}</div>
                <div className="bed-meta">{p.age} yrs · {p.weight} kg</div>
                <div className="bed-foot">
                  <span className="badge bg-blue">Active</span>
                  <span className="flex items-c gap-2">
                    <span className={`dot ${dotCls}`}></span>
                    <span className="text-sm text-muted">{fo ? fo.toFixed(1) + '% FO' : ''}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
