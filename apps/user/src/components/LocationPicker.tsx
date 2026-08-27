import { useNitipTranslation } from "@nitip/i18n";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";

import { useNitipTheme } from "../hooks/useNitipTheme";

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

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const mapRef = useRef<MapView | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const point = latitude != null && longitude != null ? { latitude, longitude } : null;

  function choose(latitudeValue: number, longitudeValue: number) {
    onChange(latitudeValue, longitudeValue);
  }

  function handleMapPress(event: MapPressEvent) {
    choose(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error(t("location.permissionRequired"));
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
      setError(nextError instanceof Error ? nextError.message : t("location.deviceUnavailable"));
    } finally {
      setLocating(false);
    }
  }

  return (
    <View className="mt-6">
      <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
        {t("location.pointTitle")}
      </Text>
      <Text className="mb-3 mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
        {t("location.helper")}
      </Text>

      <View
        className="overflow-hidden rounded-3xl border"
        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAccent }}
      >
        <MapView
          ref={mapRef}
          style={{ height: 250, width: "100%" }}
          initialRegion={
            point
              ? { ...point, latitudeDelta: 0.01, longitudeDelta: 0.01 }
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
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <Pressable
          disabled={locating}
          onPress={() => void useCurrentLocation()}
          className="min-h-12 flex-1 items-center justify-center rounded-2xl px-4"
          style={{ backgroundColor: theme.colors.primary, opacity: locating ? 0.65 : 1 }}
        >
          {locating ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text className="text-xs font-black" style={{ color: theme.colors.onPrimary }}>
              {t("location.useCurrent")}
            </Text>
          )}
        </Pressable>
        {point ? (
          <Pressable
            onPress={() => onChange(null, null)}
            className="min-h-12 items-center justify-center rounded-2xl px-4"
            style={{ backgroundColor: theme.colors.dangerSurface }}
          >
            <Text className="text-xs font-extrabold" style={{ color: theme.colors.danger }}>
              {t("location.clearPoint")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="mt-3 text-xs font-extrabold" style={{ color: theme.colors.primary }}>
        {point
          ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
          : t("location.noPoint")}
      </Text>
      {error ? (
        <Text className="mt-2 text-xs leading-5" style={{ color: theme.colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
