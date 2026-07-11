import { motion } from 'framer-motion';
import { Activity, Bell, MapPin, TrendingUp, ArrowUpRight } from 'lucide-react';
import ForecastChart from '../charts/ForecastChart.jsx';
import MapContainer from '../map/MapContainer.jsx';
import RiskMarkers from '../map/RiskMarkers.jsx';
import RiskLegend from '../map/RiskLegend.jsx';
import { buildForecast, HOTSPOTS, riskColor } from '../../services/_mock/mockData.js';

/**
 * Platform Preview — three large, visually impressive product surfaces:
 *   1. Dashboard preview (large)
 *   2. Outbreak map preview
 *   3. Forecasting preview
 */
export default function PlatformPreview() {
  const data = buildForecast('Dengue');

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* 1 — Dashboard preview (oversized) */}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <PreviewFrame label="epicast.app / dashboard">
          <div className="p-6 lg:p-9">
            <div className="flex items-end justify-between mb-7">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-faint">Authority · Overview</div>
                <div className="text-[22px] lg:text-[26px] font-semibold tracking-tight mt-1">
                  Outbreak Intelligence
                </div>
              </div>
              <div className="hidden md:inline-flex items-center gap-1.5 text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md font-medium">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 ping-ring" />
                  <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              <Kpi label="Total reports" value="12,483" delta="+8.2%" tone="up" />
              <Kpi label="Active alerts" value="27" delta="+14.3%" tone="up" />
              <Kpi label="High risk zones" value="9" delta="+5.6%" tone="up" />
              <Kpi label="Forecast growth" value="12.4%" delta="−2.1%" tone="down" />
            </div>

            <div className="mt-6 grid grid-cols-12 gap-5">
              <div className="col-span-12 lg:col-span-8 bg-canvas border border-line rounded-2xl p-5 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-faint">Forecast · Dengue</div>
                    <div className="text-[15px] font-semibold tracking-tight">Next 14 days</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[11.5px] text-mute">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ink" /> Actual</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Forecast</span>
                  </div>
                </div>
                <ForecastChart data={data} height={260} />
              </div>

              <div className="col-span-12 lg:col-span-4 bg-canvas border border-line rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] uppercase tracking-wider text-faint">Active alerts</div>
                  <Bell className="w-3.5 h-3.5 text-faint" />
                </div>
                <div className="space-y-3">
                  <AlertRow sev="critical" title="Cholera surge" sub="North Borough · 12 min ago" />
                  <AlertRow sev="high" title="Dengue uptrend" sub="Central District · 1 h ago" />
                  <AlertRow sev="moderate" title="Influenza cluster" sub="West Township · 3 h ago" />
                  <AlertRow sev="low" title="COVID baseline" sub="East Quarter · 1 d ago" />
                </div>
              </div>
            </div>
          </div>
        </PreviewFrame>
      </motion.div>

      {/* 2 + 3: Map preview & Forecast preview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-3"
        >
          <PreviewFrame label="epicast.app / risk-zones" tall>
            <div className="relative h-[460px] lg:h-[520px]">
              <MapContainer center={[17.385, 78.4867]} zoom={11} height="100%" showZoom={false} scrollWheelZoom={false}>
                <RiskMarkers points={HOTSPOTS} />
              </MapContainer>
              <RiskLegend />
              <div className="absolute top-4 right-4 inline-flex items-center gap-2 bg-surface/95 border border-line rounded-lg px-3 py-1.5 shadow-soft text-[12px]">
                <MapPin className="w-3.5 h-3.5 text-mute" />
                <span className="text-ink-2 font-medium">Outbreak map</span>
                <span className="text-faint">· 10 clusters</span>
              </div>
            </div>
          </PreviewFrame>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2"
        >
          <PreviewFrame label="epicast.app / forecasting" tall>
            <div className="p-6 h-[460px] lg:h-[520px] flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-faint">Forecast</div>
                  <div className="text-[16px] font-semibold tracking-tight mt-0.5">Dengue · 14 days</div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11.5px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">
                  <TrendingUp className="w-3 h-3" /> 86%
                </div>
              </div>

              <div className="mt-3 flex-1 bg-canvas border border-line rounded-xl p-4">
                <ForecastChart data={data} height={300} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ['Horizon', '14d'],
                  ['Peak', '92'],
                  ['Models', '9'],
                ].map(([l, v]) => (
                  <div key={l} className="bg-canvas border border-line rounded-lg px-3 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-faint">{l}</div>
                    <div className="text-[14px] font-semibold tabular-nums mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </PreviewFrame>
        </motion.div>
      </div>
    </div>
  );
}

function PreviewFrame({ label, children, tall = false }) {
  return (
    <div className={`relative bg-surface border border-line rounded-3xl overflow-hidden shadow-lift ${tall ? '' : ''}`}>
      <div className="h-11 px-4 flex items-center gap-2 border-b border-line bg-surface-2/60">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e5e5e0]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e5e5e0]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e5e5e0]" />
        <div className="ml-3 flex items-center gap-1.5 text-[11.5px] text-faint">
          <MapPin className="w-3 h-3" /> {label}
        </div>
        <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-faint">
          <span>Preview</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, delta, tone }) {
  return (
    <div className="bg-canvas border border-line rounded-xl px-5 py-4">
      <div className="text-[10.5px] uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-[24px] font-semibold tracking-tight tabular-nums">{value}</div>
        <div className={`text-[11.5px] tabular-nums ${tone === 'up' ? 'text-emerald-700' : 'text-red-600'}`}>
          {delta}
        </div>
      </div>
    </div>
  );
}

const ACCENT = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  moderate: 'bg-amber-500',
  low: 'bg-emerald-500',
};

function AlertRow({ sev, title, sub }) {
  return (
    <div className="relative pl-3.5">
      <span className={`absolute left-0 top-1 bottom-1 w-[2.5px] rounded-r-full ${ACCENT[sev]}`} />
      <div className="text-[12.5px] font-medium text-ink leading-snug">{title}</div>
      <div className="text-[11px] text-mute mt-0.5">{sub}</div>
    </div>
  );
}
