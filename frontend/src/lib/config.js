/**
 * Application-wide configuration constants.
 *
 * Geography defaults are tuned for Hyderabad demonstrations, but the
 * application supports any city — these are only the initial values.
 */

export const DEFAULT_REGION = {
  name: 'Hyderabad',
  country: 'India',
  // Center on the city
  center: [17.385, 78.4867],
  // Comfortable city-level zoom
  zoom: 11,
  // Tighter zoom when a single location is selected
  zoomDetail: 14,
  // Bounding box used to prioritize Hyderabad in Nominatim search
  // [west, south, east, north] — covers the GHMC area + suburbs
  viewbox: [78.20, 17.20, 78.70, 17.60],
  // Approximate radius (km) for proximity scoring in search results
  preferredRadiusKm: 35,
};

export const APP = {
  name: 'EpiCast',
  tagline: 'Epidemic Intelligence & Forecasting',
};
