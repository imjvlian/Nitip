import { formatRupiah } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listMerchantOrders } from "../lib/api";

function statusLabel(status: NitipMerchantOrder["status"]) {
  if (status === "paid") return "PERLU DIKONFIRMASI";
  if (status === "merchant_confirmed") return "SUDAH DIKONFIRMASI";
  if (status === "preparing") return "SEDANG DISIAPKAN";
  if (status === "ready_for_pickup") return "SIAP DIAMBIL";
  if (status === "driver_assigned") return "DRIVER DITUGASKAN";
  if (status === "picked_up") return "SUDAH DIAMBIL";
  if (status === "on_delivery") return "DALAM PENGANTARAN";
  if (status === "delivered") return "SELESAI";
  if (status === "cancelled") return "DIBATALKAN";
  if (status === "refunded") return "REFUND";
  return status.replaceAll("_", " ").toUpperCase();
}

function isActionable(status: NitipMerchantOrder["status"]) {
  return status === "paid" || status === "merchant_confirmed" || status === "preparing";
}

export default function MerchantOrdersScreen() {
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [orders, setOrders] = useState<NitipMerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return () => undefined;
    let active = true;
    setLoading(true);
    setError(null);
    void listMerchantOrders(user)
      .then((items) => {
        if (active) setOrders(items);
      })
      .catch((nextError: unknown) => {
        if (active) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Gagal memuat pesanan",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useFocusEffect(load);

  if (!user) return <Redirect href="/login" />;

  const actionableCount = orders.filter((order) => isActionable(order.status)).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.brand}>nitip mitra.</Text>
      </View>

      <Text style={styles.eyebrow}>ORDER CENTER</Text>
      <Text style={styles.title}>Pesanan masuk.</Text>
      <Text style={styles.subtitle}>
        {actionableCount} pesanan membutuhkan tindakan merchant.
      </Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat pesanan...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Belum ada pesanan dibayar</Text>
          <Text style={styles.muted}>
            Pesanan customer baru muncul di sini setelah status pembayaran menjadi paid.
          </Text>
        </View>
      ) : (
        orders.map((order) => (
          <Pressable
            key={order.id}
            onPress={() =>
              router.push({ pathname: "/order/[id]", params: { id: order.id } })
            }
            style={[styles.card, isActionable(order.status) && styles.actionableCard]}
          >
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.orderCode}>{order.orderCode}</Text>
                <Text style={styles.cardTitle}>{order.outletName}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{statusLabel(order.status)}</Text>
              </View>
            </View>
            <Text style={styles.customer}>
              {order.address.recipientName} · {order.address.phoneNumber}
            </Text>
            <Text style={styles.muted} numberOfLines={2}>
              {order.address.addressLine}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.meta}>{order.items.length} jenis item</Text>
              <Text style={styles.total}>{formatRupiah(order.customerTotal)}</Text>
            </View>
          </Pressable>
        ))
      )}
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
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      padding: 20,
      paddingTop: 54,
      paddingBottom: 42,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 28,
    },
    back: { color: colors.primary, fontWeight: "900" },
    brand: {
      color: colors.primaryStrong,
      fontWeight: "900",
      fontSize: 22,
      letterSpacing: -1,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.3,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 5,
    },
    subtitle: { color: colors.textMuted, marginTop: 5, marginBottom: 20 },
    loadingCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      alignItems: "center",
      gap: 8,
    },
    errorCard: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 16,
      padding: 14,
    },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 10,
    },
    actionableCard: { borderColor: colors.primary },
    rowBetween: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    flex: { flex: 1 },
    orderCode: {
      color: colors.primary,
      fontWeight: "900",
      fontSize: 10,
      marginBottom: 4,
    },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    badge: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
      maxWidth: 150,
    },
    badgeText: {
      color: colors.primaryStrong,
      fontWeight: "900",
      fontSize: 8,
      textAlign: "center",
    },
    customer: {
      color: colors.primary,
      fontWeight: "800",
      fontSize: 11,
      marginTop: 12,
    },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 13,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    meta: { color: colors.textMuted, fontSize: 10 },
    total: { color: colors.primaryStrong, fontWeight: "900", fontSize: 13 },
  });
}
