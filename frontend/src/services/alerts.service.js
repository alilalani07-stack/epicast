import api, { unwrap, withFallback } from './api.js';
import { ALERTS } from './_mock/mockData.js';

/**
 * Normalize a single backend alert into the shape AlertCard expects.
 * Backend: { id, area_id, disease_name, message, status ('new'|'acknowledged'|'resolved'), created_at }
 * Card:    { id, title, area, disease, message, severity, status ('active'|...), time }
 */
function normalizeAlert(a) {
  if (!a) return a;
  // If it already looks like mock data (has `title` field), pass through.
  if (a.title) return a;
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
    area:    a.area_id      || '',
    disease: a.disease_name || '',
    // UI now uses 'new' to match backend
    status: a.status,
    severity: a.severity || 'moderate',
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
 *   GET   /dashboard/alerts?severity=&status=
 *   PATCH /dashboard/alerts/:id  { status }
 */
export const alertsService = {
  list: (params = {}) => {
    const fallback = () => {
      const filtered = ALERTS.filter((a) => {
        if (params.severity && params.severity !== 'all' && a.severity !== params.severity) return false;
        if (params.status && params.status !== 'all' && a.status !== params.status) return false;
        return true;
      });
      return { alerts: filtered };
    };

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

    return withFallback(
      api.get('/dashboard/alerts', { params: backendParams })
        .then(unwrap)
        .then(normalizeList),
      fallback
    );
  },
  acknowledge: (id) =>
    withFallback(api.patch(`/dashboard/alerts/${id}`, { status: 'acknowledged' }).then(unwrap), { ok: true, id }),
  resolve: (id) =>
    withFallback(api.patch(`/dashboard/alerts/${id}`, { status: 'resolved' }).then(unwrap), { ok: true, id }),
};

export default alertsService;

