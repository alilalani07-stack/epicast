import { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState.jsx';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Input from '../../components/ui/Input.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import ReportsTable from '../../components/reports/ReportsTable.jsx';

import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import reportsService from '../../services/reports.service.js';
import dashboardService from '../../services/dashboard.service.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function History() {
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [areasMap, setAreasMap] = useState({});
  const debounced = useDebounce(q, 200);

  const { user } = useAuth();

  useEffect(() => {
    dashboardService.getFilters({ allowFallback: false }).then((f) => {
      const m = {};
      (f.areas || []).forEach((a) => { m[a.area_id] = a.area_name; });
      setAreasMap(m);
    }).catch(() => {});
  }, []);

  const { data, loading, error, refetch } = useAsync(
    () => reportsService.list({ type, q: debounced, clinic_id: user?.uid }, { allowFallback: false }),
    [type, debounced, user?.uid]
  );

  useEffect(() => {
    refetch();
  }, []);

  const areaName = (id) => areasMap[id] || id || '—';
  const reports = (data?.reports ?? []).map((r) => ({
    ...r,
    area: areaName(r.area),
  }));

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clinic Portal"
        title="Submission History"
        description="All reports submitted by your clinic."
      />

      <Panel padded={false} className="mb-6">
        <div className="p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'case', label: 'Cases' },
              { value: 'death', label: 'Deaths' },
            ]}
            value={type}
            onChange={setType}
          />
          <div className="flex-1 sm:max-w-sm">
            <Input
              icon={Search}
              placeholder="Search history…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </Panel>

      <Panel padded={false}>
        <AsyncBoundary
          loading={loading}
          error={error}
          onRetry={refetch}
          skeleton={<TableSkeleton rows={8} cols={7} />}
          isEmpty={!reports.length}
          empty={
            <EmptyState
              icon={FileText}
              title="No reports found"
              description="No submissions match your current filters."
            />
          }
        >
          <ReportsTable reports={reports} />
        </AsyncBoundary>
      </Panel>
    </PageTransition>
  );
}
