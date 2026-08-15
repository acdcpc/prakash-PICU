import { useEffect, useState } from 'react';
import { Check, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import supabase from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';

const FALLBACK_PLANS = [
  { id: 'monthly', name: 'Monthly Clinical', description: 'Pediatric clinical workspace for one month.', price_npr: 200, duration_days: 30, features: ['Clinical Tools', 'Growth and immunization workspace', 'Guideline-linked pathways'] },
  { id: 'yearly', name: 'Yearly Clinical', description: 'Full access for one year with priority content updates.', price_npr: 2000, duration_days: 365, features: ['Everything in Monthly', 'Expanded disease library', 'POCUS documentation workspace'] },
];

export default function Subscription() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [selected, setSelected] = useState('yearly');
  const [provider, setProvider] = useState(import.meta.env.VITE_PAYMENT_PROVIDER || 'manual_review');
  const [reference, setReference] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('subscription_plans').select('*').eq('active', true).order('price_npr').then(({ data }) => { if (data?.length) setPlans(data); });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const plan = plans.find((item) => item.id === selected);
    setSaving(true); setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('payment_requests').insert({ user_id: user?.id || null, plan_id: plan.id, amount_npr: plan.price_npr, provider, reference: reference || null, contact_email: contact || user?.email || null, status: 'submitted' });
    if (error) setMessage(error.message);
    else { setMessage('Payment request submitted. An administrator must verify the payment before access is activated.'); trackEvent('subscription_request', { plan: plan.id, provider }); }
    setSaving(false);
  };

  return <div className="page-content"><div className="page-heading"><div><p className="eyebrow">Access management</p><h2>Subscription & Payment</h2><p className="text-muted">Choose a plan and submit a verifiable payment request. Live card or wallet charging requires a server-side provider account and webhook configuration.</p></div></div><div className="notice notice-warning"><ShieldCheck size={18} /><span>Payment data is handled as a request until an authorized administrator verifies the provider reference. Do not enter card numbers, passwords, or sensitive patient information here.</span></div><div className="clinical-grid">{plans.map((plan) => <button key={plan.id} className={`card clinical-item ${selected === plan.id ? 'selected' : ''}`} onClick={() => setSelected(plan.id)}><div className="card-body"><div className="flex jc-between items-c"><div><h3>{plan.name}</h3><p className="text-muted">{plan.description}</p></div><CreditCard size={22} /></div><div className="big-num">NPR {plan.price_npr.toLocaleString()}</div><p className="text-muted">{plan.duration_days} days</p><div>{(plan.features || []).map((feature) => <div key={feature} className="text-sm"><Check size={14} /> {feature}</div>)}</div></div></button>)}</div><form className="card mt-4" onSubmit={submit}><div className="card-head"><h3>Submit payment reference</h3><span className="badge badge-blue">{provider}</span></div><div className="card-body form-row"><div className="form-group"><label className="form-label">Payment method</label><select className="form-select" value={provider} onChange={(e) => setProvider(e.target.value)}><option value="manual_review">Manual review</option><option value="esewa">eSewa (provider setup required)</option><option value="khalti">Khalti (provider setup required)</option><option value="stripe">Stripe (provider setup required)</option></select></div><div className="form-group"><label className="form-label">Transaction/reference number</label><input className="form-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional until payment is made" /></div><div className="form-group"><label className="form-label">Contact email</label><input className="form-input" type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="For payment follow-up" /></div><button className="btn btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</button></div>{message && <div className="card-body"><div className="alert alert-info">{message}</div></div>}</form><div className="clinical-footnote">For production charging, configure a server-side payment adapter, signed webhooks, idempotency keys, refund handling, provider reconciliation, and merchant compliance. <a href="https://supabase.com/docs/guides/database/webhooks" target="_blank" rel="noreferrer">Webhook reference <ExternalLink size={12} /></a></div></div>;
}
