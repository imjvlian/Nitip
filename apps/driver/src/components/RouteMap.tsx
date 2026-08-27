import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const FALLBACK = { latitude: -8.1335, longitude: 113.2248 };

type RoutePoint = {
  latitude: number | null;
  longitude: number | null;
  label: string;
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
    .nitip-marker {
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 4px;
      border: 3px solid #fff;
      box-shadow: 0 3px 10px rgba(17, 19, 24, .3);
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font: 900 12px/1 system-ui, sans-serif;
    }
    .nitip-marker span { transform: rotate(45deg); }
    .pickup { background: #2448F5; }
    .destination { background: #16A34A; }
    .leaflet-control-attribution { font-size: 9px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      if (!window.L) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
        }
        return;
      }

      var map = L.map('map', {
        attributionControl: true,
        zoomControl: true
      }).setView([${initialLatitude}, ${initialLongitude}], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      var bounds = [];

      function addMarker(latitude, longitude, kind, text, label) {
        var icon = L.divIcon({
          className: 'nitip-marker-wrapper',
          html: '<div class="nitip-marker ' + kind + '"><span>' + text + '</span></div>',
          iconSize: [32, 40],
          iconAnchor: [16, 38]
        });

        L.marker([latitude, longitude], { icon: icon })
          .addTo(map)
          .bindTooltip(label, { direction: 'top', offset: [0, -30] });
        bounds.push([latitude, longitude]);
      }

      ${hasPickup ? `addMarker(${pickup.latitude}, ${pickup.longitude}, 'pickup', 'A', ${JSON.stringify(escapeHtml(pickup.label))});` : ""}
      ${hasDestination ? `addMarker(${destination.latitude}, ${destination.longitude}, 'destination', 'B', ${JSON.stringify(escapeHtml(destination.label))});` : ""}

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 16);
      }

      window.setTimeout(function () {
        map.invalidateSize();
      }, 100);
    })();
  </script>
</body>
</html>`;
}

export default function RouteMap({
  pickup,
  destination,
}: {
  pickup: RoutePoint;
  destination: RoutePoint;
}) {
  const [failed, setFailed] = useState(false);
  const html = useMemo(
    () => buildMapHtml(pickup, destination),
    [
      pickup.latitude,
      pickup.longitude,
      pickup.label,
      destination.latitude,
      destination.longitude,
      destination.label,
    ],
  );

  if (failed) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorText}>Peta perjalanan tidak dapat dimuat.</Text>
      </View>
    );
  }

  return (
    <WebView
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
      renderLoading={() => (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#08349C" />
        </View>
      )}
      onError={() => setFailed(true)}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data) as { type?: string };
          if (message.type === "error") setFailed(true);
        } catch {
          // Ignore messages not emitted by the Nitip map bridge.
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  webView: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#EEF0F3",
  },
  errorText: {
    color: "#52607F",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
