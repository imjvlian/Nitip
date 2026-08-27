import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const FALLBACK = { latitude: -8.1335, longitude: 113.2248 };

function buildMapHtml(latitude: number | null, longitude: number | null) {
  const hasPoint = latitude != null && longitude != null;
  const initialLatitude = latitude ?? FALLBACK.latitude;
  const initialLongitude = longitude ?? FALLBACK.longitude;
  const initialZoom = hasPoint ? 16 : 13;

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
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 4px;
      background: #2448F5;
      border: 3px solid #fff;
      box-shadow: 0 3px 10px rgba(17, 19, 24, .3);
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nitip-marker-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #fff;
    }
    .leaflet-control-attribution { font-size: 9px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      if (!window.L) {
        post({ type: 'error' });
        return;
      }

      var map = L.map('map', {
        attributionControl: true,
        zoomControl: true
      }).setView([${initialLatitude}, ${initialLongitude}], ${initialZoom});

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      var marker = null;
      var pinIcon = L.divIcon({
        className: 'nitip-marker-wrapper',
        html: '<div class="nitip-marker"><div class="nitip-marker-dot"></div></div>',
        iconSize: [30, 38],
        iconAnchor: [15, 36]
      });

      function emit(latitude, longitude) {
        post({ type: 'location', latitude: latitude, longitude: longitude });
      }

      function placeMarker(latitude, longitude) {
        if (!marker) {
          marker = L.marker([latitude, longitude], {
            draggable: true,
            icon: pinIcon
          }).addTo(map);

          marker.on('dragend', function () {
            var point = marker.getLatLng();
            emit(point.lat, point.lng);
          });
        } else {
          marker.setLatLng([latitude, longitude]);
        }
      }

      ${hasPoint ? `placeMarker(${initialLatitude}, ${initialLongitude});` : ""}

      map.on('click', function (event) {
        placeMarker(event.latlng.lat, event.latlng.lng);
        emit(event.latlng.lat, event.latlng.lng);
      });

      window.setTimeout(function () {
        map.invalidateSize();
      }, 100);
    })();
  </script>
</body>
</html>`;
}

export default function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  loadErrorLabel = "Peta tidak dapat dimuat",
}: {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void | Promise<void>;
  loadErrorLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => buildMapHtml(latitude, longitude), [latitude, longitude]);
  const mapKey = `${latitude ?? "none"}:${longitude ?? "none"}`;

  if (failed) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorText}>{loadErrorLabel}</Text>
      </View>
    );
  }

  return (
    <WebView
      key={mapKey}
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
          <ActivityIndicator color="#2448F5" />
        </View>
      )}
      onError={() => setFailed(true)}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data) as {
            type?: string;
            latitude?: number;
            longitude?: number;
          };

          if (message.type === "error") {
            setFailed(true);
            return;
          }

          if (
            message.type === "location" &&
            Number.isFinite(message.latitude) &&
            Number.isFinite(message.longitude)
          ) {
            void onLocationChange(message.latitude as number, message.longitude as number);
          }
        } catch {
          // Ignore messages that are not emitted by the Nitip map bridge.
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
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
