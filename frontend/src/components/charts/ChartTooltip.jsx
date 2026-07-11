export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-3 shadow-card min-w-[160px]">
      {label && <div className="text-[12.5px] text-mute mb-2 font-medium">{label}</div>}
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-3 text-[14px]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-mute">{p.name}</span>
            <span className="ml-auto text-ink tabular-nums font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
