import { formatRupiah, type NitipAddress, type NitipUserProfile } from "@nitip/domain";
import type { NitipCatalogOutletSummary } from "@nitip/domain/catalog";
import { useNitipTranslation } from "@nitip/i18n";
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
} from "../lib/api";

export default function HomeScreen() {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cart = useCart();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<NitipCatalogOutletSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
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
  const addressLine = defaultAddress?.addressLine ?? t("profile.noAddressTitle");
  const heroBackground = theme.mode === "dark" ? theme.colors.surface : "#0F1014";
  const heroSearchBackground = theme.mode === "dark" ? theme.colors.surfaceRaised : "#FFFFFF";
  const heroSearchText = theme.mode === "dark" ? theme.colors.text : "#111318";
  const heroSearchMuted = theme.mode === "dark" ? theme.colors.textMuted : "#7C8190";

  const categories: { icon: NitipIconName; label: string }[] = [
    { icon: "food", label: t("home.food") },
    { icon: "drink", label: t("home.drinks") },
    { icon: "store", label: t("home.stores") },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-b-[30px] px-5 pb-6"
          style={{
            backgroundColor: heroBackground,
            paddingTop: insets.top + 12,
          }}
        >
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-w-0 flex-1 flex-row items-center"
              onPress={() => router.push("/settings/addresses")}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
              >
                <NitipIcon color="#FFFFFF" name="location" size={18} />
              </View>
              <View className="min-w-0 flex-1 pl-3">
                <Text className="text-[10px] font-extrabold" numberOfLines={1} style={{ color: "rgba(255,255,255,0.62)" }}>
                  {addressLabel}
                </Text>
                <Text className="mt-0.5 text-xs font-black" numberOfLines={1} style={{ color: "#FFFFFF" }}>
                  {addressLine}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={t("common.cart")}
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full"
              onPress={() => router.push("/cart")}
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <NitipIcon color="#FFFFFF" name="cart" size={19} />
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

          <View className="mt-7">
            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] font-extrabold" style={{ color: theme.colors.primary }}>
                {t("home.greeting", { name: firstName })}
              </Text>
              {profileLoading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
            </View>
            <Text
              className="mt-2 max-w-[310px] text-[31px] font-black leading-[35px] tracking-tighter"
              style={{ color: "#FFFFFF" }}
            >
              {t("home.title")}
            </Text>
          </View>

          <View
            className="mt-6 min-h-[50px] flex-row items-center rounded-full px-4"
            style={{ backgroundColor: heroSearchBackground }}
          >
            <NitipIcon color={heroSearchMuted} name="search" size={17} />
            <TextInput
              className="ml-3 flex-1 py-3 text-xs"
              onChangeText={setQuery}
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={heroSearchMuted}
              returnKeyType="search"
              style={{ color: heroSearchText }}
              value={query}
            />
          </View>
        </View>

        <View className="px-5 pt-7">
          <View className="flex-row items-center justify-between">
            <Text className="text-[17px] font-black tracking-tight" style={{ color: theme.colors.text }}>
              {t("home.explore")}
            </Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            {categories.map((category) => (
              <View
                className="min-w-0 flex-1 flex-row items-center rounded-full px-2.5 py-2.5"
                key={category.label}
                style={{ backgroundColor: theme.colors.surface }}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                >
                  <NitipIcon color={theme.colors.primary} name={category.icon} size={17} />
                </View>
                <Text
                  className="ml-2 flex-1 text-[10px] font-black"
                  numberOfLines={1}
                  style={{ color: theme.colors.text }}
                >
                  {category.label}
                </Text>
              </View>
            ))}
          </View>

          {!apiConfigured ? (
            <View className="mt-5 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.warningSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.warning }}>
                {t("home.apiNotConfigured")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {t("home.apiDescription")}
              </Text>
            </View>
          ) : null}

          {profileError ? (
            <View className="mt-4 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
                {t("home.profileDisconnected")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {profileError}
              </Text>
            </View>
          ) : null}

          <View className="mt-8 flex-row items-end justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[19px] font-black tracking-tight" style={{ color: theme.colors.text }}>
                {t("home.merchants")}
              </Text>
              <Text className="mt-1 text-[11px] leading-4" style={{ color: theme.colors.textMuted }}>
                {t("home.merchantsSubtitle")}
              </Text>
            </View>
            {!catalogLoading && catalog.length > 0 ? (
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: theme.colors.surface }}>
                <Text className="text-[9px] font-black" style={{ color: theme.colors.textMuted }}>
                  {visibleCatalog.length}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {catalogLoading ? (
          <View className="mx-5 mt-4 items-center rounded-[24px] p-7" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("home.loadingCatalog")}
            </Text>
          </View>
        ) : catalogError ? (
          <View className="mx-5 mt-4 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("home.catalogUnavailable")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {catalogError}
            </Text>
          </View>
        ) : visibleCatalog.length === 0 ? (
          <View className="mx-5 mt-4 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {t("home.noMerchants")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("home.noMerchantsDescription")}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingRight: 28 }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {visibleCatalog.map((outlet, index) => (
              <Pressable
                accessibilityRole="button"
                key={outlet.id}
                onPress={() => router.push(`/outlet/${outlet.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: theme.colors.surface,
                  borderRadius: 24,
                  marginRight: index === visibleCatalog.length - 1 ? 0 : 12,
                  opacity: pressed ? 0.86 : 1,
                  overflow: "hidden",
                  width: 238,
                })}
              >
                <View className="h-[132px] w-full" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  {outlet.imageUrl ? (
                    <Image className="h-full w-full" resizeMode="cover" source={{ uri: outlet.imageUrl }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-[42px] font-black" style={{ color: theme.colors.primary }}>
                        {outlet.businessName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View
                    className="absolute left-3 top-3 flex-row items-center rounded-full px-2.5 py-1.5"
                    style={{
                      backgroundColor: outlet.acceptingOrders
                        ? theme.colors.successSurface
                        : theme.colors.surfaceRaised,
                    }}
                  >
                    <View
                      className="mr-1.5 h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: outlet.acceptingOrders
                          ? theme.colors.success
                          : theme.colors.textMuted,
                      }}
                    />
                    <Text
                      className="text-[8px] font-black uppercase"
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

                <View className="p-4">
                  <Text className="text-[15px] font-black" numberOfLines={1} style={{ color: theme.colors.text }}>
                    {outlet.businessName}
                  </Text>
                  <Text className="mt-1 text-[10px] font-extrabold" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                    {outlet.name} · {t("home.productCount", { count: outlet.productCount })}
                  </Text>
                  <Text className="mt-2 min-h-[32px] text-[10px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>
                    {outlet.addressLine}
                  </Text>
                  <View className="mt-3 flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-[11px] font-black" numberOfLines={1} style={{ color: theme.colors.primary }}>
                      {outlet.minPrice == null
                        ? t("home.menuSoon")
                        : t("home.fromPrice", { price: formatRupiah(outlet.minPrice) })}
                    </Text>
                    <View
                      className="h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.colors.surfaceRaised }}
                    >
                      <NitipIcon color={theme.colors.text} name="next" size={14} />
                    </View>
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
