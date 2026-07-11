const ITEMS = [
  { label: 'Low', color: '#16a34a' },
  { label: 'Moderate', color: '#d97706' },
  { label: 'High', color: '#ea580c' },
  { label: 'Critical', color: '#dc2626' },
];

export default function RiskLegend({ className = '' }) {
  return (
    <div className={`absolute bottom-4 left-4 z-[400] bg-surface/95 backdrop-blur border border-line rounded-xl px-4 py-3.5 shadow-card ${className}`}>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-faint mb-2.5">
        Risk level
      </div>
      <div className="flex flex-col gap-2">
        {ITEMS.map((it) => (
          <div key={it.label} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: it.color, boxShadow: `0 0 0 3px ${it.color}1f` }}
            />
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}
