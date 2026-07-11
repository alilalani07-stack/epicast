/**
 * Location search via OpenStreetMap Nominatim.
 *
 *   https://nominatim.openstreetmap.org/search?q=<query>&format=jsonv2
 *
 * Notes:
 * - This is a free, public service. Respect their usage policy:
 *   https://operations.osmfoundation.org/policies/nominatim/
 * - We send a descriptive User-Agent via a custom header is not allowed
 *   from the browser, but a meaningful Referer is sent automatically.
 * - Requests are de-duplicated by query and aborted when a new query arrives.
 * - Results are scored to prefer Hyderabad / configured region matches.
 */
import axios from 'axios';
import { DEFAULT_REGION } from '../lib/config.js';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

// Axios instance dedicated to Nominatim (no auth interceptor here).
const nominatim = axios.create({
  baseURL: ENDPOINT,
  timeout: 8000,
});

// Track the most recent in-flight request so we can cancel stale ones.
let inflightController = null;

/**
 * Lightweight scoring boost for results inside the configured region.
 * Uses simple "is the point inside the bounding box?" logic.
 */
function inViewbox(lat, lon, viewbox) {
  const [west, south, east, north] = viewbox;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

function normalize(r) {
  return {
    id: `${r.osm_type}-${r.osm_id}`,
    name: r.name || (r.display_name?.split(',')[0] ?? 'Unnamed'),
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    type: r.type,
    category: r.category || r.class,
    importance: r.importance ?? 0,
    geojson: r.geojson || null,
    boundingbox: r.boundingbox || null,
  };
}

/**
 * Search for locations by free-text query.
 *
 * Options:
 *   limit              - max results (default 8)
 *   preferRegion       - boost results inside DEFAULT_REGION (default true)
 *   country            - optional ISO-3166 alpha-2 filter (e.g. 'in')
 *
 * Returns: Promise<Array<{id, name, label, lat, lng, type, category, importance}>>
 */
export async function searchLocations(query, options = {}) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const {
    limit = 8,
    preferRegion = true,
    country,
  } = options;

  // Cancel any in-flight request so only the latest matters.
  if (inflightController) {
    try { inflightController.abort(); } catch { /* noop */ }
  }
  inflightController = new AbortController();

  const params = {
    q,
    format: 'jsonv2',
    addressdetails: 1,
    limit: Math.max(limit * 2, 10), // over-fetch then re-rank
    'accept-language': 'en',
    polygon_geojson: 1,
  };

  if (preferRegion) {
    // viewbox order for Nominatim: left,top,right,bottom
    const [w, s, e, n] = DEFAULT_REGION.viewbox;
    params.viewbox = `${w},${n},${e},${s}`;
    // `bounded=0` means: prefer but don't restrict
    params.bounded = 0;
  }
  if (country) params.countrycodes = country;

  try {
    const res = await nominatim.get('', {
      params,
      signal: inflightController.signal,
    });

    const normalized = (res.data || []).map(normalize);

    // Re-rank: in-viewbox + Nominatim importance.
    const scored = normalized.map((r) => {
      const regionBoost = preferRegion && inViewbox(r.lat, r.lng, DEFAULT_REGION.viewbox) ? 1 : 0;
      return { ...r, _score: r.importance + regionBoost };
    });

    scored.sort((a, b) => b._score - a._score);

    // Deduplicate by rounded coordinate (some queries return near-duplicates).
    const seen = new Set();
    const deduped = [];
    for (const r of scored) {
      const key = `${r.lat.toFixed(3)}|${r.lng.toFixed(3)}|${r.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
      if (deduped.length >= limit) break;
    }

    return deduped;
  } catch (err) {
    // Aborted requests are expected during typing — swallow them.
    if (axios.isCancel?.(err) || err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
      return [];
    }
    // Re-throw everything else for the caller to handle.
    throw new Error(err?.message || 'Could not reach the location service.');
  }
}

/**
 * Reverse-geocode a coordinate pair into a human label.
 */
export async function reverseLookup(lat, lng) {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'jsonv2', 'accept-language': 'en' },
      timeout: 8000,
    });
    const r = res.data;
    if (!r) return null;
    return {
      id: `${r.osm_type}-${r.osm_id}`,
      name: r.name || r.display_name?.split(',')[0] || 'Unknown',
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    };
  } catch {
    return null;
  }
}

export default { searchLocations, reverseLookup };
