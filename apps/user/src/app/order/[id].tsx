import { formatRupiah } from "@nitip/domain";
import type { NitipOrder } from "@nitip/domain/commerce";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getOrder, simulateOrderPayment } from "../../lib/api";

function statusLabel(status: NitipOrder["status"]) {
  if (status === "pending_payment") return "MENUNGGU PEMBAYARAN";
  if (status === "paid") return "PEMBAYARAN BERHASIL";
  if (status === "merchant_confirmed") return "DITERIMA MERCHANT";
  if (status === "preparing") return "SEDANG DISIAPKAN";
  if (status === "ready_for_pickup") return "SIAP DIAMBIL DRIVER";
  if (status === "driver_assigned") return "DRIVER DITUGASKAN";
  if (status === "picked_up") return "SUDAH DIAMBIL DRIVER";
  if (status === "on_delivery") return "SEDANG DIANTAR";
  if (status === "cancelled") return "DIBATALKAN";
  if (status === "delivered") return "SELESAI";
  return status.replaceAll("_", " ").toUpperCase();
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    getOrder(user, id)
      .then((next) => {
        if (active) setOrder(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Gagal memuat pesanan");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  if (!user) return <Redirect href="/login" />;

  async function simulatePayment() {
    if (!order) return;
    setSimulating(true);
    setError(null);
    try {
      setOrder(await simulateOrderPayment(user, order.id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mensimulasikan pembayaran");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/home")}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat pesanan...</Text>
        </View>
      ) : error && !order ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pesanan tidak ditemukan</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : order ? (
        <>
          <Text style={styles.eyebrow}>{statusLabel(order.status)}</Text>
          <Text style={styles.title}>Pesanan kamu.</Text>
          <Text style={styles.orderCode}>{order.orderCode}</Text>
          <Text style={styles.subtitle}>{order.businessName} · {order.outletName}</Text>

          {order.status === "pending_payment" ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Payment gateway belum terhubung</Text>
              <Text style={styles.noticeText}>
                Untuk development, tombol di bawah mensimulasikan callback pembayaran berhasil. Endpoint ini otomatis tidak tersedia saat NODE_ENV=production.
              </Text>
              <Pressable
                disabled={simulating}
                onPress={() => void simulatePayment()}
                style={[styles.devButton, simulating && styles.disabled]}
              >
                <Text style={styles.devButtonText}>
                  {simulating ? "Memproses..." : "Simulasikan pembayaran berhasil"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {order.status === "paid" ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Pembayaran diterima</Text>
              <Text style={styles.noticeText}>
                Pesanan sekarang sudah masuk ke Order Center merchant dan menunggu konfirmasi.
              </Text>
            </View>
          ) : null}

          {order.status === "cancelled" ? (
            <View style={styles.cancelNotice}>
              <Text style={styles.cancelTitle}>Pesanan dibatalkan</Text>
              <Text style={styles.cancelText}>
                {order.cancellationReason ?? "Pesanan tidak dapat diproses merchant."}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Item</Text>
          <View style={styles.card}>
            {order.items.map((item) => (
              <View key={item.productId} style={styles.row}>
                <Text style={styles.rowLabel}>{item.quantity}× {item.name}</Text>
                <Text style={styles.rowValue}>{formatRupiah(item.lineTotal)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Antar ke</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{order.address.recipientName}</Text>
            <Text style={styles.addressMeta}>{order.address.phoneNumber}</Text>
            <Text style={styles.muted}>{order.address.addressLine}</Text>
            {order.address.notes ? <Text style={styles.muted}>Catatan: {order.address.notes}</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>Pembayaran</Text>
          <View style={styles.card}>
            <View style={styles.row}><Text style={styles.rowLabel}>Subtotal</Text><Text style={styles.rowValue}>{formatRupiah(order.subtotal)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>Ongkir</Text><Text style={styles.rowValue}>{formatRupiah(order.deliveryFare)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>Biaya layanan</Text><Text style={styles.rowValue}>{formatRupiah(order.serviceFee)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatRupiah(order.customerTotal)}</Text></View>
          </View>

          {error ? (
            <View style={styles.cancelNotice}>
              <Text style={styles.cancelText}>{error}</Text>
            </View>
          ) : null}

          <Pressable onPress={() => router.replace("/home")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Kembali ke Home</Text>
          </Pressable>
        </>
      ) : null}
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
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    back: { color: colors.primary, fontWeight: "900" },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 24, letterSpacing: -1 },
    loadingCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, alignItems: "center", gap: 8 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
    title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    orderCode: { color: colors.primaryStrong, fontWeight: "900", fontSize: 16, marginTop: 8 },
    subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    notice: { backgroundColor: colors.surfaceAccent, borderRadius: 18, padding: 15, marginTop: 18 },
    noticeTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
    noticeText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 },
    devButton: { backgroundColor: colors.primaryStrong, borderRadius: 12, alignItems: "center", paddingVertical: 12, marginTop: 12 },
    devButtonText: { color: colors.onPrimary, fontWeight: "900", fontSize: 11 },
    disabled: { opacity: 0.45 },
    cancelNotice: { backgroundColor: "#FFF1F0", borderRadius: 16, padding: 14, marginTop: 18 },
    cancelTitle: { color: "#B42318", fontWeight: "900", fontSize: 13 },
    cancelText: { color: "#B42318", fontSize: 10, lineHeight: 16, marginTop: 4 },
    sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 17, marginTop: 24, marginBottom: 9 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
    addressMeta: { color: colors.primary, fontSize: 11, fontWeight: "800", marginTop: 4 },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
    rowLabel: { flex: 1, color: colors.textMuted, fontSize: 11 },
    rowValue: { color: colors.text, fontWeight: "800", fontSize: 11 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    totalLabel: { color: colors.text, fontWeight: "900", fontSize: 15 },
    totalValue: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 20 },
    primaryButtonText: { color: colors.onPrimary, fontWeight: "900" },
  });
}
