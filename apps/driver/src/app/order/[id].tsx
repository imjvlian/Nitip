import { formatRupiah } from "@nitip/domain";
import type {
  DriverDeliveryAction,
  NitipDriverOrder,
} from "@nitip/domain/driver";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { actOnDriverOrder, getDriverOrder } from "../../lib/api";

function statusLabel(status: NitipDriverOrder["status"]) {
  switch (status) {
    case "driver_assigned": return "ORDER DITUGASKAN";
    case "picked_up": return "SUDAH DIAMBIL";
    case "on_delivery": return "SEDANG DIANTAR";
    case "delivered": return "SELESAI";
  }
}

function nextAction(status: NitipDriverOrder["status"]): {
  action: DriverDeliveryAction;
  label: string;
  title: string;
  message: string;
  helper: string;
} | null {
  switch (status) {
    case "driver_assigned":
      return {
        action: "confirm_pickup",
        label: "Pesanan sudah diambil",
        title: "Konfirmasi pickup?",
        message: "Pastikan pesanan sudah kamu terima dari merchant sebelum melanjutkan.",
        helper: "Ambil pesanan di merchant, periksa item, lalu konfirmasi pickup.",
      };
    case "picked_up":
      return {
        action: "start_delivery",
        label: "Mulai pengantaran",
        title: "Mulai pengantaran?",
        message: "Status customer dan merchant akan berubah menjadi sedang diantar.",
        helper: "Pesanan sudah diamankan. Mulai pengantaran saat kamu siap menuju customer.",
      };
    case "on_delivery":
      return {
        action: "complete_delivery",
        label: "Pesanan diterima customer",
        title: "Selesaikan pesanan?",
        message: "Gunakan tombol ini hanya setelah pesanan benar-benar diterima customer.",
        helper: "Pastikan pesanan sudah diterima customer sebelum menyelesaikan perjalanan.",
      };
    case "delivered":
      return null;
  }
}

export default function DriverOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);
    getDriverOrder(user, id)
      .then((next) => {
        if (active) setOrder(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Gagal memuat order");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, user]);

  if (!user) return <Redirect href="/login" />;

  async function runAction(action: DriverDeliveryAction) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      setOrder(await actOnDriverOrder(user, order.id, action));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal memperbarui perjalanan");
    } finally {
      setUpdating(false);
    }
  }

  function confirmAction(action: DriverDeliveryAction, title: string, message: string) {
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel" },
      { text: "Lanjut", onPress: () => void runAction(action) },
    ]);
  }

  const action = order ? nextAction(order.status) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/home")}>
          <Text style={styles.back}>‹ Driver Center</Text>
        </Pressable>
        <Text style={styles.brand}>nitip driver.</Text>
      </View>

      {loading ? (
        <View style={styles.centerCard}>
          <ActivityIndicator color="#08349C" />
          <Text style={styles.muted}>Memuat assignment...</Text>
        </View>
      ) : error && !order ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order tidak tersedia</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : order ? (
        <>
          <Text style={styles.eyebrow}>{statusLabel(order.status)}</Text>
          <Text style={styles.title}>{order.orderCode}</Text>
          <Text style={styles.fare}>{formatRupiah(order.deliveryFare)}</Text>
          <Text style={styles.subtitle}>Pendapatan delivery untuk assignment ini.</Text>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={order.status === "delivered" ? styles.completedCard : styles.progressCard}>
            <Text style={styles.progressLabel}>STATUS PERJALANAN</Text>
            <Text style={styles.progressTitle}>{statusLabel(order.status)}</Text>
            <Text style={styles.progressText}>
              {order.status === "driver_assigned"
                ? "Ambil pesanan dari merchant sebelum menuju customer."
                : order.status === "picked_up"
                  ? "Pesanan sudah kamu pegang dan siap diantar."
                  : order.status === "on_delivery"
                    ? "Pesanan sedang dalam perjalanan ke customer."
                    : "Pengantaran selesai dan assignment aktif sudah dilepas."}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Pickup</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{order.pickup.businessName}</Text>
            <Text style={styles.strongMeta}>{order.pickup.outletName}</Text>
            <Text style={styles.muted}>{order.pickup.addressLine}</Text>
          </View>

          <Text style={styles.sectionTitle}>Antar ke</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{order.destination.recipientName}</Text>
            <Text style={styles.strongMeta}>{order.destination.phoneNumber}</Text>
            <Text style={styles.muted}>{order.destination.addressLine}</Text>
            {order.destination.notes ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>CATATAN CUSTOMER</Text>
                <Text style={styles.noteText}>{order.destination.notes}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Isi pesanan</Text>
          <View style={styles.card}>
            {order.items.map((item) => (
              <View key={item.productId} style={styles.itemRow}>
                <Text style={styles.quantity}>{item.quantity}×</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
            ))}
          </View>

          {action ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Langkah berikutnya</Text>
              <Text style={styles.actionText}>{action.helper}</Text>
              <Pressable
                disabled={updating}
                onPress={() => confirmAction(action.action, action.title, action.message)}
                style={[styles.primaryButton, updating && styles.disabled]}
              >
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>{action.label}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.completedCardBottom}>
              <Text style={styles.completedTitle}>Pengantaran selesai</Text>
              <Text style={styles.completedText}>
                Order sudah berstatus selesai. Kamu dapat kembali ke Driver Center dan menerima order berikutnya jika tetap online.
              </Text>
              <Pressable onPress={() => router.replace("/home")} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Kembali ke Driver Center</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F7FFF9", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  back: { color: "#08349C", fontWeight: "900", fontSize: 11 },
  brand: { color: "#14216D", fontWeight: "900", fontSize: 21, letterSpacing: -0.8 },
  centerCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#A1DCD9", borderRadius: 18, padding: 18, alignItems: "center", gap: 8 },
  eyebrow: { color: "#08349C", fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  title: { color: "#14216D", fontWeight: "900", fontSize: 30, letterSpacing: -1, marginTop: 5 },
  fare: { color: "#08349C", fontWeight: "900", fontSize: 22, marginTop: 9 },
  subtitle: { color: "#52607F", fontSize: 11, marginTop: 3 },
  sectionTitle: { color: "#14216D", fontWeight: "900", fontSize: 17, marginTop: 24, marginBottom: 9 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#A1DCD9", borderRadius: 18, padding: 16 },
  cardTitle: { color: "#14216D", fontWeight: "900", fontSize: 15 },
  strongMeta: { color: "#08349C", fontWeight: "800", fontSize: 11, marginTop: 4 },
  muted: { color: "#52607F", fontSize: 11, lineHeight: 17, marginTop: 4 },
  errorCard: { backgroundColor: "#FFF1F0", borderRadius: 14, padding: 13, marginTop: 16 },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 17 },
  progressCard: { backgroundColor: "#CEFCD9", borderRadius: 18, padding: 16, marginTop: 18 },
  completedCard: { backgroundColor: "#A1DCD9", borderRadius: 18, padding: 16, marginTop: 18 },
  progressLabel: { color: "#08349C", fontWeight: "900", fontSize: 9, letterSpacing: 0.9 },
  progressTitle: { color: "#14216D", fontWeight: "900", fontSize: 16, marginTop: 4 },
  progressText: { color: "#52607F", fontSize: 11, lineHeight: 17, marginTop: 5 },
  noteBox: { backgroundColor: "#CEFCD9", borderRadius: 12, padding: 11, marginTop: 12 },
  noteLabel: { color: "#08349C", fontWeight: "900", fontSize: 9, letterSpacing: 0.7 },
  noteText: { color: "#14216D", fontSize: 11, lineHeight: 17, marginTop: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  quantity: { color: "#08349C", fontWeight: "900", width: 28 },
  itemName: { color: "#14216D", fontWeight: "800", flex: 1 },
  actionCard: { backgroundColor: "#14216D", borderRadius: 20, padding: 17, marginTop: 22 },
  actionTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  actionText: { color: "#A1DCD9", fontSize: 11, lineHeight: 18, marginTop: 5 },
  completedCardBottom: { backgroundColor: "#CEFCD9", borderRadius: 20, padding: 17, marginTop: 22 },
  completedTitle: { color: "#14216D", fontWeight: "900", fontSize: 15 },
  completedText: { color: "#52607F", fontSize: 11, lineHeight: 18, marginTop: 5 },
  primaryButton: { backgroundColor: "#08349C", borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 15 },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
});
