// Label + control + hint + field-level error, wired with aria-describedby and
// aria-invalid so assistive technology associates the message with the field.
export function FormField({ id, label, hint, error, children }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const controlProps = { id, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined };
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children(controlProps) : children}
      {hint && <span className="form-hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

export default FormField;
