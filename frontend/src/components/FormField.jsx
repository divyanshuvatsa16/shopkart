export default function FormField({ label, name, type = "text", value, onChange, error }) {
  return (
    <label className="field" htmlFor={name}>
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <small id={`${name}-error`} className="field-error">{error}</small>}
    </label>
  );
}
