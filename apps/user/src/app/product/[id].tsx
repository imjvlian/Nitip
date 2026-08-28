import { formatRupiah } from "@nitip/domain";
import type { NitipCatalogOutlet, NitipProductAddon } from "@nitip/domain/catalog";
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

import { BackButton } from "../../components/BackButton";
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
    cart: "Keranjang",
    addToCart: "Tambah ke keranjang",
    added: "Ditambahkan ke keranjang",
    soldOut: "Stok habis",
    closed: "Merchant sedang tutup",
    available: "Tersedia untuk dipesan",
    stock: "Stok",
    itemsInCart: "di keranjang",
    merchant: "Merchant",
    addons: "Add-ons",
    addonsDescription: "Pilih ekstra untuk menu ini. Harga di bawah akan ditambahkan per item.",
    noExtraCharge: "Gratis",
    selected: "dipilih",
  },
  en: {
    title: "Menu details",
    loading: "Loading menu...",
    unavailable: "Menu unavailable",
    unavailableBody: "This item may no longer be active or sold by the merchant.",
    quantity: "Quantity",
    cart: "Cart",
    addToCart: "Add to cart",
    added: "Added to cart",
    soldOut: "Out of stock",
    closed: "Merchant is closed",
    available: "Available to order",
    stock: "Stock",
    itemsInCart: "in cart",
    merchant: "Merchant",
    addons: "Add-ons",
    addonsDescription: "Choose optional extras for this item. Prices below are added per item.",
    noExtraCharge: "Free",
    selected: "selected",
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
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
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
        if (active) setError(nextError instanceof Error ? nextError.message : copy.unavailableBody);
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
      if (product) return { categoryName: category.name, product };
    }
    return null;
  }, [catalog, id]);

  const product = productEntry?.product ?? null;
  const availableAddons = useMemo(
    () => product?.addons.filter((addon) => addon.isAvailable) ?? [],
    [product],
  );
  const selectedAddons = useMemo<NitipProductAddon[]>(() => {
    const selected = new Set(selectedAddonIds);
    return availableAddons.filter((addon) => selected.has(addon.id));
  }, [availableAddons, selectedAddonIds]);

  const existingLine = useMemo(() => {
    if (!catalog || !product || cart.outlet?.id !== catalog.id) return null;
    return cart.items.find((item) => item.product.id === product.id) ?? null;
  }, [cart.items, cart.outlet?.id, catalog, product]);

  useEffect(() => {
    if (!product) return;
    setSelectedAddonIds(
      (existingLine?.selectedAddons ?? [])
        .filter((addon) => product.addons.some((current) => current.id === addon.id && current.isAvailable))
        .map((addon) => addon.id),
    );
  }, [existingLine?.product.id, product?.id]);

  if (!user) return <Redirect href="/login" />;

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
  const addonsTotal = selectedAddons.reduce((total, addon) => total + addon.price, 0);
  const unitPrice = (product?.price ?? 0) + addonsTotal;
  const totalPrice = unitPrice * selectedQuantity;

  function toggleAddon(addonId: string) {
    setAdded(false);
    setSelectedAddonIds((current) =>
      current.includes(addonId)
        ? current.filter((idValue) => idValue !== addonId)
        : [...current, addonId],
    );
  }

  function addSelectedQuantity() {
    if (!catalog || !product || !canAdd) return;
    const outlet = {
      id: catalog.id,
      name: catalog.name,
      businessName: catalog.businessName,
    };
    const finish = () => setAdded(true);
    const result = cart.addItem(outlet, product, selectedQuantity, selectedAddons);
    if (result === "different_outlet") {
      Alert.alert(t("outlet.changeCartTitle"), t("outlet.changeCartDescription"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("outlet.replaceCart"),
          style: "destructive",
          onPress: () => {
            cart.replaceWithItem(outlet, product, selectedQuantity, selectedAddons);
            finish();
          },
        },
      ]);
      return;
    }
    finish();
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
          paddingBottom: product ? 168 : Math.max(insets.bottom + 28, 44),
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="mx-4 mt-3 items-center rounded-[28px] p-8" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>{copy.loading}</Text>
          </View>
        ) : error || !catalog || !productEntry || !product ? (
          <>
            <BackButton style={{ marginLeft: 16, marginTop: 8 }} />
            <View className="mx-4 mt-5 rounded-[26px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>{copy.unavailable}</Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>{error ?? copy.unavailableBody}</Text>
            </View>
          </>
        ) : (
          <>
            <View className="mx-4 h-[310px] overflow-hidden rounded-[32px]" style={{ backgroundColor: theme.colors.surfaceAccent }}>
              {product.imageUrl ? (
                <Image className="h-full w-full" resizeMode="cover" source={{ uri: product.imageUrl }} />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                    <NitipIcon color={theme.colors.primary} name="food" size={38} />
                  </View>
                </View>
              )}
              <BackButton style={{ left: 12, position: "absolute", top: 12 }} />
              {cart.itemCount > 0 ? (
                <Pressable className="absolute right-3 top-3 h-10 min-w-10 flex-row items-center justify-center rounded-full px-3" onPress={() => router.push("/cart")} style={{ backgroundColor: "rgba(255,255,255,0.94)" }}>
                  <NitipIcon color="#111318" name="cart" size={16} />
                  <Text className="ml-1.5 text-[9px] font-black" style={{ color: "#111318" }}>{cart.itemCount}</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mx-5 rounded-[30px] p-5" style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderWidth: 1, elevation: 6, marginTop: -30, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: theme.mode === "dark" ? 0.25 : 0.1, shadowRadius: 14 }}>
              <View className="flex-row items-center justify-between gap-3">
                <View className="rounded-full px-3 py-2" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                  <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>{productEntry.categoryName}</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: availabilityColor }} />
                  <Text className="text-[8px] font-black" style={{ color: availabilityColor }}>{availabilityLabel}</Text>
                </View>
              </View>
              <Text className="mt-4 text-[25px] font-black leading-[30px] tracking-[-0.7px]" style={{ color: theme.colors.text }}>{product.name}</Text>
              <Text className="mt-2 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>{product.description}</Text>
              <Text className="mt-5 text-[20px] font-black" style={{ color: theme.colors.primary }}>{formatRupiah(product.price)}</Text>
            </View>

            {availableAddons.length > 0 ? (
              <View className="mx-4 mt-4 rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                <Text className="text-[14px] font-black" style={{ color: theme.colors.text }}>{copy.addons}</Text>
                <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.addonsDescription}</Text>
                <View className="mt-3 gap-2">
                  {availableAddons.map((addon) => {
                    const selected = selectedAddonIds.includes(addon.id);
                    return (
                      <Pressable key={addon.id} className="min-h-[54px] flex-row items-center rounded-[18px] px-3.5" onPress={() => toggleAddon(addon.id)} style={{ backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.surface, borderColor: selected ? theme.colors.primary : theme.colors.border, borderWidth: 1 }}>
                        <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised }}>
                          {selected ? <NitipIcon color="#FFFFFF" name="check" size={12} /> : null}
                        </View>
                        <Text className="ml-3 flex-1 text-[10px] font-black" style={{ color: theme.colors.text }}>{addon.name}</Text>
                        <Text className="text-[10px] font-black" style={{ color: addon.price > 0 ? theme.colors.primary : theme.colors.textMuted }}>
                          {addon.price > 0 ? `+${formatRupiah(addon.price)}` : copy.noExtraCharge}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {selectedAddons.length > 0 ? (
                  <Text className="mt-3 text-[9px] font-black" style={{ color: theme.colors.primary }}>
                    {selectedAddons.length} {copy.selected} · +{formatRupiah(addonsTotal)} / item
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="mx-4 mt-4 rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <Text className="text-[9px] font-black uppercase tracking-[1px]" style={{ color: theme.colors.textMuted }}>{copy.merchant}</Text>
              <Text className="mt-1 text-[13px] font-black" style={{ color: theme.colors.text }}>{catalog.businessName}</Text>
              <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{catalog.name} · {catalog.addressLine}</Text>
            </View>

            <View className="mx-4 mt-4 flex-row items-center justify-between rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <View>
                <Text className="text-[9px] font-black" style={{ color: theme.colors.textMuted }}>{copy.quantity}</Text>
                <Text className="mt-1 text-[9px]" style={{ color: theme.colors.textMuted }}>
                  {product.stockQuantity == null ? `${copy.stock}: ∞` : `${copy.stock}: ${product.stockQuantity}`}
                  {existingLine ? ` · ${existingLine.quantity} ${copy.itemsInCart}` : ""}
                </Text>
              </View>
              <View className="flex-row items-center rounded-full p-1" style={{ backgroundColor: theme.colors.surface }}>
                <Pressable className="h-9 w-9 items-center justify-center rounded-full" disabled={selectedQuantity <= 1} onPress={() => { setAdded(false); setQuantity((current) => Math.max(1, current - 1)); }} style={{ opacity: selectedQuantity <= 1 ? 0.35 : 1 }}>
                  <NitipIcon color={theme.colors.text} name="minus" size={15} />
                </Pressable>
                <Text className="min-w-10 text-center text-[12px] font-black" style={{ color: theme.colors.text }}>{selectedQuantity}</Text>
                <Pressable className="h-9 w-9 items-center justify-center rounded-full" disabled={selectedQuantity >= maxQuantity} onPress={() => { setAdded(false); setQuantity((current) => Math.min(maxQuantity, current + 1)); }} style={{ opacity: selectedQuantity >= maxQuantity ? 0.35 : 1 }}>
                  <NitipIcon color={theme.colors.text} name="plus" size={15} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {product ? (
        <View className="absolute bottom-0 left-0 right-0 px-4 pt-3" style={{ backgroundColor: theme.colors.surfaceRaised, paddingBottom: Math.max(insets.bottom, 12), shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: -5 }, shadowOpacity: theme.mode === "dark" ? 0.22 : 0.06, shadowRadius: 14, elevation: 10 }}>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel={added ? copy.added : copy.addToCart}
              className="min-h-[56px] flex-[4] flex-row items-center rounded-full px-5"
              disabled={!canAdd}
              onPress={addSelectedQuantity}
              style={{ backgroundColor: theme.colors.primary, opacity: canAdd ? 1 : 0.42 }}
            >
              <View className="flex-1">
                <Text className="text-[11px] font-black text-white">{added ? copy.added : copy.addToCart}</Text>
                <Text className="mt-0.5 text-[9px] text-white/75">{selectedQuantity} × {formatRupiah(unitPrice)}</Text>
              </View>
              <Text className="text-[13px] font-black text-white">{formatRupiah(totalPrice)}</Text>
              <View className="ml-2"><NitipIcon color="#FFFFFF" name={added ? "check" : "plus"} size={17} /></View>
            </Pressable>

            <Pressable
              accessibilityLabel={copy.cart}
              className="min-h-[56px] flex-1 items-center justify-center rounded-full"
              onPress={() => router.push("/cart")}
              style={{
                backgroundColor: theme.colors.surfaceAccent,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              }}
            >
              <View className="relative items-center justify-center">
                <NitipIcon color={theme.colors.primary} name="cart" size={19} />
                {cart.itemCount > 0 ? (
                  <View className="absolute -right-3 -top-3 min-w-4 items-center justify-center rounded-full px-1" style={{ backgroundColor: theme.colors.primary }}>
                    <Text className="text-[7px] font-black text-white">{cart.itemCount > 99 ? "99+" : cart.itemCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
