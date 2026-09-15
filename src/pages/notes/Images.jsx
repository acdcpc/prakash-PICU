import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase';
import { AlertTriangle, ArrowLeft, Upload } from 'lucide-react';
import { buildPatientImagePath, isPathForPatient } from '../../lib/storagePaths';
import PatientContextHeader from '../../components/PatientContextHeader';

const IMG_TYPES = ['Radiology', 'Ultrasound', 'Clinical Photo', 'ECG', 'Other'];

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Client-side resize/compress so any photo fits under the 500 KB storage limit.
async function compressImageToMaxKB(file, maxKB = 500) {
  const maxBytes = maxKB * 1000; // match the app's 500 KB = 500,000-byte limit
  if (file.size <= maxBytes) return file;

  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read this image'));
    image.src = url;
  });

  const baseName = (file.name || 'image.jpg').replace(/\.[^.]+$/, '') + '.jpg';

  const render = (w, h, quality) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvasToBlob(canvas, 'image/jpeg', quality);
  };

  // Progressively shrink dimensions + quality until it fits under the cap.
  for (const maxDim of [1600, 1200, 900, 640, 480, 360]) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    for (const q of [0.82, 0.7, 0.55, 0.4, 0.3]) {
      const blob = await render(w, h, q);
      if (blob && blob.size <= maxBytes) {
        URL.revokeObjectURL(img.src);
        return new File([blob], baseName, { type: 'image/jpeg' });
      }
    }
  }

  // Last resort: tiny thumbnail.
  const blob = await render(320, 320, 0.25);
  URL.revokeObjectURL(img.src);
  return new File([blob], baseName, { type: 'image/jpeg' });
}

export default function Images() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [images, setImages] = useState([]);
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('Radiology');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    supabase.from('patients').select('*').eq('id', id).single().then(({ data }) => setPatient(data));
    loadImages();
  }, [id]);

  async function loadImages() {
    const { data, error: loadError } = await supabase.from('patient_images').select('*').eq('patient_id', id).order('created_at', { ascending: false });
    if (loadError) { setError('We could not load this patient\u2019s images. Retry when you have a connection.'); return; }
    setError('');
    const withSignedUrls = await Promise.all((data || []).map(async (image) => {
      // Only request a signed URL for a path that genuinely belongs to the
      // patient being viewed; anything else is refused client-side too.
      if (!image.storage_path || !isPathForPatient(image.storage_path, id)) {
        return { ...image, signed_url: null, path_rejected: Boolean(image.storage_path) };
      }
      const { data: signed, error: signedError } = await supabase.storage.from('patient-images').createSignedUrl(image.storage_path, 60 * 60);
      return { ...image, signed_url: signedError ? null : signed?.signedUrl, path_rejected: false };
    }));
    setImages(withSignedUrls);
  }

  async function handleUpload(e) {
    e.preventDefault();
    const original = e.target.imgFile?.files?.[0];
    if (!original) return;

    setUploading(true);
    setError('');
    try {
      // Resize/compress to max 500 KB before uploading.
      const file = await compressImageToMaxKB(original, 500);

      const filePath = buildPatientImagePath(id, file.name);
      const { error: uploadError } = await supabase.storage.from('patient-images').upload(filePath, file);
      if (uploadError) { setError('The image could not be uploaded. Check the file size and try again.'); setUploading(false); return; }

      if (filePath) {
          await supabase.from('patient_images').insert({
            patient_id: id, storage_path: filePath, description: desc, type, file_name: file.name, created_by: user?.id,
          });
      }

      e.target.reset(); setDesc('');
      loadImages();
    } catch (err) {
      setError('This image could not be processed. Try a different file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PatientContextHeader patientId={id} />
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/patients/${id}`)}><ArrowLeft size={16} /> Back</button>
      <h3>Patient Images — Bed {patient?.bed_number || '—'}</h3>

      {error && <div className="notice notice-danger" role="alert"><AlertTriangle size={16} /><span>{error}</span></div>}
      <div className="card mt-3" style={{maxWidth: 500}}>
        <div className="card-head"><h4>Upload Image</h4></div>
        <div className="card-body">
          <form onSubmit={handleUpload}>
            <div className="form-group"><label className="form-label">File (auto-resized to max 500 KB)</label>
              <input className="form-input" type="file" name="imgFile" accept="image/*" /></div>
            <div className="form-group"><label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                {IMG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Description</label>
              <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <button type="submit" className="btn btn-teal btn-block" disabled={uploading}>
              <Upload size={16} /> {uploading ? 'Processing…' : 'Upload'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3">
        {images.length === 0 ? <p className="text-muted">No images uploaded.</p> : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12}}>
            {images.map(img => (
              <div key={img.id} style={{textAlign: 'center'}}>
                {img.signed_url ? <a href={img.signed_url} target="_blank" rel="noreferrer">
                  <img src={img.signed_url} alt={img.description || 'Patient image'} style={{width:'100%', borderRadius: 8, border: '1px solid var(--border)'}} loading="lazy" />
                </a> : <div className="notice notice-warning">{img.path_rejected ? 'This image path does not belong to the patient being viewed, so it was not opened.' : 'Image unavailable until its private storage path is migrated.'}</div>}
                <p className="text-sm text-muted mt-2">{img.type}: {img.description || ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
