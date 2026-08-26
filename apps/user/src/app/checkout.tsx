import { formatRupiah, type NitipAddress } from "@nitip/domain";
import type { NitipCheckoutQuote, NitipCheckoutRequest } from "@nitip/domain/commerce";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { createOrder, getCheckoutQuote, listAddresses } from "../lib/api";

function addressLabel(address: NitipAddress) {
  if (address.label === "home") return "Rumah";
  if (address.label === "office") return "Kantor";
  return address.customLabel || "Lainnya";
}

export default function CheckoutScreen() {
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
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
        if (active) setError(nextError instanceof Error ? nextError.message : "Gagal memuat alamat");
      })
      .finally(() => {
        if (active) setLoadingAddresses(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const request = useMemo<NitipCheckoutRequest | null>(() => {
    if (!cart.outlet || !addressId || cart.items.length === 0) return null;
    return {
      outletId: cart.outlet.id,
      addressId,
      items: cart.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
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
          setError(nextError instanceof Error ? nextError.message : "Gagal menghitung checkout");
        }
      })
      .finally(() => {
        if (active) setLoadingQuote(false);
      });

    return () => {
      active = false;
    };
  }, [request, user]);

  if (!user) return <Redirect href="/login" />;

  async function submitOrder() {
    if (!request) return;
    setCreating(true);
    setError(null);
    try {
      const order = await createOrder(user, request);
      cart.clearCart();
      router.replace({ pathname: "/order/[id]", params: { id: order.id } });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal membuat pesanan");
    } finally {
      setCreating(false);
    }
  }

  if (cart.items.length === 0 || !cart.outlet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Keranjang kosong.</Text>
        <Pressable onPress={() => router.replace("/home")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Kembali ke Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Keranjang</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      <Text style={styles.eyebrow}>CHECKOUT</Text>
      <Text style={styles.title}>Konfirmasi pesanan.</Text>
      <Text style={styles.subtitle}>{cart.outlet.businessName} · {cart.outlet.name}</Text>

      <Text style={styles.sectionTitle}>Alamat pengantaran</Text>
      {loadingAddresses ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat alamat...</Text>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Belum ada alamat tersimpan</Text>
          <Text style={styles.muted}>Tambahkan alamat terlebih dahulu untuk melanjutkan checkout.</Text>
          <Pressable onPress={() => router.push("/address/new")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>+ Tambah alamat</Text>
          </Pressable>
        </View>
      ) : (
        addresses.map((address) => (
          <Pressable
            key={address.id}
            onPress={() => setAddressId(address.id)}
            style={[styles.addressCard, addressId === address.id && styles.addressCardActive]}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{addressLabel(address)}</Text>
              {addressId === address.id ? <Text style={styles.selected}>DIPILIH</Text> : null}
            </View>
            <Text style={styles.addressName}>{address.recipientName} · {address.phoneNumber}</Text>
            <Text style={styles.muted}>{address.addressLine}</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Ringkasan</Text>
      {loadingQuote ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memvalidasi harga, stok, dan ongkir...</Text>
        </View>
      ) : quote ? (
        <View style={styles.card}>
          {quote.items.map((item) => (
            <View key={item.productId} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{item.quantity}× {item.name}</Text>
              <Text style={styles.lineValue}>{formatRupiah(item.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Subtotal</Text>
            <Text style={styles.lineValue}>{formatRupiah(quote.subtotal)}</Text>
          </View>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Ongkir</Text>
            <Text style={styles.lineValue}>{formatRupiah(quote.deliveryFare)}</Text>
          </View>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Biaya layanan</Text>
            <Text style={styles.lineValue}>{formatRupiah(quote.serviceFee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRupiah(quote.customerTotal)}</Text>
          </View>
          <Text style={styles.note}>
            {quote.distanceMethod === "minimum_fare_fallback"
              ? "Koordinat alamat/outlet belum lengkap, jadi ongkir memakai tarif minimum sementara."
              : `Estimasi jarak garis lurus ${quote.distanceKm?.toFixed(2)} km. Integrasi routing Maps akan menggantikannya nanti.`}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        disabled={!quote || creating}
        onPress={() => void submitOrder()}
        style={[styles.primaryButton, (!quote || creating) && styles.disabled]}
      >
        <Text style={styles.primaryButtonText}>
          {creating ? "Membuat pesanan..." : "Buat pesanan"}
        </Text>
      </Pressable>
      <Text style={styles.paymentNote}>Pembayaran DOKU belum diaktifkan. Pesanan akan dibuat sebagai pending_payment.</Text>
    </ScrollView>
  );
}

function createStyles(colors: {
  background: string;
  surface: string;
  surfaceAccent: string;
  primary: string;
  primaryStrong: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
  onPrimary: string;
}) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 42 },
    centered: { flex: 1, backgroundColor: colors.background, padding: 24, alignItems: "center", justifyContent: "center" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    back: { color: colors.primary, fontWeight: "900" },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 24, letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
    title: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, marginTop: 5 },
    sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 17, marginTop: 26, marginBottom: 10 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 },
    loadingCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, alignItems: "center", gap: 8 },
    addressCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 8 },
    addressCardActive: { borderColor: colors.primaryStrong, borderWidth: 2 },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
    selected: { color: colors.primary, fontSize: 9, fontWeight: "900" },
    addressName: { color: colors.primary, fontSize: 11, fontWeight: "800", marginTop: 5 },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
    secondaryButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 13, alignItems: "center", paddingVertical: 11, marginTop: 12 },
    secondaryButtonText: { color: colors.primary, fontWeight: "900" },
    lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
    lineLabel: { flex: 1, color: colors.textMuted, fontSize: 11 },
    lineValue: { color: colors.text, fontWeight: "800", fontSize: 11 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    totalLabel: { color: colors.text, fontWeight: "900", fontSize: 15 },
    totalValue: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
    note: { color: colors.textMuted, fontSize: 9, lineHeight: 15, marginTop: 12 },
    errorCard: { backgroundColor: colors.surfaceAccent, borderRadius: 14, padding: 13, marginTop: 14 },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 18, width: "100%" },
    primaryButtonText: { color: colors.onPrimary, fontWeight: "900" },
    disabled: { opacity: 0.45 },
    paymentNote: { color: colors.textMuted, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 8 },
  });
}
