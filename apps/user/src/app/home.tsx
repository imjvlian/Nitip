import { formatRupiah, type NitipUserProfile } from "@nitip/domain";
import type { NitipCatalogOutletSummary } from "@nitip/domain/catalog";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { apiConfigured, getMe, listCatalogOutlets } from "../lib/api";

export default function HomeScreen() {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cart = useCart();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<NitipCatalogOutletSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !apiConfigured) return;

    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    getMe(user)
      .then((nextProfile) => {
        if (active) setProfile(nextProfile);
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileError(error instanceof Error ? error.message : t("home.profileLoadError"));
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t, user]);

  useEffect(() => {
    if (!apiConfigured) return;

    let active = true;
    setCatalogLoading(true);
    setCatalogError(null);
    listCatalogOutlets()
      .then((items) => {
        if (active) setCatalog(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogError(error instanceof Error ? error.message : t("home.catalogLoadError"));
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  if (!user) return <Redirect href="/login" />;

  const firstName =
    profile?.displayName?.split(" ")[0] ??
    user.displayName?.split(" ")[0] ??
    t("home.fallbackName");

  const categories: { icon: NitipIconName; label: string }[] = [
    { icon: "food", label: t("home.food") },
    { icon: "drink", label: t("home.drinks") },
    { icon: "store", label: t("home.stores") },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
            nitip.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.cart")}
            className="h-11 w-11 items-center justify-center rounded-full"
            onPress={() => router.push("/cart")}
            style={{
              backgroundColor: theme.colors.surfaceRaised,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: theme.mode === "dark" ? 0.2 : 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <NitipIcon color={theme.colors.text} name="cart" size={19} />
            {cart.itemCount > 0 ? (
              <View
                className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full px-1"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Text className="text-[9px] font-black text-white">{cart.itemCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View className="mt-8">
          <Text className="text-xs font-extrabold" style={{ color: theme.colors.primary }}>
            {t("home.greeting", { name: firstName })}
          </Text>
          <Text className="mt-1 max-w-[330px] text-[32px] font-black leading-[36px] tracking-tighter" style={{ color: theme.colors.text }}>
            {t("home.title")}
          </Text>
        </View>

        <View
          className="mt-6 min-h-[50px] flex-row items-center rounded-2xl px-4"
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            borderWidth: 1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.mode === "dark" ? 0.16 : 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <NitipIcon color={theme.colors.textMuted} name="search" size={18} />
          <Text className="ml-3 flex-1 text-xs" style={{ color: theme.colors.textMuted }}>
            {t("home.searchPlaceholder")}
          </Text>
        </View>

        <View className="mt-8">
          <Text className="text-base font-black" style={{ color: theme.colors.text }}>
            {t("home.explore")}
          </Text>
          <View className="mt-3 flex-row gap-2">
            {categories.map((category) => (
              <View
                className="flex-1 items-center rounded-[22px] px-2 py-4"
                key={category.label}
                style={{ backgroundColor: theme.colors.surface }}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surfaceRaised }}
                >
                  <NitipIcon color={theme.colors.primary} name={category.icon} size={20} />
                </View>
                <Text className="mt-2 text-[11px] font-extrabold" style={{ color: theme.colors.text }}>
                  {category.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {!apiConfigured ? (
          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.warningSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.warning }}>
              {t("home.apiNotConfigured")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("home.apiDescription")}
            </Text>
          </View>
        ) : null}

        {profileError ? (
          <View className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("home.profileDisconnected")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {profileError}
            </Text>
          </View>
        ) : null}

        <View className="mt-9 flex-row items-end justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-black" style={{ color: theme.colors.text }}>
              {t("home.merchants")}
            </Text>
            <Text className="mt-1 text-[11px] leading-4" style={{ color: theme.colors.textMuted }}>
              {t("home.merchantsSubtitle")}
            </Text>
          </View>
          {profileLoading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
        </View>

        {catalogLoading ? (
          <View className="mt-4 items-center rounded-[24px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("home.loadingCatalog")}
            </Text>
          </View>
        ) : catalogError ? (
          <View className="mt-4 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("home.catalogUnavailable")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {catalogError}
            </Text>
          </View>
        ) : catalog.length === 0 ? (
          <View className="mt-4 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {t("home.noMerchants")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("home.noMerchantsDescription")}
            </Text>
          </View>
        ) : (
          <View className="mt-4 gap-2.5">
            {catalog.map((outlet) => (
              <Pressable
                className="flex-row rounded-[24px] p-3"
                key={outlet.id}
                onPress={() => router.push(`/outlet/${outlet.id}`)}
                style={{ backgroundColor: theme.colors.surface }}
              >
                {outlet.imageUrl ? (
                  <Image
                    className="h-[76px] w-[76px] rounded-[18px]"
                    source={{ uri: outlet.imageUrl }}
                    style={{ backgroundColor: theme.colors.surfaceAccent }}
                  />
                ) : (
                  <View
                    className="h-[76px] w-[76px] items-center justify-center rounded-[18px]"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <Text className="text-2xl font-black" style={{ color: theme.colors.primary }}>
                      {outlet.businessName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1 justify-center pl-3.5">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: outlet.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}
                    />
                    <Text className="text-[9px] font-black uppercase" style={{ color: theme.colors.textMuted }}>
                      {outlet.acceptingOrders ? t("common.open") : t("common.closed")}
                    </Text>
                  </View>
                  <Text className="mt-1 text-sm font-black" numberOfLines={1} style={{ color: theme.colors.text }}>
                    {outlet.businessName}
                  </Text>
                  <Text className="mt-0.5 text-[11px]" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                    {outlet.name} · {t("home.productCount", { count: outlet.productCount })}
                  </Text>
                  <Text className="mt-1.5 text-[11px] font-black" style={{ color: theme.colors.primary }}>
                    {outlet.minPrice == null
                      ? t("home.menuSoon")
                      : t("home.fromPrice", { price: formatRupiah(outlet.minPrice) })}
                  </Text>
                </View>
                <View className="justify-center pl-2">
                  <NitipIcon color={theme.colors.textMuted} name="next" size={17} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNavigation active="home" />
    </View>
  );
}
