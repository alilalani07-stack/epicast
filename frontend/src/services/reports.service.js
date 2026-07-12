import api, { unwrap, withFallback } from './api.js';
import { REPORTS } from './_mock/mockData.js';

/**
 * Reports endpoints (backend contract).
 *   GET    /reports?report_type=&disease_name=&area_id=&clinic_id=&limit=&offset=
 *   GET    /reports/stats?clinic_id=
 *   POST   /reports/case
 *   POST   /reports/death
 */

function normalizeReport(r) {
  if (!r) return r;

  const rawCount = r.count ?? r.case_count ?? r.death_count ?? 0;
  const numericCount = Number(rawCount);
  const safeCount = Number.isFinite(numericCount) ? numericCount : 0;

  return {
    ...r,
    id: r.id ?? r.report_id ?? null,
    type: r.report_type || r.type || 'case',
    disease: r.disease_name || r.disease || '—',
    area: r.area_id || r.area || '—',
    date: r.timestamp ? r.timestamp.slice(0, 10) : (r.date || '—'),
    submittedBy: r.clinic_id || r.submittedBy || '—',
    clinic_id: r.clinic_id || r.submittedBy || null,
    count: safeCount,
    notes: r.notes || '',
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  };
}

function normalizeList(raw) {
  if (!raw) return { total: 0, reports: [] };
  const payload = raw.data ?? raw;

  if (Array.isArray(payload))
    return { total: payload.length, reports: payload.map(normalizeReport) };

  if (payload && Array.isArray(payload.reports))
    return {
      total: payload.total ?? payload.reports.length,
      reports: payload.reports.map(normalizeReport),
    };

  if (payload && Array.isArray(payload.data))
    return {
      total: payload.total ?? payload.data.length,
      reports: payload.data.map(normalizeReport),
    };

  return { total: 0, reports: [] };
}

function applyFilters(list, params = {}) {
  let out = [...list];

  if (params.type && params.type !== 'all')
    out = out.filter((r) => r.type === params.type);

  if (params.disease && params.disease !== 'all')
    out = out.filter((r) => r.disease === params.disease);

  if (params.area && params.area !== 'all')
    out = out.filter((r) => r.area === params.area);

  if (params.clinic_id)
    out = out.filter(
      (r) => (r.submittedBy || r.clinic_id) === params.clinic_id
    );

  if (params.q) {
    const q = params.q.toLowerCase();
    out = out.filter(
      (r) =>
        (r.disease || '').toLowerCase().includes(q) ||
        (r.area || '').toLowerCase().includes(q) ||
        String(r.id || '').includes(q) ||
        (r.submittedBy || '').toLowerCase().includes(q) ||
        (r.clinic_id || '').toLowerCase().includes(q)
    );
  }

  if (params.from) out = out.filter((r) => r.date >= params.from);
  if (params.to) out = out.filter((r) => r.date <= params.to);
  return out;
}

export const reportsService = {
  list: (params = {}, options = {}) => {
    const backendParams = {};
    if (params.type && params.type !== 'all')
      backendParams.report_type = params.type;
    if (params.disease && params.disease !== 'all')
      backendParams.disease_name = params.disease;
    if (params.area && params.area !== 'all')
      backendParams.area_id = params.area;
    if (params.clinic_id) backendParams.clinic_id = params.clinic_id;
    if (params.from) backendParams.from_date = params.from;
    if (params.to) backendParams.to_date = params.to;
    if (params.q) backendParams.q = params.q;
    // Pass pagination if provided; backend defaults to limit=100, offset=0
    if (params.limit != null) backendParams.limit = params.limit;
    if (params.offset != null) backendParams.offset = params.offset;

    return withFallback(
      api
        .get('/reports', { params: backendParams })
        .then(unwrap)
        .then(normalizeList),
      () => {
        const filtered = applyFilters(REPORTS, params);
        return normalizeList(filtered);
      },
      { enabled: options.allowFallback !== false }
    );
  },

  /**
   * Server-side aggregated totals — use this for KPI cards and tab counts.
   * Accepts the same filter params as list() so counts stay in sync with
   * active filters without ever summing a truncated paginated row list.
   */
  getStats: (params = {}, options = {}) => {
    const backendParams = {};
    if (params.type && params.type !== 'all')
      backendParams.report_type = params.type;
    if (params.disease && params.disease !== 'all')
      backendParams.disease_name = params.disease;
    if (params.area && params.area !== 'all')
      backendParams.area_id = params.area;
    if (params.clinic_id)  backendParams.clinic_id  = params.clinic_id;
    if (params.from)       backendParams.from_date   = params.from;
    if (params.to)         backendParams.to_date     = params.to;
    if (params.q)          backendParams.q           = params.q;

    return withFallback(
      api
        .get('/reports/stats', { params: backendParams })
        .then(unwrap),
      () => ({ total_reports: 0, total_cases: 0, total_deaths: 0 }),
      { enabled: options.allowFallback !== false }
    );
  },

  /**
   * Return a map of clinic_id → clinic_name for all clinics that have
   * submitted reports. Used by ReportsTable to resolve raw UIDs into
   * human-readable names.
   */
  getClinics: (options = {}) => {
    return withFallback(
      api.get('/reports/clinics').then(unwrap).then((res) => {
        const map = {};
        (res.clinics || []).forEach((c) => { map[c.clinic_id] = c.clinic_name; });
        return map;
      }),
      () => ({}),
      { enabled: options.allowFallback !== false }
    );
  },

  createCase: (payload) => {
    return api.post('/reports/case', payload).then(unwrap);
  },

  createDeath: (payload) => {
    return api.post('/reports/death', payload).then(unwrap);
  },
};

export default reportsService;