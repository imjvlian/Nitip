import { formatRupiah } from "@nitip/domain";
import type { NitipCatalogOutlet, NitipProduct } from "@nitip/domain/catalog";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../../components/BackButton";
import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getCatalogOutlet } from "../../lib/api";

export default function CatalogOutletScreen() {
  const { t } = useNitipTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [catalog, setCatalog] = useState<NitipCatalogOutlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    getCatalogOutlet(id)
      .then((next) => {
        if (active) setCatalog(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : t("outlet.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, t]);

  if (!user) return <Redirect href="/login" />;

  function addProduct(product: NitipProduct) {
    if (!catalog || !catalog.acceptingOrders || !product.isAvailable) return;

    const outlet = { id: catalog.id, name: catalog.name, businessName: catalog.businessName };
    const result = cart.addItem(outlet, product);

    if (result === "different_outlet") {
      Alert.alert(t("outlet.changeCartTitle"), t("outlet.changeCartDescription"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("outlet.replaceCart"),
          style: "destructive",
          onPress: () => cart.replaceWithItem(outlet, product),
        },
      ]);
    }
  }

  const heroImage =
    catalog?.categories
      .flatMap((category) => category.products)
      .find((product) => Boolean(product.imageUrl))?.imageUrl ?? null;
  const hasRating = Boolean(catalog && catalog.ratingCount > 0 && catalog.ratingAverage != null);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: cart.itemCount > 0 ? 132 : Math.max(insets.bottom + 28, 44),
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="mx-4 mt-3 items-center rounded-[28px] p-8" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("outlet.loading")}
            </Text>
          </View>
        ) : error || !catalog ? (
          <>
            <BackButton style={{ marginLeft: 16, marginTop: 8 }} />
            <View className="mx-4 mt-5 rounded-[26px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
                {t("outlet.unavailable")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {error ?? t("outlet.catalogNotFound")}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              className="mx-4 h-[220px] overflow-hidden rounded-[30px]"
              style={{ backgroundColor: theme.colors.surfaceAccent }}
            >
              {heroImage ? (
                <Image className="h-full w-full" resizeMode="cover" source={{ uri: heroImage }} />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                    <NitipIcon color={theme.colors.primary} name="store" size={31} />
                  </View>
                </View>
              )}

              <BackButton style={{ left: 12, position: "absolute", top: 12 }} />

              <View
                className="absolute right-3 top-3 flex-row items-center rounded-full px-3 py-2"
                style={{ backgroundColor: "rgba(255,255,255,0.92)" }}
              >
                <View
                  className="mr-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: catalog.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}
                />
                <Text
                  className="text-[8px] font-black uppercase"
                  style={{ color: catalog.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}
                >
                  {catalog.acceptingOrders ? t("outlet.accepting") : t("outlet.closed")}
                </Text>
              </View>
            </View>

            <View
              className="mx-5 rounded-[28px] px-5 pb-5 pt-5"
              style={{
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderWidth: 1,
                elevation: 6,
                marginTop: -28,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: theme.mode === "dark" ? 0.25 : 0.1,
                shadowRadius: 14,
              }}
            >
              <Text className="text-[23px] font-black tracking-[-0.6px]" style={{ color: theme.colors.text }}>
                {catalog.businessName}
              </Text>
              <Text className="mt-1 text-[11px] font-black" style={{ color: theme.colors.primary }}>
                {catalog.name}
              </Text>

              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <View className="flex-row items-center rounded-full px-3 py-2" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  <Text className="mr-1 text-[10px]" style={{ color: "#F4B400" }}>★</Text>
                  <Text className="text-[9px] font-black" style={{ color: theme.colors.text }}>
                    {hasRating ? `${catalog.ratingAverage?.toFixed(1)} (${catalog.ratingCount})` : "—"}
                  </Text>
                </View>
                <View className="flex-row items-center rounded-full px-3 py-2" style={{ backgroundColor: theme.colors.surface }}>
                  <NitipIcon color={theme.colors.primary} name="location" size={12} />
                  <Text className="ml-1.5 max-w-[220px] text-[9px] font-bold" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                    {catalog.addressLine}
                  </Text>
                </View>
              </View>
            </View>

            {catalog.categories.length === 0 ? (
              <View className="mx-4 mt-5 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
                  {t("outlet.menuUnavailable")}
                </Text>
                <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                  {t("outlet.menuUnavailableDescription")}
                </Text>
              </View>
            ) : (
              <View className="mt-7">
                <ScrollView
                  contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 28 }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {catalog.categories.map((category, index) => (
                    <View
                      className="rounded-full px-4 py-2.5"
                      key={category.id}
                      style={{
                        backgroundColor: index === 0 ? theme.colors.primary : theme.colors.surfaceRaised,
                        borderColor: index === 0 ? theme.colors.primary : theme.colors.border,
                        borderWidth: 1,
                        marginRight: 8,
                      }}
                    >
                      <Text className="text-[10px] font-black" style={{ color: index === 0 ? "#FFFFFF" : theme.colors.text }}>
                        {category.name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View className="mt-6 gap-7 px-4">
                  {catalog.categories.map((category) => (
                    <View key={category.id}>
                      <Text className="text-[15px] font-black" style={{ color: theme.colors.text }}>
                        {category.name}
                      </Text>
                      {category.description ? (
                        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                          {category.description}
                        </Text>
                      ) : null}

                      {category.products.length === 0 ? (
                        <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
                          {t("outlet.noProducts")}
                        </Text>
                      ) : (
                        <View className="mt-3 flex-row flex-wrap justify-between">
                          {category.products.map((product) => {
                            const quantity =
                              cart.outlet?.id === catalog.id
                                ? cart.items.find((item) => item.product.id === product.id)?.quantity ?? 0
                                : 0;
                            const canAdd = catalog.acceptingOrders && product.isAvailable;

                            return (
                              <View
                                className="mb-3 overflow-hidden rounded-[22px]"
                                key={product.id}
                                style={{
                                  backgroundColor: theme.colors.surfaceRaised,
                                  borderColor: theme.colors.border,
                                  borderWidth: 1,
                                  opacity: product.isAvailable ? 1 : 0.58,
                                  width: "48.5%",
                                }}
                              >
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() =>
                                    router.push({
                                      pathname: "/product/[id]",
                                      params: { id: product.id, outletId: catalog.id },
                                    })
                                  }
                                  style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
                                >
                                  {product.imageUrl ? (
                                    <Image
                                      className="h-[118px] w-full"
                                      resizeMode="cover"
                                      source={{ uri: product.imageUrl }}
                                      style={{ backgroundColor: theme.colors.surfaceAccent }}
                                    />
                                  ) : (
                                    <View className="h-[118px] items-center justify-center" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                                      <NitipIcon color={theme.colors.primary} name="food" size={28} />
                                    </View>
                                  )}

                                  <View className="px-3 pt-3">
                                    <Text className="text-[11px] font-black leading-4" numberOfLines={2} style={{ color: theme.colors.text }}>
                                      {product.name}
                                    </Text>
                                    {product.description ? (
                                      <Text className="mt-1 text-[8px] leading-3.5" numberOfLines={2} style={{ color: theme.colors.textMuted }}>
                                        {product.description}
                                      </Text>
                                    ) : null}
                                  </View>
                                </Pressable>

                                <View className="px-3 pb-3 pt-3">
                                  <View className="flex-row items-center justify-between gap-2">
                                    <Text className="flex-1 text-[10px] font-black" numberOfLines={1} style={{ color: theme.colors.text }}>
                                      {formatRupiah(product.price)}
                                    </Text>
                                    <Pressable
                                      className="h-8 w-8 items-center justify-center rounded-full"
                                      disabled={!canAdd}
                                      onPress={() => addProduct(product)}
                                      style={{ backgroundColor: theme.colors.primary, opacity: canAdd ? 1 : 0.4 }}
                                    >
                                      <NitipIcon color="#FFFFFF" name="plus" size={14} />
                                    </Pressable>
                                  </View>
                                  {quantity > 0 ? (
                                    <Text className="mt-2 text-[8px] font-black" style={{ color: theme.colors.primary }}>
                                      {t("outlet.addAgain", { count: quantity })}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {cart.itemCount > 0 ? (
        <View
          className="absolute bottom-0 left-0 right-0 px-4 pt-3"
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            paddingBottom: Math.max(insets.bottom, 12),
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: theme.mode === "dark" ? 0.22 : 0.06,
            shadowRadius: 14,
            elevation: 10,
          }}
        >
          <Pressable
            className="min-h-[52px] flex-row items-center rounded-full px-4"
            onPress={() => router.push("/cart")}
            style={{ backgroundColor: theme.colors.primary }}
          >
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <NitipIcon color="#FFFFFF" name="cart" size={17} />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-black text-white">
                {t("outlet.cartSummary", { count: cart.itemCount })}
              </Text>
              <Text className="mt-0.5 text-[9px] text-white/80">{cart.outlet?.businessName}</Text>
            </View>
            <Text className="text-xs font-black text-white">{formatRupiah(cart.subtotal)}</Text>
            <View className="ml-2">
              <NitipIcon color="#FFFFFF" name="next" size={16} />
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
