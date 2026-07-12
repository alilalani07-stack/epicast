import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FileText, Bell, ShieldAlert, TrendingUp, ArrowUpRight, Activity, Download,
  RefreshCcw, Skull,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import MetricCard from '../../components/ui/MetricCard.jsx';
import Panel from '../../components/ui/Panel.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import {
  MetricCardSkeleton, MapSkeleton, ChartSkeleton, AlertFeedSkeleton,
} from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import MapContainer from '../../components/map/MapContainer.jsx';
import RiskMarkers from '../../components/map/RiskMarkers.jsx';
import RiskLegend from '../../components/map/RiskLegend.jsx';
import LocationSearch from '../../components/map/LocationSearch.jsx';

import ForecastChart from '../../components/charts/ForecastChart.jsx';
import AlertCard from '../../components/alerts/AlertCard.jsx';

import useAsync from '../../hooks/useAsync.js';
import dashboardService from '../../services/dashboard.service.js';
import alertsService from '../../services/alerts.service.js';
import reportsService from '../../services/reports.service.js';
import forecastService from '../../services/forecast.service.js';
import { DEFAULT_REGION } from '../../lib/config.js';

const SECTION_GAP = 'mb-8 sm:mb-10 lg:mb-12';
const PANEL_HEADER = 'px-5 sm:px-6 py-4';
const GRID_GAP = 'gap-5 sm:gap-6';

export default function Dashboard() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();

  const metricsQ = useAsync(() => dashboardService.getMetrics({ allowFallback: false }), []);
  const pointsQ = useAsync(() => dashboardService.getMapPoints({ allowFallback: false }), []);
  const alertsQ = useAsync(() => alertsService.list({}, { allowFallback: false }), []);
  const reportsQ = useAsync(() => reportsService.list({}, { allowFallback: false }), []);
  const filtersQ = useAsync(() => dashboardService.getFilters({ allowFallback: false }), []);

  const topDisease = [...(metricsQ.data?.disease_breakdown || [])]
    .sort((a, b) => (b.active_cases_7d ?? 0) - (a.active_cases_7d ?? 0))[0]?.disease_name || null;

  const forecastQ = useAsync(
    () => topDisease ? forecastService.getForecast(topDisease, { allowFallback: false }) : Promise.resolve(null),
    [topDisease]
  );

  const [mapFocus, setMapFocus] = useState(null);

  const areasMap = new Map((filtersQ.data?.areas || []).map((a) => [a.area_id, a.area_name]));

  const refreshAll = async () => {
    await metricsQ.refetch();
    await Promise.all([
      pointsQ.refetch(),
      alertsQ.refetch(),
      reportsQ.refetch(),
      filtersQ.refetch(),
      forecastQ.refetch(),
    ]);
  };

  const hasLoadedOnce = Boolean(
    metricsQ.data && pointsQ.data && alertsQ.data && reportsQ.data && filtersQ.data
  );
  const isRefreshing = hasLoadedOnce && (
    metricsQ.loading || pointsQ.loading || alertsQ.loading
    || reportsQ.loading || filtersQ.loading || forecastQ.loading
  );

  const m = metricsQ.data || {};
  const recentReports = (reportsQ.data?.reports || []).slice(0, 6);
  const liveAlerts = (alertsQ.data?.alerts || []).filter((a) => a.status !== 'resolved').slice(0, 4);
  const forecastMetricValue = forecastQ.data ? (forecastQ.data.trend_percent_change ?? 0) : '—';

  const handleExport = () => {
    const list = reportsQ.data?.reports || [];
    if (!list.length) return;
    const headers = ['ID', 'Type', 'Disease', 'Area', 'Date', 'Count', 'Clinic ID'];
    const rows = list.map((r) => [
      r.id,
      r.type,
      r.disease,
      areasMap.get(r.area) || r.area || '—',
      r.date,
      r.count,
      r.clinic_id || '—',
    ].map((val) => `"${String(val || '').replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `epicast_reports_dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const enter = (delay = 0, y = 12, duration = 0.45, ease) => (
    reducedMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration, delay, ...(ease && { ease }) } }
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow={`Authority Portal · ${DEFAULT_REGION.name}`}
        title="Outbreak Intelligence"
        description={`Current disease activity, risk zones, alerts and forecasted trends across ${DEFAULT_REGION.name}. Refresh to load the latest data.`}
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={RefreshCcw} size="lg" onClick={refreshAll} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="primary" icon={Download} size="lg" onClick={handleExport} disabled={!recentReports.length}>
              Export
            </Button>
          </div>
        )}
      />

      {/* ── Row 1: KPI Cards ── */}
      <div className={SECTION_GAP}>
        <AsyncBoundary
          loading={metricsQ.loading}
          error={metricsQ.error}
          onRetry={metricsQ.refetch}
          skeleton={<MetricCardSkeleton count={4} />}
        >
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${GRID_GAP}`}>
            <MetricCard index={0} label="Total reports" value={m.totalReports?.value ?? 0} delta={m.totalReports?.delta} deltaLabel="vs last 30d" icon={FileText} />
            <MetricCard index={1} label="Active alerts" value={m.activeAlerts?.value ?? 0} delta={m.activeAlerts?.delta} deltaLabel="vs last week" icon={Bell} />
            <MetricCard index={2} label="Critical zones" value={m.highRiskZones?.value ?? 0} delta={m.highRiskZones?.delta} deltaLabel="this week" icon={ShieldAlert} />
            <MetricCard
              index={3}
              label="Forecast growth"
              value={forecastMetricValue}
              delta={m.forecastGrowth?.delta}
              deltaLabel="next 7d"
              icon={TrendingUp}
              hint={forecastQ.error ? 'Unavailable' : undefined}
              suffix={typeof forecastMetricValue === 'number' ? '%' : undefined}
              format={(v) => Number(v).toFixed(1)}
            />
          </div>
        </AsyncBoundary>
      </div>

      {/* ── Row 2: Intelligence Map ── */}
      <motion.div {...enter(0.05, 14, 0.5, [0.22, 1, 0.36, 1])} className={SECTION_GAP}>
        <Panel padded={false} elevated className="overflow-hidden">
          <div className={`flex flex-col gap-4 border-b border-line ${PANEL_HEADER}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="eyebrow mb-1 truncate">Intelligence map · {DEFAULT_REGION.name}</div>
                <h2 className="text-[19px] sm:text-[22px] lg:text-[25px] font-semibold tracking-tight flex flex-wrap items-center gap-x-3 gap-y-2">
                  Current signals across regions
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-medium shrink-0">
                    <span className="relative flex w-2 h-2" aria-hidden="true">
                      {!reducedMotion && (
                        <span className="absolute inset-0 rounded-full bg-emerald-500 ping-ring" />
                      )}
                      <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
                    </span>
                    Latest sync
                  </span>
                </h2>
                <p className="text-[14px] text-mute mt-2">
                  Active outbreak signals across monitored areas. Search a location or click the map.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Badge variant="low" dot>Low</Badge>
                <Badge variant="moderate" dot>Moderate</Badge>
                <Badge variant="high" dot>High</Badge>
                <Badge variant="critical" dot>Critical</Badge>
              </div>
            </div>
            <div className="max-w-xl w-full">
              <LocationSearch
                placeholder="Jump to a place - e.g. Madhapur, Charminar, Apollo Hyderabad"
                onSelect={(r) => setMapFocus({
                  lat: r.lat,
                  lng: r.lng,
                  zoom: DEFAULT_REGION.zoomDetail,
                  label: r.label,
                  geojson: r.geojson,
                  boundingbox: r.boundingbox,
                })}
              />
            </div>
          </div>
          <div className="relative isolate h-[320px] sm:h-[400px] lg:h-[520px]">
            <AsyncBoundary
              loading={pointsQ.loading}
              error={pointsQ.error}
              onRetry={pointsQ.refetch}
              skeleton={<MapSkeleton className="h-full w-full" />}
              isEmpty={!pointsQ.loading && !(pointsQ.data || []).length}
              empty={<EmptyState icon={ShieldAlert} title="No risk zones available" description="Risk zones will appear here when reports are available." />}
            >
              <MapContainer
                center={DEFAULT_REGION.center}
                zoom={DEFAULT_REGION.zoom}
                height="100%"
                focus={mapFocus}
              >
                <RiskMarkers points={pointsQ.data || []} cluster />
              </MapContainer>
              <RiskLegend />
            </AsyncBoundary>
          </div>
        </Panel>
      </motion.div>

      {/* ── Row 3: Recent Reports (2/3) + Active Alerts (1/3) ── */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${GRID_GAP} ${SECTION_GAP}`}>
        <motion.div {...enter(0.1)} className="lg:col-span-2 min-w-0 self-start">
          <Panel padded={false}>
            <div className={`flex items-center justify-between gap-3 border-b border-line ${PANEL_HEADER}`}>
              <div className="min-w-0">
                <div className="eyebrow mb-1 truncate">Surveillance</div>
                <h2 className="text-[16px] font-semibold tracking-tight truncate">Recent reports</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconRight={ArrowUpRight}
                className="shrink-0"
                onClick={() => navigate('/authority/reports')}
              >
                View all
              </Button>
            </div>
            <AsyncBoundary
              loading={reportsQ.loading || filtersQ.loading}
              error={reportsQ.error || filtersQ.error}
              onRetry={() => { reportsQ.refetch(); filtersQ.refetch(); }}
              skeleton={<AlertFeedSkeleton count={6} />}
              isEmpty={!reportsQ.loading && !recentReports.length}
              empty={<EmptyState icon={FileText} title="No reports yet" description="New submissions will appear here." />}
              compactError
            >
              <div className="divide-y divide-line">
                {recentReports.map((r) => (
                  <div key={r.id} className="px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-surface-2/60 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2 shrink-0">
                      {r.type === 'death' ? <Skull className="w-4 h-4 text-red-600" /> : <Activity className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-medium truncate text-ink min-w-0">{r.disease}</div>
                        <Badge variant={r.type === 'death' ? 'critical' : 'info'} className="shrink-0">
                          {r.type === 'death' ? 'Death' : 'Case'}
                        </Badge>
                      </div>
                      <div className="text-[13px] text-mute truncate mt-1">
                        {areasMap.get(r.area) || r.area || '—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[17px] font-semibold tabular-nums text-ink">{r.count}</div>
                      <div className="text-[12px] text-faint mt-0.5 whitespace-nowrap">{r.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </AsyncBoundary>
          </Panel>
        </motion.div>

        <motion.div {...enter(0.15)} className="min-w-0 self-start">
          <Panel padded={false} className="h-full flex flex-col">
            <div className={`flex items-center justify-between gap-3 border-b border-line shrink-0 ${PANEL_HEADER}`}>
              <div className="min-w-0">
                <div className="eyebrow mb-1 truncate">Operations</div>
                <h2 className="text-[16px] font-semibold tracking-tight truncate">Active alerts</h2>
              </div>
              <Button variant="ghost" size="sm" iconRight={ArrowUpRight} className="shrink-0" onClick={() => navigate('/authority/alerts')}>
                View all
              </Button>
            </div>
            <div className="px-5 sm:px-6 py-3 flex-1 min-h-0 overflow-y-auto">
              <AsyncBoundary
                loading={alertsQ.loading}
                error={alertsQ.error}
                onRetry={alertsQ.refetch}
                skeleton={<AlertFeedSkeleton count={4} />}
                isEmpty={!alertsQ.loading && !liveAlerts.length}
                empty={<EmptyState icon={Bell} title="No active alerts" description="You're all caught up." />}
                compactError
              >
                <div className="space-y-2.5">
                  {liveAlerts.map((a, i) => (
                    <AlertCard key={a.id} alert={a} index={i} compact />
                  ))}
                </div>
              </AsyncBoundary>
            </div>
          </Panel>
        </motion.div>
      </div>

      {/* ── Row 4: Forecast (2/3) + Top Disease Breakdown (1/3) ── */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${GRID_GAP} ${SECTION_GAP}`}>
        <motion.div {...enter(0.2)} className="lg:col-span-2 min-w-0 self-start">
          <Panel>
            <SectionHeader
              eyebrow="Forecast"
              title={topDisease ? `${topDisease} · 7-day projection` : '7-day projection'}
              description="Solid line is observed; dashed line is forecast."
              actions={<Badge variant="info" dot>Model: {forecastQ.data?.model_used || 'Auto'}</Badge>}
            />
            <AsyncBoundary
              loading={forecastQ.loading}
              error={forecastQ.error}
              onRetry={forecastQ.refetch}
              skeleton={<ChartSkeleton height={300} />}
              isEmpty={!forecastQ.loading && !forecastQ.error && !forecastQ.data}
              empty={<EmptyState icon={TrendingUp} title="No forecast available" description="Forecast data will appear here once enough case reports are available." />}
              compactError
            >
              <ForecastChart data={forecastQ.data || []} height={300} />
            </AsyncBoundary>
          </Panel>
        </motion.div>

        <motion.div {...enter(0.25)} className="min-w-0 self-start">
          <Panel className="h-full flex flex-col">
            <SectionHeader
              eyebrow="Risk summary"
              title="Disease breakdown"
              description={topDisease ? `Top signal: ${topDisease}` : 'No dominant disease signal yet.'}
            />
            <div className="flex-1 flex flex-col justify-center pb-5">
              <AsyncBoundary
                loading={metricsQ.loading}
                error={metricsQ.error}
                onRetry={metricsQ.refetch}
                skeleton={<AlertFeedSkeleton count={3} />}
                isEmpty={!metricsQ.loading && !metricsQ.data?.disease_breakdown?.length}
                empty={<EmptyState icon={ShieldAlert} title="No disease data" description="Disease breakdown will appear once reports are submitted." />}
                compactError
              >
                <div className="space-y-3">
                  {(metricsQ.data?.disease_breakdown || []).slice(0, 5).map((d, i) => (
                    <div
                      key={d.disease_name}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-2 border border-line"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[12px] font-semibold text-faint w-5 text-center">{i + 1}</span>
                        <span className="text-[14px] font-medium text-ink truncate">{d.disease_name}</span>
                      </div>
                      <span className="text-[14px] font-semibold tabular-nums text-ink shrink-0">{d.total_cases}</span>
                    </div>
                  ))}
                </div>
              </AsyncBoundary>
            </div>
          </Panel>
        </motion.div>
      </div>
    </PageTransition>
  );
}