import { useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ← added
import { motion, useReducedMotion } from 'framer-motion';
import {
  FileText, Bell, ShieldAlert, TrendingUp, ArrowUpRight, Sparkles, Activity, Download,
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
  MetricCardSkeleton, MapSkeleton, ChartSkeleton, AlertFeedSkeleton, PanelSkeleton,
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

function useMatchHeight(breakpoint = 1024) {
  const sourceRef = useRef(null);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const el = sourceRef.current;
    if (!el) return;

    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const update = () => {
      if (!mq.matches) {
        setHeight(null);
        return;
      }
      setHeight(el.getBoundingClientRect().height);
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    mq.addEventListener('change', update);
    update();

    return () => {
      ro.disconnect();
      mq.removeEventListener('change', update);
    };
  }, [breakpoint]);

  return [sourceRef, height];
}

export default function Dashboard() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate(); // ← added

  const metricsQ  = useAsync(() => dashboardService.getMetrics(), []);
  const pointsQ   = useAsync(() => dashboardService.getMapPoints(), []);
  const insightsQ = useAsync(() => dashboardService.getInsights(), []);
  const alertsQ   = useAsync(() => alertsService.list(), []);
  const reportsQ  = useAsync(() => reportsService.list(), []);
  const forecastQ = useAsync(() => forecastService.getForecast('Dengue'), []);

  const [mapFocus, setMapFocus] = useState(null);
  const [forecastRef, operationsHeight] = useMatchHeight();
  const [reportsRef, insightsHeight] = useMatchHeight();

  const refreshAll = () => {
    metricsQ.refetch(); pointsQ.refetch(); insightsQ.refetch();
    alertsQ.refetch(); reportsQ.refetch(); forecastQ.refetch();
  };

  const hasLoadedOnce = Boolean(
    metricsQ.data && pointsQ.data && insightsQ.data
    && alertsQ.data && reportsQ.data && forecastQ.data,
  );
  const isRefreshing = hasLoadedOnce && (
    metricsQ.loading || pointsQ.loading || insightsQ.loading
    || alertsQ.loading || reportsQ.loading || forecastQ.loading
  );

  const m = metricsQ.data || {};
  const recentReports = (reportsQ.data?.reports || []).slice(0, 6);
  const liveAlerts = (alertsQ.data?.alerts || []).filter((a) => a.status !== 'resolved').slice(0, 4);

  const enter = (delay = 0, y = 12, duration = 0.45, ease) =>
    reducedMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration, delay, ...(ease && { ease }) } };

  return (
    <PageTransition>
      <PageHeader
        eyebrow={`Authority Portal · ${DEFAULT_REGION.name} · Live`}
        title="Outbreak Intelligence"
        description={`A real-time view of disease activity, risk zones, alerts and forecasted trends across ${DEFAULT_REGION.name}.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={RefreshCcw} size="lg" onClick={refreshAll} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button variant="primary" icon={Download} size="lg">Export</Button>
          </div>
        }
      />

      {/* Metrics */}
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
            <MetricCard index={2} label="High risk zones" value={m.highRiskZones?.value ?? 0} delta={m.highRiskZones?.delta} deltaLabel="this week" icon={ShieldAlert} />
            <MetricCard index={3} label="Forecast growth" value={m.forecastGrowth?.value ?? 0} delta={m.forecastGrowth?.delta} deltaLabel="next 7d" icon={TrendingUp} suffix="%" format={(v) => Number(v).toFixed(1)} />
          </div>
        </AsyncBoundary>
      </div>

      {/* Map */}
      <motion.div
        {...enter(0.05, 14, 0.5, [0.22, 1, 0.36, 1])}
        className={SECTION_GAP}
      >
        <Panel padded={false} elevated className="overflow-hidden">
          <div className={`flex flex-col gap-4 border-b border-line ${PANEL_HEADER}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="eyebrow mb-1 truncate">Intelligence map · {DEFAULT_REGION.name}</div>
                <h2 className="text-[19px] sm:text-[22px] lg:text-[25px] font-semibold tracking-tight flex flex-wrap items-center gap-x-3 gap-y-2">
                  Live signals across regions
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-medium shrink-0">
                    <span className="relative flex w-2 h-2" aria-hidden="true">
                      {!reducedMotion && (
                        <span className="absolute inset-0 rounded-full bg-emerald-500 ping-ring" />
                      )}
                      <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
                    </span>
                    Live
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
                placeholder="Jump to a place — e.g. Madhapur, Charminar, Apollo Hyderabad"
                onSelect={(r) => setMapFocus({ 
                  lat: r.lat, 
                  lng: r.lng, 
                  zoom: DEFAULT_REGION.zoomDetail, 
                  label: r.label,
                  geojson: r.geojson,
                  boundingbox: r.boundingbox
                })}
              />
            </div>
          </div>
          <div className="relative isolate h-[320px] sm:h-[400px] lg:h-[520px]">
            <AsyncBoundary
              loading={pointsQ.loading}
              error={pointsQ.error}
              onRetry={pointsQ.refetch}
              skeleton={
                <MapSkeleton className="h-full w-full" />
              }
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

      {/* Forecast + Alerts */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${GRID_GAP} ${SECTION_GAP}`}>
        <motion.div
          {...enter(0.1)}
          className="lg:col-span-2 min-w-0 self-start"
          ref={forecastRef}
        >
          <Panel>
            <SectionHeader
              eyebrow="Forecast"
              title="Dengue · 14-day projection"
              description="Solid line is observed; dashed line is forecast."
              actions={<Badge variant="info" dot>Confidence 86%</Badge>}
            />
            <AsyncBoundary
              loading={forecastQ.loading}
              error={forecastQ.error}
              onRetry={forecastQ.refetch}
              skeleton={<ChartSkeleton height={300} />}
              compactError
            >
              <ForecastChart data={forecastQ.data || []} height={300} />
            </AsyncBoundary>
          </Panel>
        </motion.div>

        <motion.div
          {...enter(0.15)}
          className="min-w-0"
          style={operationsHeight ? { height: operationsHeight } : undefined}
        >
          <Panel padded={false} className="h-full flex flex-col">
            <div className={`flex items-center justify-between gap-3 border-b border-line shrink-0 ${PANEL_HEADER}`}>
              <div className="min-w-0">
                <div className="eyebrow mb-1 truncate">Operations</div>
                <h2 className="text-[16px] font-semibold tracking-tight truncate">Active alerts</h2>
              </div>
              <Button variant="ghost" size="sm" iconRight={ArrowUpRight} className="shrink-0">View all</Button>
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

      {/* Recent Reports + Insights */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${GRID_GAP}`}>
        <motion.div
          {...enter(0.2)}
          className="lg:col-span-2 min-w-0 self-start"
          ref={reportsRef}
        >
          <Panel padded={false}>
            <div className={`flex items-center justify-between gap-3 border-b border-line ${PANEL_HEADER}`}>
              <div className="min-w-0">
                <div className="eyebrow mb-1 truncate">Surveillance</div>
                <h2 className="text-[16px] font-semibold tracking-tight truncate">Recent reports</h2>
              </div>
              {/* FIX: Added onClick handler to navigate to the Reports page.
                  Assumes the route path is '/authority/reports'. Adjust if your
                  router registers a different path for Reports.jsx. */}
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
              loading={reportsQ.loading}
              error={reportsQ.error}
              onRetry={reportsQ.refetch}
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
                        {r.area} · {r.submittedBy}
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

        <motion.div
          {...enter(0.25)}
          className="min-w-0"
          style={insightsHeight ? { height: insightsHeight } : undefined}
        >
          <Panel className="h-full flex flex-col">
            <SectionHeader
              eyebrow="Auto-generated"
              title="Quick insights"
              actions={<Sparkles className="w-4 h-4 text-faint" aria-hidden="true" />}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AsyncBoundary
                loading={insightsQ.loading}
                error={insightsQ.error}
                onRetry={insightsQ.refetch}
                skeleton={<div className="space-y-3"><PanelSkeleton lines={2} withHeader={false} /><PanelSkeleton lines={2} withHeader={false} /></div>}
                isEmpty={!insightsQ.loading && !(insightsQ.data || []).length}
                empty={<EmptyState icon={Sparkles} title="No insights yet" description="Insights will be generated as data arrives." />}
                compactError
              >
                <div className="space-y-3">
                  {(insightsQ.data || []).slice(0, 5).map((insight) => (
                    <div key={insight.id} className="p-4 rounded-xl bg-canvas border border-line min-w-0">
                      <Badge
                        variant={insight.tone === 'warning' ? 'warning' : insight.tone === 'success' ? 'success' : 'info'}
                        dot
                      >
                        {insight.tone === 'warning' ? 'Watch' : insight.tone === 'success' ? 'OK' : 'Note'}
                      </Badge>
                      <div className="text-[14px] font-medium text-ink mt-3 break-words">{insight.title}</div>
                      <p className="text-[13px] text-mute mt-2 leading-relaxed break-words">{insight.detail}</p>
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