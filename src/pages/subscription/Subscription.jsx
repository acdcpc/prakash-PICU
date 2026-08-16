import { useEffect, useState } from 'react';
import { BadgeCheck, Check, CreditCard, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';
import supabase from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';

const PAYMENT_WEB_URL = import.meta.env.VITE_PAYMENT_WEB_URL || '';

const FALLBACK_PLANS = [
  {
    id: 'full-access',
    name: 'PICU Full Access',
    description: 'Full access to the PICU clinical workspace for one year.',
    price_npr: 2500,
    duration_days: 365,
    features: [
      'All clinical calculators',
      'High-risk infusion reference',
      'Emergency Mode',
      'Clinical Tools workspace',
      'Child health workspace',
      'Pediatric updates',
      'Excel exports',
    ],
  },
];

export default function Subscription() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [subscription, setSubscription] = useState(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('active', true)
      .order('price_npr')
      .then(({ data }) => { if (data?.length) setPlans(data); })
      .catch(() => {});

    supabase
      .from('subscriptions')
      .select('*')
      .maybeSingle()
      .then(({ data }) => { if (data) setSubscription(data); })
      .catch(() => {});
  }, []);

  const isActive = subscription?.status === 'active';
  const endsAt = subscription?.end_date ? new Date(subscription.end_date) : null;

  const buy = () => {
    if (!PAYMENT_WEB_URL) {
      setMessage({
        text: 'Payment page is not configured yet. Set VITE_PAYMENT_WEB_URL in .env (see SETUP_GUIDE.md).',
        type: 'info',
      });
      return;
    }
    window.open(PAYMENT_WEB_URL, '_blank', 'noopener');
    trackEvent('subscription_open_payment', {});
  };

  const redeem = async (event) => {
    event.preventDefault();
    const clean = code.trim();
    if (!clean) {
      setMessage({ text: 'Please enter an activation code.', type: 'danger' });
      return;
    }
    setBusy(true);
    setMessage({ text: '', type: '' });
    const { data, error } = await supabase.rpc('redeem_activation_code', { p_code: clean });
    setBusy(false);
    if (error) {
      setMessage({ text: error.message, type: 'danger' });
      return;
    }
    if (data?.error) {
      setMessage({ text: data.error, type: 'danger' });
      return;
    }
    setMessage({ text: 'Premium activated successfully! 🎉', type: 'success' });
    setCode('');
    trackEvent('subscription_redeem', { plan: data?.plan });
    const { data: sub } = await supabase.from('subscriptions').select('*').maybeSingle();
    if (sub) setSubscription(sub);
  };

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Access management</p>
          <h2>Subscription & Payment</h2>
          <p className="text-muted">
            Pay via eSewa/Khalti/Fonepay/Bank, submit your transaction on the payment page,
            then redeem the activation code sent by the administrator.
          </p>
        </div>
      </div>

      {isActive && (
        <div className="notice notice-success mb-2">
          <BadgeCheck size={18} />
          <span>
            Active — expires {endsAt ? endsAt.toLocaleDateString() : 'N/A'}
            {subscription?.plan ? ` (${subscription.plan})` : ''}
          </span>
        </div>
      )}

      <div className="notice notice-warning mb-2">
        <ShieldCheck size={18} />
        <span>
          Do not enter card numbers, passwords, or patient information on the payment page.
          Payment is verified manually by an administrator before access is activated.
        </span>
      </div>

      <div className="clinical-grid">
        {plans.map((plan) => (
          <div key={plan.id} className="card clinical-item">
            <div className="card-body">
              <div className="flex jc-between items-c">
                <div>
                  <h3>{plan.name}</h3>
                  <p className="text-muted">{plan.description}</p>
                </div>
                <CreditCard size={22} />
              </div>
              <div className="big-num">NPR {Number(plan.price_npr).toLocaleString()}</div>
              <p className="text-muted">{plan.duration_days} days</p>
              <div>
                {(plan.features || []).map((feature) => (
                  <div key={feature} className="text-sm">
                    <Check size={14} /> {feature}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary mt-2" onClick={buy}>
                Buy Premium
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="card mt-4" onSubmit={redeem}>
        <div className="card-head">
          <h3>Redeem activation code</h3>
          <KeyRound size={18} />
        </div>
        <div className="card-body form-row">
          <div className="form-group">
            <label className="form-label">Activation code</label>
            <input
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
            />
          </div>
          <button className="btn btn-primary" disabled={busy || !code.trim()}>
            {busy ? 'Redeeming…' : 'Redeem'}
          </button>
        </div>
        {message.text && (
          <div className="card-body">
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          </div>
        )}
      </form>

      <div className="clinical-footnote">
        For production charging, configure a server-side payment adapter, signed webhooks,
        idempotency keys, refund handling, provider reconciliation, and merchant compliance.{' '}
        <a href="https://supabase.com/docs/guides/database/webhooks" target="_blank" rel="noreferrer">
          Webhook reference <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
