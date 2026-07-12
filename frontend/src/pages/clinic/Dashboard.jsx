import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, Skull, FileText, Activity, ArrowUpRight } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import MetricCard from '../../components/ui/MetricCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { MetricCardSkeleton, AlertFeedSkeleton } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import useAsync from '../../hooks/useAsync.js';
import reportsService from '../../services/reports.service.js';
import dashboardService from '../../services/dashboard.service.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ClinicDashboard() {
  const { user } = useAuth();
  const [areasMap, setAreasMap] = useState({});

  useEffect(() => {
    dashboardService.getFilters({ allowFallback: false }).then((f) => {
      const m = {};
      (f.areas || []).forEach((a) => { m[a.area_id] = a.area_name; });
      setAreasMap(m);
    }).catch(() => {});
  }, []);

  // Guard: never fire requests until the clinic UID is resolved.
  // An undefined clinic_id would return ALL reports (leak from other clinics).
  const uid = user?.uid;
  const { data: listData, loading: listLoading, error: listError, refetch: listRefetch } = useAsync(
    () => uid
      ? reportsService.list({ clinic_id: uid, limit: 6 }, { allowFallback: false })
      : Promise.resolve({ total: 0, reports: [] }),
    [uid]
  );

  // Server-side aggregated totals so the KPI cards are always accurate regardless
  // of how many rows the clinic has submitted (avoids the 100-row client-sum bug)
  const { data: statsData, loading: statsLoading, error: statsError, refetch: statsRefetch } = useAsync(
    () => uid
      ? reportsService.getStats({ clinic_id: uid }, { allowFallback: false })
      : Promise.resolve({ total_reports: 0, total_cases: 0, total_deaths: 0 }),
    [uid]
  );

  const refetch = () => { listRefetch(); statsRefetch(); };

  const areaName = (id) => areasMap[id] || id || '—';

  const recent = listData?.reports ?? [];

  const totalReports = statsData?.total_reports ?? 0;
  const totalCases   = statsData?.total_cases   ?? 0;
  const totalDeaths  = statsData?.total_deaths  ?? 0;

  const greeting = user?.displayName
    ? `Welcome back, ${user.displayName}`
    : 'Welcome back';

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clinic Portal"
        title={greeting}
        description="Submit reports and review your clinic's recent activity."
        actions={
          <>
            <Link to="/clinic/submit-case">
              <Button variant="secondary" icon={FilePlus} size="lg">
                New case report
              </Button>
            </Link>
            <Link to="/clinic/submit-death">
              <Button variant="primary" icon={Skull} size="lg">
                New death report
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-14">
        <AsyncBoundary
          loading={statsLoading}
          error={statsError}
          onRetry={refetch}
          skeleton={<MetricCardSkeleton count={3} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard
              index={0}
              label="Reports submitted"
              value={totalReports}
              deltaLabel="all time"
              icon={FileText}
            />
            <MetricCard
              index={1}
              label="Cases reported"
              value={totalCases}
              deltaLabel="all time"
              icon={Activity}
            />
            <MetricCard
              index={2}
              label="Deaths reported"
              value={totalDeaths}
              deltaLabel="all time"
              icon={Skull}
            />
          </div>
        </AsyncBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Panel padded={false} className="lg:col-span-2">
          <div className="flex items-center justify-between px-7 py-6 border-b border-line">
            <div>
              <div className="eyebrow mb-1">Activity</div>
              <h2 className="text-[18px] font-semibold tracking-tight">
                Recent submissions
              </h2>
            </div>
            <Link to="/clinic/history">
              <Button variant="ghost" size="sm" iconRight={ArrowUpRight}>
                History
              </Button>
            </Link>
          </div>
          <AsyncBoundary
            loading={listLoading}
            error={listError}
            onRetry={listRefetch}
            skeleton={
              <div className="p-3">
                <AlertFeedSkeleton count={5} />
              </div>
            }
            isEmpty={!recent.length}
            empty={
              <EmptyState
                icon={FileText}
                title="No submissions yet"
                description="Submit your first case or death report to get started."
                action={
                  <Link to="/clinic/submit-case">
                    <Button variant="primary" icon={FilePlus}>
                      New case report
                    </Button>
                  </Link>
                }
              />
            }
            compactError
          >
            <div className="divide-y divide-line">
              {recent.map((r) => (
                <div
                  key={r.id ?? Math.random()}
                  className="px-7 py-5 flex items-center gap-5 hover:bg-surface-2/60 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2">
                    {r.type === 'death' ? (
                      <Skull className="w-4 h-4 text-red-600" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[14px] font-medium truncate text-ink">
                        {r.disease}
                      </div>
                      <Badge variant={r.type === 'death' ? 'critical' : 'info'}>
                        {r.type === 'death' ? 'Death' : 'Case'}
                      </Badge>
                    </div>
                    <div className="text-[13px] text-mute truncate mt-1">
                      {areaName(r.area)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[17px] font-semibold tabular-nums text-ink">
                      {Number(r.count) || 0}
                    </div>
                    <div className="text-[12px] text-faint mt-0.5">{r.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </AsyncBoundary>
        </Panel>

        <Panel>
          <div className="eyebrow mb-1">Quick actions</div>
          <h2 className="text-[18px] font-semibold tracking-tight">
            Submit a report
          </h2>
          <p className="text-[14px] text-mute mt-2 leading-relaxed">
            Help build a faster, more accurate response by sharing field data.
          </p>
          <div className="mt-6 space-y-3">
            <ActionRow
              to="/clinic/submit-case"
              title="Case report"
              sub="Confirmed or suspected cases."
              Icon={FilePlus}
              tint="info"
            />
            <ActionRow
              to="/clinic/submit-death"
              title="Death report"
              sub="Disease-related fatalities."
              Icon={Skull}
              tint="critical"
            />
          </div>
        </Panel>
      </div>
    </PageTransition>
  );
}

function ActionRow({ to, title, sub, Icon, tint }) {
  const tintClass =
    tint === 'critical'
      ? 'bg-red-50 border-red-100 text-red-700'
      : 'bg-blue-50 border-blue-100 text-blue-700';
  return (
    <Link to={to} className="block">
      <div className="group p-4 rounded-xl bg-canvas border border-line hover:border-line-strong hover:bg-surface-2/60 transition-all flex items-center gap-3.5">
        <div
          className={`w-11 h-11 rounded-lg border flex items-center justify-center ${tintClass}`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-ink">{title}</div>
          <div className="text-[13px] text-mute mt-0.5">{sub}</div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-mute group-hover:text-ink transition-colors" />
      </div>
    </Link>
  );
}
