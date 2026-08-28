import { formatRupiah, type NitipAddress, type NitipUserProfile } from "@nitip/domain";
import type {
  NitipCatalogOutletSummary,
  NitipPromotion,
} from "@nitip/domain/catalog";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  apiConfigured,
  getMe,
  listAddresses,
  listCatalogOutlets,
  listCatalogPromotions,
} from "../lib/api";

const HOME_COPY = {
  id: {
    deliveryLocation: "Lokasi pengantaran",
    offerSection: "Promo hari ini",
    seeAll: "Lihat semua",
    offerEyebrow: "PILIHAN HARI INI",
    offerTitle: "Apa pun yang kamu butuhkan, tinggal nitip.",
    offerBody: "Cari makanan, minuman, dan toko yang siap menerima pesanan.",
    viewMerchant: "Pesan sekarang",
  },
  en: {
    deliveryLocation: "Delivery location",
    offerSection: "Today's Offer",
    seeAll: "See all",
    offerEyebrow: "TODAY'S PICKS",
    offerTitle: "Whatever you need, just nitip.",
    offerBody: "Find food, drinks, and stores that are ready to take orders.",
    viewMerchant: "Order now",
  },
} as const;

export default function HomeScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const cart = useCart();
  const copy = HOME_COPY[language];
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<NitipCatalogOutletSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<NitipPromotion[]>([]);
  const [query, setQuery] = useState("");

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
    if (!user || !apiConfigured) return;

    let active = true;
    listAddresses(user)
      .then((items) => {
        if (active) setAddresses(items);
      })
      .catch(() => {
        if (active) setAddresses([]);
      });

    return () => {
      active = false;
    };
  }, [user]);

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

  useEffect(() => {
    if (!apiConfigured) return;
    let active = true;
    listCatalogPromotions()
      .then((items) => {
        if (active) setPromotions(items);
      })
      .catch(() => {
        if (active) setPromotions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalog;

    return catalog.filter((outlet) =>
      [outlet.businessName, outlet.name, outlet.addressLine]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [catalog, query]);

  if (!user) return <Redirect href="/login" />;

  const firstName =
    profile?.displayName?.split(" ")[0] ??
    user.displayName?.split(" ")[0] ??
    t("home.fallbackName");
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const addressLabel = defaultAddress
    ? defaultAddress.customLabel || t(`address.${defaultAddress.label}`)
    : t("profile.addAddress");
  const heroBackground = theme.mode === "dark" ? theme.colors.surface : "#0F1014";
  const heroSearchBackground = theme.mode === "dark" ? theme.colors.surfaceRaised : "#FFFFFF";
  const heroSearchText = theme.mode === "dark" ? theme.colors.text : "#111318";
  const heroSearchMuted = theme.mode === "dark" ? theme.colors.textMuted : "#7C8190";
  const merchantCardWidth = Math.max(154, Math.min(188, Math.floor((width - 52) / 2)));
  const featuredPromotion = promotions[0] ?? null;

  const categories: { icon: NitipIconName; label: string }[] = [
    { icon: "food", label: t("home.food") },
    { icon: "drink", label: t("home.drinks") },
    { icon: "store", label: t("home.stores") },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-b-[26px] px-4 pb-5"
          style={{
            backgroundColor: heroBackground,
            paddingTop: insets.top + 10,
          }}
        >
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              className="min-w-0 flex-1 flex-row items-center"
              onPress={() => router.push("/settings/addresses")}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
              >
                <NitipIcon color="#FFFFFF" name="location" size={16} />
              </View>
              <View className="min-w-0 flex-1 pl-2.5">
                <Text
                  className="text-[9px] font-extrabold"
                  numberOfLines={1}
                  style={{ color: "rgba(255,255,255,0.56)" }}
                >
                  {copy.deliveryLocation}
                </Text>
                <Text
                  className="mt-0.5 text-[11px] font-black"
                  numberOfLines={1}
                  style={{ color: "#FFFFFF" }}
                >
                  {addressLabel}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={copy.offerSection}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.push("/promos")}
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <NitipIcon color="#FFFFFF" name="promo" size={17} />
            </Pressable>

            <Pressable
              accessibilityLabel={t("common.cart")}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.push("/cart")}
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <NitipIcon color="#FFFFFF" name="cart" size={18} />
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

          <View className="mt-5">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-[10px] font-extrabold"
                style={{ color: "rgba(255,255,255,0.68)" }}
              >
                {t("home.greeting", { name: firstName })}
              </Text>
              {profileLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            </View>
            <Text
              className="mt-1.5 max-w-[300px] text-[29px] font-black leading-[33px] tracking-tighter"
              style={{ color: "#FFFFFF" }}
            >
              {t("home.title")}
            </Text>
          </View>

          <View
            className="mt-5 min-h-[48px] flex-row items-center rounded-full px-4"
            style={{ backgroundColor: heroSearchBackground }}
          >
            <NitipIcon color={heroSearchMuted} name="search" size={16} />
            <TextInput
              className="ml-3 flex-1 py-3 text-[11px]"
              onChangeText={setQuery}
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={heroSearchMuted}
              returnKeyType="search"
              style={{ color: heroSearchText }}
              value={query}
            />
          </View>
        </View>

        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-black" style={{ color: theme.colors.text }}>
              {copy.offerSection}
            </Text>
            <Pressable onPress={() => router.push("/promos")}>
              <Text className="text-[9px] font-bold" style={{ color: theme.colors.textMuted }}>
                {copy.seeAll}
              </Text>
            </Pressable>
          </View>

          <View
            className="mt-2.5 flex-row items-center overflow-hidden rounded-[20px]"
            style={{ backgroundColor: theme.colors.surfaceAccent }}
          >
            <View className="min-w-0 flex-1 px-4 py-4">
              <Text className="text-[8px] font-black tracking-[1.1px]" style={{ color: theme.colors.primary }}>
                {copy.offerEyebrow}
              </Text>
              <Text className="mt-1.5 text-[16px] font-black leading-5" numberOfLines={2} style={{ color: theme.colors.text }}>
                {featuredPromotion?.title ?? copy.offerTitle}
              </Text>
              <Text className="mt-1.5 text-[10px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>
                {featuredPromotion?.description ?? copy.offerBody}
              </Text>
              {featuredPromotion?.outletId ? (
                <Pressable
                  className="mt-3 self-start rounded-full px-3.5 py-2"
                  onPress={() => router.push(`/outlet/${featuredPromotion.outletId}`)}
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Text className="text-[9px] font-black text-white">
                    {featuredPromotion.ctaLabel ?? copy.viewMerchant}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {featuredPromotion?.imageUrl ? (
              <Image
                className="h-[118px] w-[118px] self-stretch"
                resizeMode="cover"
                source={{ uri: featuredPromotion.imageUrl }}
                style={{ backgroundColor: theme.colors.surfaceAccent }}
              />
            ) : (
              <View className="h-[112px] w-[104px] items-center justify-center">
                <View
                  className="absolute left-1 top-5 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surfaceRaised }}
                >
                  <NitipIcon color={theme.colors.primary} name="food" size={18} />
                </View>
                <View
                  className="absolute right-2 top-2 h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <NitipIcon color="#FFFFFF" name="promo" size={20} />
                </View>
                <View
                  className="absolute bottom-3 right-5 h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surfaceRaised }}
                >
                  <NitipIcon color={theme.colors.primary} name="drink" size={16} />
                </View>
              </View>
            )}
          </View>
        </View>

        <View className="px-4 pt-4">
          <Text className="text-[14px] font-black tracking-tight" style={{ color: theme.colors.text }}>
            {t("home.explore")}
          </Text>
          <View className="mt-3 flex-row justify-between">
            {categories.map((category) => (
              <View className="w-[30%] items-center" key={category.label}>
                <View
                  className="h-[52px] w-[52px] items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.surfaceAccent }}
                  >
                    <NitipIcon color={theme.colors.primary} name={category.icon} size={17} />
                  </View>
                </View>
                <Text
                  className="mt-2 text-center text-[9px] font-black"
                  numberOfLines={1}
                  style={{ color: theme.colors.text }}
                >
                  {category.label}
                </Text>
              </View>
            ))}
          </View>

          {!apiConfigured ? (
            <View className="mt-5 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.warningSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.warning }}>
                {t("home.apiNotConfigured")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {t("home.apiDescription")}
              </Text>
            </View>
          ) : null}

          {profileError ? (
            <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
                {t("home.profileDisconnected")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {profileError}
              </Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row items-end justify-between">
            <View>
              <Text className="text-[15px] font-black tracking-tight" style={{ color: theme.colors.text }}>
                {t("home.merchants")}
              </Text>
              <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                {t("home.merchantsSubtitle")}
              </Text>
            </View>
          </View>
        </View>

        {catalogLoading ? (
          <View className="mx-4 mt-3 items-center rounded-[20px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("home.loadingCatalog")}
            </Text>
          </View>
        ) : catalogError ? (
          <View className="mx-4 mt-3 rounded-[20px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("home.catalogUnavailable")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {catalogError}
            </Text>
          </View>
        ) : visibleCatalog.length === 0 ? (
          <View className="mx-4 mt-3 rounded-[20px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {t("home.noMerchants")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("home.noMerchantsDescription")}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingRight: 24 }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {visibleCatalog.map((outlet, index) => (
              <Pressable
                accessibilityRole="button"
                key={outlet.id}
                onPress={() => router.push(`/outlet/${outlet.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: theme.colors.surfaceRaised,
                  borderRadius: 16,
                  marginRight: index === visibleCatalog.length - 1 ? 0 : 10,
                  opacity: pressed ? 0.86 : 1,
                  overflow: "hidden",
                  width: merchantCardWidth,
                })}
              >
                <View className="h-[100px] w-full" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  {outlet.imageUrl ? (
                    <Image className="h-full w-full" resizeMode="cover" source={{ uri: outlet.imageUrl }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-[34px] font-black" style={{ color: theme.colors.primary }}>
                        {outlet.businessName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View
                    className="absolute left-2 top-2 flex-row items-center rounded-full px-2 py-1"
                    style={{
                      backgroundColor: outlet.acceptingOrders
                        ? theme.colors.successSurface
                        : theme.colors.surfaceRaised,
                    }}
                  >
                    <View
                      className="mr-1 h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: outlet.acceptingOrders
                          ? theme.colors.success
                          : theme.colors.textMuted,
                      }}
                    />
                    <Text
                      className="text-[7px] font-black uppercase"
                      style={{
                        color: outlet.acceptingOrders
                          ? theme.colors.success
                          : theme.colors.textMuted,
                      }}
                    >
                      {outlet.acceptingOrders ? t("common.open") : t("common.closed")}
                    </Text>
                  </View>
                </View>

                <View className="p-3">
                  <Text className="text-[12px] font-black leading-4" numberOfLines={2} style={{ color: theme.colors.text }}>
                    {outlet.businessName}
                  </Text>
                  <Text className="mt-1 text-[9px]" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                    {outlet.name} · {t("home.productCount", { count: outlet.productCount })}
                  </Text>
                  <View className="mt-2 flex-row items-center justify-between gap-2">
                    <Text className="flex-1 text-[9px] font-black" numberOfLines={1} style={{ color: theme.colors.primary }}>
                      {outlet.minPrice == null
                        ? t("home.menuSoon")
                        : t("home.fromPrice", { price: formatRupiah(outlet.minPrice) })}
                    </Text>
                    <NitipIcon color={theme.colors.textMuted} name="next" size={12} />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}
