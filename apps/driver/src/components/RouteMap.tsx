import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const tomTomApiKey = (process.env.EXPO_PUBLIC_TOMTOM_API_KEY ?? "").trim();
const tomTomConfigured = tomTomApiKey.length > 0;
const FALLBACK = { latitude: -8.1335, longitude: 113.2248 };

export type RoutePoint = {
  latitude: number | null;
  longitude: number | null;
  label: string;
};

export type RouteSummary = {
  distanceMeters: number | null;
  durationSeconds: number | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildMapHtml(pickup: RoutePoint, destination: RoutePoint) {
  const hasPickup = pickup.latitude != null && pickup.longitude != null;
  const hasDestination = destination.latitude != null && destination.longitude != null;
  const initialLatitude = hasPickup
    ? (pickup.latitude as number)
    : hasDestination
      ? (destination.latitude as number)
      : FALLBACK.latitude;
  const initialLongitude = hasPickup
    ? (pickup.longitude as number)
    : hasDestination
      ? (destination.longitude as number)
      : FALLBACK.longitude;
  const tileUrl = `https://api.tomtom.com/maps/orbis/display/raster/tile/{z}/{x}/{y}?apiVersion=2&style=street-light&tileSize=256&key=${encodeURIComponent(tomTomApiKey)}`;
  const routingUrl = "https://api.tomtom.com/maps/orbis/routing/routes/calculate";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
    * { box-sizing: border-box; }
    body { background: #eef0f3; }
    .leaflet-container { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background: #eef0f3; }
    .nitip-marker-wrapper { background: transparent !important; border: 0 !important; }
    .nitip-marker { width: 32px; height: 32px; border-radius: 50% 50% 50% 4px; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(17,19,24,.3); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; color: #fff; font: 900 12px/1 system-ui,sans-serif; }
    .nitip-marker span { transform: rotate(45deg); }
    .pickup { background: #2448F5; }
    .destination { background: #16A34A; }
    .driver { background: #111318; }
    .route-summary { background: rgba(255,255,255,.96); color: #111318; border: 1px solid rgba(17,19,24,.08); border-radius: 999px; padding: 7px 10px; box-shadow: 0 3px 10px rgba(17,19,24,.12); font: 800 10px/1.2 system-ui,sans-serif; }
    .leaflet-control-attribution { font-size: 9px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      function post(message) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
      if (!window.L) { post({ type: 'error' }); return; }

      var map = L.map('map', { attributionControl: true, zoomControl: true }).setView([${initialLatitude}, ${initialLongitude}], 14);
      L.tileLayer(${JSON.stringify(tileUrl)}, { attribution: '&copy; TomTom, &copy; OpenStreetMap', maxZoom: 22 }).addTo(map);

      var pickupMarker = null;
      var destinationMarker = null;
      var driverMarker = null;
      var routeLine = null;
      var routeSummaryControl = null;
      var routeRequestSequence = 0;

      function markerIcon(kind, text) {
        return L.divIcon({
          className: 'nitip-marker-wrapper',
          html: '<div class="nitip-marker ' + kind + '"><span>' + text + '</span></div>',
          iconSize: [32, 40],
          iconAnchor: [16, 38]
        });
      }

      function addStaticMarker(latitude, longitude, kind, text, label) {
        return L.marker([latitude, longitude], { icon: markerIcon(kind, text) })
          .addTo(map)
          .bindTooltip(label, { direction: 'top', offset: [0, -30] });
      }

      ${hasPickup ? `pickupMarker = addStaticMarker(${pickup.latitude}, ${pickup.longitude}, 'pickup', 'A', ${JSON.stringify(escapeHtml(pickup.label))});` : ""}
      ${hasDestination ? `destinationMarker = addStaticMarker(${destination.latitude}, ${destination.longitude}, 'destination', 'B', ${JSON.stringify(escapeHtml(destination.label))});` : ""}

      function fitVisible() {
        var points = [];
        if (pickupMarker) points.push(pickupMarker.getLatLng());
        if (destinationMarker) points.push(destinationMarker.getLatLng());
        if (driverMarker) points.push(driverMarker.getLatLng());
        if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 16 });
        else if (points.length === 1) map.setView(points[0], 16);
      }

      function clearRouteSummary() {
        if (routeSummaryControl) {
          map.removeControl(routeSummaryControl);
          routeSummaryControl = null;
        }
      }

      function addRouteSummary(summary) {
        clearRouteSummary();
        if (!summary) return;
        var distanceKm = typeof summary.lengthInMeters === 'number' ? (summary.lengthInMeters / 1000).toFixed(summary.lengthInMeters < 10000 ? 1 : 0) : null;
        var durationMinutes = typeof summary.travelDurationInSeconds === 'number' ? Math.max(1, Math.round(summary.travelDurationInSeconds / 60)) : null;
        if (!distanceKm && !durationMinutes) return;
        var SummaryControl = L.Control.extend({
          options: { position: 'topright' },
          onAdd: function () {
            var container = L.DomUtil.create('div', 'route-summary');
            container.textContent = [distanceKm ? distanceKm + ' km' : null, durationMinutes ? durationMinutes + ' min' : null].filter(Boolean).join(' • ');
            return container;
          }
        });
        routeSummaryControl = new SummaryControl();
        map.addControl(routeSummaryControl);
      }

      async function renderRoute(originLatitude, originLongitude) {
        if (!${hasDestination ? "true" : "false"}) return;
        if (!Number.isFinite(originLatitude) || !Number.isFinite(originLongitude)) return;
        var requestSequence = ++routeRequestSequence;
        try {
          var response = await fetch(${JSON.stringify(routingUrl)}, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'TomTom-Api-Version': '3',
              'TomTom-Api-Key': ${JSON.stringify(tomTomApiKey)},
              'Attributes': 'routes'
            },
            body: JSON.stringify({
              routePlanningLocations: {
                origin: { type: 'Point', coordinates: [originLongitude, originLatitude] },
                destination: { type: 'Point', coordinates: [${destination.longitude ?? 0}, ${destination.latitude ?? 0}] }
              },
              routeType: 'fast',
              traffic: 'live'
            })
          });
          if (!response.ok) throw new Error('routing_' + response.status);
          var body = await response.json();
          if (requestSequence !== routeRequestSequence) return;
          var route = body && body.routes && body.routes[0];
          var coordinates = route && route.path && route.path.coordinates;
          if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error('route_geometry_missing');
          var latLngs = coordinates
            .filter(function (point) { return Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]); })
            .map(function (point) { return [point[1], point[0]]; });
          if (latLngs.length < 2) throw new Error('route_geometry_invalid');
          if (routeLine) map.removeLayer(routeLine);
          routeLine = L.polyline(latLngs, { color: '#2448F5', weight: 5, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
          map.fitBounds(latLngs, { padding: [38, 38], maxZoom: 16 });
          addRouteSummary(route.summary);
          post({ type: 'route', distanceMeters: route.summary && route.summary.lengthInMeters, durationSeconds: route.summary && route.summary.travelDurationInSeconds });
        } catch (error) {
          if (requestSequence !== routeRequestSequence) return;
          fitVisible();
          post({ type: 'route_fallback' });
        }
      }

      window.nitipUpdateLiveOrigin = function (latitude, longitude, label) {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        if (!driverMarker) {
          driverMarker = L.marker([latitude, longitude], { icon: markerIcon('driver', 'D') }).addTo(map);
        } else {
          driverMarker.setLatLng([latitude, longitude]);
        }
        driverMarker.bindTooltip(label || 'Driver', { direction: 'top', offset: [0, -30] });
        void renderRoute(latitude, longitude);
      };

      fitVisible();
      ${hasPickup && hasDestination ? `void renderRoute(${pickup.latitude}, ${pickup.longitude});` : ""}
      window.setTimeout(function () { map.invalidateSize(); }, 100);
      post({ type: 'ready' });
    })();
  </script>
</body>
</html>`;
}

export default function RouteMap({
  pickup,
  destination,
  liveOrigin,
  onRouteSummary,
}: {
  pickup: RoutePoint;
  destination: RoutePoint;
  liveOrigin?: RoutePoint | null;
  onRouteSummary?: (summary: RouteSummary | null) => void;
}) {
  const webViewRef = useRef<WebView>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const html = useMemo(
    () => buildMapHtml(pickup, destination),
    [pickup.latitude, pickup.longitude, pickup.label, destination.latitude, destination.longitude, destination.label],
  );

  useEffect(() => {
    if (!ready || !liveOrigin || liveOrigin.latitude == null || liveOrigin.longitude == null) return;
    const script = `window.nitipUpdateLiveOrigin(${JSON.stringify(liveOrigin.latitude)}, ${JSON.stringify(liveOrigin.longitude)}, ${JSON.stringify(liveOrigin.label)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, [liveOrigin?.label, liveOrigin?.latitude, liveOrigin?.longitude, ready]);

  if (!tomTomConfigured) {
    return <View style={styles.stateContainer}><Text style={styles.errorText}>TomTom API key belum dikonfigurasi.</Text></View>;
  }
  if (failed) {
    return <View style={styles.stateContainer}><Text style={styles.errorText}>Peta perjalanan tidak dapat dimuat.</Text></View>;
  }

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://nitip.local/" }}
      style={styles.webView}
      containerStyle={styles.webViewContainer}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      startInLoadingState
      renderLoading={() => <View style={styles.stateContainer}><ActivityIndicator color="#08349C" /></View>}
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data) as { type?: string; distanceMeters?: number; durationSeconds?: number };
          if (message.type === "error") setFailed(true);
          if (message.type === "ready") setReady(true);
          if (message.type === "route") {
            onRouteSummary?.({
              distanceMeters: typeof message.distanceMeters === "number" ? message.distanceMeters : null,
              durationSeconds: typeof message.durationSeconds === "number" ? message.durationSeconds : null,
            });
          }
          if (message.type === "route_fallback") onRouteSummary?.(null);
        } catch {
          // Ignore messages not emitted by the Nitip map bridge.
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  webViewContainer: { flex: 1, backgroundColor: "#EEF0F3" },
  webView: { flex: 1, backgroundColor: "#EEF0F3" },
  stateContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#EEF0F3" },
  errorText: { color: "#52607F", fontSize: 11, fontWeight: "600", textAlign: "center" },
});
