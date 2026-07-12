import api, { unwrap, withFallback } from './api.js';
import { AREAS, HOTSPOTS, RISK_ZONES } from './_mock/mockData.js';

/**
 * Areas / Risk Zones / Hotspots endpoints (backend contract).
 *   GET    /dashboard/area-stats?q=
 *   POST   /areas
 *   DELETE /areas/:id
 *   GET    /dashboard/zones?disease_name=
 *   GET    /dashboard/hotspots?disease_name=
 */
let _areas = [...AREAS];

function normalizeArea(a) {
  if (!a) return a;
  // If already formatted in frontend shape
  if (a.name !== undefined && a.lng !== undefined && a.cases !== undefined) return a;
  return {
    ...a,
    id: a.area_id,
    name: a.area_name || '',
    area: a.area_name || '', // compatibility with RiskZones.jsx
    population: a.population_density || 0,
    lng: a.lon || 0,
    risk: a.risk_level || a.risk || 'low',
    cases: a.case_count_7d ?? 0, // compatibility with RiskZones.jsx
    case_count_7d: a.case_count_7d ?? 0,
    death_count_7d: a.death_count_7d ?? 0,
    active_alerts: a.active_alerts ?? 0,
    trend: a.trend_pct ?? 0.0, // compatibility with RiskZones.jsx
    trend_pct: a.trend_pct ?? 0.0,
    diseases: a.diseases || [],
    windowLabel: 'Last 7 days',
  };
}

function normalizeAreaList(raw) {
  if (Array.isArray(raw)) return raw.map(normalizeArea);
  return [];
}

function normalizeZones(raw) {
  if (!Array.isArray(raw)) return [];
  const colorToRisk = { Red: 'critical', Yellow: 'high', Green: 'low' };
  return raw.map((z) => {
    const risk = colorToRisk[z.zone_color] || 'moderate';
    return {
      id: `${z.area_id}-${z.disease_in_cluster}`, // Compound key
      name: z.area_name,
      area: z.area_name,
      lat: z.lat,
      lng: z.lon, // Backend uses lon, frontend expects lng
      risk,
      disease: z.disease_in_cluster,
      cases: z.case_count ?? 0,
      trend: null, // calculated dynamically in backend or loaded separately
      updated: 'just now',
    };
  });
}

function normalizeHotspots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((h) => ({
    id: h.id,
    name: h.primary_area,
    lat: h.lat,
    lng: h.lon, // backend lon -> frontend lng
    risk: h.risk_level, // 'critical' | 'high' | 'low'
    disease: h.disease,
    cases: h.total_cases,
    area_names: h.area_names,
    area_count: h.area_count,
    trend: h.trend_pct,
  }));
}

function filterZones(list, params = {}) {
  let out = [...list];
  if (params.risk && params.risk !== 'all') {
    out = out.filter((z) => z.risk === params.risk);
  }
  if (params.disease && params.disease !== 'all') {
    out = out.filter((z) => z.disease.toLowerCase() === params.disease.toLowerCase());
  }
  return out;
}

export const areasService = {
  list: (params = {}, options = {}) => {
    const q = (params.q || '').toLowerCase();
    const fallback = () =>
      q ? _areas.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
        : _areas;

    // Use /dashboard/area-stats to get rich risk indicators and active stats per area
    return withFallback(
      api.get('/dashboard/area-stats', { params }).then(unwrap).then(normalizeAreaList),
      fallback,
      { enabled: options.allowFallback !== false }
    );
  },

  create: (payload) => {
    // Do NOT wrap in withFallback — a 409 Conflict must surface so the caller
    // can show a proper error instead of silently showing a phantom area.
    return api.post('/areas', payload).then(unwrap).then((result) => {
      const normalized = normalizeArea(result);
      _areas = [normalized, ..._areas];
      return normalized;
    });
  },

  remove: (id) => {
    _areas = _areas.filter((a) => a.id !== id);
    return withFallback(
      api.delete(`/areas/${id}`).then(unwrap),
      { ok: true, id }
    );
  },

  riskZones: (params = {}, options = {}) => {
    const fallback = () => {
      let out = [...RISK_ZONES];
      if (params.risk && params.risk !== 'all') out = out.filter((r) => r.risk === params.risk);
      if (params.disease && params.disease !== 'all') out = out.filter((r) => r.disease === params.disease);
      return out;
    };
    return withFallback(
      api.get('/dashboard/area-stats').then(unwrap).then(normalizeAreaList).then((list) => {
        let out = list;
        if (params.risk && params.risk !== 'all') {
          out = out.filter((z) => z.risk === params.risk);
        }
        if (params.disease && params.disease !== 'all') {
          out = out.filter((z) => z.diseases.some(d => d.toLowerCase() === params.disease.toLowerCase()));
        }
        return out;
      }),
      fallback,
      { enabled: options.allowFallback !== false }
    );
  },

  hotspots: (params = {}, options = {}) => {
    const fallback = () => {
      let out = [...HOTSPOTS].filter((r) => r.risk === 'critical' || r.risk === 'high');
      if (params.risk && params.risk !== 'all') out = out.filter((r) => r.risk === params.risk);
      if (params.disease && params.disease !== 'all') out = out.filter((r) => r.disease === params.disease);
      return out;
    };
    const backendParams = {};
    if (params.disease && params.disease !== 'all') {
      backendParams.disease_name = params.disease;
    }
    // Sourced from GET /dashboard/hotspots (aggregated cluster endpoint)
    return withFallback(
      api.get('/dashboard/hotspots', { params: backendParams })
        .then(unwrap)
        .then(normalizeHotspots)
        .then((list) => filterZones(list, params)),
      fallback,
      { enabled: options.allowFallback !== false }
    );
  },
};

export default areasService;
