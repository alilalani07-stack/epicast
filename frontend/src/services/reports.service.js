import api, { unwrap, withFallback } from './api.js';
import { REPORTS } from './_mock/mockData.js';

/**
 * Reports endpoints (backend contract).
 *   GET    /reports?report_type=&disease_name=&area_id=&clinic_id=
 *   POST   /reports/case
 *   POST   /reports/death
 *
 * Backend may return a raw array OR { reports: [] }.
 * Normalise to always { reports: [] } so callers are consistent.
 */

/**
 * Translate a single backend report row into the shape the UI expects.
 *
 * Backend row keys:  report_type, disease_name, area_id, timestamp, count, clinic_id, id
 * Frontend UI keys:  type,        disease,       area,    date,      count, submittedBy, id
 *
 * If the object already has the frontend shape (e.g. mock data which has `type`
 * and `disease`), it passes through untouched.
 */
function normalizeReport(r) {
  if (!r) return r;
  // Already in frontend shape — mock data already has `type` and `disease`
  if (r.type !== undefined && r.disease !== undefined) return r;
  return {
    ...r,
    type:        r.report_type  || 'case',
    disease:     r.disease_name || '',
    area:        r.area_id      || '',
    // Timestamps from the backend are ISO strings; slice to YYYY-MM-DD for display.
    date:        r.timestamp    ? r.timestamp.slice(0, 10) : (r.date || ''),
    submittedBy: r.clinic_id   || '—',
    count:       r.count        ?? 0,
  };
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return { reports: raw.map(normalizeReport) };
  if (raw && Array.isArray(raw.reports)) return { reports: raw.reports.map(normalizeReport) };
  if (raw && Array.isArray(raw.data))    return { reports: raw.data.map(normalizeReport) };
  return { reports: [] };
}

function applyFilters(list, params = {}) {
  let out = [...list];
  if (params.type    && params.type    !== 'all') out = out.filter((r) => r.type    === params.type);
  if (params.disease && params.disease !== 'all') out = out.filter((r) => r.disease === params.disease);
  if (params.area    && params.area    !== 'all') out = out.filter((r) => r.area    === params.area);
  if (params.q) {
    const q = params.q.toLowerCase();
    out = out.filter(
      (r) =>
        (r.disease     || '').toLowerCase().includes(q) ||
        (r.area        || '').toLowerCase().includes(q) ||
        String(r.id || '').includes(q)                  ||
        (r.submittedBy || '').toLowerCase().includes(q)
    );
  }
  // `date` is now always a YYYY-MM-DD string after normalizeReport — string compare works.
  if (params.from) out = out.filter((r) => r.date >= params.from);
  if (params.to)   out = out.filter((r) => r.date <= params.to);
  return out;
}

export const reportsService = {
  list: (params = {}) => {
    const backendParams = {};
    if (params.type      && params.type    !== 'all') backendParams.report_type  = params.type;
    if (params.disease   && params.disease !== 'all') backendParams.disease_name = params.disease;
    if (params.area      && params.area    !== 'all') backendParams.area_id      = params.area;
    if (params.clinic_id) backendParams.clinic_id = params.clinic_id;

    return withFallback(
      api.get('/reports', { params: backendParams })
         .then(unwrap)
         .then(normalizeList)
         .then((res) => ({ reports: applyFilters(res.reports, params) })),
      () => ({ reports: applyFilters(REPORTS, params) })
    );
  },
  createCase: (payload) =>
    api.post('/reports/case', payload).then(unwrap),
  createDeath: (payload) =>
    api.post('/reports/death', payload).then(unwrap),
};

export default reportsService;
