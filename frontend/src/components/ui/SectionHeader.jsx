export default function SectionHeader({ title, description, actions, eyebrow, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow text-[12px] mb-2">{eyebrow}</div>}
        <h2 className="text-[20px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="text-[14px] text-mute mt-1.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
