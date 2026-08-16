import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import PaymentAdmin from './PaymentAdmin';

const ADMIN_TABS = [
  'Profile',
  'Payments',
  'PICU Settings',
  'Drug Library',
  'Videos',
  'Teaching Notes',
  'MCQs',
  'Social Media',
];

const EMPTY_DRUG = { name: '', dose: '', max: '', freq: '', route: '', prep: '' };
const EMPTY_VIDEO = { title: '', youtube_id: '', description: '' };
const EMPTY_NOTE = { title: '', content: '' };
const EMPTY_MCQ = { question: '', options: ['', '', '', ''], correct: 0, explanation: '' };

export default function AdminPanel() {
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('Profile');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  // Profile / PICU settings
  const [profile, setProfile] = useState({
    doctor_name: '',
    designation: '',
    hospital: '',
    unit_name: '',
    num_beds: '',
  });
  const [newPassword, setNewPassword] = useState('');

  // Drug library
  const [drugs, setDrugs] = useState([]);
  const [drugForm, setDrugForm] = useState({ ...EMPTY_DRUG });

  // Education data
  const [eduId, setEduId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [teachingNotes, setTeachingNotes] = useState([]);
  const [mcqs, setMcqs] = useState([]);
  const [socialMedia, setSocialMedia] = useState({
    youtube: '',
    facebook: '',
    twitter: '',
    instagram: '',
  });

  // Editable forms for education
  const [videoForm, setVideoForm] = useState({ ...EMPTY_VIDEO });
  const [noteForm, setNoteForm] = useState({ ...EMPTY_NOTE });
  const [mcqForm, setMcqForm] = useState({ ...EMPTY_MCQ });

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // ── Fetch all data on mount ──
  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchEducation(), fetchDrugs()]);
    setLoading(false);
  }

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').limit(1).single();
    if (data) {
      setProfile({
        doctor_name: data.doctor_name || '',
        designation: data.designation || '',
        hospital: data.hospital || '',
        unit_name: data.unit_name || '',
        num_beds: data.num_beds || '',
      });
    }
  }

  async function fetchEducation() {
    let { data } = await supabase.from('education').select('*').limit(1).single();
    if (!data) {
      // Insert empty row
      const { data: inserted } = await supabase
        .from('education')
        .insert({
          videos: [],
          teaching_notes: [],
          mcqs: [],
          social_media: {},
        })
        .select('*')
        .single();
      data = inserted;
    }
    if (data) {
      setEduId(data.id);
      setVideos(data.videos || []);
      setTeachingNotes(data.teaching_notes || []);
      setMcqs(data.mcqs || []);
      setSocialMedia(data.social_media || { youtube: '', facebook: '', twitter: '', instagram: '' });
    }
  }

  async function fetchDrugs() {
    const { data } = await supabase.from('drug_library').select('*').order('name');
    if (data) setDrugs(data);
  }

  // helper: update education JSONB column
  async function updateEduColumn(column, value) {
    const { error } = await supabase
      .from('education')
      .update({ [column]: value })
      .eq('id', eduId);
    if (error) throw error;
  }

  // ── PROFILE ──
  async function saveProfile() {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        doctor_name: profile.doctor_name,
        designation: profile.designation,
        hospital: profile.hospital,
        unit_name: profile.unit_name,
        num_beds: profile.num_beds,
      });
    if (error) return showMsg(error.message, 'danger');
    showMsg('Profile saved successfully');

    if (newPassword) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) return showMsg(pwErr.message, 'danger');
      setNewPassword('');
      showMsg('Password updated successfully');
    }
  }

  // ── DRUG LIBRARY ──
  async function addDrug() {
    const { name, dose, max, freq, route, prep } = drugForm;
    if (!name.trim()) return showMsg('Drug name is required', 'danger');
    const { error } = await supabase.from('drug_library').insert({
      name: name.trim(),
      dose: dose.trim(),
      max: max.trim(),
      freq: freq.trim(),
      route: route.trim(),
      prep: prep.trim(),
    });
    if (error) return showMsg(error.message, 'danger');
    setDrugForm({ ...EMPTY_DRUG });
    await fetchDrugs();
    showMsg('Drug added');
  }

  async function deleteDrug(id) {
    if (!confirm('Delete this drug?')) return;
    const { error } = await supabase.from('drug_library').delete().eq('id', id);
    if (error) return showMsg(error.message, 'danger');
    setDrugs((prev) => prev.filter((d) => d.id !== id));
    showMsg('Drug deleted');
  }

  // ── VIDEOS ──
  async function addVideo() {
    if (!videoForm.title.trim() || !videoForm.youtube_id.trim())
      return showMsg('Title and YouTube ID are required', 'danger');
    const updated = [...videos, { ...videoForm, created_at: new Date().toISOString() }];
    try {
      await updateEduColumn('videos', updated);
      setVideos(updated);
      setVideoForm({ ...EMPTY_VIDEO });
      showMsg('Video added');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  async function deleteVideo(idx) {
    if (!confirm('Delete this video?')) return;
    const updated = videos.filter((_, i) => i !== idx);
    try {
      await updateEduColumn('videos', updated);
      setVideos(updated);
      showMsg('Video deleted');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  // ── TEACHING NOTES ──
  async function addNote() {
    if (!noteForm.title.trim() || !noteForm.content.trim())
      return showMsg('Title and content are required', 'danger');
    const updated = [...teachingNotes, { ...noteForm, created_at: new Date().toISOString() }];
    try {
      await updateEduColumn('teaching_notes', updated);
      setTeachingNotes(updated);
      setNoteForm({ ...EMPTY_NOTE });
      showMsg('Note added');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  async function deleteNote(idx) {
    if (!confirm('Delete this note?')) return;
    const updated = teachingNotes.filter((_, i) => i !== idx);
    try {
      await updateEduColumn('teaching_notes', updated);
      setTeachingNotes(updated);
      showMsg('Note deleted');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  // ── MCQs ──
  function setMcqOption(idx, value) {
    const opts = [...mcqForm.options];
    opts[idx] = value;
    setMcqForm((prev) => ({ ...prev, options: opts }));
  }

  async function addMcq() {
    if (!mcqForm.question.trim()) return showMsg('Question is required', 'danger');
    if (mcqForm.options.some((o) => !o.trim()))
      return showMsg('All four options are required', 'danger');
    const updated = [
      ...mcqs,
      { ...mcqForm, created_at: new Date().toISOString() },
    ];
    try {
      await updateEduColumn('mcqs', updated);
      setMcqs(updated);
      setMcqForm({ ...EMPTY_MCQ });
      showMsg('MCQ added');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  async function deleteMcq(idx) {
    if (!confirm('Delete this MCQ?')) return;
    const updated = mcqs.filter((_, i) => i !== idx);
    try {
      await updateEduColumn('mcqs', updated);
      setMcqs(updated);
      showMsg('MCQ deleted');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  // ── SOCIAL MEDIA ──
  async function saveSocialMedia() {
    try {
      await updateEduColumn('social_media', socialMedia);
      showMsg('Social media links saved');
    } catch (err) {
      showMsg(err.message, 'danger');
    }
  }

  // ── ACCESS GATE ──
  if (!isAdmin) {
    return (
      <div className="p-4 text-center">
        <div className="alert alert-danger">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-c jc-between p-4">
        <div className="loader"></div>
        <span className="ml-2 text-muted">Loading admin panel…</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2>Admin Panel</h2>

      {message.text && (
        <div className={`alert alert-${message.type} mt-1`}>{message.text}</div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mt-2 mb-2" style={{ flexWrap: 'wrap' }}>
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ────── PROFILE ────── */}
      {activeTab === 'Profile' && (
        <div className="card">
          <div className="card-head"><strong>Doctor Profile</strong></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Doctor Name</label>
              <input
                className="form-input"
                value={profile.doctor_name}
                onChange={(e) => setProfile({ ...profile, doctor_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input
                className="form-input"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hospital</label>
              <input
                className="form-input"
                value={profile.hospital}
                onChange={(e) => setProfile({ ...profile, hospital: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password (leave blank to keep current)</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
            </div>
            <button className="btn btn-primary" onClick={saveProfile}>
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* ────── PAYMENTS ────── */}
      {activeTab === 'Payments' && <PaymentAdmin />}

      {/* ────── PICU SETTINGS ────── */}
      {activeTab === 'PICU Settings' && (
        <div className="card">
          <div className="card-head"><strong>Unit Settings</strong></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Unit Name</label>
              <input
                className="form-input"
                value={profile.unit_name}
                onChange={(e) => setProfile({ ...profile, unit_name: e.target.value })}
                placeholder="e.g. PICU, Patan Hospital"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Number of Beds</label>
              <input
                type="number"
                className="form-input"
                value={profile.num_beds}
                onChange={(e) => setProfile({ ...profile, num_beds: e.target.value })}
                placeholder="e.g. 8"
              />
            </div>
            <button className="btn btn-primary" onClick={saveProfile}>
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ────── DRUG LIBRARY ────── */}
      {activeTab === 'Drug Library' && (
        <div>
          <div className="card mb-2">
            <div className="card-head"><strong>Add Drug</strong></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Drug Name *</label>
                <input
                  className="form-input"
                  value={drugForm.name}
                  onChange={(e) => setDrugForm({ ...drugForm, name: e.target.value })}
                  placeholder="e.g. Amoxicillin"
                />
              </div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                  <label className="form-label">Dose</label>
                  <input
                    className="form-input"
                    value={drugForm.dose}
                    onChange={(e) => setDrugForm({ ...drugForm, dose: e.target.value })}
                    placeholder="e.g. 50 mg/kg"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                  <label className="form-label">Max Dose</label>
                  <input
                    className="form-input"
                    value={drugForm.max}
                    onChange={(e) => setDrugForm({ ...drugForm, max: e.target.value })}
                    placeholder="e.g. 2 g"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                  <label className="form-label">Frequency</label>
                  <input
                    className="form-input"
                    value={drugForm.freq}
                    onChange={(e) => setDrugForm({ ...drugForm, freq: e.target.value })}
                    placeholder="e.g. TDS, Q8H"
                  />
                </div>
              </div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                  <label className="form-label">Route</label>
                  <input
                    className="form-input"
                    value={drugForm.route}
                    onChange={(e) => setDrugForm({ ...drugForm, route: e.target.value })}
                    placeholder="e.g. IV, PO"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                  <label className="form-label">Preparation</label>
                  <input
                    className="form-input"
                    value={drugForm.prep}
                    onChange={(e) => setDrugForm({ ...drugForm, prep: e.target.value })}
                    placeholder="e.g. Dilute in 10 mL NS"
                  />
                </div>
              </div>
              <button className="btn btn-success" onClick={addDrug}>
                Add Drug
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dose</th>
                  <th>Max</th>
                  <th>Freq</th>
                  <th>Route</th>
                  <th>Prep</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drugs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">No drugs added yet</td>
                  </tr>
                ) : (
                  drugs.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.name}</strong></td>
                      <td>{d.dose}</td>
                      <td>{d.max}</td>
                      <td>{d.freq}</td>
                      <td>{d.route}</td>
                      <td>{d.prep}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteDrug(d.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────── VIDEOS ────── */}
      {activeTab === 'Videos' && (
        <div>
          <div className="card mb-2">
            <div className="card-head"><strong>Add Video</strong></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">YouTube Video ID *</label>
                <input
                  className="form-input"
                  value={videoForm.youtube_id}
                  onChange={(e) => setVideoForm({ ...videoForm, youtube_id: e.target.value })}
                  placeholder="e.g. dQw4w9WgXcQ"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                />
              </div>
              <button className="btn btn-success" onClick={addVideo}>Add Video</button>
            </div>
          </div>

          {videos.length === 0 ? (
            <p className="text-muted text-center">No videos yet</p>
          ) : (
            videos.map((v, i) => (
              <div key={i} className="card mb-1">
                <div className="card-body flex items-c jc-between">
                  <div>
                    <strong>{v.title}</strong>
                    <span className="text-muted text-sm ml-2">({v.youtube_id})</span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteVideo(i)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ────── TEACHING NOTES ────── */}
      {activeTab === 'Teaching Notes' && (
        <div>
          <div className="card mb-2">
            <div className="card-head"><strong>Add Teaching Note</strong></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content *</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                />
              </div>
              <button className="btn btn-success" onClick={addNote}>Add Note</button>
            </div>
          </div>

          {teachingNotes.length === 0 ? (
            <p className="text-muted text-center">No notes yet</p>
          ) : (
            teachingNotes.map((n, i) => (
              <div key={i} className="card mb-1">
                <div className="card-body flex items-c jc-between">
                  <div>
                    <strong>{n.title}</strong>
                    {n.created_at && (
                      <span className="text-muted text-sm ml-2">
                        — {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteNote(i)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ────── MCQs ────── */}
      {activeTab === 'MCQs' && (
        <div>
          <div className="card mb-2">
            <div className="card-head"><strong>Add MCQ</strong></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Question *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={mcqForm.question}
                  onChange={(e) =>
                    setMcqForm({ ...mcqForm, question: e.target.value })
                  }
                />
              </div>
              {mcqForm.options.map((opt, oi) => (
                <div className="form-group" key={oi}>
                  <label className="form-label">
                    Option {oi + 1} *
                  </label>
                  <input
                    className="form-input"
                    value={opt}
                    onChange={(e) => setMcqOption(oi, e.target.value)}
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Correct Answer (0–3)</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  max={3}
                  value={mcqForm.correct}
                  onChange={(e) =>
                    setMcqForm({ ...mcqForm, correct: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Explanation</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={mcqForm.explanation}
                  onChange={(e) =>
                    setMcqForm({ ...mcqForm, explanation: e.target.value })
                  }
                />
              </div>
              <button className="btn btn-success" onClick={addMcq}>Add MCQ</button>
            </div>
          </div>

          <p className="text-sm mb-1">
            {mcqs.length} question{mcqs.length !== 1 ? 's' : ''} added
          </p>
          {mcqs.length === 0 ? (
            <p className="text-muted text-center">No MCQs yet</p>
          ) : (
            mcqs.map((m, i) => (
              <div key={i} className="card mb-1">
                <div className="card-body flex items-c jc-between">
                  <div>
                    <strong>Q{i + 1}.</strong> {m.question.substring(0, 60)}
                    {m.question.length > 60 ? '…' : ''}
                    <span className="badge bg-blue ml-1">
                      Answer: {m.correct}
                    </span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteMcq(i)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ────── SOCIAL MEDIA ────── */}
      {activeTab === 'Social Media' && (
        <div className="card">
          <div className="card-head"><strong>Social Media Links</strong></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">YouTube</label>
              <input
                className="form-input"
                value={socialMedia.youtube}
                onChange={(e) =>
                  setSocialMedia({ ...socialMedia, youtube: e.target.value })
                }
                placeholder="https://youtube.com/@channel"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Facebook</label>
              <input
                className="form-input"
                value={socialMedia.facebook}
                onChange={(e) =>
                  setSocialMedia({ ...socialMedia, facebook: e.target.value })
                }
                placeholder="https://facebook.com/page"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Twitter / X</label>
              <input
                className="form-input"
                value={socialMedia.twitter}
                onChange={(e) =>
                  setSocialMedia({ ...socialMedia, twitter: e.target.value })
                }
                placeholder="https://twitter.com/handle"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input
                className="form-input"
                value={socialMedia.instagram}
                onChange={(e) =>
                  setSocialMedia({ ...socialMedia, instagram: e.target.value })
                }
                placeholder="https://instagram.com/handle"
              />
            </div>
            <button className="btn btn-primary" onClick={saveSocialMedia}>
              Save Links
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
