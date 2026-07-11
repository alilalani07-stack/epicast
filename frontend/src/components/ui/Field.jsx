import Label from './Label.jsx';

export default function Field({ label, required, hint, error, children, htmlFor }) {
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[12.5px] text-red-600 mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-mute mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}
