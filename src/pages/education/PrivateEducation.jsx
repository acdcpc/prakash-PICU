import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';
export default function PrivateEducation() {
  const [edu, setEdu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [score, setScore] = useState(null);

  useEffect(() => { loadEdu(); }, []);

  async function loadEdu() {
    const { data } = await supabase.from('education').select('*').limit(1).single();
    setEdu(data || { videos: [], teaching_notes: [], mcqs: [], social_media: {} });
    setLoading(false);
  }

  const videos = edu?.videos || [];
  const notes = edu?.teaching_notes || [];
  const mcqs = edu?.mcqs || [];

  function scoreMCQs() {
    const answers = [];
    mcqs.forEach((q, qi) => {
      const selected = document.querySelector(`input[name="pmcq_${qi}"]:checked`);
      if (selected) answers.push(parseInt(selected.value) === q.correctIndex);
    });
    const correct = answers.filter(Boolean).length;
    const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    setScore({ correct, total: answers.length, pct });
  }

  if (loading) return <div className="loader"><div className="spinner"></div> Loading…</div>;

  return (
    <div>
      <h3>Education Hub</h3>

      <div className="tabs mt-3">
        {['videos', 'notes', 'mcqs'].map(t => (
          <button key={t} className={`tbtn ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
            {t === 'videos' ? 'Videos' : t === 'notes' ? 'Teaching Notes' : 'MCQs'}
          </button>
        ))}
      </div>

      {activeTab === 'videos' && (
        <div>
          {videos.length === 0 ? (
            <p className="text-muted text-center" style={{padding: 30}}>No videos added yet.</p>
          ) : (
            <div className="vid-grid">
              {videos.map((v, i) => (
                <div key={i} className="vid-card">
                  <div className="vid-embed">
                    <iframe src={`https://www.youtube.com/embed/${v.ytId}`} frameBorder="0" allowFullScreen loading="lazy" title={v.title}></iframe>
                  </div>
                  <div className="vid-info"><h4>{v.title}</h4><p className="text-sm text-muted">{v.desc || ''}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div>
          {notes.length === 0 ? (
            <p className="text-muted text-center" style={{padding: 30}}>No teaching notes yet.</p>
          ) : (
            notes.map((n, i) => (
              <div key={i} className="card mb-3">
                <div className="card-head"><h3 className="text-sm">{n.title}</h3><span className="text-sm text-muted">{n.date || ''}</span></div>
                <div className="card-body"><p style={{whiteSpace:'pre-wrap', lineHeight: 1.85, fontSize: 14}}>{n.content}</p></div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'mcqs' && (
        <div>
          {mcqs.length === 0 ? (
            <p className="text-muted text-center" style={{padding: 30}}>No MCQ questions added yet.</p>
          ) : (
            <div>
              {mcqs.map((q, qi) => (
                <div key={qi} className="mcq-card">
                  <div className="mcq-q">Q{qi + 1}. {q.question}</div>
                  <div className="mcq-opts">
                    {(q.options || []).map((opt, oi) => (
                      <label key={oi} className="mcq-opt">
                        <input type="radio" name={`pmcq_${qi}`} value={oi} />
                        <strong>{'ABCD'[oi]}.</strong> {opt}
                      </label>
                    ))}
                  </div>
                  <div className="mcq-exp" style={{display: score !== null ? 'block' : 'none'}}>
                    {q.explanation || 'No explanation provided.'}
                  </div>
                </div>
              ))}
              <button className="btn btn-teal btn-block mt-3" onClick={scoreMCQs}>Submit &amp; Score</button>
              {score !== null && (
                <div className={`alert ${score.pct >= 70 ? 'alert-success' : score.pct >= 50 ? 'alert-warn' : 'alert-danger'} mt-3`}>
                  📊 Score: {score.correct}/{score.total} ({score.pct}%) — {score.pct >= 80 ? 'Excellent!' : score.pct >= 50 ? 'Good effort — review explanations.' : 'Keep studying!'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
