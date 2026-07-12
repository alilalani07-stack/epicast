import api, { unwrap } from './api.js';

/**
 * Normalize a single backend alert into the shape AlertCard expects.
 * Backend: { id, area_id, disease_name, message, status, severity, created_at }
 * Card:    { id, title, area, disease, message, severity, status, time, date }
 */
function normalizeAlert(a) {
  if (!a) return a;
  // If it already looks like normalized data (has `title` field), pass through.
  if (a.title && !a.disease_name) return a;

  const date = a.created_at ? new Date(a.created_at) : null;
  const now = Date.now();
  const diffMs = date ? now - date.getTime() : null;
  const timeStr = diffMs !== null
    ? diffMs < 60000    ? 'just now'
    : diffMs < 3600000  ? `${Math.round(diffMs / 60000)} min ago`
    : diffMs < 86400000 ? `${Math.round(diffMs / 3600000)} h ago`
    :                     `${Math.round(diffMs / 86400000)} d ago`
    : '';

  return {
    ...a,
    title: a.disease_name
      ? `${a.disease_name} alert — ${a.area_id}`
      : `Alert #${a.id}`,
    area:      a.area_id      || a.area    || '',
    disease:   a.disease_name || a.disease || '',
    time:      timeStr        || a.time    || 'just now',
    date:      a.created_at   || a.date    || '',
    createdAt: a.created_at   || a.createdAt || '',
    status:    a.status,
    severity:  a.severity || 'moderate',
  };
}

function normalizeList(raw) {
  const list = Array.isArray(raw)        ? raw
             : Array.isArray(raw?.alerts) ? raw.alerts
             : [];
  return { alerts: list.map(normalizeAlert) };
}

/**
 * Alerts endpoints (backend contract).
 *   GET   /dashboard/alerts?severity=&status=&disease_name=&area_id=
 *   PATCH /dashboard/alerts/:id  { status }
 *   DELETE /dashboard/alerts/:id
 *
 * NOTE: Mutations (acknowledge, resolve, remove) do NOT use withFallback.
 * They must fail loudly so the user knows if the action didn't persist.
 */
export const alertsService = {
  list: (params = {}, options = {}) => {
    const backendParams = {};
    if (params.status && params.status !== 'all') {
      backendParams.status = params.status;
    }
    if (params.severity && params.severity !== 'all') {
      backendParams.severity = params.severity;
    }
    if (params.disease && params.disease !== 'all') {
      backendParams.disease_name = params.disease;
    }
    if (params.area && params.area !== 'all') {
      backendParams.area_id = params.area;
    }

    // FIX: Removed the /dashboard/zones side-effect call.
    // GET requests should be idempotent. Alert refresh should be triggered
    // by a separate explicit endpoint, not piggy-backed on every list fetch.
    return api.get('/dashboard/alerts', { params: backendParams })
      .then(unwrap)
      .then(normalizeList);
  },

  /**
   * Server-side per-status counts scoped by the same non-status filters
   * (disease, area, severity) as the list endpoint. Use this for tab headers
   * so counts never change when switching tabs.
   */
  getStats: (params = {}) => {
    const backendParams = {};
    if (params.disease && params.disease !== 'all') {
      backendParams.disease_name = params.disease;
    }
    if (params.area && params.area !== 'all') {
      backendParams.area_id = params.area;
    }
    if (params.severity && params.severity !== 'all') {
      backendParams.severity = params.severity;
    }
    return api.get('/dashboard/alerts/stats', { params: backendParams }).then(unwrap);
  },

  acknowledge: (id) =>
    api.patch(`/dashboard/alerts/${id}`, { status: 'acknowledged' }).then(unwrap),

  resolve: (id) =>
    api.patch(`/dashboard/alerts/${id}`, { status: 'resolved' }).then(unwrap),

  remove: (id) =>
    api.delete(`/dashboard/alerts/${id}`).then(() => ({ ok: true, id })),
};

export default alertsService;