import { Table, THead, TH, TBody, TR, TD } from '../ui/Table.jsx';
import Badge from '../ui/Badge.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { FileText, Activity, Skull } from 'lucide-react';

function typeBadge(type) {
  return type === 'death' ? (
    <Badge variant="critical" dot>Death</Badge>
  ) : (
    <Badge variant="info" dot>Case</Badge>
  );
}

/**
 * Shorten a raw Firebase UID or arbitrary string to a readable clinic label.
 */
function formatClinicId(id, clinicsMap = {}) {
  if (!id || id === '—') return <span className="text-faint text-[12px] italic">System / Seeded</span>;
  if (clinicsMap[id]) return <span className="text-[13.5px] text-ink-2 font-medium">{clinicsMap[id]}</span>;

  if (id.startsWith('demo-')) {
    try {
      const email = atob(id.slice(5));
      return <span className="text-[13.5px] text-ink-2 font-medium">{email.split('@')[0]} Clinic</span>;
    } catch {
      return <span className="text-[13.5px] text-ink-2 font-medium">Demo Clinic ({id.slice(5, 11)})</span>;
    }
  }

  if (id === 'dev_user') return <span className="text-[13.5px] text-ink-2 font-medium">Central Development Clinic</span>;

  const label = id.length > 12 ? `${id.slice(0, 10)}…` : id;
  return (
    <span className="font-mono text-[12px] text-mute animate-pulse" title={id}>
      Clinic ({label})
    </span>
  );
}

export default function ReportsTable({ reports = [], areasMap = new Map(), clinicsMap = {}, onRowClick }) {
  if (!reports.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No reports found"
        description="Try adjusting your filters or search query."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TH>ID</TH>
        <TH>Type</TH>
        <TH>Disease</TH>
        <TH>Area</TH>
        <TH align="right">Count</TH>
        <TH>Submitted by</TH>
        <TH>Date</TH>
      </THead>
      <TBody>
        {reports.map((r) => (
          <TR key={r.id} onClick={() => onRowClick?.(r)} className="cursor-pointer">
            <TD>
              <span className="text-faint">#</span>
              <span className="text-ink-2">{r.id}</span>
            </TD>
            <TD>{typeBadge(r.type)}</TD>
            <TD>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-mute">
                  {r.type === 'death' ? <Skull className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </span>
                <span className="font-semibold text-ink">{r.disease}</span>
              </div>
            </TD>
            <TD title={r.area}>
              <span className="truncate max-w-[160px] inline-block">
                {areasMap.get(r.area) || r.area || '—'}
              </span>
            </TD>
            <TD align="right" className="font-semibold text-ink text-[15px]">{r.count}</TD>
            <TD>{formatClinicId(r.clinic_id, clinicsMap)}</TD>
            <TD><span className="text-mute">{r.date}</span></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}