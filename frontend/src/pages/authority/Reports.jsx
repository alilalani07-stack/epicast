import { useMemo, useState, useEffect } from 'react';
import { Search, Download, Filter, X, FileText } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import ReportsTable from '../../components/reports/ReportsTable.jsx';

import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import reportsService from '../../services/reports.service.js';
import dashboardService from '../../services/dashboard.service.js';

export default function Reports() {
  const [type, setType] = useState('all');
  const [disease, setDisease] = useState('all');
  const [area, setArea] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 200);

  const [filters, setFilters] = useState({ diseases: [], areas: [] });

  useEffect(() => {
    dashboardService.getFilters().then(setFilters);
  }, []);

  const params = { type, disease, area, from, to, q: debounced };
  const { data, loading, error, refetch } = useAsync(
    () => reportsService.list(params),
    [type, disease, area, from, to, debounced]
  );

  const reports = data?.reports || [];
  const counts = useMemo(() => ({
    total: reports.length,
    cases:  reports.filter((r) => r.type === 'case').length,
    deaths: reports.filter((r) => r.type === 'death').length,
  }), [reports]);

  const reset = () => {
    setType('all'); setDisease('all'); setArea('all'); setFrom(''); setTo(''); setQ('');
  };

  const handleExport = () => {
    if (!reports.length) return;
    const headers = ['ID', 'Type', 'Disease', 'Area', 'Date', 'Count', 'Submitted By'];
    const rows = reports.map(r => [
      r.id,
      r.type,
      r.disease,
      r.area,
      r.date,
      r.count,
      r.submittedBy
    ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `epicast_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // FIX: Revoke the object URL to free memory. Without this, blob URLs
    // accumulate for the lifetime of the session.
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition>
      {/* FIX (Category 1): Lock the entire content area to the viewport height
          minus the navbar (72px). The page itself never scrolls; only the
          table area scrolls internally. */}
      <div className="h-[calc(100vh-72px)] flex flex-col overflow-hidden">
        <div className="shrink-0">
          <PageHeader
            eyebrow="Surveillance"
            title="Reports"
            description="Cases and death reports submitted across all monitored areas."
            actions={
              <Button
                variant="secondary"
                icon={Download}
                onClick={handleExport}
                // FIX (Category 6): Disable export when there is nothing to export
                // or while the query is still loading.
                disabled={!reports.length || loading}
              >
                Export CSV
              </Button>
            }
          />
        </div>

        {/* FIX (Category 1): Filter bar is shrink-0 so it never compresses.
            mb-6 stays as the section gap. */}
        <div className="shrink-0 mb-6">
          <Panel padded={false}>
            <div className="p-5 lg:p-6 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* FIX (Category 9): min-w-0 prevents the tabs from refusing to
                    shrink on intermediate widths, which would push the search
                    input off-screen. */}
                <div className="min-w-0">
                  <Tabs
                    tabs={[
                      { value: 'all', label: `All · ${counts.total}` },
                      { value: 'case', label: `Case · ${counts.cases}` },
                      { value: 'death', label: `Death · ${counts.deaths}` },
                    ]}
                    value={type}
                    onChange={setType}
                  />
                </div>
                <div className="flex-1 lg:max-w-sm">
                  <Input
                    icon={Search}
                    placeholder="Search by disease, area, ID…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="ghost" icon={X} onClick={reset}>Clear</Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FilterField label="Disease">
                  {/* FIX (Category 8): w-full ensures the select fills its grid
                      cell on mobile where the grid is 2-column. */}
                  <Select value={disease} onChange={(e) => setDisease(e.target.value)} className="w-full">
                    <option value="all">All diseases</option>
                    {filters.diseases.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="Area">
                  <Select value={area} onChange={(e) => setArea(e.target.value)} className="w-full">
                    <option value="all">All areas</option>
                    {filters.areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="From">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full" />
                </FilterField>
                <FilterField label="To">
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full" />
                </FilterField>
              </div>
            </div>
          </Panel>
        </div>

        {/* FIX (Categories 2, 4, 5): The table panel fills all remaining viewport
            space (flex-1) and clips overflow (overflow-hidden). Inside, the
            AsyncBoundary renders either a skeleton or the scrollable table.
            overflow-auto on the table wrapper gives both vertical scrolling
            (many rows) and horizontal scrolling (7 columns on mobile). */}
        <Panel padded={false} className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <AsyncBoundary
            loading={loading}
            error={error}
            onRetry={refetch}
            skeleton={
              <div className="h-full overflow-hidden">
                <TableSkeleton rows={8} cols={7} />
              </div>
            }
            // FIX (Category 3): Explicit empty state instead of a blank gap when
            // filters exclude every report.
            isEmpty={!reports.length}
            empty={
              <div className="h-full flex items-center justify-center px-6 py-8">
                <EmptyState icon={FileText} title="No reports found" description="Try adjusting your filters or clearing the search." />
              </div>
            }
          >
            {/* ASSUMPTION: ReportsTable does not have its own overflow wrapper.
                If it does, this creates a nested scroll trap — remove this div. */}
            <div className="h-full overflow-auto">
              <ReportsTable reports={reports} />
            </div>
          </AsyncBoundary>
        </Panel>
      </div>
    </PageTransition>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <div className="text-[10.5px] text-faint uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <Filter className="w-3 h-3" /> {label}
      </div>
      {children}
    </div>
  );
}