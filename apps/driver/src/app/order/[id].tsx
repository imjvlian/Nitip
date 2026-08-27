import { formatRupiah } from "@nitip/domain";
import type { NitipDriverOrder } from "@nitip/domain/driver";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { getDriverOrder } from "../../lib/api";

function statusLabel(status: NitipDriverOrder["status"]) {
  switch (status) {
    case "driver_assigned": return "ORDER DITUGASKAN";
    case "picked_up": return "SUDAH DIAMBIL";
    case "on_delivery": return "SEDANG DIANTAR";
    case "delivered": return "SELESAI";
  }
}

export default function DriverOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
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
      ) : error || !order ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order tidak tersedia</Text>
          <Text style={styles.muted}>{error ?? "Assignment tidak ditemukan"}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.eyebrow}>{statusLabel(order.status)}</Text>
          <Text style={styles.title}>{order.orderCode}</Text>
          <Text style={styles.fare}>{formatRupiah(order.deliveryFare)}</Text>
          <Text style={styles.subtitle}>Pendapatan delivery untuk assignment ini.</Text>

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

          <View style={styles.nextCard}>
            <Text style={styles.nextTitle}>Assignment berhasil diamankan</Text>
            <Text style={styles.nextText}>
              Order ini tidak lagi tersedia untuk driver lain. Tombol pickup, mulai antar, dan selesai akan diaktifkan pada tahap Pickup & Delivery berikutnya.
            </Text>
          </View>

          <Pressable onPress={() => router.replace("/home")} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Kembali ke Driver Center</Text>
          </Pressable>
        </>
      )}
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
  noteBox: { backgroundColor: "#CEFCD9", borderRadius: 12, padding: 11, marginTop: 12 },
  noteLabel: { color: "#08349C", fontWeight: "900", fontSize: 9, letterSpacing: 0.7 },
  noteText: { color: "#14216D", fontSize: 11, lineHeight: 17, marginTop: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  quantity: { color: "#08349C", fontWeight: "900", width: 28 },
  itemName: { color: "#14216D", fontWeight: "800", flex: 1 },
  nextCard: { backgroundColor: "#CEFCD9", borderRadius: 18, padding: 16, marginTop: 22 },
  nextTitle: { color: "#14216D", fontWeight: "900", fontSize: 14 },
  nextText: { color: "#52607F", fontSize: 11, lineHeight: 18, marginTop: 5 },
  primaryButton: { backgroundColor: "#14216D", borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 18 },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
});
