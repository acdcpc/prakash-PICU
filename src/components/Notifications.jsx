import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { subscribe, dismiss } from '../lib/notifications';

const ICONS = { info: Info, success: CheckCircle2, danger: AlertTriangle };

// Global, accessible notice stack. Errors use role="alert" (assertive); other
// tones use role="status" (polite). Rendered once per layout.
export default function Notifications() {
  const [items, setItems] = useState([]);
  useEffect(() => subscribe(setItems), []);
  if (!items.length) return null;
  return (
    <div className="notice-stack" aria-live="polite">
      {items.map((item) => {
        const Icon = ICONS[item.tone] || Info;
        return (
          <div key={item.id} className={`notice notice-${item.tone}`} role={item.tone === 'danger' ? 'alert' : 'status'}>
            <Icon size={17} />
            <span>{item.message}</span>
            <button type="button" className="notice-dismiss" aria-label="Dismiss message" onClick={() => dismiss(item.id)}><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}
