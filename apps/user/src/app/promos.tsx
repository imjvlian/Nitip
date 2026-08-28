import type { NitipPromotion } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { apiConfigured, listCatalogPromotions } from "../lib/api";

const COPY = {
  id: {
    title: "Promo",
    subtitle: "Campaign pilihan yang sedang aktif di Nitip.",
    loading: "Memuat promo...",
    emptyTitle: "Belum ada promo aktif",
    emptyBody: "Promo dari Nitip akan muncul di sini saat campaign sedang berlangsung.",
    errorTitle: "Promo belum dapat dimuat",
    viewMerchant: "Lihat merchant",
    until: "Berlaku sampai",
  },
  en: {
    title: "Offers",
    subtitle: "Featured campaigns that are currently active on Nitip.",
    loading: "Loading offers...",
    emptyTitle: "No active offers yet",
    emptyBody: "Nitip campaigns will appear here while they are active.",
    errorTitle: "Offers are unavailable",
    viewMerchant: "View merchant",
    until: "Available until",
  },
} as const;

function formatEndDate(value: string, language: "id" | "en") {
  return new Date(value).toLocaleDateString(language === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PromotionsScreen() {
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [promotions, setPromotions] = useState<NitipPromotion[]>([]);
  const [loading, setLoading] = useState(apiConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiConfigured) return;
    let active = true;
    setLoading(true);
    setError(null);
    listCatalogPromotions()
      .then((items) => {
        if (active) setPromotions(items);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : copy.errorTitle);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [copy.errorTitle]);

  if (!user) return <Redirect href="/login" />;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 14,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
              {copy.title}
            </Text>
            <Text className="mt-1 max-w-[300px] text-[11px] leading-4" style={{ color: theme.colors.textMuted }}>
              {copy.subtitle}
            </Text>
          </View>
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.surfaceAccent }}
          >
            <NitipIcon color={theme.colors.primary} name="promo" size={19} />
          </View>
        </View>

        {!apiConfigured ? (
          <View className="mt-6 rounded-[20px] p-5" style={{ backgroundColor: theme.colors.warningSurface }}>
            <Text className="font-black" style={{ color: theme.colors.warning }}>
              API belum dikonfigurasi
            </Text>
          </View>
        ) : loading ? (
          <View className="mt-8 items-center py-10">
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-[11px]" style={{ color: theme.colors.textMuted }}>
              {copy.loading}
            </Text>
          </View>
        ) : error ? (
          <View className="mt-6 rounded-[20px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="font-black" style={{ color: theme.colors.danger }}>
              {copy.errorTitle}
            </Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {error}
            </Text>
          </View>
        ) : promotions.length === 0 ? (
          <View className="mt-8 items-center rounded-[24px] px-6 py-10" style={{ backgroundColor: theme.colors.surface }}>
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.colors.surfaceAccent }}
            >
              <NitipIcon color={theme.colors.primary} name="promo" size={23} />
            </View>
            <Text className="mt-4 text-center text-sm font-black" style={{ color: theme.colors.text }}>
              {copy.emptyTitle}
            </Text>
            <Text className="mt-2 text-center text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
              {copy.emptyBody}
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-4">
            {promotions.map((promotion) => (
              <View
                className="overflow-hidden rounded-[22px]"
                key={promotion.id}
                style={{ backgroundColor: theme.colors.surface }}
              >
                {promotion.imageUrl ? (
                  <Image
                    className="h-[150px] w-full"
                    resizeMode="cover"
                    source={{ uri: promotion.imageUrl }}
                    style={{ backgroundColor: theme.colors.surfaceAccent }}
                  />
                ) : (
                  <View
                    className="h-[122px] flex-row items-center justify-between px-5"
                    style={{ backgroundColor: theme.colors.surfaceAccent }}
                  >
                    <View className="max-w-[68%]">
                      <Text className="text-[9px] font-black uppercase tracking-[1.2px]" style={{ color: theme.colors.primary }}>
                        NITIP PROMO
                      </Text>
                      <Text className="mt-2 text-[20px] font-black leading-6" numberOfLines={2} style={{ color: theme.colors.text }}>
                        {promotion.title}
                      </Text>
                    </View>
                    <View
                      className="h-16 w-16 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <NitipIcon color="#FFFFFF" name="promo" size={27} />
                    </View>
                  </View>
                )}

                <View className="p-4">
                  {promotion.imageUrl ? (
                    <Text className="text-[17px] font-black leading-5" style={{ color: theme.colors.text }}>
                      {promotion.title}
                    </Text>
                  ) : null}
                  {promotion.description ? (
                    <Text className="mt-2 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
                      {promotion.description}
                    </Text>
                  ) : null}
                  {promotion.endsAt ? (
                    <Text className="mt-2 text-[9px] font-bold" style={{ color: theme.colors.textMuted }}>
                      {copy.until} {formatEndDate(promotion.endsAt, language)}
                    </Text>
                  ) : null}
                  {promotion.outletId ? (
                    <Pressable
                      className="mt-4 self-start rounded-full px-4 py-2.5"
                      onPress={() => router.push(`/outlet/${promotion.outletId}`)}
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <Text className="text-[10px] font-black text-white">
                        {promotion.ctaLabel ?? copy.viewMerchant}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
