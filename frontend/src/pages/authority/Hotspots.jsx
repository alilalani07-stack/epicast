import { useMemo, useState } from 'react';
import { Flame, Filter } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { MapSkeleton } from '../../components/ui/Skeleton.jsx';
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

const PANEL_HEADER = 'px-6 py-4';

export default function Hotspots() {
  const reducedMotion = useReducedMotion();
  const [risk, setRisk] = useState('all');
  const [disease, setDisease] = useState('all');
  const [mapFocus, setMapFocus] = useState(null);

  const filtersQ = useAsync(() => dashboardService.getFilters({ allowFallback: false }), []);
  const filters = filtersQ.data || { diseases: [], areas: [] };

  const { data, loading, error, refetch } = useAsync(
    () => areasService.hotspots({ risk, disease }, { allowFallback: false }),
    [risk, disease]
  );
  const hotspots = data || [];
  const sorted = useMemo(() => [...hotspots].sort((a, b) => b.cases - a.cases).slice(0, 50), [hotspots]);
  const max = sorted[0]?.cases || 1;

  // Helper to respect prefers-reduced-motion for entrance animations.
  const enter = (delay = 0, x = 6, duration = 0.3) =>
    reducedMotion
      ? { initial: { opacity: 1, x: 0 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, x }, animate: { opacity: 1, x: 0 }, transition: { duration, delay } };

  return (
    <PageTransition>
      {/* FIX (Category 1): Lock the entire content area to the viewport height
          minus the navbar (72px). The page itself never scrolls; only internal
          panel panes scroll. */}
      <div className="h-[calc(100vh-72px)] flex flex-col overflow-hidden">
        <div className="shrink-0">
          <PageHeader
            eyebrow="Intelligence"
            title="Hotspots"
            description="Geographic clusters with elevated activity, ranked by case density."
          />
        </div>

        <div className="shrink-0 mb-6 max-w-2xl">
          <LocationSearch
            placeholder="Jump to a place — e.g. Gachibowli, LB Nagar"
            onSelect={(r) => setMapFocus({ lat: r.lat, lng: r.lng, zoom: DEFAULT_REGION.zoomDetail })}
          />
        </div>

        {/* FIX (Category 1, 2, 4): Grid fills remaining viewport height. On mobile
            the entire column scrolls; on desktop internal panels scroll only. */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Map */}
          <div className="lg:col-span-3 h-[320px] sm:h-[480px] lg:h-full min-h-0">
            <Panel padded={false} elevated className="h-full flex flex-col overflow-hidden">
              {/* FIX (Category 5): Standardized to PANEL_HEADER (px-6 py-4) to match
                  the right panel header. Previously this was px-6 py-4 (ok) but
                  the right panel was px-6 py-5 — now both use the same token. */}
              <div className={`shrink-0 border-b border-line flex items-center justify-between gap-3 flex-wrap ${PANEL_HEADER}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-mute" />
                  {/* FIX (Category 10): w-full on mobile so selects don't overflow
                      their container; snap to fixed width on sm+ screens. */}
                  <Select value={risk} onChange={(e) => setRisk(e.target.value)} className="w-full sm:w-36">
                    <option value="all">All severity</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>
                  <Select value={disease} onChange={(e) => setDisease(e.target.value)} className="w-full sm:w-44" disabled={filtersQ.loading || !!filtersQ.error}>
                    <option value="all">All diseases</option>
                    {filters.diseases.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[12px] text-mute">
                  <Flame className="w-3.5 h-3.5 text-orange-600" />
                  {hotspots.length} clusters
                </div>
              </div>

              {/* FIX (Category 2, 3): Responsive height box wraps AsyncBoundary.
                  Both skeleton and loaded map share the same 320/480/full box.
                  On desktop, flex-1 fills the locked panel height. */}
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
                      <RiskMarkers points={hotspots} cluster />
                    </MapContainer>
                    <RiskLegend />
                  </div>
                </AsyncBoundary>
              </div>
            </Panel>
          </div>

          {/* Top clusters */}
          <div className="lg:col-span-2 lg:h-full lg:min-h-0 flex flex-col lg:overflow-hidden">
            <Panel padded={false} className="lg:flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden">
              {/* FIX (Category 5): Standardized header padding to PANEL_HEADER. */}
              <div className={`shrink-0 border-b border-line flex items-center justify-between ${PANEL_HEADER}`}>
                <div>
                  <div className="eyebrow mb-1">Top clusters</div>
                  <h2 className="text-[16px] font-semibold tracking-tight">Ranked by case load</h2>
                </div>
                <span className="text-[12px] text-faint">{sorted.length}</span>
              </div>
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                <AsyncBoundary
                  loading={loading}
                  error={error}
                  onRetry={refetch}
                  skeleton={
                    // FIX (Category 6): Removed p-5 wrapper. Loaded items use px-6 py-4,
                    // so the skeleton now matches that geometry to avoid layout shift.
                    <div className="px-6 py-4 space-y-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-14 bg-surface-2 shimmer rounded-lg" />
                      ))}
                    </div>
                  }
                  isEmpty={!sorted.length}
                  empty={
                    <div className="h-full flex items-center justify-center px-6 py-8">
                      <EmptyState icon={Flame} title="No matching clusters" />
                    </div>
                  }
                  compactError
                >
                  <div className="divide-y divide-line">
                    {sorted.map((h, i) => (
                      <motion.button
                        type="button"
                        key={h.id}
                        {...enter(i * 0.03)}
                        onClick={() => setMapFocus({ lat: h.lat, lng: h.lng, zoom: DEFAULT_REGION.zoomDetail })}
                        className="w-full text-left px-6 py-4 hover:bg-surface-2/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20 focus:z-10 relative"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-[11px] text-faint tabular-nums w-6 font-medium">{String(i + 1).padStart(2, '0')}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-[13.5px] font-medium truncate text-ink">{h.name}</div>
                                <Badge variant={h.risk} dot>{h.risk}</Badge>
                              </div>
                              <div className="text-[11.5px] text-mute truncate">{h.disease}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[14.5px] font-semibold tabular-nums text-ink">{h.cases}</div>
                            <div className="text-[10.5px] text-faint">cases</div>
                          </div>
                        </div>
                        {/* FIX (Category 8): Progress bar now uses scaleX transform
                            instead of width animation. Width triggers layout recalc
                            on every frame; scaleX is GPU-composited and smooth. */}
                        <div className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: Math.max(0.06, h.cases / max) }}
                            transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full origin-left"
                            style={{ background: riskColor(h.risk) }}
                          />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </AsyncBoundary>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
