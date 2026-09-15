import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Download } from 'lucide-react';
import { notifyError } from '../../lib/notifications';

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows) {
  if (!rows.length) return 'No records found.\n';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return `${columns.map(csvCell).join(',')}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')).join('\n')}\n`;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function downloadCsv(rows, filename) {
  const csv = rowsToCsv(rows);
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (Capacitor.isNativePlatform()) {
    const bytes = new TextEncoder().encode(csv);
    await Filesystem.writeFile({ path: safe, data: bytesToBase64(bytes), directory: Directory.Documents });
    const { uri } = await Filesystem.getUri({ path: safe, directory: Directory.Documents });
    await Share.share({ url: uri, title: filename });
    return;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safe;
  link.click();
  URL.revokeObjectURL(url);
}

function patientLabel(patient) {
  return [patient.source_type || 'Pediatric encounter', patient.diagnosis || 'No diagnosis recorded'].join(' — ');
}

export default function ExportCenter() {
  const today = new Date().toISOString().split('T')[0];
  const [patients, setPatients] = useState([]);
  const [selPt, setSelPt] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from('patients').select('id,diagnosis,source_type,created_at').order('created_at', { ascending: false })
      .then(({ data }) => { if (active) setPatients(data || []); });
    return () => { active = false; };
  }, []);

  async function exportAll() {
    setExporting(true);
    try {
      const { data: pts, error } = await supabase.from('patients').select('id,source_type,sex,age,weight,height,diagnosis,admission_date,date_of_birth,date_of_birth_bs,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      if (!pts?.length) { notifyError('No pediatric records found.'); return; }
      await downloadCsv(pts.map((patient) => ({ Section: 'Patients', ...patient })), `PrakashPediatrics_All_Patients_${today}.csv`);
    } catch (error) {
      notifyError(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function exportSingle() {
    if (!selPt) { notifyError('Select a patient record.'); return; }
    setExporting(true);
    try {
      const pid = selPt;
      const { data: pt, error: patientError } = await supabase.from('patients').select('*').eq('id', pid).single();
      if (patientError) throw patientError;
      if (!pt) throw new Error('Patient record not found.');
      const rows = [{ Section: 'Patient', ...pt }];

      const { data: fb } = await supabase.from('fluid_balance').select('*').eq('patient_id', pid).order('date');
      fb?.forEach((record) => rows.push({ Section: 'Fluid balance', ...record }));
      const { data: drugs } = await supabase.from('patient_drugs').select('*').eq('patient_id', pid).order('created_at');
      drugs?.forEach((record) => rows.push({ Section: 'Drugs', ...record }));
      const { data: investigations } = await supabase.from('investigations').select('*').eq('patient_id', pid).order('date');
      investigations?.forEach((record) => rows.push({ Section: 'Investigations', ...record, lab_values: JSON.stringify(record.lab_values || {}) }));
      const { data: notes } = await supabase.from('patient_notes').select('*').eq('patient_id', pid).order('created_at');
      notes?.forEach((record) => rows.push({ Section: 'Clinical notes', ...record }));

      const cleanLabel = patientLabel(pt).replace(/[^a-zA-Z0-9-_ ]/g, '_');
      await downloadCsv(rows, `PrakashPediatrics_${cleanLabel}_${today}.csv`);
    } catch (error) {
      notifyError(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function exportRange() {
    if (!from || !to || from > to) { notifyError('Select a valid date range.'); return; }
    setExporting(true);
    try {
      const rows = [];
      for (const patient of patients) {
        const { data: records, error } = await supabase.from('fluid_balance').select('*').eq('patient_id', patient.id).gte('date', from).lte('date', to).order('date');
        if (error) throw error;
        records?.forEach((record) => rows.push({ Section: 'Fluid balance', Patient: patientLabel(patient), ...record }));
      }
      await downloadCsv(rows.length ? rows : [{ Section: 'Fluid balance', Note: 'No records found for this date range.' }], `PrakashPediatrics_Range_${from}_to_${to}.csv`);
    } catch (error) {
      notifyError(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h3>Export Centre</h3>
      <p className="text-muted">Exports are generated as CSV files and include only records permitted by your authenticated Supabase session.</p>
      <div className="flex gap-3 flex-wrap mt-3">
        <div className="card" style={{ flex: '1 1 300px' }}>
          <div className="card-head"><h4>Export All Pediatric Records</h4></div>
          <div className="card-body">
            <p className="text-sm text-muted mb-3">Download a summary of your pediatric records.</p>
            <button className="btn btn-blue btn-block" onClick={exportAll} disabled={exporting}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export All (.csv)'}
            </button>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 300px' }}>
          <div className="card-head"><h4>Export One Patient Record</h4></div>
          <div className="card-body">
            <div className="form-group">
              <select className="form-select" value={selPt} onChange={(event) => setSelPt(event.target.value)}>
                <option value="">Select patient record…</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patientLabel(patient)}</option>)}
              </select>
            </div>
            <p className="text-sm text-muted mb-3">Includes patient data, fluid balance, drugs, investigations, and notes.</p>
            <button className="btn btn-teal btn-block" onClick={exportSingle} disabled={exporting || !selPt}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export Patient (.csv)'}
            </button>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 300px' }}>
          <div className="card-head"><h4>Export Fluid Balance Range</h4></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">From</label><input className="form-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
              <div className="form-group"><label className="form-label">To</label><input className="form-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
            </div>
            <p className="text-sm text-muted mb-3">Fluid-balance records across your accessible patients.</p>
            <button className="btn btn-ghost btn-block" onClick={exportRange} disabled={exporting}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export Range (.csv)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
