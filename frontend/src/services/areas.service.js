import api, { unwrap, withFallback } from './api.js';
import { AREAS, HOTSPOTS, RISK_ZONES } from './_mock/mockData.js';

/**
 * Areas / Risk Zones / Hotspots endpoints (backend contract).
 *   GET    /areas?q=
 *   POST   /areas
 *   DELETE /areas/:id
 *   GET    /risk-zones?risk=&disease=
 *   GET    /hotspots?risk=&disease=
 */
let _areas = [...AREAS];

function normalizeArea(a) {
  if (!a) return a;
  if (a.name !== undefined && a.lng !== undefined) return a;
  return {
    ...a,
    id: a.area_id,
    name: a.area_name || '',
    population: a.population_density || 0,
    lng: a.lon || 0,
    risk: a.risk || 'low',
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
      id: `${z.area_id}-${z.disease_in_cluster}`, // Compound key to avoid duplicate keys for multiple disease clusters in same area
      name: z.area_name,
      area: z.area_name,
      lat: z.lat,
      lng: z.lon, // Backend uses lon, frontend expects lng
      risk,
      disease: z.disease_in_cluster,
      cases: z.population_density,
      trend: risk === 'critical' ? 18 : risk === 'high' ? 9 : risk === 'moderate' ? 2 : -3,
      updated: 'just now',
    };
  });
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
  list: (params = {}) => {
    const q = (params.q || '').toLowerCase();
    const fallback = () =>
      q ? _areas.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
        : _areas;
    return withFallback(
      api.get('/areas', { params }).then(unwrap).then(normalizeAreaList),
      fallback
    );
  },

  create: (payload) => {
    const created = {
      id: payload.area_id || `A-${100 + _areas.length + 1}`,
      population: payload.population_density || 0,
      risk: 'low',
      lat: payload.lat || 20,
      lng: payload.lon || 0,
      name: payload.area_name,
      ...payload,
    };
    _areas = [created, ..._areas];
    return withFallback(
      api.post('/areas', payload).then(unwrap).then(normalizeArea),
      created
    );
  },

  remove: (id) => {
    _areas = _areas.filter((a) => a.id !== id);
    return withFallback(
      api.delete(`/areas/${id}`).then(unwrap),
      { ok: true, id }
    );
  },

  riskZones: (params = {}) => {
    const fallback = () => {
      let out = [...RISK_ZONES];
      if (params.risk && params.risk !== 'all') out = out.filter((r) => r.risk === params.risk);
      if (params.disease && params.disease !== 'all') out = out.filter((r) => r.disease === params.disease);
      return out;
    };
    const backendParams = {};
    if (params.disease && params.disease !== 'all') {
      backendParams.disease_name = params.disease;
    }
    return withFallback(
      api.get('/dashboard/zones', { params: backendParams })
        .then(unwrap)
        .then(normalizeZones)
        .then((list) => filterZones(list, params)),
      fallback
    );
  },

  hotspots: (params = {}) => {
    const fallback = () => {
      let out = [...HOTSPOTS];
      if (params.risk && params.risk !== 'all') out = out.filter((r) => r.risk === params.risk);
      if (params.disease && params.disease !== 'all') out = out.filter((r) => r.disease === params.disease);
      return out;
    };
    const backendParams = {};
    if (params.disease && params.disease !== 'all') {
      backendParams.disease_name = params.disease;
    }
    return withFallback(
      api.get('/dashboard/zones', { params: backendParams })
        .then(unwrap)
        .then(normalizeZones)
        .then((list) => filterZones(list, params)),
      fallback
    );
  },
};


export default areasService;
