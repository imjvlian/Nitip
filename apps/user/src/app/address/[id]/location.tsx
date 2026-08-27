import type { NitipAddress } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LocationPicker from "../../../components/LocationPicker";
import { NitipIcon } from "../../../components/NitipIcon";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { listAddresses, updateAddress } from "../../../lib/api";

export default function AddressLocationScreen() {
  const { t } = useNitipTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState<NitipAddress | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);

    listAddresses(user)
      .then((items) => {
        if (!active) return;
        const found = items.find((item) => item.id === id) ?? null;
        setAddress(found);
        setLatitude(found?.latitude ?? null);
        setLongitude(found?.longitude ?? null);
      })
      .catch((nextError: unknown) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t("location.loadError"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, t, user]);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    if (!address) return;
    setSaving(true);
    setError(null);
    try {
      await updateAddress(user, address.id, { latitude, longitude });
      router.replace("/profile");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("location.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: insets.top + 14,
        paddingBottom: Math.max(insets.bottom + 24, 40),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between">
        <Pressable className="min-h-10 flex-row items-center justify-center pr-4" onPress={() => router.back()}>
          <NitipIcon color={theme.colors.primary} name="back" size={18} />
          <Text className="ml-1 text-xs font-black" style={{ color: theme.colors.primary }}>
            {t("common.back")}
          </Text>
        </Pressable>
        <Text className="text-2xl font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
          nitip.
        </Text>
      </View>

      <View className="mt-8">
        <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: theme.colors.primary }}>
          {t("location.eyebrow")}
        </Text>
        <Text className="mt-2 text-3xl font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {t("location.title")}
        </Text>
        <Text className="mt-2 text-sm leading-6" style={{ color: theme.colors.textMuted }}>
          {t("location.subtitle")}
        </Text>
      </View>

      {loading ? (
        <View
          className="mt-6 items-center rounded-3xl border p-6"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
            {t("location.loading")}
          </Text>
        </View>
      ) : !address ? (
        <View className="mt-6 rounded-3xl p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
            {t("location.notFound")}
          </Text>
          <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
            {error ?? t("location.notFoundDescription")}
          </Text>
        </View>
      ) : (
        <View
          className="mt-6 rounded-3xl border p-5"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <View className="flex-row items-start gap-2">
            <NitipIcon color={theme.colors.primary} name="location" size={18} />
            <View className="flex-1">
              <Text className="text-sm font-black leading-5" style={{ color: theme.colors.text }}>
                {address.addressLine}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
                {address.recipientName} · {address.phoneNumber}
              </Text>
            </View>
          </View>

          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(nextLatitude, nextLongitude) => {
              setLatitude(nextLatitude);
              setLongitude(nextLongitude);
            }}
          />

          {error ? (
            <View className="mt-4 rounded-2xl p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-xs leading-5" style={{ color: theme.colors.danger }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            className="mt-5 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl"
            disabled={saving}
            onPress={() => void save()}
            style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }}
          >
            {!saving ? <NitipIcon color="#FFFFFF" name="location" size={18} /> : null}
            <Text className="text-sm font-black text-white">
              {saving ? t("common.saving") : t("location.savePoint")}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
