import { useMemo, useState } from 'react';
import { Filter, ArrowUpRight, ArrowDownRight, Minus, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { MapSkeleton, PanelSkeleton } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import MapContainer from '../../components/map/MapContainer.jsx';
import RiskMarkers from '../../components/map/RiskMarkers.jsx';
import RiskLegend from '../../components/map/RiskLegend.jsx';
import LocationSearch from '../../components/map/LocationSearch.jsx';

import useAsync from '../../hooks/useAsync.js';
import areasService from '../../services/areas.service.js';
import dashboardService from '../../services/dashboard.service.js';
import { riskColor } from '../../services/_mock/mockData.js';
import { DEFAULT_REGION } from '../../lib/config.js';

const RISKS = ['all', 'low', 'moderate', 'high', 'critical'];
const PANEL_HEADER = 'px-6 py-4';

export default function RiskZones() {
  const [risk, setRisk] = useState('all');
  const [disease, setDisease] = useState('all');
  const [selected, setSelected] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);

  const filtersQ = useAsync(() => dashboardService.getFilters({ allowFallback: false }), []);
  const filters = filtersQ.data || { diseases: [], areas: [] };

  const { data, loading, error, refetch } = useAsync(
    () => areasService.riskZones({ risk, disease }, { allowFallback: false }),
    [risk, disease]
  );
  const zones = data || [];

  const counts = useMemo(() => ({
    low: zones.filter((z) => z.risk === 'low').length,
    moderate: zones.filter((z) => z.risk === 'moderate').length,
    high: zones.filter((z) => z.risk === 'high').length,
    critical: zones.filter((z) => z.risk === 'critical').length,
  }), [zones]);

  const visibleZones = zones.slice(0, 50);
  const active = selected || visibleZones[0];

  const focusOnZone = (z) => {
    setSelected(z);
    setMapFocus({ lat: z.lat, lng: z.lng, zoom: DEFAULT_REGION.zoomDetail });
  };

  return (
    <PageTransition>
      <div className="h-[calc(100vh-72px)] flex flex-col overflow-hidden">
        <div className="shrink-0">
          <PageHeader
            eyebrow="Intelligence"
            title="Risk Zones"
            description="Geographic risk profile based on case density, growth rate and severity."
          />
        </div>

        <div className="shrink-0 mb-6 max-w-2xl">
          <LocationSearch
            placeholder="Jump to a place — e.g. Madhapur, Charminar"
            onSelect={(r) => setMapFocus({ lat: r.lat, lng: r.lng, zoom: DEFAULT_REGION.zoomDetail })}
          />
        </div>

        {/* Mobile: grid scrolls as a single column. Desktop: locked to viewport
            with internal panel scrolling only. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Map */}
          <div className="lg:col-span-2 h-[320px] sm:h-[480px] lg:h-full min-h-0">
            <Panel padded={false} elevated className="h-full flex flex-col overflow-hidden">
              <div className={`shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line ${PANEL_HEADER}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-mute" />
                  <Select value={risk} onChange={(e) => setRisk(e.target.value)} className="w-full sm:w-36">
                    {RISKS.map((r) => (
                      <option key={r} value={r}>{r === 'all' ? 'All risk' : r}</option>
                    ))}
                  </Select>
                  <Select value={disease} onChange={(e) => setDisease(e.target.value)} className="w-full sm:w-44" disabled={filtersQ.loading || !!filtersQ.error}>
                    <option value="all">All diseases</option>
                    {filters.diseases.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="low" dot>{counts.low} Low</Badge>
                  <Badge variant="moderate" dot>{counts.moderate} Mod</Badge>
                  <Badge variant="high" dot>{counts.high} High</Badge>
                  <Badge variant="critical" dot>{counts.critical} Crit</Badge>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative">
                <AsyncBoundary
                  loading={loading}
                  error={error}
                  onRetry={refetch}
                  skeleton={
                    <div className="absolute inset-0">
                      <MapSkeleton className="h-full w-full" />
                    </div>
                  }
                >
                  <div className="absolute inset-0">
                    <MapContainer
                      center={DEFAULT_REGION.center}
                      zoom={DEFAULT_REGION.zoom}
                      height="100%"
                      focus={mapFocus}
                    >
                      <RiskMarkers points={zones} cluster />
                    </MapContainer>
                    <RiskLegend />
                  </div>
                </AsyncBoundary>
              </div>
            </Panel>
          </div>

          {/* Zones list + Detail */}
          <div className="lg:h-full lg:min-h-0 flex flex-col gap-6 lg:overflow-hidden">
            {/* Zones list */}
            <Panel padded={false} className="lg:flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden">
              <div className={`shrink-0 border-b border-line ${PANEL_HEADER}`}>
                <div className="eyebrow mb-1">Zones</div>
                <h2 className="text-[16px] font-semibold tracking-tight">{zones.length} matching</h2>
              </div>
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                <AsyncBoundary
                  loading={loading}
                  error={error}
                  onRetry={refetch}
                  skeleton={
                    <div className="px-6 py-3 space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 bg-surface-2 shimmer rounded-lg" />
                      ))}
                    </div>
                  }
                  isEmpty={!zones.length}
                  empty={
                    <div className="h-full flex items-center justify-center px-6 py-8">
                      <EmptyState icon={ShieldAlert} title="No matching zones" description="Adjust the filters above." />
                    </div>
                  }
                  compactError
                >
                  <div className="divide-y divide-line">
                    {visibleZones.map((z) => {
                      const isActive = active?.id === z.id;
                      return (
                        <button
                          type="button"
                          key={z.id}
                          onClick={() => focusOnZone(z)}
                          aria-pressed={isActive}
                          className={clsx(
                            'w-full text-left px-6 py-3.5 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20 focus:z-10 relative',
                            isActive
                              ? 'bg-surface-2 border-l-2'
                              : 'hover:bg-surface-2/60 border-l-2 border-transparent'
                          )}
                          style={isActive ? { borderLeftColor: riskColor(z.risk) } : undefined}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: riskColor(z.risk), boxShadow: `0 0 0 3px ${riskColor(z.risk)}1f` }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-medium truncate text-ink">{z.area}</div>
                            <div className="text-[11.5px] text-mute truncate">
                              {z.diseases && z.diseases.length > 0 ? z.diseases.join(', ') : 'No active diseases'}
                            </div>
                          </div>
                          <div className="text-[13px] tabular-nums text-mute">{z.cases}</div>
                        </button>
                      );
                    })}
                  </div>
                </AsyncBoundary>
              </div>
            </Panel>

            {/* Detail */}
            {loading ? (
              <div className="shrink-0">
                <PanelSkeleton lines={4} />
              </div>
            ) : active ? (
              <Panel className="shrink-0 lg:max-h-[240px] lg:overflow-y-auto">
                <div className="eyebrow">Zone details</div>
                <h3 className="text-[22px] leading-tight font-semibold mt-2 text-ink">{active.area}</h3>
                <div className="mt-3">
                  <Badge variant={active.risk} dot>{active.risk} risk</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 text-[13px]">
                  <Detail label="Diseases" value={active.diseases && active.diseases.length > 0 ? active.diseases.join(', ') : 'None'} />
                  <Detail label="Cases" value={active.cases} mono />
                  <Detail
                    label="Trend"
                    value={
                      <span className={clsx(
                        'inline-flex items-center gap-1 tabular-nums',
                        active.trend > 0 ? 'text-red-600' : active.trend < 0 ? 'text-emerald-700' : 'text-mute'
                      )}>
                        {active.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : active.trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {Math.abs(active.trend)}%
                      </span>
                    }
                  />
                  <Detail label="Window" value={active.windowLabel || 'Last 7 days'} />
                </div>
              </Panel>
            ) : (
              <Panel className="shrink-0">
                <EmptyState
                  icon={ShieldAlert}
                  title="No zone selected"
                  description="Select a zone from the list to view details."
                />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10.5px] text-faint uppercase tracking-wider">{label}</div>
      <div className={clsx('mt-1 text-ink break-words', mono && 'tabular-nums')}>{value}</div>
    </div>
  );
}
