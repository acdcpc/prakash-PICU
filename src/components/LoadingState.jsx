export default function LoadingState({ label = 'Loading…' }) {
  return <div className="loader" role="status" aria-live="polite"><div className="spinner" aria-hidden="true" /> {label}</div>;
}
