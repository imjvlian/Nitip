import { formatRupiah, type NitipAddress } from "@nitip/domain";
import type { NitipCheckoutQuote, NitipCheckoutRequest } from "@nitip/domain/commerce";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { createOrder, getCheckoutQuote, listAddresses } from "../lib/api";

export default function CheckoutScreen() {
  const { t } = useNitipTranslation();
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [quote, setQuote] = useState<NitipCheckoutQuote | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingAddresses(true);
    listAddresses(user)
      .then((items) => {
        if (!active) return;
        setAddresses(items);
        const preferred = items.find((item) => item.isDefault) ?? items[0];
        setAddressId((current) => current || preferred?.id || "");
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : t("checkout.addressError"));
      })
      .finally(() => {
        if (active) setLoadingAddresses(false);
      });
    return () => {
      active = false;
    };
  }, [t, user]);

  const request = useMemo<NitipCheckoutRequest | null>(() => {
    if (!cart.outlet || !addressId || cart.items.length === 0) return null;
    return {
      outletId: cart.outlet.id,
      addressId,
      items: cart.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        addonIds: item.selectedAddons.map((addon) => addon.id),
      })),
    };
  }, [addressId, cart.items, cart.outlet]);

  useEffect(() => {
    if (!user || !request) {
      setQuote(null);
      return;
    }

    let active = true;
    setLoadingQuote(true);
    setError(null);
    getCheckoutQuote(user, request)
      .then((nextQuote) => {
        if (active) setQuote(nextQuote);
      })
      .catch((nextError: unknown) => {
        if (active) {
          setQuote(null);
          setError(nextError instanceof Error ? nextError.message : t("checkout.quoteError"));
        }
      })
      .finally(() => {
        if (active) setLoadingQuote(false);
      });

    return () => {
      active = false;
    };
  }, [request, t, user]);

  if (!user) return <Redirect href="/login" />;

  function addressLabel(address: NitipAddress) {
    if (address.label === "home") return t("address.home");
    if (address.label === "office") return t("address.office");
    return address.customLabel || t("address.other");
  }

  async function submitOrder() {
    if (!request) return;
    setCreating(true);
    setError(null);
    try {
      const order = await createOrder(user, request);
      cart.clearCart();
      router.replace({ pathname: "/order/[id]", params: { id: order.id } });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("checkout.createError"));
    } finally {
      setCreating(false);
    }
  }

  if (cart.items.length === 0 || !cart.outlet) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="mb-4 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
          <NitipIcon color={theme.colors.primary} name="cart" size={21} />
        </View>
        <Text className="text-center text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {t("checkout.emptyCart")}
        </Text>
        <Pressable className="mt-5 min-h-12 w-full flex-row items-center justify-center gap-2 rounded-2xl" onPress={() => router.replace("/home")} style={{ backgroundColor: theme.colors.primary }}>
          <NitipIcon color="#FFFFFF" name="home" size={17} />
          <Text className="text-xs font-black text-white">{t("checkout.backHome")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 165 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => router.back()} style={{ backgroundColor: theme.colors.surface }}>
            <NitipIcon color={theme.colors.text} name="back" size={18} />
          </Pressable>
          <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
            {t("checkout.eyebrow")}
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-7">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {t("checkout.title")}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
            {cart.outlet.businessName} · {cart.outlet.name}
          </Text>
        </View>

        <Text className="mt-7 text-sm font-black" style={{ color: theme.colors.text }}>
          {t("checkout.deliveryAddress")}
        </Text>

        {loadingAddresses ? (
          <View className="mt-3 items-center rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-2 text-xs" style={{ color: theme.colors.textMuted }}>{t("checkout.loadingAddresses")}</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View className="mt-3 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>{t("checkout.noAddressTitle")}</Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>{t("checkout.noAddressDescription")}</Text>
            <Pressable className="mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-2xl" onPress={() => router.push("/address/new")} style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <NitipIcon color={theme.colors.primary} name="plus" size={16} />
              <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>{t("checkout.addAddress")}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-3 gap-2">
            {addresses.map((address) => {
              const selected = addressId === address.id;
              return (
                <Pressable
                  className="rounded-[24px] p-4"
                  key={address.id}
                  onPress={() => setAddressId(address.id)}
                  style={{
                    backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : "transparent",
                    borderWidth: selected ? 1.5 : 0,
                  }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-xs font-black" style={{ color: theme.colors.text }}>{addressLabel(address)}</Text>
                    {selected ? (
                      <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.primary }}>
                        <NitipIcon color="#FFFFFF" name="check" size={13} />
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-2 text-[11px] font-extrabold" style={{ color: theme.colors.primary }}>{address.recipientName} · {address.phoneNumber}</Text>
                  <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{address.addressLine}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text className="mt-7 text-sm font-black" style={{ color: theme.colors.text }}>{t("checkout.summary")}</Text>

        {loadingQuote ? (
          <View className="mt-3 items-center rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-2 text-xs" style={{ color: theme.colors.textMuted }}>{t("checkout.validating")}</Text>
          </View>
        ) : quote ? (
          <View className="mt-3 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            {quote.items.map((item) => (
              <View className="py-1.5" key={item.productId}>
                <View className="flex-row justify-between gap-4">
                  <Text className="flex-1 text-[10px]" style={{ color: theme.colors.textMuted }}>{item.quantity}× {item.name}</Text>
                  <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(item.lineTotal)}</Text>
                </View>
                {(item.addons ?? []).length > 0 ? (
                  <View className="mt-1 pl-3">
                    {(item.addons ?? []).map((addon) => (
                      <Text key={addon.id} className="text-[8px] leading-3.5" style={{ color: theme.colors.textMuted }}>
                        + {addon.name}{addon.price > 0 ? ` · ${formatRupiah(addon.price)}` : ""}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            <View className="my-3 h-px" style={{ backgroundColor: theme.colors.border }} />
            <View className="flex-row justify-between py-1.5"><Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>{t("common.subtotal")}</Text><Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(quote.subtotal)}</Text></View>
            <View className="flex-row justify-between py-1.5"><Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>{t("common.deliveryFee")}</Text><Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(quote.deliveryFare)}</Text></View>
            <View className="flex-row justify-between py-1.5"><Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>{t("common.serviceFee")}</Text><Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(quote.serviceFee)}</Text></View>
            <View className="mt-3 flex-row justify-between border-t pt-4" style={{ borderTopColor: theme.colors.border }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.text }}>{t("common.total")}</Text>
              <Text className="text-base font-black" style={{ color: theme.colors.primary }}>{formatRupiah(quote.customerTotal)}</Text>
            </View>
            <Text className="mt-4 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
              {quote.distanceMethod === "minimum_fare_fallback"
                ? t("checkout.distanceFallback")
                : t("checkout.distanceHaversine", { distance: quote.distanceKm?.toFixed(2) ?? "-" })}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-xs leading-5" style={{ color: theme.colors.danger }}>{error}</Text>
          </View>
        ) : null}

        <Text className="mt-4 text-center text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{t("checkout.paymentNote")}</Text>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 px-5 pt-3"
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
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="text-[9px] font-bold" style={{ color: theme.colors.textMuted }}>{t("common.total")}</Text>
            <Text className="mt-0.5 text-sm font-black" style={{ color: theme.colors.text }}>{quote ? formatRupiah(quote.customerTotal) : "—"}</Text>
          </View>
          <Pressable
            className="min-h-[52px] flex-[1.45] flex-row items-center justify-center gap-2 rounded-2xl px-4"
            disabled={!quote || creating}
            onPress={() => void submitOrder()}
            style={{ backgroundColor: theme.colors.primary, opacity: !quote || creating ? 0.45 : 1 }}
          >
            {creating ? <ActivityIndicator color="#FFFFFF" /> : <><NitipIcon color="#FFFFFF" name="receipt" size={17} /><Text className="text-center text-xs font-black text-white">{t("checkout.createOrder")}</Text></>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
