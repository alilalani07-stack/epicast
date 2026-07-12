/**
 * Local mock data used as a graceful fallback so the UI is fully
 * usable before the real backend is wired up.
 *
 * Locations are Hyderabad neighborhoods so demos look meaningful out of
 * the box. The application is NOT hardcoded to Hyderabad — services
 * accept arbitrary lat/lng/area data from the real backend.
 */

export const DISEASES = [
  'COVID-19', 'Influenza', 'Dengue', 'Malaria', 'Cholera',
  'Measles', 'Tuberculosis', 'Typhoid', 'Chikungunya',
];

/** Hyderabad neighborhoods with realistic coordinates. */
export const AREAS = [
  { id: 'A-101', name: 'Madhapur',       population: 215000, lat: 17.4483, lng: 78.3915, risk: 'high' },
  { id: 'A-102', name: 'Hitech City',    population: 178000, lat: 17.4435, lng: 78.3772, risk: 'critical' },
  { id: 'A-103', name: 'Gachibowli',     population: 162000, lat: 17.4401, lng: 78.3489, risk: 'moderate' },
  { id: 'A-104', name: 'Kukatpally',     population: 488000, lat: 17.4849, lng: 78.4138, risk: 'high' },
  { id: 'A-105', name: 'Banjara Hills',  population: 132000, lat: 17.4156, lng: 78.4347, risk: 'moderate' },
  { id: 'A-106', name: 'Jubilee Hills',  population: 110000, lat: 17.4326, lng: 78.4071, risk: 'low' },
  { id: 'A-107', name: 'Begumpet',       population: 145000, lat: 17.4399, lng: 78.4983, risk: 'moderate' },
  { id: 'A-108', name: 'Secunderabad',   population: 215000, lat: 17.4399, lng: 78.4983, risk: 'high' },
  { id: 'A-109', name: 'Charminar',      population: 188000, lat: 17.3616, lng: 78.4747, risk: 'critical' },
  { id: 'A-110', name: 'Mehdipatnam',    population: 156000, lat: 17.3938, lng: 78.4347, risk: 'moderate' },
  { id: 'A-111', name: 'LB Nagar',       population: 245000, lat: 17.3457, lng: 78.5520, risk: 'high' },
  { id: 'A-112', name: 'Uppal',          population: 198000, lat: 17.4055, lng: 78.5589, risk: 'moderate' },
  { id: 'A-113', name: 'Miyapur',        population: 167000, lat: 17.4969, lng: 78.3578, risk: 'low' },
  { id: 'A-114', name: 'Tarnaka',        population: 92000,  lat: 17.4239, lng: 78.5377, risk: 'low' },
  { id: 'A-115', name: 'Dilsukhnagar',   population: 178000, lat: 17.3687, lng: 78.5247, risk: 'high' },
];

export const HOTSPOTS = [
  { id: 'H-1',  name: 'Madhapur',       lat: 17.4483, lng: 78.3915, risk: 'high',     disease: 'Dengue',       cases: 348 },
  { id: 'H-2',  name: 'Hitech City',    lat: 17.4435, lng: 78.3772, risk: 'critical', disease: 'Influenza',    cases: 612 },
  { id: 'H-3',  name: 'Gachibowli',     lat: 17.4401, lng: 78.3489, risk: 'moderate', disease: 'COVID-19',     cases: 184 },
  { id: 'H-4',  name: 'Kukatpally',     lat: 17.4849, lng: 78.4138, risk: 'high',     disease: 'Malaria',      cases: 274 },
  { id: 'H-5',  name: 'Banjara Hills',  lat: 17.4156, lng: 78.4347, risk: 'moderate', disease: 'Tuberculosis', cases: 137 },
  { id: 'H-6',  name: 'Jubilee Hills',  lat: 17.4326, lng: 78.4071, risk: 'low',      disease: 'Influenza',    cases: 62  },
  { id: 'H-7',  name: 'Begumpet',       lat: 17.4399, lng: 78.4983, risk: 'moderate', disease: 'Typhoid',      cases: 152 },
  { id: 'H-8',  name: 'Charminar',      lat: 17.3616, lng: 78.4747, risk: 'critical', disease: 'Cholera',      cases: 528 },
  { id: 'H-9',  name: 'Mehdipatnam',    lat: 17.3938, lng: 78.4347, risk: 'high',     disease: 'Dengue',       cases: 219 },
  { id: 'H-10', name: 'LB Nagar',       lat: 17.3457, lng: 78.5520, risk: 'high',     disease: 'Chikungunya',  cases: 196 },
  { id: 'H-11', name: 'Uppal',          lat: 17.4055, lng: 78.5589, risk: 'moderate', disease: 'Dengue',       cases: 143 },
  { id: 'H-12', name: 'Dilsukhnagar',   lat: 17.3687, lng: 78.5247, risk: 'high',     disease: 'Measles',      cases: 207 },
  { id: 'H-13', name: 'Miyapur',        lat: 17.4969, lng: 78.3578, risk: 'low',      disease: 'COVID-19',     cases: 48  },
  { id: 'H-14', name: 'Tarnaka',        lat: 17.4239, lng: 78.5377, risk: 'low',      disease: 'Influenza',    cases: 41  },
  { id: 'H-15', name: 'Secunderabad',   lat: 17.4399, lng: 78.4983, risk: 'high',     disease: 'Tuberculosis', cases: 263 },
];

export const RISK_ZONES = HOTSPOTS.map((h) => ({
  id: `Z-${h.id}`,
  area: h.name,
  lat: h.lat,
  lng: h.lng,
  risk: h.risk,
  disease: h.disease,
  cases: h.cases,
  trend: h.risk === 'critical' ? 18 : h.risk === 'high' ? 9 : h.risk === 'moderate' ? 2 : -3,
  updated: '2h ago',
}));

const SUBMITTERS = [
  'uid_apollo_001',
  'uid_kims_002',
  'uid_care_003',
  'uid_yashoda_004',
  'uid_continental_005',
  'uid_sunshine_006',
  'uid_nims_007',
];

function buildReports(n = 64) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const disease = DISEASES[i % DISEASES.length];
    const area = AREAS[i % AREAS.length].name;
    const type = i % 5 === 0 ? 'death' : 'case';
    const count = type === 'death'
      ? Math.floor(((i * 7) % 8)) + 1
      : Math.floor(((i * 13) % 38)) + 1;
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      id: 1000 + i,
      type, disease, area, count,
      submittedBy: SUBMITTERS[i % SUBMITTERS.length],
      date: d.toISOString().slice(0, 10),
      notes: 'Routine field submission.',
    });
  }
  return out;
}

export const REPORTS = buildReports(64);

export const ALERTS = [
  { id: 'AL-2041', title: 'Cholera surge in Charminar',       message: 'Case count exceeded the moderate threshold for three consecutive days. Recommend immediate field response.',  severity: 'critical',  status: 'new',          area: 'Charminar',    disease: 'Cholera',      time: '12 min ago' },
  { id: 'AL-2040', title: 'Dengue uptrend in Madhapur',       message: 'A 32% week-over-week increase in confirmed cases. Vector control advised.',                                    severity: 'high',      status: 'new',          area: 'Madhapur',     disease: 'Dengue',       time: '1 h ago'    },
  { id: 'AL-2039', title: 'Influenza cluster in Hitech City', message: 'Localized cluster identified across two adjacent zones.',                                                       severity: 'critical',  status: 'acknowledged', area: 'Hitech City',  disease: 'Influenza',    time: '3 h ago'    },
  { id: 'AL-2038', title: 'COVID-19 baseline restored',       message: 'Case counts returned to baseline in Jubilee Hills. Alert can be closed after review.',                          severity: 'low',       status: 'resolved',     area: 'Jubilee Hills',disease: 'COVID-19',     time: 'Yesterday'  },
  { id: 'AL-2037', title: 'Malaria resurgence in Kukatpally', message: 'Surveillance flagged an unusual rise in case load along construction belts.',                                   severity: 'high',      status: 'acknowledged', area: 'Kukatpally',   disease: 'Malaria',      time: 'Yesterday'  },
  { id: 'AL-2036', title: 'Measles flare in Dilsukhnagar',    message: 'Vaccination coverage analysis triggered a new advisory.',                                                       severity: 'moderate',  status: 'new',          area: 'Dilsukhnagar', disease: 'Measles',      time: '2 d ago'    },
  { id: 'AL-2035', title: 'Chikungunya rise in LB Nagar',     message: 'New cases reported across four wards. Vector control deploying tomorrow.',                                      severity: 'moderate',  status: 'new',          area: 'LB Nagar',     disease: 'Chikungunya',  time: '2 d ago'    },
];

// Deterministic pseudo-random so charts look stable across reloads.
function prng(seed) {
  let s = seed % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildForecast(disease = 'Dengue') {
  const days = 30;
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const out = [];
  const rand = prng(disease.length * 97 + 11);
  let v = 80;
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    v = Math.max(12, v + Math.round((rand() - 0.42) * 14));
    const isForecast = i >= 14;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    out.push({
      date: label,
      actual: isForecast ? null : v,
      forecast: isForecast ? v + Math.round((rand() - 0.3) * 6) : null,
      isForecastStart: i === 14,
    });
  }
  const boundary = out[14];
  const prev = out[13];
  if (boundary && prev) boundary.actual = prev.actual;
  return out;
}

export function buildTrend() {
  const days = 21;
  const start = new Date();
  start.setDate(start.getDate() - days);
  const out = [];
  const rand = prng(42);
  let a = 40, b = 18, c = 9;
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    a = Math.max(5, a + Math.round((rand() - 0.45) * 8));
    b = Math.max(2, b + Math.round((rand() - 0.5) * 4));
    c = Math.max(1, c + Math.round((rand() - 0.5) * 3));
    out.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Dengue: a, Malaria: b, Cholera: c,
    });
  }
  return out;
}

export function dashboardMetrics() {
  return {
    totalReports: { value: 12483, delta: 8.2 },
    activeAlerts: { value: 27, delta: 14.3 },
    highRiskZones: { value: 9, delta: 5.6 },
    forecastGrowth: { value: 12.4, delta: -2.1 },
  };
}

export const riskColor = (risk) =>
  ({
    low: '#16a34a',
    moderate: '#d97706',
    high: '#ea580c',
    critical: '#dc2626',
  }[risk] || '#6b6b66');


