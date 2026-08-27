import { useNitipLanguage } from "@nitip/i18n";
import * as Location from "expo-location";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { getMerchantCopy } from "../constants/merchantCopy";
import { useNitipTheme } from "../hooks/useNitipTheme";
import LocationMap from "./LocationMap";
import { NitipIcon } from "./NitipIcon";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language).location;
  const theme = useNitipTheme();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const point = latitude != null && longitude != null ? { latitude, longitude } : null;

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error(c.permission);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange(position.coords.latitude, position.coords.longitude);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.deviceError);
    } finally {
      setLocating(false);
    }
  }

  return (
    <View className="mt-5">
      <View className="flex-row items-center gap-2">
        <NitipIcon color={theme.colors.primary} name="location" size={16} />
        <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{c.pointTitle}</Text>
      </View>
      <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.helper}</Text>

      <View
        className="mt-3 overflow-hidden rounded-[20px]"
        style={{ backgroundColor: theme.colors.surfaceRaised, height: 230 }}
      >
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          loadErrorLabel={language === "id" ? "Peta tidak dapat dimuat. Periksa koneksi internet." : "Map could not load. Check your internet connection."}
          onLocationChange={async (nextLatitude, nextLongitude) => {
            onChange(nextLatitude, nextLongitude);
          }}
          dom={{
            scrollEnabled: false,
            style: { height: 230, width: "100%" },
          }}
        />
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          className="min-h-[44px] flex-1 flex-row items-center justify-center rounded-[15px]"
          disabled={locating}
          onPress={() => void useCurrentLocation()}
          style={{ backgroundColor: theme.colors.primary, opacity: locating ? 0.55 : 1 }}
        >
          {locating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <NitipIcon color="#FFFFFF" name="location" size={15} />
              <Text className="ml-2 text-[10px] font-black text-white">{c.useCurrent}</Text>
            </>
          )}
        </Pressable>
        {point ? (
          <Pressable
            className="min-h-[44px] items-center justify-center rounded-[15px] px-4"
            onPress={() => onChange(null, null)}
            style={{ backgroundColor: theme.colors.dangerSurface }}
          >
            <Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>{c.clear}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="mt-2 text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>
        {point ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : c.empty}
      </Text>
      {error ? <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text> : null}
    </View>
  );
}
