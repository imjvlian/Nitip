import { formatRupiah, type NitipAddress, type NitipUserProfile } from "@nitip/domain";
import type {
  NitipCatalogOutlet,
  NitipCatalogOutletSummary,
  NitipProduct,
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
  getCatalogOutlet,
  getMe,
  listAddresses,
  listCatalogOutlets,
  listCatalogPromotions,
} from "../lib/api";

const ALL_CATEGORY = "__all__";
const MERCHANT_CATEGORY = "__merchant__";

const HOME_COPY = {
  id: {
    deliveryLocation: "Lokasi pengantaran",
    notifications: "Notifikasi",
    offerSection: "Promo hari ini",
    offerEyebrow: "PILIHAN UNTUKMU",
    offerTitle: "Ada promo untuk pesananmu.",
    offerBody: "Lihat penawaran yang sedang aktif sebelum mulai pesan.",
    offerCta: "Cek promo",
    seeAll: "Lihat semua",
    exploreSection: "Mau cari apa?",
    allCategory: "Semua",
    merchantFilter: "Merchant",
    menuSection: "Menu di Nitip",
    menuSubtitle: "Menu nyata dari merchant yang tersedia di Nitip.",
    menuEmpty: "Belum ada menu yang cocok.",
    menuEmptyDescription: "Coba kategori atau kata pencarian lain.",
    merchantSection: "Merchant di Nitip",
    merchantSubtitle: "Pilihan yang sedang tersedia untuk dipesan.",
    openOnly: "Buka saja",
    openOnlyActive: "Hanya yang buka",
    unrated: "Belum ada rating",
  },
  en: {
    deliveryLocation: "Delivery location",
    notifications: "Notifications",
    offerSection: "Today's offers",
    offerEyebrow: "PICKED FOR YOU",
    offerTitle: "There's an offer for your order.",
    offerBody: "Check currently active offers before you start ordering.",
    offerCta: "View offer",
    seeAll: "See all",
    exploreSection: "What are you looking for?",
    allCategory: "All",
    merchantFilter: "Merchants",
    menuSection: "Menus on Nitip",
    menuSubtitle: "Real menu items currently available from Nitip merchants.",
    menuEmpty: "No matching menu yet.",
    menuEmptyDescription: "Try another category or search term.",
    merchantSection: "Merchants on Nitip",
    merchantSubtitle: "Places currently available to take your order.",
    openOnly: "Open only",
    openOnlyActive: "Showing open",
    unrated: "No ratings yet",
  },
} as const;

function isPlaceholderCopy(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return (
    !normalized ||
    ["test", "test promo", "promo", "dummy", "contoh", "contoh promo"].includes(normalized)
  );
}

function normalizeCategory(value: string) {
  return value.trim().toLocaleLowerCase();
}

function categoryIcon(label: string): NitipIconName {
  const value = normalizeCategory(label);
  if (/minum|drink|beverage|kopi|coffee|teh|tea|jus|juice|soda/.test(value)) return "drink";
  if (/toko|store|shop|market/.test(value)) return "store";
  return "food";
}

type HomeMenuItem = {
  outlet: NitipCatalogOutlet;
  product: NitipProduct;
  categoryName: string;
};

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
  const [catalogDetails, setCatalogDetails] = useState<NitipCatalogOutlet[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<NitipPromotion[]>([]);
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

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
    if (!apiConfigured || catalog.length === 0) {
      setCatalogDetails([]);
      setMenuLoading(false);
      return;
    }

    let active = true;
    setMenuLoading(true);

    Promise.all(catalog.map((outlet) => getCatalogOutlet(outlet.id).catch(() => null)))
      .then((items) => {
        if (!active) return;
        setCatalogDetails(items.filter((item): item is NitipCatalogOutlet => item !== null));
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catalog]);

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

  const menuItems = useMemo<HomeMenuItem[]>(() => {
    return catalogDetails.flatMap((outlet) =>
      outlet.categories.flatMap((category) =>
        category.isActive
          ? category.products
              .filter((product) => product.isActive)
              .map((product) => ({ outlet, product, categoryName: category.name }))
          : [],
      ),
    );
  }, [catalogDetails]);

  const detailsByOutlet = useMemo(
    () => new Map(catalogDetails.map((outlet) => [outlet.id, outlet])),
    [catalogDetails],
  );

  const categoryFilters = useMemo(() => {
    const unique = new Map<string, string>();

    for (const item of menuItems) {
      const key = normalizeCategory(item.categoryName);
      if (key && !unique.has(key)) unique.set(key, item.categoryName.trim());
    }

    return [
      { key: ALL_CATEGORY, label: copy.allCategory, icon: "search" as NitipIconName },
      ...Array.from(unique.entries())
        .slice(0, 8)
        .map(([key, label]) => ({ key, label, icon: categoryIcon(label) })),
      { key: MERCHANT_CATEGORY, label: copy.merchantFilter, icon: "store" as NitipIconName },
    ];
  }, [copy.allCategory, copy.merchantFilter, menuItems]);

  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visibleProducts = useMemo(() => {
    if (selectedCategory === MERCHANT_CATEGORY) return [];

    return menuItems.filter((item) => {
      if (openOnly && !item.outlet.acceptingOrders) return false;
      if (
        selectedCategory !== ALL_CATEGORY &&
        normalizeCategory(item.categoryName) !== selectedCategory
      ) {
        return false;
      }
      if (!normalizedQuery) return true;

      return [
        item.product.name,
        item.product.description ?? "",
        item.categoryName,
        item.outlet.businessName,
        item.outlet.name,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [menuItems, normalizedQuery, openOnly, selectedCategory]);

  const visibleCatalog = useMemo(() => {
    return catalog.filter((outlet) => {
      if (openOnly && !outlet.acceptingOrders) return false;

      const detail = detailsByOutlet.get(outlet.id);
      const outletProducts =
        detail?.categories.flatMap((category) =>
          category.products.map((product) => ({ category, product })),
        ) ?? [];

      if (
        selectedCategory !== ALL_CATEGORY &&
        selectedCategory !== MERCHANT_CATEGORY &&
        !outletProducts.some(
          ({ category, product }) =>
            product.isActive && normalizeCategory(category.name) === selectedCategory,
        )
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      const merchantMatch = [outlet.businessName, outlet.name, outlet.addressLine]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const productMatch = outletProducts.some(({ category, product }) =>
        [product.name, product.description ?? "", category.name]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );

      return merchantMatch || productMatch;
    });
  }, [catalog, detailsByOutlet, normalizedQuery, openOnly, selectedCategory]);

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
  const pageBackground = theme.mode === "dark" ? theme.colors.background : "#F2F3F5";
  const cardWidth = Math.max(194, Math.min(220, Math.floor((width - 44) / 1.65)));
  const cardBorder = theme.mode === "dark" ? theme.colors.border : "#D9DEE7";
  const activeFilterBackground = theme.colors.primary;
  const activeFilterText = "#FFFFFF";

  const featuredPromotion = promotions[0] ?? null;
  const promotionDestination = featuredPromotion?.outletId
    ? `/outlet/${featuredPromotion.outletId}`
    : "/promos";
  const promotionTitle =
    !isPlaceholderCopy(featuredPromotion?.title) && featuredPromotion?.title
      ? featuredPromotion.title.trim()
      : copy.offerTitle;
  const promotionDescription =
    !isPlaceholderCopy(featuredPromotion?.description) && featuredPromotion?.description
      ? featuredPromotion.description.trim()
      : copy.offerBody;
  const promotionCta = featuredPromotion?.ctaLabel?.trim() || copy.offerCta;

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
                style={{ backgroundColor: "rgba(255,255,255,0.11)" }}
              >
                <NitipIcon color="#FFFFFF" name="location" size={15} />
              </View>

              <View className="min-w-0 flex-1 pl-2.5">
                <Text
                  className="text-[8px] font-extrabold uppercase tracking-[0.8px]"
                  numberOfLines={1}
                  style={{ color: "rgba(255,255,255,0.48)" }}
                >
                  {copy.deliveryLocation}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Text
                    className="max-w-[185px] text-[11px] font-black"
                    numberOfLines={1}
                    style={{ color: "#FFFFFF" }}
                  >
                    {addressLabel}
                  </Text>
                  <NitipIcon color="rgba(255,255,255,0.58)" name="next" size={9} />
                </View>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={copy.notifications}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => ({
                backgroundColor: "rgba(255,255,255,0.10)",
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <NitipIcon color="#FFFFFF" name="notification" size={16} />
            </Pressable>

            <Pressable
              accessibilityLabel={t("common.cart")}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.push("/cart")}
              style={({ pressed }) => ({
                backgroundColor: "rgba(255,255,255,0.10)",
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <NitipIcon color="#FFFFFF" name="cart" size={17} />
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
              <Text className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.60)" }}>
                {t("home.greeting", { name: firstName })}
              </Text>
              {profileLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            </View>

            <Text
              className="mt-1.5 max-w-[315px] text-[29px] font-black leading-[33px] tracking-[-1px]"
              style={{ color: "#FFFFFF" }}
            >
              {t("home.title")}
            </Text>
          </View>

          <View
            className="mt-5 flex-row items-center rounded-full p-1.5"
            style={{
              backgroundColor: heroSearchBackground,
              elevation: 2,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            }}
          >
            <View className="min-h-[44px] min-w-0 flex-1 flex-row items-center px-3">
              <NitipIcon color={heroSearchMuted} name="search" size={15} />
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
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => setOpenOnly((current) => !current)}
              style={({ pressed }) => ({
                backgroundColor: openOnly ? theme.colors.primary : theme.colors.surfaceAccent,
                opacity: pressed ? 0.76 : 1,
              })}
            >
              <NitipIcon
                color={openOnly ? "#FFFFFF" : theme.colors.primary}
                name="filter"
                size={16}
              />
            </Pressable>
          </View>
        </View>

        {!apiConfigured ? (
          <View
            className="mx-4 mt-5 rounded-[20px] px-4 py-3.5"
            style={{ backgroundColor: theme.colors.warningSurface }}
          >
            <Text className="text-[12px] font-black" style={{ color: theme.colors.warning }}>
              {t("home.apiNotConfigured")}
            </Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {t("home.apiDescription")}
            </Text>
          </View>
        ) : null}

        {profileError ? (
          <View
            className="mx-4 mt-4 rounded-[20px] px-4 py-3.5"
            style={{ backgroundColor: theme.colors.dangerSurface }}
          >
            <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>
              {t("home.profileDisconnected")}
            </Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {profileError}
            </Text>
          </View>
        ) : null}

        <View className="px-4 pt-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className="text-[16px] font-black tracking-[-0.35px]"
              style={{ color: theme.colors.text }}
            >
              {copy.offerSection}
            </Text>
            <Pressable
              onPress={() => router.push("/promos")}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
            >
              <Text className="text-[9px] font-bold" style={{ color: theme.colors.textMuted }}>
                {copy.seeAll}
              </Text>
            </Pressable>
          </View>

          <View
            className="mt-3 overflow-hidden rounded-[22px]"
            style={{
              backgroundColor: theme.colors.surfaceRaised,
              elevation: 4,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme.mode === "dark" ? 0.22 : 0.09,
              shadowRadius: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              className="min-h-[142px] flex-row"
              onPress={() => router.push(promotionDestination as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <View className="min-w-0 flex-1 px-4 py-4">
                <Text
                  className="text-[8px] font-black tracking-[1.05px]"
                  style={{ color: theme.colors.primary }}
                >
                  {copy.offerEyebrow}
                </Text>
                <Text
                  className="mt-1.5 text-[18px] font-black leading-[21px] tracking-[-0.45px]"
                  numberOfLines={2}
                  style={{ color: theme.colors.text }}
                >
                  {promotionTitle}
                </Text>
                <Text
                  className="mt-1.5 max-w-[205px] text-[10px] leading-[15px]"
                  numberOfLines={2}
                  style={{ color: theme.colors.textMuted }}
                >
                  {promotionDescription}
                </Text>
                <View
                  className="mt-3 self-start rounded-full px-3.5 py-2"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Text className="text-[9px] font-black text-white">{promotionCta}</Text>
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
                  className="w-[120px] items-center justify-center"
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                >
                  <View
                    className="h-[72px] w-[72px] items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <View
                      className="h-[52px] w-[52px] items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <NitipIcon color="#FFFFFF" name="promo" size={22} />
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View className="pt-5">
          <View className="px-4">
            <Text
              className="text-[16px] font-black tracking-[-0.35px]"
              style={{ color: theme.colors.text }}
            >
              {copy.exploreSection}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 26, paddingTop: 12 }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {categoryFilters.map((category, index) => {
              const selected = selectedCategory === category.key;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  android_ripple={{ color: theme.colors.surfaceAccent, borderless: false }}
                  key={category.key}
                  onPress={() => setSelectedCategory(category.key)}
                  style={{
                    alignItems: "center",
                    backgroundColor: selected ? activeFilterBackground : theme.colors.surfaceRaised,
                    borderColor: selected ? theme.colors.primaryStrong : theme.colors.border,
                    borderRadius: 999,
                    borderWidth: selected ? 2 : 1,
                    elevation: selected ? 8 : 2,
                    flexDirection: "row",
                    height: 42,
                    marginRight: index === categoryFilters.length - 1 ? 0 : 8,
                    paddingHorizontal: 14,
                    shadowColor: selected ? theme.colors.primary : theme.colors.shadow,
                    shadowOffset: { width: 0, height: selected ? 4 : 2 },
                    shadowOpacity: selected ? (theme.mode === "dark" ? 0.34 : 0.24) : 0.06,
                    shadowRadius: selected ? 10 : 4,
                  }}
                >
                  <NitipIcon
                    color={selected ? activeFilterText : theme.colors.primary}
                    name={category.icon}
                    size={15}
                  />
                  <Text
                    className="ml-2.5 text-[11px] font-black"
                    numberOfLines={1}
                    style={{ color: selected ? activeFilterText : theme.colors.text }}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {selectedCategory !== MERCHANT_CATEGORY ? (
          <View className="mt-6">
            <View className="px-4">
              <Text
                className="text-[16px] font-black tracking-[-0.35px]"
                style={{ color: theme.colors.text }}
              >
                {copy.menuSection}
              </Text>
              <Text className="mt-1 text-[9px] leading-[14px]" style={{ color: theme.colors.textMuted }}>
                {copy.menuSubtitle}
              </Text>
            </View>

            {menuLoading ? (
              <View
                className="mx-4 mt-3 items-center rounded-[22px] p-6"
                style={{ backgroundColor: theme.colors.surfaceRaised }}
              >
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : visibleProducts.length === 0 ? (
              <View
                className="mx-4 mt-3 rounded-[22px] p-5"
                style={{ backgroundColor: theme.colors.surfaceRaised }}
              >
                <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>
                  {copy.menuEmpty}
                </Text>
                <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.menuEmptyDescription}
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{
                  paddingBottom: 16,
                  paddingHorizontal: 16,
                  paddingRight: 26,
                  paddingTop: 12,
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {visibleProducts.slice(0, 12).map((item, index) => {
                  const hasRating = item.outlet.ratingCount > 0 && item.outlet.ratingAverage != null;

                  return (
                    <View
                      key={`${item.outlet.id}-${item.product.id}`}
                      style={{
                        backgroundColor: theme.colors.surfaceRaised,
                        borderColor: cardBorder,
                        borderRadius: 22,
                        borderWidth: 1,
                        elevation: 6,
                        marginRight: index === Math.min(visibleProducts.length, 12) - 1 ? 0 : 13,
                        shadowColor: theme.colors.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: theme.mode === "dark" ? 0.22 : 0.11,
                        shadowRadius: 11,
                        width: cardWidth,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push(`/outlet/${item.outlet.id}`)}
                        style={({ pressed }) => ({
                          borderRadius: 22,
                          opacity: pressed ? 0.88 : item.product.isAvailable ? 1 : 0.62,
                          overflow: "hidden",
                        })}
                      >
                        <View
                          className="h-[136px] w-full overflow-hidden rounded-t-[22px]"
                          style={{ backgroundColor: theme.colors.surfaceAccent }}
                        >
                          {item.product.imageUrl ? (
                            <Image
                              className="h-full w-full"
                              resizeMode="cover"
                              source={{ uri: item.product.imageUrl }}
                              style={{ backgroundColor: theme.colors.surfaceAccent }}
                            />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <View
                                className="h-16 w-16 items-center justify-center rounded-full"
                                style={{ backgroundColor: theme.colors.surfaceRaised }}
                              >
                                <NitipIcon color={theme.colors.primary} name="food" size={25} />
                              </View>
                            </View>
                          )}

                          <View
                            className="absolute left-2.5 top-2.5 flex-row items-center rounded-full px-2.5 py-1.5"
                            style={{
                              backgroundColor: hasRating
                                ? "rgba(17,19,24,0.80)"
                                : "rgba(255,255,255,0.94)",
                            }}
                          >
                            <Text className="mr-1 text-[10px]" style={{ color: "#F4B400" }}>
                              ★
                            </Text>
                            <Text
                              className="text-[8px] font-black"
                              style={{ color: hasRating ? "#FFFFFF" : theme.colors.textMuted }}
                            >
                              {hasRating
                                ? `${item.outlet.ratingAverage?.toFixed(1)} (${item.outlet.ratingCount})`
                                : copy.unrated}
                            </Text>
                          </View>
                        </View>

                        <View className="px-3.5 pb-3.5 pt-3">
                          <Text
                            className="text-[13px] font-black leading-[17px] tracking-[-0.2px]"
                            numberOfLines={2}
                            style={{ color: theme.colors.text }}
                          >
                            {item.product.name}
                          </Text>

                          <Text
                            className="mt-1 text-[9px]"
                            numberOfLines={1}
                            style={{ color: theme.colors.textMuted }}
                          >
                            {item.outlet.businessName} · {item.categoryName}
                          </Text>

                          <View className="mt-3 flex-row items-center justify-between gap-2">
                            <Text
                              className="flex-1 text-[10px] font-black"
                              numberOfLines={1}
                              style={{ color: theme.colors.primary }}
                            >
                              {formatRupiah(item.product.price)}
                            </Text>

                            <View
                              className="h-7 w-7 items-center justify-center rounded-full"
                              style={{ backgroundColor: theme.colors.surface }}
                            >
                              <NitipIcon color={theme.colors.textMuted} name="next" size={10} />
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        <View className="mt-6 px-4">
          <Text
            className="text-[16px] font-black tracking-[-0.35px]"
            style={{ color: theme.colors.text }}
          >
            {copy.merchantSection}
          </Text>
          <Text className="mt-1 text-[9px] leading-[14px]" style={{ color: theme.colors.textMuted }}>
            {openOnly ? copy.openOnlyActive : copy.merchantSubtitle}
          </Text>
        </View>

        {catalogLoading ? (
          <View
            className="mx-4 mt-3 items-center rounded-[22px] p-6"
            style={{ backgroundColor: theme.colors.surfaceRaised }}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
              {t("home.loadingCatalog")}
            </Text>
          </View>
        ) : catalogError ? (
          <View
            className="mx-4 mt-3 rounded-[22px] p-5"
            style={{ backgroundColor: theme.colors.dangerSurface }}
          >
            <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>
              {t("home.catalogUnavailable")}
            </Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {catalogError}
            </Text>
          </View>
        ) : visibleCatalog.length === 0 ? (
          <View
            className="mx-4 mt-3 rounded-[22px] p-5"
            style={{ backgroundColor: theme.colors.surfaceRaised }}
          >
            <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>
              {t("home.noMerchants")}
            </Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {t("home.noMerchantsDescription")}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 16,
              paddingHorizontal: 16,
              paddingRight: 26,
              paddingTop: 12,
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {visibleCatalog.map((outlet, index) => {
              const hasRating = outlet.ratingCount > 0 && outlet.ratingAverage != null;

              return (
                <View
                  key={outlet.id}
                  style={{
                    backgroundColor: theme.colors.surfaceRaised,
                    borderColor: cardBorder,
                    borderRadius: 22,
                    borderWidth: 1,
                    elevation: 6,
                    marginRight: index === visibleCatalog.length - 1 ? 0 : 13,
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: theme.mode === "dark" ? 0.22 : 0.11,
                    shadowRadius: 11,
                    width: cardWidth,
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
                      className="h-[136px] w-full overflow-hidden rounded-t-[22px]"
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
                            <Text className="text-[27px] font-black" style={{ color: theme.colors.primary }}>
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
                            backgroundColor: outlet.acceptingOrders ? theme.colors.success : "#FFFFFF",
                          }}
                        />
                        <Text
                          className="text-[7px] font-black uppercase tracking-[0.4px]"
                          style={{ color: outlet.acceptingOrders ? theme.colors.success : "#FFFFFF" }}
                        >
                          {outlet.acceptingOrders ? t("common.open") : t("common.closed")}
                        </Text>
                      </View>
                    </View>

                    <View className="px-3.5 pb-3.5 pt-3">
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

                      <View className="mt-2 flex-row items-center">
                        <Text className="mr-1 text-[10px]" style={{ color: "#F4B400" }}>
                          ★
                        </Text>
                        <Text className="text-[8px] font-bold" style={{ color: theme.colors.textMuted }}>
                          {hasRating
                            ? `${outlet.ratingAverage?.toFixed(1)} (${outlet.ratingCount})`
                            : copy.unrated}
                        </Text>
                      </View>

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
                          <NitipIcon color={theme.colors.textMuted} name="next" size={10} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}
