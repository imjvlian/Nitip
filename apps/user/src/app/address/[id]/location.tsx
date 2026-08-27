import type { NitipAddress } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
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
        if (active) setError(nextError instanceof Error ? nextError.message : t("location.loadError"));
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
      router.replace("/settings/addresses");
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
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 28, 40),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={t("location.pointTitle")} />

      <View className="mt-7">
        <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {t("location.title")}
        </Text>
        <Text className="mt-1.5 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
          {t("location.subtitle")}
        </Text>
      </View>

      {loading ? (
        <View className="mt-5 items-center rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
            {t("location.loading")}
          </Text>
        </View>
      ) : !address ? (
        <View className="mt-5 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
            {t("location.notFound")}
          </Text>
          <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
            {error ?? t("location.notFoundDescription")}
          </Text>
        </View>
      ) : (
        <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
          <View className="flex-row items-start gap-3 rounded-[18px] p-3" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
              <NitipIcon color={theme.colors.primary} name="location" size={15} />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-black leading-5" style={{ color: theme.colors.text }}>
                {address.addressLine}
              </Text>
              <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>
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
            <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
            </View>
          ) : null}

          <Pressable className="mt-5 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px]" disabled={saving} onPress={() => void save()} style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }}>
            {!saving ? <NitipIcon color="#FFFFFF" name="location" size={16} /> : <ActivityIndicator color="#FFFFFF" />}
            {!saving ? (
              <Text className="text-xs font-black text-white">{t("location.savePoint")}</Text>
            ) : null}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
