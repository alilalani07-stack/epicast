import api, { unwrap, withFallback } from './api.js';
import { buildForecast, buildTrend } from './_mock/mockData.js';

/**
 * Converts backend ForecastResponse into the flat array the ForecastChart expects.
 * Backend: { historical_labels, historical_data, forecast_labels, forecast_data, ... }
 * Chart:   [{ date, actual, forecast, isForecastStart }]
 *
 * Stitching rule: the forecast line starts at the last *actual* observed value
 * so there is no vertical jump at the join point. The last historical point
 * gets `forecast = lastActual`, and each subsequent forecast point gets its
 * predicted value. The first forecast day entry is also included separately
 * in the array (with actual = null) so the dashed line continues from there.
 */
function normalizeForecast(raw) {
  if (!raw || !Array.isArray(raw.historical_labels)) return null;
  const out = [];

  raw.historical_labels.forEach((label, i) => {
    out.push({
      date: label,
      actual: raw.historical_data[i] ?? null,
      forecast: null,
      isForecastStart: false,
    });
  });

  // Stitch: anchor the forecast line at the last observed actual value.
  // This prevents a jump: the dashed line starts exactly where the solid line ends.
  if (out.length > 0 && raw.forecast_data.length > 0) {
    out[out.length - 1].forecast = out[out.length - 1].actual;
  }

  raw.forecast_labels.forEach((label, i) => {
    out.push({
      date: label,
      actual: null,
      forecast: raw.forecast_data[i] ?? null,
      isForecastStart: i === 0,
    });
  });

  out.trend = raw.trend;
  out.trend_percent_change = raw.trend_percent_change;
  out.model_used = raw.model_used;

  return out;
}

function buildTable(disease) {
  const f = buildForecast(disease).filter((d) => d.forecast != null);
  return f.map((d, i) => ({
    period: d.date,
    predicted: d.forecast,
    delta: i === 0 ? 0 : Math.round(((d.forecast - f[i - 1].forecast) / (f[i - 1].forecast || 1)) * 100),
  }));
}

export const forecastService = {
  getForecast: (disease = 'Dengue', options = {}) =>
    withFallback(
      api.get(`/dashboard/forecast/${encodeURIComponent(disease)}`)
        .then(unwrap)
        .then(normalizeForecast)
        .catch((err) => {
          if (err?.status === 404) return null;
          throw err;
        }),
      () => buildForecast(disease),
      { enabled: options.allowFallback !== false }
    ),

  getTrend: (options = {}) =>
    withFallback(
      api.get('/dashboard/trends')
        .then(unwrap)
        .then((trends) => {
          const diseases = Array.isArray(trends)
            ? trends.map((item) => item.disease_name).filter(Boolean)
            : [];
          if (!diseases.length) return [];

          // Limit to max 5 to prevent browser request congestion
          const activeDiseases = diseases.slice(0, 5);

          return Promise.all(
            activeDiseases.map((dis) =>
              api.get(`/dashboard/forecast/${encodeURIComponent(dis)}`)
                .then(unwrap)
                .then((res) => ({ disease: dis, res }))
            )
          ).then((results) => {
            const dateMap = {};

            results.forEach(({ disease, res }) => {
              const labels = res.historical_labels || [];
              const data = res.historical_data || [];
              labels.forEach((label, idx) => {
                const formattedDate = label.includes('T') ? label.slice(0, 10) : label;
                if (!dateMap[formattedDate]) {
                  dateMap[formattedDate] = { date: formattedDate };
                }
                dateMap[formattedDate][disease] = data[idx] ?? 0;
              });
            });

            const sortedDates = Object.keys(dateMap).sort();
            return sortedDates.map((date) => dateMap[date]);
          });
        }),
      buildTrend,
      { enabled: options.allowFallback !== false }
    ),

  getTable: (disease = 'Dengue', options = {}) =>
    withFallback(
      api.get(`/dashboard/forecast/${encodeURIComponent(disease)}`)
        .then(unwrap)
        .then((raw) => {
          if (!raw || !Array.isArray(raw.forecast_labels)) return [];
          return raw.forecast_labels.map((label, i) => ({
            period: label,
            predicted: raw.forecast_data[i] ?? 0,
            // Guard against division by zero when previous day has zero cases
            delta: i === 0 ? 0 : Math.round(
              ((raw.forecast_data[i] - raw.forecast_data[i - 1]) / (raw.forecast_data[i - 1] || 1)) * 100
            ),
          }));
        })
        .catch((err) => {
          if (err?.status === 404) return [];
          throw err;
        }),
      () => buildTable(disease),
      { enabled: options.allowFallback !== false }
    ),
};

export default forecastService;
