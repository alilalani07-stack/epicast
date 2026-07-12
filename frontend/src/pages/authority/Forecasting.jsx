import { useEffect, useState, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Select from '../../components/ui/Select.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { ChartSkeleton, TableSkeleton } from '../../components/ui/Skeleton.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import ForecastChart from '../../components/charts/ForecastChart.jsx';
import TrendChart from '../../components/charts/TrendChart.jsx';

import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table.jsx';

import useAsync from '../../hooks/useAsync.js';
import forecastService from '../../services/forecast.service.js';
import dashboardService from '../../services/dashboard.service.js';

const TREND_COLORS = ['#ea580c', '#2563eb', '#dc2626', '#16a34a', '#8b5cf6', '#06b6d4', '#eab308'];

export default function Forecasting() {
  const [disease, setDisease] = useState('');
  const filtersQ = useAsync(() => dashboardService.getFilters({ allowFallback: false }), []);

  useEffect(() => {
    if (!disease && filtersQ.data?.diseases?.length > 0) {
      setDisease(filtersQ.data.diseases[0]);
    }
  }, [disease, filtersQ.data]);

  const forecastQ = useAsync(
    () => disease ? forecastService.getForecast(disease, { allowFallback: false }) : Promise.resolve(null),
    [disease]
  );
  const tableQ = useAsync(
    () => disease ? forecastService.getTable(disease, { allowFallback: false }) : Promise.resolve([]),
    [disease]
  );

  // ── Multi-disease trend chart ──────────────────────────────────────────
  // The backend /dashboard/trends returns summary stats (trend direction,
  // percent change, etc.) — NOT the time-series rows TrendChart needs.
  //
  // TrendChart expects: [{ date: '2024-01-01', Dengue: 10, Flu: 5 }, ...]
  //
  // We build this by fetching the forecast for each disease (which includes
  // historical daily actuals) and merging them by date. Forecast-only rows
  // (actual == null) are skipped so the trend chart shows pure history.
  // ───────────────────────────────────────────────────────────────────────
  const fetchTrendData = useCallback(async () => {
    const diseases = filtersQ.data?.diseases || [];
    if (!diseases.length) return [];

    const topDiseases = diseases.slice(0, 5);
    const results = await Promise.all(
      topDiseases.map((d) =>
        forecastService.getForecast(d, { allowFallback: false }).catch(() => null)
      )
    );

    const dateMap = new Map();
    results.forEach((forecast, i) => {
      if (!Array.isArray(forecast)) return;
      const diseaseName = topDiseases[i];

      forecast.forEach((row) => {
        // Only use historical actuals; skip forecast-only rows
        if (row.actual == null) return;
        if (!dateMap.has(row.date)) {
          dateMap.set(row.date, { date: row.date });
        }
        dateMap.get(row.date)[diseaseName] = row.actual;
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtersQ.data]);

  const trendQ = useAsync(fetchTrendData, [fetchTrendData]);

  const trendSeries = (filtersQ.data?.diseases || []).slice(0, 5).map((d, i) => ({
    key: d,
    label: d,
    color: TREND_COLORS[i % TREND_COLORS.length],
  }));

  const tableRows = tableQ.data || [];
  const hasForecast = Array.isArray(forecastQ.data) && forecastQ.data.length > 0;
  const peak = tableRows.reduce((m, r) => (r.predicted > m ? r.predicted : m), 0);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Predictive Models"
        title="Forecasting"
        description="Time-series projections and trend analysis across monitored diseases."
        actions={(
          <Select
            value={disease || ''}
            onChange={(e) => setDisease(e.target.value)}
            className="w-48"
            disabled={filtersQ.loading || !!filtersQ.error || !filtersQ.data?.diseases?.length}
          >
            {!filtersQ.data?.diseases?.length && (
              <option value="">{filtersQ.loading ? 'Loading...' : 'No diseases'}</option>
            )}
            {(filtersQ.data?.diseases || []).map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <Stat label="Primary disease burden" value={disease || '—'} />
        <Stat label="Estimated peak load" value={tableQ.loading ? 'Calculating...' : hasForecast ? peak.toLocaleString() : '—'} />
      </div>

      <div className="mb-8">
        <Panel>
          <SectionHeader
            eyebrow={disease || 'Forecast'}
            title="14-day projection"
            description="Solid line is observed history; dashed projection is the forecast."
          />
          <AsyncBoundary
            loading={forecastQ.loading}
            error={forecastQ.error}
            onRetry={forecastQ.refetch}
            skeleton={<ChartSkeleton height={420} />}
            isEmpty={!forecastQ.loading && !forecastQ.error && !hasForecast}
            empty={<EmptyState icon={TrendingUp} title="No forecast available" description="Forecast data will appear once enough case reports are available for this disease." />}
            compactError
          >
            <ForecastChart data={forecastQ.data || []} height={420} />
          </AsyncBoundary>
        </Panel>
      </div>

      <div className="mb-8">
        <Panel>
          <SectionHeader
            eyebrow="Multi-disease"
            title="Disease trends"
            description="Observed weekly trajectory of leading diseases."
            actions={<TrendingUp className="w-4 h-4 text-faint" />}
          />
          <AsyncBoundary
            loading={trendQ.loading}
            error={trendQ.error}
            onRetry={trendQ.refetch}
            skeleton={<ChartSkeleton height={360} />}
            isEmpty={!trendQ.loading && !trendQ.error && !(trendQ.data || []).length}
            empty={<EmptyState icon={TrendingUp} title="No trend data available" description="Disease trend lines will appear here once report history is available." />}
            compactError
          >
            <TrendChart
              data={trendQ.data || []}
              series={trendSeries}
              height={360}
            />
          </AsyncBoundary>
        </Panel>
      </div>

      <Panel padded={false}>
        <div className="px-6 py-5 border-b border-line">
          <div className="eyebrow mb-1">Forecast table</div>
          <h2 className="text-[16px] font-semibold tracking-tight">Day-by-day projection</h2>
          <p className="text-[12.5px] text-mute mt-0.5">Predicted values with day-over-day delta.</p>
        </div>
        <AsyncBoundary
          loading={tableQ.loading}
          error={tableQ.error}
          onRetry={tableQ.refetch}
          skeleton={<TableSkeleton rows={8} cols={3} />}
          isEmpty={!tableQ.loading && !tableQ.error && !tableRows.length}
          empty={<EmptyState icon={TrendingUp} title="No forecast available" description="There is no forecast table for the selected disease yet." />}
        >
          <Table>
            <THead>
              <TH>Period</TH>
              <TH align="right">Predicted</TH>
              <TH align="right">Delta vs prev.</TH>
            </THead>
            <TBody>
              {tableRows.map((r) => (
                <TR key={r.period}>
                  <TD>{r.period}</TD>
                  <TD align="right" className="font-semibold text-ink">{r.predicted}</TD>
                  <TD align="right" className={r.delta > 0 ? 'text-red-600' : r.delta < 0 ? 'text-emerald-700' : 'text-mute'}>
                    {r.delta > 0 ? `+${r.delta}%` : `${r.delta}%`}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </AsyncBoundary>
      </Panel>
    </PageTransition>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface border border-line rounded-2xl px-6 py-5 shadow-soft">
      <div className="text-[11.5px] text-mute font-medium">{label}</div>
      <div className="display text-[32px] mt-2 text-ink tabular-nums">{value}</div>
    </div>
  );
}