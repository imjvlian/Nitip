import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  searchTomTomPlaces,
  tomTomConfigured,
  type TomTomPlace,
} from "../lib/tomtom";
import LocationMap from "./LocationMap";
import { NitipIcon } from "./NitipIcon";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
  onPlaceSelected?: (place: TomTomPlace) => void;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onPlaceSelected,
}: LocationPickerProps) {
  const { language } = useNitipLanguage();
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TomTomPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<TomTomPlace | null>(null);
  const point = latitude != null && longitude != null ? { latitude, longitude } : null;

  const copy = language === "id"
    ? {
        searchTitle: "Cari nama tempat",
        searchPlaceholder: "Cari perumahan, toko, jalan, atau lokasi...",
        searchHelper: "Pencarian lokasi menggunakan TomTom Places di Indonesia.",
        searching: "Mencari lokasi...",
        noResult: "Lokasi tidak ditemukan. Kamu tetap bisa memilih titik langsung di peta.",
        searchFailed: "Pencarian TomTom gagal. Periksa koneksi lalu coba lagi.",
        keyMissing: "TomTom API key belum dikonfigurasi.",
      }
    : {
        searchTitle: "Search for a place",
        searchPlaceholder: "Search housing, shops, roads, or places...",
        searchHelper: "Place search is powered by TomTom Places in Indonesia.",
        searching: "Searching places...",
        noResult: "No matching place found. You can still choose a point directly on the map.",
        searchFailed: "TomTom search failed. Check your connection and try again.",
        keyMissing: "TomTom API key is not configured.",
      };

  useEffect(() => {
    const needle = query.trim();
    if (
      needle.length < 2 ||
      !tomTomConfigured ||
      (selectedPlace && needle === selectedPlace.name)
    ) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      searchTomTomPlaces(needle, {
        language: language === "id" ? "id-ID" : "en-US",
        latitude,
        longitude,
        limit: 6,
      })
        .then((items) => {
          if (active) setResults(items);
        })
        .catch(() => {
          if (active) {
            setResults([]);
            setSearchError(copy.searchFailed);
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [copy.searchFailed, language, latitude, longitude, query, selectedPlace]);

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error(t("location.permissionRequired"));
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setSelectedPlace(null);
      setQuery("");
      setResults([]);
      onChange(position.coords.latitude, position.coords.longitude);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("location.deviceUnavailable"));
    } finally {
      setLocating(false);
    }
  }

  function choosePlace(place: TomTomPlace) {
    setSelectedPlace(place);
    setQuery(place.name);
    setResults([]);
    setSearchError(null);
    onChange(place.latitude, place.longitude);
    onPlaceSelected?.(place);
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
        className="mb-3 rounded-[18px] border p-3"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>
          {copy.searchTitle}
        </Text>
        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
          {copy.searchHelper}
        </Text>
        <View
          className="mt-3 min-h-12 flex-row items-center rounded-[15px] border px-3"
          style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }}
        >
          <NitipIcon color={theme.colors.textMuted} name="search" size={16} />
          <TextInput
            className="ml-2 flex-1 text-xs"
            onChangeText={(value) => {
              setSelectedPlace(null);
              setQuery(value);
            }}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={{ color: theme.colors.text }}
            value={query}
          />
          {searching ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
        </View>

        {!tomTomConfigured ? (
          <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.danger }}>
            {copy.keyMissing}
          </Text>
        ) : searchError ? (
          <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.danger }}>
            {searchError}
          </Text>
        ) : query.trim().length >= 2 && !searching && results.length === 0 && !selectedPlace ? (
          <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
            {copy.noResult}
          </Text>
        ) : null}

        {results.length > 0 ? (
          <View className="mt-2 gap-2">
            {results.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => choosePlace(place)}
                className="flex-row items-start rounded-[14px] p-3"
                style={{ backgroundColor: theme.colors.surfaceRaised }}
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                >
                  <NitipIcon color={theme.colors.primary} name="location" size={14} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>
                    {place.name}
                  </Text>
                  <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                    {place.address}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedPlace ? (
          <View className="mt-2 rounded-[14px] p-3" style={{ backgroundColor: theme.colors.surfaceAccent }}>
            <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>
              {selectedPlace.name}
            </Text>
            <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
              {selectedPlace.address}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        className="overflow-hidden rounded-3xl border"
        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAccent, height: 250 }}
      >
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          loadErrorLabel={t("location.deviceUnavailable")}
          missingKeyLabel={copy.keyMissing}
          onLocationChange={(nextLatitude, nextLongitude) => {
            setSelectedPlace(null);
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
            onPress={() => {
              setSelectedPlace(null);
              setQuery("");
              setResults([]);
              onChange(null, null);
            }}
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
