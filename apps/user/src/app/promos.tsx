import type { NitipPromotion } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { ROOT_BOTTOM_NAV_HEIGHT } from "../components/BottomNavigation";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { apiConfigured, listCatalogPromotions } from "../lib/api";

const ROOT_TAB_SCROLL_CLEARANCE = ROOT_BOTTOM_NAV_HEIGHT + 28;

const COPY = {
  id: {
    title: "Promo",
    loading: "Memuat promo...",
    emptyTitle: "Belum ada promo aktif",
    emptyBody: "Promo dari Nitip akan muncul di sini saat campaign sedang berlangsung.",
    errorTitle: "Promo belum dapat dimuat",
    viewMerchant: "Lihat merchant",
    until: "Berlaku sampai",
  },
  en: {
    title: "Offers",
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
        if (active) setError(reason instanceof Error ? reason.message : copy.errorTitle);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [copy.errorTitle]);

  if (!user) return <Redirect href="/login" />;

  const isDark = theme.mode === "dark";

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: ROOT_TAB_SCROLL_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={copy.title}
          showBack={false}
          right={
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor: isDark ? theme.colors.surfaceRaised : "#FFFFFF",
                  borderColor: isDark ? theme.colors.border : "#E8E9ED",
                },
              ]}
            >
              <NitipIcon color={theme.colors.primary} name="promo" size={18} />
            </View>
          }
        />

        {!apiConfigured ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warningSurface }]}>
            <Text style={[styles.stateTitle, { color: theme.colors.warning }]}>{copy.errorTitle}</Text>
          </View>
        ) : loading ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>{copy.loading}</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerSurface }]}>
            <Text style={[styles.stateTitle, { color: theme.colors.danger }]}>{copy.errorTitle}</Text>
            <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{error}</Text>
          </View>
        ) : promotions.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name="promo" size={23} />
            </View>
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{copy.emptyTitle}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{copy.emptyBody}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {promotions.map((promotion) => (
              <View
                key={promotion.id}
                style={[
                  styles.promoCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  },
                ]}
              >
                {promotion.imageUrl ? (
                  <Image
                    resizeMode="cover"
                    source={{ uri: promotion.imageUrl }}
                    style={[styles.image, { backgroundColor: theme.colors.surfaceAccent }]}
                  />
                ) : (
                  <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceAccent }]}>
                    <Text numberOfLines={2} style={[styles.placeholderTitle, { color: theme.colors.text }]}>{promotion.title}</Text>
                    <View style={[styles.promoIcon, { backgroundColor: theme.colors.primary }]}>
                      <NitipIcon color="#FFFFFF" name="promo" size={27} />
                    </View>
                  </View>
                )}

                <View style={styles.cardBody}>
                  {promotion.imageUrl ? <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{promotion.title}</Text> : null}
                  {promotion.description ? <Text style={[styles.description, { color: theme.colors.textMuted }]}>{promotion.description}</Text> : null}
                  {promotion.endsAt ? <Text style={[styles.until, { color: theme.colors.textMuted }]}>{copy.until} {formatEndDate(promotion.endsAt, language)}</Text> : null}
                  {promotion.outletId ? (
                    <Pressable onPress={() => router.push(`/outlet/${promotion.outletId}`)} style={[styles.cta, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.ctaText}>{promotion.ctaLabel ?? copy.viewMerchant}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerIcon: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stateCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    padding: 24,
  },
  loadingText: { fontSize: 10, marginTop: 10 },
  stateTitle: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  stateBody: { fontSize: 10, lineHeight: 16, marginTop: 8, textAlign: "center" },
  emptyIcon: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", marginBottom: 14, width: 56 },
  emptyBody: { fontSize: 10, lineHeight: 17, marginTop: 8, textAlign: "center" },
  list: { gap: 14, marginTop: 18 },
  promoCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  image: { height: 150, width: "100%" },
  placeholder: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 122,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  placeholderTitle: { flex: 1, fontSize: 19, fontWeight: "900", lineHeight: 23, paddingRight: 16 },
  promoIcon: { alignItems: "center", borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: "900", lineHeight: 21 },
  description: { fontSize: 10, lineHeight: 17, marginTop: 7 },
  until: { fontSize: 9, fontWeight: "700", marginTop: 7 },
  cta: { alignItems: "center", alignSelf: "flex-start", borderRadius: 999, justifyContent: "center", marginTop: 14, minHeight: 38, paddingHorizontal: 17 },
  ctaText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
});
