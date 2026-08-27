import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}

const FALLBACK_REGION = {
  latitude: -8.1335,
  longitude: 113.2248,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const mapRef = useRef<MapView | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const point =
    latitude != null && longitude != null ? { latitude, longitude } : null;

  function choose(latitudeValue: number, longitudeValue: number) {
    onChange(latitudeValue, longitudeValue);
  }

  function handleMapPress(event: MapPressEvent) {
    choose(
      event.nativeEvent.coordinate.latitude,
      event.nativeEvent.coordinate.longitude,
    );
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Izin lokasi diperlukan untuk mengambil posisi perangkat.");
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const nextLatitude = position.coords.latitude;
      const nextLongitude = position.coords.longitude;
      choose(nextLatitude, nextLongitude);
      mapRef.current?.animateToRegion(
        {
          latitude: nextLatitude,
          longitude: nextLongitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Lokasi perangkat tidak dapat dibaca.",
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Titik lokasi</Text>
      <Text style={styles.helper}>
        Ketuk peta atau gunakan posisi perangkat. Titik ini dipakai untuk menghitung jarak pengantaran.
      </Text>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          point
            ? {
                ...point,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : FALLBACK_REGION
        }
        onPress={handleMapPress}
      >
        {point ? (
          <Marker
            coordinate={point}
            draggable
            onDragEnd={(event) =>
              choose(
                event.nativeEvent.coordinate.latitude,
                event.nativeEvent.coordinate.longitude,
              )
            }
          />
        ) : null}
      </MapView>

      <View style={styles.actions}>
        <Pressable
          disabled={locating}
          onPress={() => void useCurrentLocation()}
          style={styles.primaryButton}
        >
          {locating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Gunakan lokasi saya</Text>
          )}
        </Pressable>
        {point ? (
          <Pressable onPress={() => onChange(null, null)} style={styles.clearButton}>
            <Text style={styles.clearText}>Hapus titik</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.coordinate}>
        {point
          ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
          : "Belum ada titik lokasi"}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 18 },
  title: { color: "#14216D", fontWeight: "900", fontSize: 14 },
  helper: { color: "#52607F", fontSize: 10, lineHeight: 16, marginTop: 4, marginBottom: 10 },
  map: { height: 230, borderRadius: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 11 },
  primaryButton: { minHeight: 42, minWidth: 158, alignItems: "center", justifyContent: "center", backgroundColor: "#08349C", borderRadius: 13, paddingHorizontal: 14 },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 11 },
  clearButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 10 },
  clearText: { color: "#B42318", fontWeight: "800", fontSize: 11 },
  coordinate: { color: "#08349C", fontSize: 10, fontWeight: "800", marginTop: 9 },
  error: { color: "#B42318", fontSize: 10, lineHeight: 15, marginTop: 6 },
});
