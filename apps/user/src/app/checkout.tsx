import { formatRupiah, type NitipAddress } from "@nitip/domain";
import type { NitipCheckoutQuote, NitipCheckoutRequest } from "@nitip/domain/commerce";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
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
      <View
        style={[
          styles.emptyScreen,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
          <NitipIcon color={theme.colors.primary} name="cart" size={22} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("checkout.emptyCart")}</Text>
        <Pressable onPress={() => router.replace("/home")} style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}>
          <NitipIcon color="#FFFFFF" name="home" size={17} />
          <Text style={styles.emptyButtonText}>{t("checkout.backHome")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={t("checkout.eyebrow")} />

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{t("checkout.title")}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>
            {cart.outlet.businessName} · {cart.outlet.name}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("checkout.deliveryAddress")}</Text>

        {loadingAddresses ? (
          <View style={[styles.card, styles.centeredCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>{t("checkout.loadingAddresses")}</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t("checkout.noAddressTitle")}</Text>
            <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{t("checkout.noAddressDescription")}</Text>
            <Pressable onPress={() => router.push("/address/new")} style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name="plus" size={16} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>{t("checkout.addAddress")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => {
              const selected = addressId === address.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={address.id}
                  onPress={() => setAddressId(address.id)}
                  style={[
                    styles.addressCard,
                    {
                      backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.addressTop}>
                    <View style={[styles.addressIcon, { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAccent }]}>
                      <NitipIcon color={selected ? "#FFFFFF" : theme.colors.primary} name="location" size={16} />
                    </View>
                    <View style={styles.addressCopy}>
                      <Text style={[styles.addressLabel, { color: theme.colors.text }]}>{addressLabel(address)}</Text>
                      <Text style={[styles.recipient, { color: theme.colors.primary }]}>{address.recipientName} · {address.phoneNumber}</Text>
                    </View>
                    {selected ? (
                      <View style={[styles.check, { backgroundColor: theme.colors.primary }]}>
                        <NitipIcon color="#FFFFFF" name="check" size={12} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.addressLine, { color: theme.colors.textMuted }]}>{address.addressLine}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("checkout.summary")}</Text>

        {loadingQuote ? (
          <View style={[styles.card, styles.centeredCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>{t("checkout.validating")}</Text>
          </View>
        ) : quote ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {quote.items.map((item) => (
              <View style={styles.quoteItem} key={item.productId}>
                <View style={styles.quoteRow}>
                  <Text style={[styles.quoteName, { color: theme.colors.textMuted }]}>{item.quantity}× {item.name}</Text>
                  <Text style={[styles.quotePrice, { color: theme.colors.text }]}>{formatRupiah(item.lineTotal)}</Text>
                </View>
                {(item.addons ?? []).length > 0 ? (
                  <View style={styles.quoteAddons}>
                    {(item.addons ?? []).map((addon) => (
                      <Text key={addon.id} style={[styles.quoteAddon, { color: theme.colors.textMuted }]}>
                        + {addon.name}{addon.price > 0 ? ` · ${formatRupiah(addon.price)}` : ""}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.moneyRow}><Text style={[styles.moneyLabel, { color: theme.colors.textMuted }]}>{t("common.subtotal")}</Text><Text style={[styles.moneyValue, { color: theme.colors.text }]}>{formatRupiah(quote.subtotal)}</Text></View>
            <View style={styles.moneyRow}><Text style={[styles.moneyLabel, { color: theme.colors.textMuted }]}>{t("common.deliveryFee")}</Text><Text style={[styles.moneyValue, { color: theme.colors.text }]}>{formatRupiah(quote.deliveryFare)}</Text></View>
            <View style={styles.moneyRow}><Text style={[styles.moneyLabel, { color: theme.colors.textMuted }]}>{t("common.serviceFee")}</Text><Text style={[styles.moneyValue, { color: theme.colors.text }]}>{formatRupiah(quote.serviceFee)}</Text></View>
            <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>{t("common.total")}</Text>
              <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{formatRupiah(quote.customerTotal)}</Text>
            </View>
            <Text style={[styles.distanceNote, { color: theme.colors.textMuted }]}>
              {quote.distanceMethod === "minimum_fare_fallback"
                ? t("checkout.distanceFallback")
                : t("checkout.distanceHaversine", { distance: quote.distanceKm?.toFixed(2) ?? "-" })}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <Text style={[styles.paymentNote, { color: theme.colors.textMuted }]}>{t("checkout.paymentNote")}</Text>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <View style={styles.bottomCopy}>
          <Text style={[styles.bottomLabel, { color: theme.colors.textMuted }]}>{t("common.total")}</Text>
          <Text style={[styles.bottomTotal, { color: theme.colors.text }]}>{quote ? formatRupiah(quote.customerTotal) : "—"}</Text>
        </View>
        <Pressable
          disabled={!quote || creating}
          onPress={() => void submitOrder()}
          style={[
            styles.orderButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: !quote || creating ? 0.45 : 1,
            },
          ]}
        >
          {creating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <NitipIcon color="#FFFFFF" name="receipt" size={17} />
              <Text style={styles.orderButtonText}>{t("checkout.createOrder")}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, paddingHorizontal: 20 },
  hero: { marginTop: 26 },
  heroTitle: { fontSize: 27, fontWeight: "900", letterSpacing: -0.7 },
  heroSubtitle: { fontSize: 11, marginTop: 5 },
  sectionTitle: { fontSize: 13, fontWeight: "900", marginTop: 24 },
  card: { borderRadius: 20, borderWidth: 1, marginTop: 10, padding: 16 },
  centeredCard: { alignItems: "center", paddingVertical: 22 },
  loadingText: { fontSize: 10, marginTop: 9 },
  cardTitle: { fontSize: 13, fontWeight: "900" },
  cardBody: { fontSize: 10, lineHeight: 17, marginTop: 5 },
  secondaryButton: { alignItems: "center", borderRadius: 15, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 14, minHeight: 44 },
  secondaryButtonText: { fontSize: 10, fontWeight: "900" },
  addressList: { gap: 9, marginTop: 10 },
  addressCard: { borderRadius: 18, borderWidth: 1, padding: 13 },
  addressTop: { alignItems: "center", flexDirection: "row" },
  addressIcon: { alignItems: "center", borderRadius: 19, height: 38, justifyContent: "center", width: 38 },
  addressCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  addressLabel: { fontSize: 11, fontWeight: "900" },
  recipient: { fontSize: 9, fontWeight: "800", marginTop: 2 },
  check: { alignItems: "center", borderRadius: 13, height: 26, justifyContent: "center", width: 26 },
  addressLine: { fontSize: 9, lineHeight: 14, marginTop: 9, paddingLeft: 49 },
  quoteItem: { paddingVertical: 5 },
  quoteRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  quoteName: { flex: 1, fontSize: 9 },
  quotePrice: { fontSize: 9, fontWeight: "800" },
  quoteAddons: { marginTop: 3, paddingLeft: 12 },
  quoteAddon: { fontSize: 8, lineHeight: 12 },
  divider: { height: 1, marginVertical: 12 },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  moneyLabel: { fontSize: 9 },
  moneyValue: { fontSize: 9, fontWeight: "800" },
  totalRow: { borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 13 },
  totalLabel: { fontSize: 13, fontWeight: "900" },
  totalValue: { fontSize: 15, fontWeight: "900" },
  distanceNote: { fontSize: 8, lineHeight: 13, marginTop: 12 },
  errorCard: { borderRadius: 16, marginTop: 12, padding: 13 },
  errorText: { fontSize: 10, lineHeight: 16 },
  paymentNote: { fontSize: 8, lineHeight: 13, marginTop: 14, textAlign: "center" },
  bottomBar: {
    alignItems: "center",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    elevation: 10,
    flexDirection: "row",
    flexShrink: 0,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  bottomCopy: { flex: 1 },
  bottomLabel: { fontSize: 9, fontWeight: "700" },
  bottomTotal: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  orderButton: { alignItems: "center", borderRadius: 16, flex: 1.55, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 52, paddingHorizontal: 14 },
  orderButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", textAlign: "center" },
  emptyScreen: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  emptyIcon: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  emptyTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.6, marginTop: 14, textAlign: "center" },
  emptyButton: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 18, minHeight: 48, width: "100%" },
  emptyButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
});
