/// <reference lib="dom" />
'use dom';

import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const FALLBACK = { latitude: -8.1335, longitude: 113.2248 };

type Leaflet = any;
type LeafletMap = any;
type LeafletMarker = any;

declare global {
  interface Window {
    L?: Leaflet;
  }
}

function ensureLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);

  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = LEAFLET_CSS;
    document.head.appendChild(stylesheet);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    const handleLoad = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet unavailable"));
    };

    const handleError = () => reject(new Error("Failed to load Leaflet"));

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      script.src = LEAFLET_JS;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

function createPinIcon(L: Leaflet) {
  return L.divIcon({
    className: "nitip-marker-wrapper",
    html: '<div class="nitip-marker"><div class="nitip-marker-dot"></div></div>',
    iconSize: [30, 38],
    iconAnchor: [15, 36],
  });
}

export default function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  loadErrorLabel = "Peta tidak dapat dimuat",
}: {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => Promise<void>;
  loadErrorLabel?: string;
  dom?: import("expo/dom").DOMProps;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const callbackRef = useRef(onLocationChange);
  const coordinateRef = useRef({ latitude, longitude });
  const [loadError, setLoadError] = useState(false);

  callbackRef.current = onLocationChange;
  coordinateRef.current = { latitude, longitude };

  useEffect(() => {
    let active = true;

    void ensureLeaflet()
      .then((L) => {
        if (!active || !containerRef.current) return;

        const current = coordinateRef.current;
        const hasPoint = current.latitude != null && current.longitude != null;
        const center = hasPoint
          ? [current.latitude as number, current.longitude as number]
          : [FALLBACK.latitude, FALLBACK.longitude];

        const map = L.map(containerRef.current, {
          attributionControl: true,
          zoomControl: true,
        }).setView(center, hasPoint ? 16 : 13);

        L.tileLayer(OSM_TILE_URL, {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        const pinIcon = createPinIcon(L);

        const placeMarker = (nextLatitude: number, nextLongitude: number) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([nextLatitude, nextLongitude]);
            return;
          }

          const marker = L.marker([nextLatitude, nextLongitude], {
            draggable: true,
            icon: pinIcon,
          }).addTo(map);

          marker.on("dragend", () => {
            const point = marker.getLatLng();
            void callbackRef.current(point.lat, point.lng);
          });

          markerRef.current = marker;
        };

        if (hasPoint) {
          placeMarker(current.latitude as number, current.longitude as number);
        }

        map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
          placeMarker(event.latlng.lat, event.latlng.lng);
          void callbackRef.current(event.latlng.lat, event.latlng.lng);
        });

        mapRef.current = map;
        window.setTimeout(() => map.invalidateSize(), 50);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (latitude == null || longitude == null) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: createPinIcon(L),
      }).addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        void callbackRef.current(point.lat, point.lng);
      });
      markerRef.current = marker;
    }

    map.setView([latitude, longitude], Math.max(map.getZoom(), 16), { animate: true });
  }, [latitude, longitude]);

  return (
    <>
      <style>{`
        html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        * { box-sizing: border-box; }
        .nitip-map { width: 100%; height: 100%; background: #eef0f3; }
        .nitip-error { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; font: 600 12px system-ui, sans-serif; color: #6b7280; background: #f3f4f6; text-align: center; }
        .nitip-marker-wrapper { background: transparent !important; border: 0 !important; }
        .nitip-marker { width: 30px; height: 30px; border-radius: 50% 50% 50% 4px; background: #2448F5; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(17, 19, 24, .28); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; }
        .nitip-marker-dot { width: 8px; height: 8px; border-radius: 999px; background: #fff; transform: rotate(45deg); }
        .leaflet-control-attribution { font: 9px/1.2 system-ui, sans-serif !important; }
      `}</style>
      {loadError ? (
        <div className="nitip-error">{loadErrorLabel}</div>
      ) : (
        <div ref={containerRef} className="nitip-map" />
      )}
    </>
  );
}
