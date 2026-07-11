import api, { unwrap, withFallback } from './api.js';
import { buildForecast, buildTrend } from './_mock/mockData.js';

/**
 * Converts backend ForecastResponse into the flat array the ForecastChart expects.
 * Backend: { historical_labels, historical_data, forecast_labels, forecast_data, ... }
 * Chart:   [{ date, actual, forecast, isForecastStart }]
 */
function normalizeForecast(raw) {
  if (!raw || !Array.isArray(raw.historical_labels)) return raw; // already mock format
  const out = [];

  raw.historical_labels.forEach((label, i) => {
    out.push({
      date: label,
      actual: raw.historical_data[i] ?? null,
      forecast: null,
      isForecastStart: false,
    });
  });

  raw.forecast_labels.forEach((label, i) => {
    // Stitch: first forecast point shares its value with last historical point
    if (i === 0 && out.length > 0) {
      out[out.length - 1].forecast = raw.forecast_data[i] ?? null;
    }
    out.push({
      date: label,
      actual: null,
      forecast: raw.forecast_data[i] ?? null,
      isForecastStart: i === 0,
    });
  });

  return out;
}

function buildTable(disease) {
  const f = buildForecast(disease).filter((d) => d.forecast != null);
  return f.map((d, i) => ({
    period: d.date,
    predicted: d.forecast,
    confidence: Math.max(60, 96 - i * 2),
    delta: i === 0 ? 0 : Math.round(((d.forecast - f[i - 1].forecast) / (f[i - 1].forecast || 1)) * 100),
  }));
}

export const forecastService = {
  getForecast: (disease = 'Dengue') =>
    withFallback(
      api.get(`/dashboard/forecast/${disease}`).then(unwrap).then(normalizeForecast),
      () => buildForecast(disease)
    ),
  getTrend: () =>
    withFallback(
      Promise.all([
        api.get('/dashboard/forecast/Dengue').then(unwrap).catch(() => ({})),
        api.get('/dashboard/forecast/Malaria').then(unwrap).catch(() => ({})),
        api.get('/dashboard/forecast/Cholera').then(unwrap).catch(() => ({})),
      ]).then(([dengue, malaria, cholera]) => {
        const dengueLabels = dengue.historical_labels || [];
        const malariaLabels = malaria.historical_labels || [];
        const choleraLabels = cholera.historical_labels || [];

        const allDates = Array.from(new Set([
          ...dengueLabels,
          ...malariaLabels,
          ...choleraLabels
        ])).sort();

        const getVal = (labels, data, date) => {
          const idx = labels.indexOf(date);
          return idx !== -1 ? (data[idx] ?? 0) : 0;
        };

        return allDates.map((date) => ({
          date,
          Dengue: getVal(dengueLabels, dengue.historical_data || [], date),
          Malaria: getVal(malariaLabels, malaria.historical_data || [], date),
          Cholera: getVal(choleraLabels, cholera.historical_data || [], date),
        }));
      }),
      buildTrend
    ),
  getTable: (disease = 'Dengue') =>
    withFallback(
      api.get(`/dashboard/forecast/${disease}`).then(unwrap).then((raw) => {
        if (!raw || !Array.isArray(raw.forecast_labels)) return buildTable(disease);
        return raw.forecast_labels.map((label, i) => ({
          period: label,
          predicted: raw.forecast_data[i] ?? 0,
          confidence: Math.max(60, 96 - i * 2),
          delta: i === 0 ? 0 : Math.round(
            ((raw.forecast_data[i] - raw.forecast_data[i - 1]) / (raw.forecast_data[i - 1] || 1)) * 100
          ),
        }));
      }),
      () => buildTable(disease)
    ),
};

export default forecastService;
