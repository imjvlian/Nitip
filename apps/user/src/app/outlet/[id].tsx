import { formatRupiah } from "@nitip/domain";
import type { NitipCatalogOutlet, NitipProduct } from "@nitip/domain/catalog";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t("outlet.loadError"));
        }
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

    const outlet = {
      id: catalog.id,
      name: catalog.name,
      businessName: catalog.businessName,
    };
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: cart.itemCount > 0 ? 130 : Math.max(insets.bottom + 24, 40),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Pressable className="min-h-10 justify-center pr-4" onPress={() => router.back()}>
            <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
              ‹ {t("common.back")}
            </Text>
          </Pressable>
          <Text className="text-2xl font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
            nitip.
          </Text>
        </View>

        {loading ? (
          <View
            className="mt-8 items-center rounded-3xl border p-7"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("outlet.loading")}
            </Text>
          </View>
        ) : error || !catalog ? (
          <View
            className="mt-8 rounded-3xl border p-5"
            style={{ backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.border }}
          >
            <Text className="text-base font-black" style={{ color: theme.colors.danger }}>
              {t("outlet.unavailable")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {error ?? t("outlet.catalogNotFound")}
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-8">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: catalog.acceptingOrders
                      ? theme.colors.success
                      : theme.colors.textMuted,
                  }}
                />
                <Text
                  className="text-[10px] font-black uppercase tracking-[1.5px]"
                  style={{ color: catalog.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}
                >
                  {catalog.acceptingOrders ? t("outlet.accepting") : t("outlet.closed")}
                </Text>
              </View>
              <Text className="mt-3 text-4xl font-black tracking-tighter" style={{ color: theme.colors.text }}>
                {catalog.businessName}
              </Text>
              <Text className="mt-2 text-sm font-extrabold" style={{ color: theme.colors.primary }}>
                {catalog.name}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {catalog.addressLine}
              </Text>
            </View>

            {catalog.categories.length === 0 ? (
              <View
                className="mt-7 rounded-3xl border p-5"
                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
              >
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {t("outlet.menuUnavailable")}
                </Text>
                <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                  {t("outlet.menuUnavailableDescription")}
                </Text>
              </View>
            ) : (
              <View className="mt-8 gap-8">
                {catalog.categories.map((category) => (
                  <View key={category.id}>
                    <Text className="text-xl font-black" style={{ color: theme.colors.text }}>
                      {category.name}
                    </Text>
                    {category.description ? (
                      <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                        {category.description}
                      </Text>
                    ) : null}

                    {category.products.length === 0 ? (
                      <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
                        {t("outlet.noProducts")}
                      </Text>
                    ) : (
                      <View className="mt-3 gap-3">
                        {category.products.map((product) => {
                          const quantity =
                            cart.outlet?.id === catalog.id
                              ? cart.items.find((item) => item.product.id === product.id)?.quantity ?? 0
                              : 0;
                          const canAdd = catalog.acceptingOrders && product.isAvailable;

                          return (
                            <View
                              className="flex-row rounded-3xl border p-3"
                              key={product.id}
                              style={{
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                                opacity: product.isAvailable ? 1 : 0.58,
                              }}
                            >
                              {product.imageUrl ? (
                                <Image
                                  className="h-24 w-24 rounded-2xl"
                                  source={{ uri: product.imageUrl }}
                                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                                />
                              ) : (
                                <View
                                  className="h-24 w-24 items-center justify-center rounded-2xl"
                                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                                >
                                  <Text className="text-3xl font-black" style={{ color: theme.colors.primary }}>
                                    N
                                  </Text>
                                </View>
                              )}

                              <View className="flex-1 pl-4">
                                <View className="flex-row items-start justify-between gap-3">
                                  <Text className="flex-1 text-sm font-black" style={{ color: theme.colors.text }}>
                                    {product.name}
                                  </Text>
                                  <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
                                    {formatRupiah(product.price)}
                                  </Text>
                                </View>
                                {product.description ? (
                                  <Text className="mt-1.5 text-[11px] leading-4" numberOfLines={3} style={{ color: theme.colors.textMuted }}>
                                    {product.description}
                                  </Text>
                                ) : null}
                                <Text
                                  className="mt-2 text-[10px] font-black"
                                  style={{ color: product.isAvailable ? theme.colors.success : theme.colors.danger }}
                                >
                                  {product.isAvailable ? t("outlet.available") : t("outlet.unavailableProduct")}
                                </Text>
                                <Pressable
                                  className="mt-3 self-start rounded-full px-4 py-2.5"
                                  disabled={!canAdd}
                                  onPress={() => addProduct(product)}
                                  style={{ backgroundColor: theme.colors.primary, opacity: canAdd ? 1 : 0.4 }}
                                >
                                  <Text className="text-[11px] font-black text-white">
                                    {quantity > 0
                                      ? t("outlet.addAgain", { count: quantity })
                                      : t("outlet.add")}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {cart.itemCount > 0 ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t px-5 pt-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <Pressable
            className="min-h-[54px] flex-row items-center rounded-2xl px-4"
            onPress={() => router.push("/cart")}
            style={{ backgroundColor: theme.colors.primary }}
          >
            <View className="flex-1">
              <Text className="text-xs font-black text-white">
                {t("outlet.cartSummary", { count: cart.itemCount })}
              </Text>
              <Text className="mt-0.5 text-[10px] text-white/80">{cart.outlet?.businessName}</Text>
            </View>
            <Text className="text-sm font-black text-white">{formatRupiah(cart.subtotal)}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
