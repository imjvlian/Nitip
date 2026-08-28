import { useNitipLanguage } from "@nitip/i18n";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { getMerchantCopy } from "../constants/merchantCopy";
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
  const c = getMerchantCopy(language).location;
  const theme = useNitipTheme();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TomTomPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<TomTomPlace | null>(null);
  const point = latitude != null && longitude != null ? { latitude, longitude } : null;

  const searchCopy = language === "id"
    ? {
        title: "Cari nama tempat",
        placeholder: "Cari outlet, perumahan, jalan, atau lokasi...",
        helper: "Cari POI/alamat dengan TomTom, lalu sesuaikan pin jika diperlukan.",
        noResult: "Lokasi tidak ditemukan. Pilih titik langsung di peta sebagai alternatif.",
        failed: "Pencarian TomTom gagal. Periksa koneksi lalu coba lagi.",
        keyMissing: "TomTom API key belum dikonfigurasi.",
      }
    : {
        title: "Search for a place",
        placeholder: "Search outlets, housing, roads, or places...",
        helper: "Find a POI/address with TomTom, then adjust the pin if needed.",
        noResult: "No matching place found. Choose a point directly on the map instead.",
        failed: "TomTom search failed. Check your connection and try again.",
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
            setSearchError(searchCopy.failed);
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
  }, [language, latitude, longitude, query, searchCopy.failed, selectedPlace]);

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error(c.permission);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setSelectedPlace(null);
      setQuery("");
      setResults([]);
      onChange(position.coords.latitude, position.coords.longitude);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.deviceError);
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
    <View className="mt-5">
      <View className="flex-row items-center gap-2">
        <NitipIcon color={theme.colors.primary} name="location" size={16} />
        <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{c.pointTitle}</Text>
      </View>
      <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.helper}</Text>

      <View
        className="mt-3 rounded-[18px] border p-3"
        style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }}
      >
        <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>{searchCopy.title}</Text>
        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{searchCopy.helper}</Text>
        <View
          className="mt-3 min-h-[46px] flex-row items-center rounded-[14px] border px-3"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <NitipIcon color={theme.colors.textMuted} name="location" size={15} />
          <TextInput
            className="ml-2 flex-1 text-[10px]"
            onChangeText={(value) => {
              setSelectedPlace(null);
              setQuery(value);
            }}
            placeholder={searchCopy.placeholder}
            placeholderTextColor={theme.colors.textMuted}
            style={{ color: theme.colors.text }}
            value={query}
          />
          {searching ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
        </View>

        {!tomTomConfigured ? (
          <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.danger }}>{searchCopy.keyMissing}</Text>
        ) : searchError ? (
          <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.danger }}>{searchError}</Text>
        ) : query.trim().length >= 2 && !searching && results.length === 0 && !selectedPlace ? (
          <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{searchCopy.noResult}</Text>
        ) : null}

        {results.length > 0 ? (
          <View className="mt-2 gap-2">
            {results.map((place) => (
              <Pressable
                key={place.id}
                className="flex-row items-start rounded-[14px] p-3"
                onPress={() => choosePlace(place)}
                style={{ backgroundColor: theme.colors.surface }}
              >
                <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  <NitipIcon color={theme.colors.primary} name="location" size={14} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>{place.name}</Text>
                  <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{place.address}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedPlace ? (
          <View className="mt-2 rounded-[14px] p-3" style={{ backgroundColor: theme.colors.surfaceAccent }}>
            <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>{selectedPlace.name}</Text>
            <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{selectedPlace.address}</Text>
          </View>
        ) : null}
      </View>

      <View
        className="mt-3 overflow-hidden rounded-[20px]"
        style={{ backgroundColor: theme.colors.surfaceRaised, height: 230 }}
      >
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          loadErrorLabel={language === "id" ? "Peta tidak dapat dimuat. Periksa koneksi internet." : "Map could not load. Check your internet connection."}
          missingKeyLabel={searchCopy.keyMissing}
          onLocationChange={async (nextLatitude, nextLongitude) => {
            setSelectedPlace(null);
            onChange(nextLatitude, nextLongitude);
          }}
          dom={{ scrollEnabled: false, style: { height: 230, width: "100%" } }}
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
            onPress={() => {
              setSelectedPlace(null);
              setQuery("");
              setResults([]);
              onChange(null, null);
            }}
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
