// Empty, and explicitly explains what the clinician can do next.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state" role="status">
      {Icon && <Icon size={28} aria-hidden="true" />}
      {title && <strong>{title}</strong>}
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
