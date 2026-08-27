import { formatRupiah } from "@nitip/domain";
import type { NitipOrder } from "@nitip/domain/commerce";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listOrders } from "../lib/api";

type OrderTab = "active" | "history";

const HISTORY_STATUSES = new Set<NitipOrder["status"]>([
  "delivered",
  "cancelled",
  "refunded",
]);

function statusLabel(status: NitipOrder["status"]) {
  switch (status) {
    case "pending_payment":
      return "MENUNGGU PEMBAYARAN";
    case "paid":
      return "SUDAH DIBAYAR";
    case "merchant_confirmed":
      return "DIKONFIRMASI MERCHANT";
    case "preparing":
      return "SEDANG DISIAPKAN";
    case "ready_for_pickup":
      return "SIAP DIAMBIL DRIVER";
    case "driver_assigned":
      return "DRIVER DITEMUKAN";
    case "picked_up":
      return "PESANAN DIAMBIL";
    case "on_delivery":
      return "SEDANG DIANTAR";
    case "delivered":
      return "SELESAI";
    case "cancelled":
      return "DIBATALKAN";
    case "refunded":
      return "REFUND";
    default:
      return status.replaceAll("_", " ").toUpperCase();
  }
}

function formatOrderTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [orders, setOrders] = useState<NitipOrder[]>([]);
  const [tab, setTab] = useState<OrderTab>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!user) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        setOrders(await listOrders(user));
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat pesanan",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return <Redirect href="/login" />;

  const activeOrders = orders.filter(
    (order) => !HISTORY_STATUSES.has(order.status),
  );
  const historyOrders = orders.filter((order) =>
    HISTORY_STATUSES.has(order.status),
  );
  const visibleOrders = tab === "active" ? activeOrders : historyOrders;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      <Text style={styles.eyebrow}>PESANAN SAYA</Text>
      <Text style={styles.title}>Pantau pesananmu.</Text>
      <Text style={styles.subtitle}>
        Pesanan aktif dan riwayat transaksi tersimpan di sini.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.tab, tab === "active" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              tab === "active" && styles.tabTextActive,
            ]}
          >
            Aktif · {activeOrders.length}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("history")}
          style={[styles.tab, tab === "history" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              tab === "history" && styles.tabTextActive,
            ]}
          >
            Riwayat · {historyOrders.length}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat pesanan...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Pesanan belum dapat dimuat</Text>
          <Text style={styles.muted}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : visibleOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {tab === "active"
              ? "Tidak ada pesanan aktif"
              : "Belum ada riwayat pesanan"}
          </Text>
          <Text style={styles.muted}>
            {tab === "active"
              ? "Pesanan baru akan muncul di sini setelah checkout."
              : "Pesanan selesai atau dibatalkan akan tersimpan di sini."}
          </Text>
          {tab === "active" ? (
            <Pressable
              onPress={() => router.replace("/home")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Cari merchant</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        visibleOrders.map((order) => (
          <Pressable
            key={order.id}
            onPress={() =>
              router.push({
                pathname: "/order/[id]",
                params: { id: order.id },
              })
            }
            style={styles.orderCard}
          >
            <View style={styles.orderTop}>
              <View style={styles.orderTopBody}>
                <Text style={styles.orderCode}>{order.orderCode}</Text>
                <Text style={styles.merchantName}>{order.businessName}</Text>
                <Text style={styles.outletName}>{order.outletName}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{statusLabel(order.status)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.muted}>{formatOrderTime(order.createdAt)}</Text>
              <Text style={styles.total}>{formatRupiah(order.customerTotal)}</Text>
            </View>
            <Text style={styles.itemSummary}>
              {order.items.reduce((total, item) => total + item.quantity, 0)} item · {order.items
                .slice(0, 2)
                .map((item) => item.name)
                .join(", ")}
              {order.items.length > 2 ? "…" : ""}
            </Text>

            {order.status === "cancelled" && order.cancellationReason ? (
              <View style={styles.cancelBox}>
                <Text style={styles.cancelLabel}>ALASAN PEMBATALAN</Text>
                <Text style={styles.cancelText}>{order.cancellationReason}</Text>
              </View>
            ) : null}

            <Text style={styles.openText}>Lihat detail →</Text>
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
      paddingHorizontal: 20,
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
      fontSize: 24,
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
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
      marginBottom: 20,
    },
    tabs: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    tab: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: colors.primaryStrong,
      borderColor: colors.primaryStrong,
    },
    tabText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "900",
    },
    tabTextActive: { color: colors.onPrimary },
    loadingCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 20,
      alignItems: "center",
      gap: 8,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
    },
    emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    errorCard: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 18,
      padding: 18,
    },
    errorTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
    muted: {
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },
    retryButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 9,
      marginTop: 12,
    },
    retryText: { color: colors.primary, fontWeight: "900", fontSize: 11 },
    primaryButton: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 13,
      alignItems: "center",
      paddingVertical: 12,
      marginTop: 14,
    },
    primaryButtonText: { color: colors.onPrimary, fontWeight: "900" },
    orderCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
      marginBottom: 10,
    },
    orderTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },
    orderTopBody: { flex: 1 },
    orderCode: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    merchantName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      marginTop: 5,
    },
    outletName: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    statusBadge: {
      maxWidth: 142,
      backgroundColor: colors.surfaceAccent,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    statusText: {
      color: colors.primaryStrong,
      fontSize: 8,
      lineHeight: 11,
      textAlign: "center",
      fontWeight: "900",
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    total: { color: colors.text, fontWeight: "900", fontSize: 13 },
    itemSummary: {
      color: colors.textMuted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 7,
    },
    cancelBox: {
      backgroundColor: "#FFF1F0",
      borderRadius: 12,
      padding: 11,
      marginTop: 11,
    },
    cancelLabel: {
      color: "#B42318",
      fontWeight: "900",
      fontSize: 8,
      letterSpacing: 0.8,
    },
    cancelText: {
      color: "#B42318",
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },
    openText: {
      color: colors.primary,
      fontWeight: "900",
      fontSize: 10,
      marginTop: 12,
    },
  });
}
