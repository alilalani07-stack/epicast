import api, { unwrap, withFallback } from './api.js';
import { dashboardMetrics, HOTSPOTS } from './_mock/mockData.js';

/**
 * Maps backend DashboardStats → frontend metric card shape.
 * Backend: { active_cases_7d, total_recorded_cases, total_report_count, total_deaths,
 *            new_alerts, active_alerts, high_risk_zone_count, disease_breakdown }
 * Frontend: { totalReports, activeAlerts, highRiskZones, forecastGrowth } each { value, delta }
 */
function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return {
    totalReports:  { value: raw.total_report_count ?? 0, delta: raw.total_reports_delta ?? null },
    activeAlerts:  { value: raw.active_alerts       ?? 0, delta: raw.active_alerts_delta ?? null },
    highRiskZones: { value: raw.high_risk_zone_count ?? 0, delta: raw.high_risk_zones_delta ?? null },
    forecastGrowth:{ value: 0, delta: null }, // Overridden dynamically by forecastQ on Dashboard.jsx
    disease_breakdown: raw.disease_breakdown ?? [],
  };
}

/**
 * Maps backend ZoneResponse → frontend RiskMarkers hotspot shape.
 * Backend: { area_id, area_name, lat, lon, zone_color, disease_in_cluster,
 *            nearby_reporting_clinics, population_density, case_count }
 * Frontend: { id, name, lat, lng, risk, disease, cases }
 */
function normalizeZones(raw) {
  if (!Array.isArray(raw)) return [];
  const colorToRisk = { Red: 'critical', Yellow: 'high', Green: 'low' };
  return raw.map((z) => ({
    id: z.area_id,
    name: z.area_name,
    lat: z.lat,
    lng: z.lon,          // backend uses lon, frontend uses lng
    risk: colorToRisk[z.zone_color] || 'moderate',
    disease: z.disease_in_cluster,
    cases: z.case_count ?? z.nearby_reporting_clinics ?? 0,
    clusterSize: z.nearby_reporting_clinics || 0,
  }));
}

/**
 * Maps backend TrendResponse[] → frontend insight card shape.
 * Backend: { disease_name, trend, percent_change_7d, summary }
 * Frontend: { id, title, detail, tone }
 */
function normalizeTrends(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const toneMap = { Rising: 'warning', Declining: 'success', Stable: 'info' };
  return raw.map((t, i) => ({
    id: i + 1,
    title: `${t.disease_name} is ${t.trend}`,
    detail: t.summary,
    tone: toneMap[t.trend] || 'info',
  }));
}

export const dashboardService = {
  getMetrics:   (options = {}) =>
    withFallback(
      api.get('/dashboard/stats').then(unwrap).then(normalizeStats),
      dashboardMetrics,
      { enabled: options.allowFallback !== false }
    ),

  getMapPoints: (options = {}) =>
    withFallback(
      api.get('/dashboard/zones').then(unwrap).then(normalizeZones),
      HOTSPOTS,
      { enabled: options.allowFallback !== false }
    ),
  getFilters: (options = {}) =>
    withFallback(
      api.get('/dashboard/filters').then(unwrap),
      () => ({ diseases: [], areas: [] }),
      { enabled: options.allowFallback !== false }
    ),
};

export default dashboardService;
