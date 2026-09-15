import { Lock } from 'lucide-react';

// Shown when a record exists but the clinician is not authorised to see it.
// Deliberately does not reveal whether the row exists beyond "no access".
export default function PermissionState({ title = 'You do not have access', description = 'This record is outside your permitted scope. Ask an administrator if you believe you should have access.' }) {
  return (
    <div className="empty-state" role="status">
      <Lock size={28} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
