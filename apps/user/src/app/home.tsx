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
  StyleSheet,
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
    offerBody: "Temukan makanan, minuman, dan toko yang siap menerima pesanan.",
    viewMerchant: "Pesan sekarang",
    openOnly: "Buka saja",
    openOnlyActive: "Hanya yang buka",
  },
  en: {
    deliveryLocation: "Delivery location",
    offerSection: "Today's Offer",
    seeAll: "See all",
    offerEyebrow: "TODAY'S PICKS",
    offerTitle: "Whatever you need, just nitip.",
    offerBody: "Find food, drinks, and stores that are ready to take orders.",
    viewMerchant: "Order now",
    openOnly: "Open only",
    openOnlyActive: "Showing open",
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
  const [openOnly, setOpenOnly] = useState(false);

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

    return catalog.filter((outlet) => {
      if (openOnly && !outlet.acceptingOrders) return false;
      if (!normalizedQuery) return true;

      return [outlet.businessName, outlet.name, outlet.addressLine]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [catalog, openOnly, query]);

  if (!user) return <Redirect href="/login" />;

  const firstName =
    profile?.displayName?.split(" ")[0] ??
    user.displayName?.split(" ")[0] ??
    t("home.fallbackName");
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const addressLabel = defaultAddress
    ? defaultAddress.customLabel || t(`address.${defaultAddress.label}`)
    : t("profile.addAddress");
  const heroBackground = theme.mode === "dark" ? "#111318" : "#0B0D0F";
  const heroSearchBackground = theme.mode === "dark" ? theme.colors.surfaceRaised : "#FFFFFF";
  const heroSearchText = theme.mode === "dark" ? theme.colors.text : "#111318";
  const heroSearchMuted = theme.mode === "dark" ? theme.colors.textMuted : "#8A8F9D";
  const pageBackground = theme.mode === "dark" ? theme.colors.background : theme.colors.surface;
  const merchantCardWidth = Math.max(174, Math.min(206, Math.floor((width - 38) / 1.82)));
  const featuredPromotion = promotions[0] ?? null;
  const promotionDestination = featuredPromotion?.outletId
    ? `/outlet/${featuredPromotion.outletId}`
    : "/promos";

  const categories: { icon: NitipIconName; label: string }[] = [
    { icon: "food", label: t("home.food") },
    { icon: "drink", label: t("home.drinks") },
    { icon: "store", label: t("home.stores") },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: pageBackground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-b-[30px] px-4 pb-5"
          style={{ backgroundColor: heroBackground, paddingTop: insets.top + 10 }}
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
                  className="text-[8px] font-extrabold uppercase tracking-[0.6px]"
                  numberOfLines={1}
                  style={{ color: "rgba(255,255,255,0.48)" }}
                >
                  {copy.deliveryLocation}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Text
                    className="max-w-[180px] text-[11px] font-black"
                    numberOfLines={1}
                    style={{ color: "#FFFFFF" }}
                  >
                    {addressLabel}
                  </Text>
                  <NitipIcon color="rgba(255,255,255,0.66)" name="next" size={10} />
                </View>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={copy.offerSection}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.push("/promos")}
              style={({ pressed }) => ({
                backgroundColor: "rgba(255,255,255,0.10)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <NitipIcon color="#FFFFFF" name="promo" size={17} />
            </Pressable>

            <Pressable
              accessibilityLabel={t("common.cart")}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.push("/cart")}
              style={({ pressed }) => ({
                backgroundColor: "rgba(255,255,255,0.10)",
                opacity: pressed ? 0.7 : 1,
              })}
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
                style={{ color: "rgba(255,255,255,0.62)" }}
              >
                {t("home.greeting", { name: firstName })}
              </Text>
              {profileLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            </View>
            <Text
              className="mt-1.5 max-w-[310px] text-[30px] font-black leading-[34px] tracking-[-1.2px]"
              style={{ color: "#FFFFFF" }}
            >
              {t("home.title")}
            </Text>
          </View>

          <View
            className="mt-5 flex-row items-center rounded-[18px] p-1.5"
            style={{
              backgroundColor: heroSearchBackground,
              elevation: 2,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 7,
            }}
          >
            <View className="min-h-[44px] min-w-0 flex-1 flex-row items-center px-3">
              <NitipIcon color={heroSearchMuted} name="search" size={16} />
              <TextInput
                className="ml-3 flex-1 py-2 text-[11px]"
                onChangeText={setQuery}
                placeholder={t("home.searchPlaceholder")}
                placeholderTextColor={heroSearchMuted}
                returnKeyType="search"
                style={{ color: heroSearchText }}
                value={query}
              />
            </View>
            <Pressable
              accessibilityLabel={openOnly ? copy.openOnlyActive : copy.openOnly}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-[14px]"
              onPress={() => setOpenOnly((current) => !current)}
              style={({ pressed }) => ({
                backgroundColor: openOnly ? theme.colors.primary : theme.colors.surfaceAccent,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <NitipIcon
                color={openOnly ? "#FFFFFF" : theme.colors.primary}
                name="filter"
                size={17}
              />
              {openOnly ? (
                <View
                  className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#FFFFFF" }}
                >
                  <NitipIcon color={theme.colors.primary} name="check" size={9} />
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <View className="px-4 pt-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[15px] font-black tracking-[-0.3px]" style={{ color: theme.colors.text }}>
                {copy.offerSection}
              </Text>
              <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>
                {featuredPromotion ? featuredPromotion.title : copy.offerEyebrow}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/promos")}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
            >
              <Text className="text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                {copy.seeAll}
              </Text>
            </Pressable>
          </View>

          <View
            className="mt-3 rounded-[22px]"
            style={{
              backgroundColor: theme.colors.surfaceRaised,
              elevation: 5,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: theme.mode === "dark" ? 0.2 : 0.1,
              shadowRadius: 14,
            }}
          >
            <Pressable
              accessibilityRole="button"
              className="min-h-[148px] flex-row overflow-hidden rounded-[22px]"
              onPress={() => router.push(promotionDestination as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <View className="min-w-0 flex-1 px-4 py-4">
                <Text
                  className="text-[8px] font-black tracking-[1.15px]"
                  style={{ color: theme.colors.primary }}
                >
                  {copy.offerEyebrow}
                </Text>
                <Text
                  className="mt-1.5 text-[18px] font-black leading-[22px] tracking-[-0.4px]"
                  numberOfLines={2}
                  style={{ color: theme.colors.text }}
                >
                  {featuredPromotion?.title ?? copy.offerTitle}
                </Text>
                <Text
                  className="mt-1.5 max-w-[210px] text-[10px] leading-[15px]"
                  numberOfLines={2}
                  style={{ color: theme.colors.textMuted }}
                >
                  {featuredPromotion?.description ?? copy.offerBody}
                </Text>
                <View
                  className="mt-3 self-start rounded-full px-3.5 py-2"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Text className="text-[9px] font-black text-white">
                    {featuredPromotion?.ctaLabel ?? copy.viewMerchant}
                  </Text>
                </View>
              </View>

              {featuredPromotion?.imageUrl ? (
                <Image
                  className="w-[126px] self-stretch"
                  resizeMode="cover"
                  source={{ uri: featuredPromotion.imageUrl }}
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                />
              ) : (
                <View
                  className="w-[122px] items-center justify-center"
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                >
                  <View
                    className="h-[76px] w-[76px] items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <View
                      className="h-[56px] w-[56px] items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <NitipIcon color="#FFFFFF" name="promo" size={24} />
                    </View>
                  </View>
                  <View
                    className="absolute bottom-4 left-3 h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <NitipIcon color={theme.colors.primary} name="food" size={16} />
                  </View>
                  <View
                    className="absolute right-3 top-4 h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <NitipIcon color={theme.colors.primary} name="drink" size={15} />
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View className="pt-5">
          <View className="px-4">
            <Text className="text-[15px] font-black tracking-[-0.3px]" style={{ color: theme.colors.text }}>
              {t("home.explore")}
            </Text>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 24, paddingTop: 11 }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {categories.map((category, index) => (
              <View
                className="flex-row items-center rounded-full py-2 pl-2 pr-3.5"
                key={category.label}
                style={{
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  marginRight: index === categories.length - 1 ? 0 : 9,
                }}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                >
                  <NitipIcon color={theme.colors.primary} name={category.icon} size={16} />
                </View>
                <Text
                  className="ml-2.5 text-[10px] font-black"
                  numberOfLines={1}
                  style={{ color: theme.colors.text }}
                >
                  {category.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {!apiConfigured ? (
          <View className="mx-4 mt-5 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.warningSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.warning }}>
              {t("home.apiNotConfigured")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("home.apiDescription")}
            </Text>
          </View>
        ) : null}

        {profileError ? (
          <View className="mx-4 mt-4 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("home.profileDisconnected")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {profileError}
            </Text>
          </View>
        ) : null}

        <View className="mt-6 px-4">
          <View className="flex-row items-end justify-between">
            <View className="min-w-0 flex-1">
              <Text className="text-[16px] font-black tracking-[-0.45px]" style={{ color: theme.colors.text }}>
                {t("home.merchants")}
              </Text>
              <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                {openOnly ? copy.openOnlyActive : t("home.merchantsSubtitle")}
              </Text>
            </View>
          </View>
        </View>

        {catalogLoading ? (
          <View
            className="mx-4 mt-3 items-center rounded-[22px] p-6"
            style={{ backgroundColor: theme.colors.surfaceRaised }}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("home.loadingCatalog")}
            </Text>
          </View>
        ) : catalogError ? (
          <View className="mx-4 mt-3 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("home.catalogUnavailable")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {catalogError}
            </Text>
          </View>
        ) : visibleCatalog.length === 0 ? (
          <View
            className="mx-4 mt-3 rounded-[22px] p-5"
            style={{ backgroundColor: theme.colors.surfaceRaised }}
          >
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {t("home.noMerchants")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("home.noMerchantsDescription")}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 14,
              paddingHorizontal: 16,
              paddingRight: 26,
              paddingTop: 12,
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {visibleCatalog.map((outlet, index) => (
              <View
                key={outlet.id}
                style={{
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: 22,
                  borderWidth: StyleSheet.hairlineWidth,
                  elevation: 6,
                  marginRight: index === visibleCatalog.length - 1 ? 0 : 13,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: theme.mode === "dark" ? 0.22 : 0.12,
                  shadowRadius: 12,
                  width: merchantCardWidth,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/outlet/${outlet.id}`)}
                  style={({ pressed }) => ({
                    borderRadius: 22,
                    opacity: pressed ? 0.88 : 1,
                    overflow: "hidden",
                  })}
                >
                  <View
                    className="h-[126px] w-full overflow-hidden rounded-t-[22px]"
                    style={{ backgroundColor: theme.colors.surfaceAccent }}
                  >
                    {outlet.imageUrl ? (
                      <Image
                        className="h-full w-full"
                        resizeMode="cover"
                        source={{ uri: outlet.imageUrl }}
                        style={{ backgroundColor: theme.colors.surfaceAccent }}
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <View
                          className="h-16 w-16 items-center justify-center rounded-full"
                          style={{ backgroundColor: theme.colors.surfaceRaised }}
                        >
                          <Text className="text-[28px] font-black" style={{ color: theme.colors.primary }}>
                            {outlet.businessName.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View
                      className="absolute left-2.5 top-2.5 flex-row items-center rounded-full px-2.5 py-1.5"
                      style={{
                        backgroundColor: outlet.acceptingOrders
                          ? "rgba(255,255,255,0.94)"
                          : "rgba(17,19,24,0.78)",
                      }}
                    >
                      <View
                        className="mr-1.5 h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: outlet.acceptingOrders
                            ? theme.colors.success
                            : "#FFFFFF",
                        }}
                      />
                      <Text
                        className="text-[7px] font-black uppercase tracking-[0.4px]"
                        style={{
                          color: outlet.acceptingOrders
                            ? theme.colors.success
                            : "#FFFFFF",
                        }}
                      >
                        {outlet.acceptingOrders ? t("common.open") : t("common.closed")}
                      </Text>
                    </View>
                  </View>

                  <View className="p-3.5">
                    <Text
                      className="text-[13px] font-black leading-[17px] tracking-[-0.2px]"
                      numberOfLines={2}
                      style={{ color: theme.colors.text }}
                    >
                      {outlet.businessName}
                    </Text>
                    <Text
                      className="mt-1 text-[9px]"
                      numberOfLines={1}
                      style={{ color: theme.colors.textMuted }}
                    >
                      {outlet.name} · {t("home.productCount", { count: outlet.productCount })}
                    </Text>
                    <View className="mt-3 flex-row items-center justify-between gap-2">
                      <Text
                        className="flex-1 text-[9px] font-black"
                        numberOfLines={1}
                        style={{ color: theme.colors.primary }}
                      >
                        {outlet.minPrice == null
                          ? t("home.menuSoon")
                          : t("home.fromPrice", { price: formatRupiah(outlet.minPrice) })}
                      </Text>
                      <View
                        className="h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: theme.colors.surface }}
                      >
                        <NitipIcon color={theme.colors.textMuted} name="next" size={11} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}
