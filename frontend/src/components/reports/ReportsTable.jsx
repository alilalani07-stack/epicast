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

export default function ReportsTable({ reports = [], onRowClick }) {
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
          <TR key={r.id} onClick={() => onRowClick?.(r)}>
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
            <TD>{r.area}</TD>
            <TD align="right" className="font-semibold text-ink text-[15px]">{r.count}</TD>
            <TD><span className="text-mute">{r.submittedBy}</span></TD>
            <TD><span className="text-mute">{r.date}</span></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
