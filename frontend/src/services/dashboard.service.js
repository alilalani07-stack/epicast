import api, { unwrap, withFallback } from './api.js';
import { dashboardMetrics, dashboardInsights, HOTSPOTS } from './_mock/mockData.js';

/**
 * Maps backend DashboardStats → frontend metric card shape.
 * Backend: { active_cases_7d, total_recorded_cases, total_deaths, new_alerts, disease_breakdown }
 * Frontend: { totalReports, activeAlerts, highRiskZones, forecastGrowth } each { value, delta }
 */
function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object') return dashboardMetrics();
  
  // Calculate some trend based on disease_breakdown if possible, or just default to 0
  let growth = 0;
  if (raw.disease_breakdown && raw.disease_breakdown.length > 0) {
     const top = raw.disease_breakdown[0];
     // Simple placeholder logic since we don't have historical data in this endpoint
     growth = top.active_cases_7d > 10 ? 15.2 : -5.4; 
  }

  return {
    totalReports:  { value: raw.total_recorded_cases ?? 0, delta: null },
    activeAlerts:  { value: raw.new_alerts           ?? 0, delta: null },
    highRiskZones: { value: raw.active_cases_7d      ?? 0, delta: null },
    forecastGrowth:{ value: growth, delta: null },
  };
}

/**
 * Maps backend ZoneResponse → frontend RiskMarkers hotspot shape.
 * Backend: { area_id, area_name, lat, lon, zone_color, disease_in_cluster, population_density }
 * Frontend: { id, name, lat, lng, risk, disease, cases }
 */
function normalizeZones(raw) {
  if (!Array.isArray(raw)) return HOTSPOTS;
  const colorToRisk = { Red: 'critical', Yellow: 'high', Green: 'low' };
  return raw.map((z) => ({
    id: z.area_id,
    name: z.area_name,
    lat: z.lat,
    lng: z.lon,          // backend uses lon, frontend uses lng
    risk: colorToRisk[z.zone_color] || 'moderate',
    disease: z.disease_in_cluster,
    cases: z.nearby_reporting_clinics || 0,
    clusterSize: z.nearby_reporting_clinics || 0,
  }));
}

/**
 * Maps backend TrendResponse[] → frontend insight card shape.
 * Backend: { disease_name, trend, percent_change_7d, summary }
 * Frontend: { id, title, detail, tone }
 */
function normalizeTrends(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return dashboardInsights();
  const toneMap = { Rising: 'warning', Declining: 'success', Stable: 'info' };
  return raw.map((t, i) => ({
    id: i + 1,
    title: `${t.disease_name} is ${t.trend}`,
    detail: t.summary,
    tone: toneMap[t.trend] || 'info',
  }));
}

export const dashboardService = {
  getMetrics:   () =>
    withFallback(
      api.get('/dashboard/stats').then(unwrap).then(normalizeStats),
      dashboardMetrics
    ),
  getInsights:  () =>
    withFallback(
      api.get('/dashboard/trends').then(unwrap).then(normalizeTrends),
      dashboardInsights
    ),
  getMapPoints: () =>
    withFallback(
      api.get('/dashboard/zones').then(unwrap).then(normalizeZones),
      HOTSPOTS
    ),
  getFilters: () => 
    withFallback(
      api.get('/dashboard/filters').then(unwrap),
      { diseases: ['Dengue', 'Influenza', 'Malaria'], areas: [{area_id: 'A-101', area_name: 'Madhapur'}] }
    ),
};

export default dashboardService;
