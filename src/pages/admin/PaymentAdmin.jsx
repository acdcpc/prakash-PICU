import { useEffect, useState } from 'react';
import { Check, Copy, Eye, MessageCircle, RefreshCw, X } from 'lucide-react';
import supabase from '../../lib/supabase';

const STORAGE_BUCKET = 'payment-screenshots';
const TABS = ['pending', 'approved', 'rejected'];

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i += 1) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
}

function waNumber(raw) {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length === 10) d = `977${d}`;
  return d;
}

export default function PaymentAdmin() {
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [signedUrls, setSignedUrls] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [viewId, setViewId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveResult, setApproveResult] = useState(null);

  async function loadPayments() {
    setError('');
    const { data, error: err } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); return; }
    const rows = data || [];
    setPayments(rows);

    const urls = {};
    await Promise.all(
      rows
        .filter((p) => p.screenshot_url)
        .map(async (p) => {
          try {
            const { data: sg, error: serr } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(p.screenshot_url, 3600);
            if (!serr && sg) urls[p.id] = sg.signedUrl;
          } catch { /* ignore */ }
        }),
    );
    setSignedUrls(urls);
  }

  useEffect(() => { loadPayments(); }, []);

  const filtered = payments.filter((p) => {
    if (p.status !== tab) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.transaction_id || '').toLowerCase().includes(q)
    );
  });

  const currentView = payments.find((p) => p.id === viewId) || null;

  async function approvePayment(id) {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    if (!confirm('Approve this payment and generate an activation code?')) return;
    setBusy(true);
    setError('');
    try {
      const code = generateCode();
      const normalized = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const codeHash = await sha256Hex(normalized);

      const { error: codeErr } = await supabase.from('activation_codes').insert({
        code_hash: codeHash,
        status: 'valid',
        plan: p.plan || 'full-access',
        amount: p.amount,
        original_transaction_id: p.transaction_id || null,
      });
      if (codeErr) throw new Error(`Code creation failed: ${codeErr.message}`);

      const { error: updateErr } = await supabase
        .from('payments')
        .update({ status: 'approved', verified_at: new Date().toISOString() })
        .eq('id', id);
      if (updateErr) throw new Error(`Payment update failed: ${updateErr.message}`);

      setApproveResult({ code, name: p.name || '', email: p.email || '', mobile: p.mobile || '' });
      await loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function regenerateCode(id) {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Generate a new activation code for ${p.email || 'this customer'}? Any previous code will be voided.`)) return;
    setBusy(true);
    setError('');
    try {
      const code = generateCode();
      const normalized = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const codeHash = await sha256Hex(normalized);

      const { error: voidErr } = await supabase.rpc('admin_void_codes', {
        p_original_transaction_id: p.transaction_id || null,
      });
      if (voidErr) throw new Error(`Void old code failed: ${voidErr.message}`);

      const { error: codeErr } = await supabase.from('activation_codes').insert({
        code_hash: codeHash,
        status: 'valid',
        plan: p.plan || 'full-access',
        amount: p.amount,
        original_transaction_id: p.transaction_id || null,
      });
      if (codeErr) throw new Error(`Code creation failed: ${codeErr.message}`);

      setApproveResult({ code, name: p.name || '', email: p.email || '', mobile: p.mobile || '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReject() {
    if (!rejectId) return;
    if (!rejectReason.trim()) { setError('Please provide a rejection reason.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
        verified_at: new Date().toISOString(),
      })
      .eq('id', rejectId);
    if (err) { setError(err.message); setBusy(false); return; }
    setRejectId(null);
    setRejectReason('');
    await loadPayments();
    setBusy(false);
  }

  const approveModal = approveResult && (
    <div className="modal-overlay open" onClick={() => setApproveResult(null)}>
      <div className="modal" style={{ padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3>✅ Payment Approved</h3>
        <p>Share this activation code with the customer:</p>
        <div className="code-box">{approveResult.code}</div>
        <p className="text-muted text-sm">
          {approveResult.name}{approveResult.name ? ' · ' : ''}{approveResult.email || 'no email'}
          {approveResult.mobile ? ` · ${approveResult.mobile}` : ''}
        </p>
        <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-success btn-sm"
            onClick={() => {
              const num = waNumber(approveResult.mobile);
              if (!num) { alert('No mobile number on file. Copy the code manually.'); return; }
              const msg = `Hi ${approveResult.name || 'there'}! Thank you for your payment. Your activation code is: ${approveResult.code}. Open the app, go to Subscription, and redeem this code to activate. — OurPICU Team`;
              window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(approveResult.code).then(() => alert('Code copied!'), () => {});
            }}
          >
            <Copy size={14} /> Copy
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setApproveResult(null)}>
            <X size={14} /> Close
          </button>
        </div>
      </div>
    </div>
  );

  const viewModal = currentView && (
    <div className="modal-overlay open" onClick={() => setViewId(null)}>
      <div className="modal" style={{ padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3>Payment Details</h3>
        <p><strong>Name:</strong> {currentView.name || '-'}</p>
        <p><strong>Email:</strong> {currentView.email || '-'}</p>
        <p><strong>Mobile:</strong> {currentView.mobile || '-'}</p>
        <p><strong>Transaction ID:</strong> {currentView.transaction_id || '-'}</p>
        <p><strong>Amount:</strong> NPR {Number(currentView.amount || 0).toLocaleString()}</p>
        <p><strong>Plan:</strong> {currentView.plan || 'full-access'}</p>
        <p><strong>Status:</strong> {currentView.status}</p>
        {currentView.rejection_reason && (
          <p><strong>Rejection reason:</strong> {currentView.rejection_reason}</p>
        )}
        {signedUrls[currentView.id] && (
          <img src={signedUrls[currentView.id]} alt="Payment screenshot" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} />
        )}
        <div className="flex gap-2 mt-2">
          {currentView.status === 'pending' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => { setViewId(null); approvePayment(currentView.id); }}>
                <Check size={14} /> Approve
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => { setViewId(null); setRejectId(currentView.id); }}>
                <X size={14} /> Reject
              </button>
            </>
          )}
          {currentView.status === 'approved' && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setViewId(null); regenerateCode(currentView.id); }}>
              <RefreshCw size={14} /> New Code
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setViewId(null)}>Close</button>
        </div>
      </div>
    </div>
  );

  const rejectModal = rejectId && (
    <div className="modal-overlay open" onClick={() => setRejectId(null)}>
      <div className="modal" style={{ padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3>Reject Payment</h3>
        <p>Why are you rejecting this payment?</p>
        <textarea
          className="form-input"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
        />
        <div className="flex gap-2 mt-2">
          <button className="btn btn-danger btn-sm" onClick={confirmReject} disabled={busy}>
            {busy ? 'Rejecting…' : 'Reject'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setRejectId(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex jc-between items-c mb-2" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadPayments}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or transaction ID..."
        />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {filtered.length === 0 ? (
        <p className="text-muted text-center mt-2">No {tab} payments found.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Email</th>
                <th>Txn ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Screenshot</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                  <td>{p.name || '-'}</td>
                  <td>{p.email || '-'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.transaction_id || '-'}</td>
                  <td>NPR {Number(p.amount || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${p.status === 'approved' ? 'bg-green' : p.status === 'rejected' ? 'bg-red' : 'bg-blue'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {signedUrls[p.id] ? (
                      <img
                        src={signedUrls[p.id]}
                        alt="screenshot"
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => setViewId(p.id)}
                      />
                    ) : '-'}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewId(p.id)}>
                        <Eye size={14} />
                      </button>
                      {p.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => approvePayment(p.id)} disabled={busy}>
                            Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectId(p.id)} disabled={busy}>
                            Reject
                          </button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => regenerateCode(p.id)} disabled={busy}>
                          <RefreshCw size={14} /> Code
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {approveModal}
      {viewModal}
      {rejectModal}
    </div>
  );
}
