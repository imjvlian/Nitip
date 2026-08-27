import type { NitipOutlet } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import LocationPicker from "../../../components/LocationPicker";
import { getMerchantCopy } from "../../../constants/merchantCopy";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { listOutlets, updateOutlet } from "../../../lib/api";

export default function OutletLocationScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [outlet, setOutlet] = useState<NitipOutlet | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true); setError(null);
    listOutlets(user)
      .then((items) => {
        if (!active) return;
        const found = items.find((item) => item.id === id) ?? null;
        setOutlet(found); setLatitude(found?.latitude ?? null); setLongitude(found?.longitude ?? null);
      })
      .catch((nextError: unknown) => { if (active) setError(nextError instanceof Error ? nextError.message : c.location.loadError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [c.location.loadError, id, user]);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    if (!outlet) return;
    setSaving(true); setError(null);
    try { await updateOutlet(user, outlet.id, { latitude, longitude }); router.replace("/home"); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : c.location.saveError); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }} showsVerticalScrollIndicator={false} style={{ backgroundColor: theme.colors.background }}>
      <AppHeader title={c.location.eyebrow} onBack={() => router.back()} />
      <View className="mt-7"><Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.location.eyebrow}</Text><Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.location.title}</Text><Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.location.subtitle}</Text></View>

      {loading ? <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}><ActivityIndicator color={theme.colors.primary} /><Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.location.loading}</Text></View> : !outlet ? <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>{c.location.notFound}</Text><Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{error ?? c.location.notFoundDescription}</Text></View> : <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}><Text className="text-[13px] font-black" style={{ color: theme.colors.text }}>{outlet.name}</Text><Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{outlet.addressLine}</Text><LocationPicker latitude={latitude} longitude={longitude} onChange={(nextLatitude, nextLongitude) => { setLatitude(nextLatitude); setLongitude(nextLongitude); }} />{error ? <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[9px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : null}<Pressable className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]" disabled={saving} onPress={() => void save()} style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}><Text className="text-[11px] font-black text-white">{saving ? c.common.saving : c.location.save}</Text></Pressable></View>}
    </ScrollView>
  );
}
