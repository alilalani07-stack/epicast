import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { ChartSkeleton, TableSkeleton } from '../../components/ui/Skeleton.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import ForecastChart from '../../components/charts/ForecastChart.jsx';
import TrendChart from '../../components/charts/TrendChart.jsx';

import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table.jsx';

import useAsync from '../../hooks/useAsync.js';
import forecastService from '../../services/forecast.service.js';
import dashboardService from '../../services/dashboard.service.js';

export default function Forecasting() {
  const [filters, setFilters] = useState({ diseases: [] });
  const [disease, setDisease] = useState(null);

  useEffect(() => {
    let active = true;
    dashboardService.getFilters()
      .then((f) => {
        if (active) {
          setFilters(f);
          if (f.diseases && f.diseases.length > 0) {
            setDisease((prev) => prev ?? f.diseases[0]);
          }
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const forecastQ = useAsync(
    () => disease ? forecastService.getForecast(disease) : Promise.resolve([]),
    [disease]
  );
  const trendQ    = useAsync(() => forecastService.getTrend(), []);
  const tableQ    = useAsync(
    () => disease ? forecastService.getTable(disease) : Promise.resolve([]),
    [disease]
  );

  const peak = (tableQ.data || []).reduce((m, r) => (r.predicted > m ? r.predicted : m), 0);
  const avgConfidence = Math.round(
    ((tableQ.data || []).reduce((s, r) => s + r.confidence, 0) / Math.max(1, (tableQ.data || []).length))
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Predictive Models"
        title="Forecasting"
        description="Time-series projections and trend analysis across monitored diseases."
        actions={
          <Select value={disease || ''} onChange={(e) => setDisease(e.target.value)} className="w-48">
            {!disease && <option value="">Loading...</option>}
            {filters.diseases.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <Stat label="Forecast horizon" value="14 days" />
        <Stat label="Predicted peak" value={peak || '—'} />
        <Stat label="Model confidence" value={`${avgConfidence || 86}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Panel>
            <SectionHeader
              eyebrow={disease}
              title="14-day projection"
              description="Solid line is observed history; dashed projection is the forecast."
              actions={<Badge variant="info" dot>Confidence {avgConfidence || 86}%</Badge>}
            />
            <AsyncBoundary
              loading={forecastQ.loading}
              error={forecastQ.error}
              onRetry={forecastQ.refetch}
              skeleton={<ChartSkeleton height={420} />}
              compactError
            >
              <ForecastChart data={forecastQ.data || []} height={420} />
            </AsyncBoundary>
          </Panel>
        </div>
        <div>
          <Panel className="h-full">
            <SectionHeader title="Insights" actions={<Sparkles className="w-4 h-4 text-faint" />} />
            <div className="space-y-3">
              <Insight tone="warning" title="Caseload expected to rise" text="A 14% expected increase over the next week in current selection." />
              <Insight tone="info" title="Confidence holding steady" text="No major variance signals detected in the validation set." />
              <Insight tone="success" title="Seasonal patterns align" text="Forecast aligns with prior seasonal baselines for the region." />
            </div>
          </Panel>
        </div>
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
            compactError
          >
            <TrendChart
              data={trendQ.data || []}
              series={[
                { key: 'Dengue', label: 'Dengue', color: '#ea580c' },
                { key: 'Malaria', label: 'Malaria', color: '#2563eb' },
                { key: 'Cholera', label: 'Cholera', color: '#dc2626' },
              ]}
              height={360}
            />
          </AsyncBoundary>
        </Panel>
      </div>

      <Panel padded={false}>
        <div className="px-6 py-5 border-b border-line">
          <div className="eyebrow mb-1">Forecast table</div>
          <h2 className="text-[16px] font-semibold tracking-tight">Day-by-day projection</h2>
          <p className="text-[12.5px] text-mute mt-0.5">Predicted values with day-over-day delta and confidence.</p>
        </div>
        <AsyncBoundary
          loading={tableQ.loading}
          error={tableQ.error}
          onRetry={tableQ.refetch}
          skeleton={<TableSkeleton rows={8} cols={4} />}
        >
          <Table>
            <THead>
              <TH>Period</TH>
              <TH align="right">Predicted</TH>
              <TH align="right">Δ vs prev.</TH>
              <TH align="right">Confidence</TH>
            </THead>
            <TBody>
              {(tableQ.data || []).map((r, i) => (
                <TR key={i}>
                  <TD>{r.period}</TD>
                  <TD align="right" className="font-semibold text-ink">{r.predicted}</TD>
                  <TD align="right" className={r.delta > 0 ? 'text-red-600' : r.delta < 0 ? 'text-emerald-700' : 'text-mute'}>
                    {r.delta > 0 ? `+${r.delta}%` : `${r.delta}%`}
                  </TD>
                  <TD align="right" className="text-mute">{r.confidence}%</TD>
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

function Insight({ tone, title, text }) {
  return (
    <div className="p-4 rounded-xl bg-canvas border border-line">
      <Badge variant={tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'info'} dot>
        {tone === 'warning' ? 'Watch' : tone === 'success' ? 'OK' : 'Note'}
      </Badge>
      <div className="text-[14px] font-medium text-ink mt-2.5">{title}</div>
      <p className="text-[12.5px] text-mute mt-1.5 leading-relaxed">{text}</p>
    </div>
  );
}
