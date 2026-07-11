import './leafletFix.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { useEffect, useRef } from 'react';
import {
  MapContainer as LeafletMap, TileLayer, ZoomControl, useMap, useMapEvents, Marker, Popup, GeoJSON, Rectangle
} from 'react-leaflet';
import clsx from 'clsx';
import L from 'leaflet';
import { DEFAULT_REGION } from '../../lib/config.js';

/**
 * Shared light map container.
 *
 * Props:
 *   center           [lat, lng] (default: Hyderabad)
 *   zoom             initial zoom (default: 11)
 *   focus            optional { lat, lng, zoom?, label? } — programmatically flies to this point
 *   onMapClick(latlng) optional — fires on map click for "pick a point" UX
 *   onMapReady(map)  optional — receive the Leaflet instance after mount
 *   className, height, scrollWheelZoom, showZoom
 */
export default function MapContainer({
  center = DEFAULT_REGION.center,
  zoom = DEFAULT_REGION.zoom,
  focus,
  onMapClick,
  onMapReady,
  className,
  children,
  scrollWheelZoom = true,
  height = '100%',
  showZoom = true,
}) {
  return (
    <div className={clsx('relative w-full h-full overflow-hidden', className)} style={{ height }}>
      <LeafletMap
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        zoomControl={false}
        className="w-full h-full"
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        {showZoom && <ZoomControl position="bottomright" />}

        <MapBindings focus={focus} onMapClick={onMapClick} onMapReady={onMapReady} />
        <FocusHighlight focus={focus} />

        {children}
      </LeafletMap>
    </div>
  );
}

function FocusHighlight({ focus }) {
  if (!focus || typeof focus.lat !== 'number' || typeof focus.lng !== 'number') return null;
  
  const icon = L.divIcon({
    html: `
      <span class="flex items-center justify-center w-6 h-6">
        <span class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75"></span>
        <span class="relative w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow"></span>
      </span>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const areaHighlight = focus.geojson ? (
    <GeoJSON
      key={focus.label || Date.now()}
      data={focus.geojson}
      style={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.15 }}
    />
  ) : focus.boundingbox ? (
    <Rectangle
      key={focus.label || Date.now()}
      bounds={[
        [parseFloat(focus.boundingbox[0]), parseFloat(focus.boundingbox[2])],
        [parseFloat(focus.boundingbox[1]), parseFloat(focus.boundingbox[3])]
      ]}
      pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.15 }}
    />
  ) : null;

  return (
    <>
      {areaHighlight}
      <Marker position={[focus.lat, focus.lng]} icon={icon}>
        {focus.label && <Popup>{focus.label}</Popup>}
      </Marker>
    </>
  );
}

/** Subscribes to map events + bridges imperative behaviors. */
function MapBindings({ focus, onMapClick, onMapReady }) {
  const map = useMap();
  const initialReady = useRef(false);

  // Notify parent once on mount.
  useEffect(() => {
    if (initialReady.current) return;
    initialReady.current = true;
    onMapReady?.(map);
  }, [map, onMapReady]);

  // Fly to a new focus when it changes.
  useEffect(() => {
    if (!focus) return;
    const { lat, lng, zoom = DEFAULT_REGION.zoomDetail, boundingbox } = focus;
    
    if (boundingbox) {
      const bounds = [
        [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],
        [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]
      ];
      map.flyToBounds(bounds, { duration: 1.2, easeLinearity: 0.25, maxZoom: 15 });
    } else {
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      map.flyTo([lat, lng], zoom, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [focus, map]);

  // Map click bridge.
  useMapEvents({
    click: (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });

  return null;
}
