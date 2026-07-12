import { useMemo, useState } from 'react';
import { Search, Download, Filter, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

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

const PAGE_SIZE = 50;

export default function Reports() {
  const [type, setType] = useState('all');
  const [disease, setDisease] = useState('all');
  const [area, setArea] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const debounced = useDebounce(q, 200);

  const filtersQ = useAsync(() => dashboardService.getFilters({ allowFallback: false }), []);
  const filters = filtersQ.data || { diseases: [], areas: [] };

  // ── Paginated filtered table rows ──────────────────────────────────────────
  // The `type` tab filter is passed to the backend so the server returns only
  // rows matching the selected type. This also makes `data.total` accurate for
  // the selected type tab.
  const listParams = {
    type,
    disease,
    area,
    from,
    to,
    q: debounced,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, loading, error, refetch } = useAsync(
    () => reportsService.list(listParams, { allowFallback: false }),
    [type, disease, area, from, to, debounced, page]
  );

  const reports = data?.reports || [];
  // `total` is the backend's count of ALL matching rows (not just this page)
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Server-side global totals for tab header counts ───────────────────────
  // Three parallel /reports/stats calls — one per type — with the same
  // disease/area/date/search filters so the tab counts always reflect the
  // current filter state, not the page.
  const statsBaseParams = { disease, area, from, to, q: debounced };
  const allStatsQ    = useAsync(() => reportsService.getStats({ ...statsBaseParams },            { allowFallback: false }), [disease, area, from, to, debounced]);
  const caseStatsQ   = useAsync(() => reportsService.getStats({ ...statsBaseParams, type: 'case' },  { allowFallback: false }), [disease, area, from, to, debounced]);
  const deathStatsQ  = useAsync(() => reportsService.getStats({ ...statsBaseParams, type: 'death' }, { allowFallback: false }), [disease, area, from, to, debounced]);

  // Map area_id -> area_name for resolving human-readable facility names
  const areasMap = useMemo(
    () => new Map((filters.areas || []).map((a) => [a.area_id, a.area_name])),
    [filters.areas]
  );

  // Real-time clinic_id -> clinic_name map from the backend (not a hardcoded dict).
  // Any clinic that has submitted a report will appear here with its human-readable name.
  const clinicsQ = useAsync(
    () => reportsService.getClinics({ allowFallback: false }),
    []
  );
  const clinicsMap = clinicsQ.data || {};

  const counts = {
    all:    allStatsQ.data?.total_reports    ?? 0,
    cases:  caseStatsQ.data?.total_cases     ?? 0,
    deaths: deathStatsQ.data?.total_deaths   ?? 0,
  };

  // Reset page when filters change
  const changeType = (v)    => { setType(v);    setPage(0); };
  const changeDisease = (v) => { setDisease(v); setPage(0); };
  const changeArea = (v)    => { setArea(v);    setPage(0); };
  const changeFrom = (v)    => { setFrom(v);    setPage(0); };
  const changeTo = (v)      => { setTo(v);      setPage(0); };
  const changeQ = (v)       => { setQ(v);       setPage(0); };

  const reset = () => {
    setType('all'); setDisease('all'); setArea('all');
    setFrom(''); setTo(''); setQ(''); setPage(0);
  };

  const handleExport = () => {
    if (!reports.length) return;
    const headers = ['ID', 'Type', 'Disease', 'Area', 'Date', 'Count', 'Clinic ID'];
    const rows = reports.map(r => [
      r.id,
      r.type,
      r.disease,
      areasMap.get(r.area) || r.area || '—',
      r.date,
      r.count,
      r.clinic_id || '—',
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

    URL.revokeObjectURL(url);
  };

  const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow  = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <PageTransition>
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
                disabled={!reports.length || loading}
              >
                Export CSV
              </Button>
            }
          />
        </div>

        <div className="shrink-0 mb-6">
          <Panel padded={false}>
            <div className="p-5 lg:p-6 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0">
                  <Tabs
                    tabs={[
                      { value: 'all',   label: `All · ${counts.all}`      },
                      { value: 'case',  label: `Cases · ${counts.cases}`  },
                      { value: 'death', label: `Deaths · ${counts.deaths}`},
                    ]}
                    value={type}
                    onChange={changeType}
                  />
                </div>
                <div className="flex-1 lg:max-w-sm">
                  <Input
                    icon={Search}
                    placeholder="Search by disease, area, ID…"
                    value={q}
                    onChange={(e) => changeQ(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="ghost" icon={X} onClick={reset}>Clear</Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FilterField label="Disease">
                  <Select value={disease} onChange={(e) => changeDisease(e.target.value)} className="w-full" disabled={filtersQ.loading || !!filtersQ.error}>
                    <option value="all">All diseases</option>
                    {filters.diseases.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="Area">
                  <Select value={area} onChange={(e) => changeArea(e.target.value)} className="w-full" disabled={filtersQ.loading || !!filtersQ.error}>
                    <option value="all">All areas</option>
                    {filters.areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="From">
                  <Input type="date" value={from} onChange={(e) => changeFrom(e.target.value)} className="w-full" />
                </FilterField>
                <FilterField label="To">
                  <Input type="date" value={to} onChange={(e) => changeTo(e.target.value)} className="w-full" />
                </FilterField>
              </div>
            </div>
          </Panel>
        </div>

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
            isEmpty={!reports.length}
            empty={
              <div className="h-full flex items-center justify-center px-6 py-8">
                <EmptyState icon={FileText} title="No reports found" description="Try adjusting your filters or clearing the search." />
              </div>
            }
          >
            <div className="flex-1 overflow-auto">
              <ReportsTable reports={reports} areasMap={areasMap} clinicsMap={clinicsMap} />
            </div>
          </AsyncBoundary>

          {/* ── Pagination footer ── */}
          {total > 0 && (
            <div className="shrink-0 border-t border-line px-5 py-3 flex items-center justify-between gap-4 bg-canvas">
              <span className="text-[13px] text-mute tabular-nums">
                {firstRow}–{lastRow} of {total} records
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Prev
                </Button>
                <span className="text-[13px] text-mute tabular-nums">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  iconRight={ChevronRight}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
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