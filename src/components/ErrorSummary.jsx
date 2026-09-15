import { AlertTriangle } from 'lucide-react';

// Accessible form error summary: announced, focusable, and linked to fields.
export default function ErrorSummary({ errors, summaryRef }) {
  const entries = Object.entries(errors || {}).filter(([, message]) => message);
  if (!entries.length) return null;
  return (
    <div className="notice notice-danger" role="alert" tabIndex={-1} ref={summaryRef}>
      <AlertTriangle size={18} aria-hidden="true" />
      <span>
        <strong>{entries.length === 1 ? 'One field needs attention' : `${entries.length} fields need attention`}</strong>
        <ul className="error-summary">
          {entries.map(([name, message]) => <li key={name}><a href={`#field-${name}`}>{message}</a></li>)}
        </ul>
      </span>
    </div>
  );
}
