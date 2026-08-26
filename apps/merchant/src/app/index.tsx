import { DEFAULT_MARKETPLACE_RULES, formatRupiah } from "@nitip/domain";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function MerchantHomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>nitip mitra.</Text>
          <Text style={styles.store}>Nasi Ayam Bu Rini</Text>
        </View>
        <View style={styles.openPill}><Text style={styles.openText}>● Buka</Text></View>
      </View>

      <Text style={styles.title}>Ringkasan hari ini</Text>
      <View style={styles.metrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pesanan</Text>
          <Text style={styles.metricValue}>12</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Penjualan</Text>
          <Text style={styles.metricValue}>{formatRupiah(684_000)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Pesanan baru</Text>
      <View style={styles.orderCard}>
        <View style={styles.orderTop}>
          <Text style={styles.orderId}>#NTP-00128</Text>
          <Text style={styles.orderTime}>baru saja</Text>
        </View>
        <Text style={styles.items}>2× Nasi Ayam · 1× Es Teh</Text>
        <View style={styles.orderBottom}>
          <Text style={styles.total}>{formatRupiah(48_000)}</Text>
          <View style={styles.action}><Text style={styles.actionText}>Terima pesanan</Text></View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Komisi awal Nitip</Text>
        <Text style={styles.infoValue}>{DEFAULT_MARKETPLACE_RULES.merchantCommissionRate * 100}%</Text>
        <Text style={styles.infoText}>Draft konfigurasi MVP. Nantinya angka ini dapat dikelola dari dashboard Ops tanpa hard-code di aplikasi.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F7F8F4", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 22, fontWeight: "900", color: "#1E5B3A" },
  store: { marginTop: 3, color: "#768079", fontSize: 12 },
  openPill: { backgroundColor: "#E2F2E6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  openText: { color: "#20723F", fontWeight: "800" },
  title: { marginTop: 36, fontSize: 30, fontWeight: "900", color: "#17251D", letterSpacing: -1 },
  metrics: { flexDirection: "row", gap: 10, marginTop: 18 },
  metricCard: { flex: 1, minHeight: 100, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E5E8E4" },
  metricLabel: { color: "#7A847D", fontSize: 12, fontWeight: "700" },
  metricValue: { marginTop: 12, color: "#17251D", fontSize: 22, fontWeight: "900" },
  sectionTitle: { marginTop: 30, marginBottom: 12, fontSize: 18, fontWeight: "800", color: "#17251D" },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E5E8E4" },
  orderTop: { flexDirection: "row", justifyContent: "space-between" },
  orderId: { color: "#1E5B3A", fontWeight: "900" },
  orderTime: { color: "#89918B", fontSize: 12 },
  items: { marginTop: 16, color: "#35443B", fontSize: 15, fontWeight: "600" },
  orderBottom: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  total: { fontWeight: "900", fontSize: 17, color: "#17251D" },
  action: { backgroundColor: "#1E5B3A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  infoCard: { marginTop: 24, backgroundColor: "#E6EFE8", borderRadius: 20, padding: 18 },
  infoTitle: { color: "#42604E", fontWeight: "700", fontSize: 12 },
  infoValue: { marginTop: 4, color: "#1E5B3A", fontSize: 30, fontWeight: "900" },
  infoText: { marginTop: 8, color: "#4F6557", lineHeight: 19, fontSize: 12 },
});
