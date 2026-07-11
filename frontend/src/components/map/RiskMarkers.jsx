import { CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { riskColor } from '../../services/_mock/mockData.js';

/**
 * Renders risk points on a Leaflet map.
 *
 * Props:
 *   points: [{ id, lat, lng, name, disease, cases, risk }]
 *   cluster: when true, groups markers into clusters (recommended at city zoom)
 */
export default function RiskMarkers({ points = [], cluster = false }) {
  return cluster ? <ClusteredMarkers points={points} /> : <PlainMarkers points={points} />;
}

function radiusFor(p) {
  const base = p.risk === 'critical' ? 16 : p.risk === 'high' ? 13 : p.risk === 'moderate' ? 10 : 8;
  return base + (p.clusterSize || 0) * 4; // Make it bigger based on cluster size
}

function PlainMarkers({ points }) {
  return points.map((p) => {
    const color = riskColor(p.risk);
    return (
      <CircleMarker
        key={p.id}
        center={[p.lat, p.lng]}
        radius={radiusFor(p)}
        pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.22 }}
      >
        <Popup>
          <PopupBody point={p} color={color} />
        </Popup>
      </CircleMarker>
    );
  });
}

function ClusteredMarkers({ points }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      maxClusterRadius: 48,
    });

    points.forEach((p) => {
      const color = riskColor(p.risk);
      const r = radiusFor(p);
      const html = `
        <span style="
          display:inline-flex;align-items:center;justify-content:center;
          width:${r * 2}px;height:${r * 2}px;border-radius:9999px;
          background:${color}33; border:2px solid ${color};
          box-shadow: 0 0 0 4px ${color}1f;
        "></span>`;
      const icon = L.divIcon({
        html,
        className: 'epicast-risk-marker',
        iconSize: [r * 2 + 8, r * 2 + 8],
        iconAnchor: [r + 4, r + 4],
      });
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.bindPopup(`
        <div style="font-family: Inter, system-ui, sans-serif;">
          <div style="font-weight:600;color:#0a0a0a;font-size:13px;">${p.name}</div>
          <div style="color:#6b6b66;font-size:12px;margin-top:2px;">${p.disease}</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;font-size:12px;color:#1f1f1f;">
            <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
            <span style="text-transform:capitalize">${p.risk} risk</span>
            <span style="color:#9c9c95">· ${p.cases} cases</span>
          </div>
        </div>
      `);
      group.addLayer(marker);
    });

    groupRef.current = group;
    map.addLayer(group);

    return () => {
      if (groupRef.current) map.removeLayer(groupRef.current);
    };
  }, [points, map]);

  return null;
}

function PopupBody({ point, color }) {
  return (
    <div className="text-[12.5px] space-y-1">
      <div className="font-semibold text-ink">{point.name}</div>
      <div className="text-mute">{point.disease}</div>
      <div className="flex items-center gap-2 pt-1">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="capitalize text-ink-2">{point.risk} risk</span>
        <span className="text-mute">· {point.cases} cases</span>
      </div>
    </div>
  );
}
