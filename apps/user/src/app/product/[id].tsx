import { formatRupiah } from "@nitip/domain";
import type { NitipCatalogOutlet } from "@nitip/domain/catalog";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getCatalogOutlet } from "../../lib/api";

const COPY = {
  id: {
    title: "Detail menu",
    loading: "Memuat menu...",
    unavailable: "Menu tidak tersedia",
    unavailableBody: "Menu ini mungkin sudah tidak aktif atau tidak lagi dijual merchant.",
    quantity: "Jumlah",
    addToCart: "Tambah ke keranjang",
    added: "Ditambahkan ke keranjang",
    soldOut: "Stok habis",
    closed: "Merchant sedang tutup",
    available: "Tersedia untuk dipesan",
    stock: "Stok",
    itemsInCart: "di keranjang",
    merchant: "Merchant",
  },
  en: {
    title: "Menu details",
    loading: "Loading menu...",
    unavailable: "Menu unavailable",
    unavailableBody: "This item may no longer be active or sold by the merchant.",
    quantity: "Quantity",
    addToCart: "Add to cart",
    added: "Added to cart",
    soldOut: "Out of stock",
    closed: "Merchant is closed",
    available: "Available to order",
    stock: "Stock",
    itemsInCart: "in cart",
    merchant: "Merchant",
  },
} as const;

export default function ProductDetailScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const { id, outletId } = useLocalSearchParams<{ id: string; outletId?: string }>();
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const copy = COPY[language];

  const [catalog, setCatalog] = useState<NitipCatalogOutlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!outletId) {
      setLoading(false);
      setError(copy.unavailableBody);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getCatalogOutlet(outletId)
      .then((next) => {
        if (active) setCatalog(next);
      })
      .catch((nextError: unknown) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : copy.unavailableBody);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.unavailableBody, outletId]);

  const productEntry = useMemo(() => {
    if (!catalog || !id) return null;

    for (const category of catalog.categories) {
      const product = category.products.find((item) => item.id === id);
      if (product) {
        return { categoryName: category.name, product };
      }
    }

    return null;
  }, [catalog, id]);

  if (!user) return <Redirect href="/login" />;

  const product = productEntry?.product ?? null;
  const rawStockLimit = product?.stockQuantity ?? 99;
  const maxQuantity = Math.max(0, Math.min(99, rawStockLimit));
  const selectedQuantity = Math.min(quantity, Math.max(1, maxQuantity));
  const canAdd = Boolean(
    catalog &&
      product &&
      catalog.acceptingOrders &&
      product.isAvailable &&
      product.isActive &&
      maxQuantity > 0,
  );
  const existingQuantity =
    catalog && product && cart.outlet?.id === catalog.id
      ? cart.items.find((item) => item.product.id === product.id)?.quantity ?? 0
      : 0;

  function addSelectedQuantity() {
    if (!catalog || !product || !canAdd) return;

    const outlet = {
      id: catalog.id,
      name: catalog.name,
      businessName: catalog.businessName,
    };
    const result = cart.addItem(outlet, product, selectedQuantity);

    if (result === "different_outlet") {
      Alert.alert(t("outlet.changeCartTitle"), t("outlet.changeCartDescription"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("outlet.replaceCart"),
          style: "destructive",
          onPress: () => {
            cart.replaceWithItem(outlet, product, selectedQuantity);
            setAdded(true);
          },
        },
      ]);
      return;
    }

    setAdded(true);
  }

  const availabilityLabel = !catalog?.acceptingOrders
    ? copy.closed
    : !product?.isAvailable || maxQuantity <= 0
      ? copy.soldOut
      : copy.available;
  const availabilityColor =
    catalog?.acceptingOrders && product?.isAvailable && maxQuantity > 0
      ? theme.colors.success
      : theme.colors.textMuted;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: product ? 150 : Math.max(insets.bottom + 28, 44),
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="mx-4 mt-3 items-center rounded-[28px] p-8" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {copy.loading}
            </Text>
          </View>
        ) : error || !catalog || !productEntry ? (
          <>
            <Pressable
              className="ml-4 mt-2 h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.back()}
              style={{ backgroundColor: theme.colors.surfaceRaised }}
            >
              <NitipIcon color={theme.colors.text} name="back" size={17} />
            </Pressable>
            <View className="mx-4 mt-5 rounded-[26px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
                {copy.unavailable}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {error ?? copy.unavailableBody}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              className="mx-4 h-[310px] overflow-hidden rounded-[32px]"
              style={{ backgroundColor: theme.colors.surfaceAccent }}
            >
              {product.imageUrl ? (
                <Image className="h-full w-full" resizeMode="cover" source={{ uri: product.imageUrl }} />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                    <NitipIcon color={theme.colors.primary} name="food" size={38} />
                  </View>
                </View>
              )}

              <Pressable
                className="absolute left-3 top-3 h-10 w-10 items-center justify-center rounded-full"
                onPress={() => router.back()}
                style={{ backgroundColor: "rgba(255,255,255,0.94)" }}
              >
                <NitipIcon color="#111318" name="back" size={17} />
              </Pressable>

              {cart.itemCount > 0 ? (
                <Pressable
                  className="absolute right-3 top-3 h-10 min-w-10 flex-row items-center justify-center rounded-full px-3"
                  onPress={() => router.push("/cart")}
                  style={{ backgroundColor: "rgba(255,255,255,0.94)" }}
                >
                  <NitipIcon color="#111318" name="cart" size={16} />
                  <Text className="ml-1.5 text-[9px] font-black" style={{ color: "#111318" }}>
                    {cart.itemCount}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View
              className="mx-5 rounded-[30px] p-5"
              style={{
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderWidth: 1,
                elevation: 6,
                marginTop: -30,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: theme.mode === "dark" ? 0.25 : 0.1,
                shadowRadius: 14,
              }}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="rounded-full px-3 py-2" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                    {productEntry.categoryName}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: availabilityColor }} />
                  <Text className="text-[8px] font-black" style={{ color: availabilityColor }}>
                    {availabilityLabel}
                  </Text>
                </View>
              </View>

              <Text className="mt-4 text-[25px] font-black leading-[30px] tracking-[-0.7px]" style={{ color: theme.colors.text }}>
                {product.name}
              </Text>

              {product.description ? (
                <Text className="mt-2 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
                  {product.description}
                </Text>
              ) : null}

              <Text className="mt-5 text-[20px] font-black" style={{ color: theme.colors.primary }}>
                {formatRupiah(product.price)}
              </Text>
            </View>

            <View className="mx-4 mt-4 rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <Text className="text-[9px] font-black uppercase tracking-[1px]" style={{ color: theme.colors.textMuted }}>
                {copy.merchant}
              </Text>
              <Text className="mt-2 text-[13px] font-black" style={{ color: theme.colors.text }}>
                {catalog.businessName}
              </Text>
              <Text className="mt-1 text-[10px]" style={{ color: theme.colors.primary }}>
                {catalog.name}
              </Text>

              <View className="mt-4 flex-row items-center justify-between gap-3">
                <View className="flex-row items-center">
                  <NitipIcon color={theme.colors.textMuted} name="location" size={13} />
                  <Text className="ml-2 max-w-[245px] text-[9px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>
                    {catalog.addressLine}
                  </Text>
                </View>
              </View>

              <View className="mt-4 h-px" style={{ backgroundColor: theme.colors.border }} />

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-[10px] font-bold" style={{ color: theme.colors.textMuted }}>
                  {copy.stock}
                </Text>
                <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>
                  {product.stockQuantity == null ? "—" : product.stockQuantity}
                </Text>
              </View>

              {existingQuantity > 0 ? (
                <View className="mt-3 rounded-2xl px-3 py-2.5" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                    {existingQuantity} {copy.itemsInCart}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {catalog && product ? (
        <View
          className="absolute bottom-0 left-0 right-0 px-4 pt-3"
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            paddingBottom: Math.max(insets.bottom, 12),
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: theme.mode === "dark" ? 0.22 : 0.08,
            shadowRadius: 14,
            elevation: 12,
          }}
        >
          <Text className="mb-2 text-[9px] font-black" style={{ color: theme.colors.textMuted }}>
            {copy.quantity}
          </Text>

          <View className="flex-row items-center gap-3">
            <View
              className="h-[52px] flex-row items-center rounded-full px-1.5"
              style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }}
            >
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                disabled={selectedQuantity <= 1}
                onPress={() => {
                  setAdded(false);
                  setQuantity((current) => Math.max(1, current - 1));
                }}
                style={{ opacity: selectedQuantity <= 1 ? 0.35 : 1 }}
              >
                <NitipIcon color={theme.colors.text} name="minus" size={16} />
              </Pressable>

              <Text className="min-w-8 text-center text-[13px] font-black" style={{ color: theme.colors.text }}>
                {selectedQuantity}
              </Text>

              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                disabled={!canAdd || selectedQuantity >= maxQuantity}
                onPress={() => {
                  setAdded(false);
                  setQuantity((current) => Math.min(maxQuantity, current + 1));
                }}
                style={{ opacity: !canAdd || selectedQuantity >= maxQuantity ? 0.35 : 1 }}
              >
                <NitipIcon color={theme.colors.text} name="plus" size={16} />
              </Pressable>
            </View>

            <Pressable
              className="min-h-[52px] flex-1 flex-row items-center justify-center rounded-full px-4"
              disabled={!canAdd}
              onPress={addSelectedQuantity}
              style={{ backgroundColor: theme.colors.primary, opacity: canAdd ? 1 : 0.42 }}
            >
              <NitipIcon color="#FFFFFF" name="cart" size={16} />
              <View className="ml-2 flex-1">
                <Text className="text-[10px] font-black text-white" numberOfLines={1}>
                  {added ? copy.added : copy.addToCart}
                </Text>
              </View>
              <Text className="text-[10px] font-black text-white">
                {formatRupiah(product.price * selectedQuantity)}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
