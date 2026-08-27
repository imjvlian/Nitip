import { useNitipTranslation } from "@nitip/i18n";
import * as Location from "expo-location";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import LocationMap from "./LocationMap";
import { NitipIcon } from "./NitipIcon";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const point = latitude != null && longitude != null ? { latitude, longitude } : null;

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error(t("location.permissionRequired"));
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange(position.coords.latitude, position.coords.longitude);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("location.deviceUnavailable"));
    } finally {
      setLocating(false);
    }
  }

  return (
    <View className="mt-6">
      <View className="flex-row items-center gap-2">
        <NitipIcon color={theme.colors.text} name="location" size={18} />
        <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
          {t("location.pointTitle")}
        </Text>
      </View>
      <Text className="mb-3 mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
        {t("location.helper")}
      </Text>

      <View
        className="overflow-hidden rounded-3xl border"
        style={{
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceAccent,
          height: 250,
        }}
      >
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          loadErrorLabel={t("location.deviceUnavailable")}
          onLocationChange={(nextLatitude, nextLongitude) => {
            onChange(nextLatitude, nextLongitude);
          }}
        />
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <Pressable
          disabled={locating}
          onPress={() => void useCurrentLocation()}
          className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-4"
          style={{ backgroundColor: theme.colors.primary, opacity: locating ? 0.65 : 1 }}
        >
          {locating ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <>
              <NitipIcon color={theme.colors.onPrimary} name="location" size={18} />
              <Text className="text-xs font-black" style={{ color: theme.colors.onPrimary }}>
                {t("location.useCurrent")}
              </Text>
            </>
          )}
        </Pressable>
        {point ? (
          <Pressable
            onPress={() => onChange(null, null)}
            className="min-h-12 flex-row items-center justify-center gap-1.5 rounded-2xl px-4"
            style={{ backgroundColor: theme.colors.dangerSurface }}
          >
            <NitipIcon color={theme.colors.danger} name="trash" size={16} />
            <Text className="text-xs font-extrabold" style={{ color: theme.colors.danger }}>
              {t("location.clearPoint")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3 flex-row items-center gap-1.5">
        <NitipIcon color={theme.colors.primary} name="location" size={14} />
        <Text className="text-xs font-extrabold" style={{ color: theme.colors.primary }}>
          {point
            ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
            : t("location.noPoint")}
        </Text>
      </View>
      {error ? (
        <Text className="mt-2 text-xs leading-5" style={{ color: theme.colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
