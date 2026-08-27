import { formatRupiah } from "@nitip/domain";
import type {
  MerchantOrderAction,
  NitipMerchantOrder,
} from "@nitip/domain/commerce";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { actOnMerchantOrder, getMerchantOrder } from "../../lib/api";

function statusLabel(status: NitipMerchantOrder["status"]) {
  if (status === "paid") return "PERLU DIKONFIRMASI";
  if (status === "merchant_confirmed") return "SUDAH DIKONFIRMASI";
  if (status === "preparing") return "SEDANG DISIAPKAN";
  if (status === "ready_for_pickup") return "SIAP DIAMBIL DRIVER";
  if (status === "driver_assigned") return "DRIVER DITUGASKAN";
  if (status === "picked_up") return "SUDAH DIAMBIL DRIVER";
  if (status === "on_delivery") return "DALAM PENGANTARAN";
  if (status === "delivered") return "SELESAI";
  if (status === "cancelled") return "DIBATALKAN";
  if (status === "refunded") return "REFUND";
  return status.replaceAll("_", " ").toUpperCase();
}

export default function MerchantOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [order, setOrder] = useState<NitipMerchantOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);
    void getMerchantOrder(user, id)
      .then((next) => {
        if (active) setOrder(next);
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
  }, [id, user]);

  if (!user) return <Redirect href="/login" />;

  async function runAction(action: MerchantOrderAction) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      const next = await actOnMerchantOrder(user, order.id, {
        action,
        ...(action === "reject"
          ? { reason: rejectionReason.trim() || null }
          : {}),
      });
      setOrder(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal memperbarui pesanan",
      );
    } finally {
      setUpdating(false);
    }
  }

  function confirmAction(action: MerchantOrderAction, title: string, message: string) {
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel" },
      { text: "Lanjut", onPress: () => void runAction(action) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Pesanan</Text>
        </Pressable>
        <Text style={styles.brand}>nitip mitra.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat detail...</Text>
        </View>
      ) : error && !order ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : order ? (
        <>
          <Text style={styles.eyebrow}>{statusLabel(order.status)}</Text>
          <Text style={styles.title}>{order.orderCode}</Text>
          <Text style={styles.subtitle}>
            {order.businessName} · {order.outletName}
          </Text>

          {order.status === "paid" ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Pesanan sudah dibayar</Text>
              <Text style={styles.muted}>
                Periksa item dan alamat customer sebelum menerima pesanan.
              </Text>
              <Pressable
                disabled={updating}
                onPress={() =>
                  confirmAction(
                    "confirm",
                    "Terima pesanan?",
                    "Pesanan akan masuk ke tahap persiapan merchant.",
                  )
                }
                style={[styles.primaryButton, updating && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {updating ? "Memproses..." : "Terima pesanan"}
                </Text>
              </Pressable>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Alasan penolakan (opsional)"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                maxLength={300}
              />
              <Pressable
                disabled={updating}
                onPress={() =>
                  confirmAction(
                    "reject",
                    "Tolak pesanan?",
                    "Status order akan menjadi cancelled.",
                  )
                }
                style={[styles.dangerButton, updating && styles.disabled]}
              >
                <Text style={styles.dangerButtonText}>Tolak pesanan</Text>
              </Pressable>
            </View>
          ) : null}

          {order.status === "merchant_confirmed" ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Pesanan sudah diterima</Text>
              <Text style={styles.muted}>
                Mulai proses ketika dapur/toko benar-benar mulai menyiapkan order.
              </Text>
              <Pressable
                disabled={updating}
                onPress={() => void runAction("start_preparing")}
                style={[styles.primaryButton, updating && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {updating ? "Memproses..." : "Mulai siapkan"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {order.status === "preparing" ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Sedang disiapkan</Text>
              <Text style={styles.muted}>
                Tandai siap hanya ketika paket sudah bisa diambil driver.
              </Text>
              <Pressable
                disabled={updating}
                onPress={() => void runAction("ready_for_pickup")}
                style={[styles.primaryButton, updating && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {updating ? "Memproses..." : "Siap diambil driver"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {order.status === "ready_for_pickup" ? (
            <View style={styles.noticeCard}>
              <Text style={styles.actionTitle}>Menunggu driver</Text>
              <Text style={styles.muted}>
                Order sudah siap. Driver dispatch akan menangani tahap berikutnya.
              </Text>
            </View>
          ) : null}

          {order.status === "cancelled" && order.cancellationReason ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                Alasan pembatalan: {order.cancellationReason}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Item</Text>
          <View style={styles.card}>
            {order.items.map((item) => (
              <View key={item.productId} style={styles.row}>
                <Text style={styles.rowLabel}>
                  {item.quantity}× {item.name}
                </Text>
                <Text style={styles.rowValue}>{formatRupiah(item.lineTotal)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Customer & pengantaran</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{order.address.recipientName}</Text>
            <Text style={styles.addressMeta}>{order.address.phoneNumber}</Text>
            <Text style={styles.muted}>{order.address.addressLine}</Text>
            {order.address.notes ? (
              <Text style={styles.muted}>Catatan: {order.address.notes}</Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Nilai pesanan</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subtotal produk</Text>
              <Text style={styles.rowValue}>{formatRupiah(order.subtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Komisi Nitip</Text>
              <Text style={styles.rowValue}>
                −{formatRupiah(order.merchantCommission)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Pendapatan merchant</Text>
              <Text style={styles.totalValue}>{formatRupiah(order.merchantNet)}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
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
    loadingCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      alignItems: "center",
      gap: 8,
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
    subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    actionCard: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 18,
      padding: 16,
      marginTop: 18,
    },
    noticeCard: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 18,
      padding: 16,
      marginTop: 18,
    },
    actionTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
    input: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    primaryButton: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 13,
      alignItems: "center",
      paddingVertical: 13,
      marginTop: 14,
    },
    primaryButtonText: { color: colors.onPrimary, fontWeight: "900" },
    dangerButton: {
      borderWidth: 1,
      borderColor: "#B42318",
      borderRadius: 13,
      alignItems: "center",
      paddingVertical: 12,
      marginTop: 9,
    },
    dangerButtonText: { color: "#B42318", fontWeight: "900" },
    disabled: { opacity: 0.45 },
    sectionTitle: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 17,
      marginTop: 24,
      marginBottom: 9,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
    },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
    addressMeta: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 4,
    },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 6,
    },
    rowLabel: { flex: 1, color: colors.textMuted, fontSize: 11 },
    rowValue: { color: colors.text, fontWeight: "800", fontSize: 11 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: { color: colors.text, fontWeight: "900", fontSize: 13 },
    totalValue: { color: colors.primaryStrong, fontWeight: "900", fontSize: 16 },
    errorCard: {
      backgroundColor: "#FFF1F0",
      borderRadius: 14,
      padding: 13,
      marginTop: 14,
    },
    errorText: { color: "#B42318", fontSize: 11, lineHeight: 17 },
  });
}
