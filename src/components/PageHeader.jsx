// One meaningful <h1> per route, with an optional eyebrow, description, icon
// and actions. Keeps heading order and spacing consistent across routes.
export default function PageHeader({ eyebrow, title, description, icon: Icon, actions }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="text-muted">{description}</p>}
      </div>
      <div className="page-heading-side">
        {actions}
        {Icon && <Icon size={26} aria-hidden="true" />}
      </div>
    </div>
  );
}
