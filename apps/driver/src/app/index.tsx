import { calculateDriverFare, formatRupiah } from "@nitip/domain";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const sampleFare = calculateDriverFare(3);

export default function DriverHomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>nitip driver.</Text>
        <View style={styles.online}><Text style={styles.onlineText}>● Online</Text></View>
      </View>

      <View style={styles.earningCard}>
        <Text style={styles.earningLabel}>Pendapatan hari ini</Text>
        <Text style={styles.earningValue}>{formatRupiah(126_000)}</Text>
        <Text style={styles.earningMeta}>11 perjalanan · 100% ongkir untuk driver</Text>
      </View>

      <Text style={styles.sectionTitle}>Order tersedia</Text>
      <View style={styles.jobCard}>
        <View style={styles.routeRow}>
          <View style={styles.dot} />
          <View style={styles.routeContent}>
            <Text style={styles.routeLabel}>AMBIL</Text>
            <Text style={styles.routeTitle}>Nasi Ayam Bu Rini</Text>
            <Text style={styles.routeMeta}>1,1 km dari posisi kamu</Text>
          </View>
        </View>
        <View style={styles.line} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, styles.dotDestination]} />
          <View style={styles.routeContent}>
            <Text style={styles.routeLabel}>ANTAR</Text>
            <Text style={styles.routeTitle}>Jl. Veteran · Lumajang</Text>
            <Text style={styles.routeMeta}>3 km dari merchant</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.jobBottom}>
          <View>
            <Text style={styles.fareLabel}>Pendapatan</Text>
            <Text style={styles.fare}>{formatRupiah(sampleFare.driverEarning)}</Text>
          </View>
          <View style={styles.accept}><Text style={styles.acceptText}>Ambil order</Text></View>
        </View>
      </View>

      <View style={styles.payoutCard}>
        <Text style={styles.payoutTitle}>Payout harian</Text>
        <Text style={styles.payoutText}>Pendapatan dikumpulkan sebagai ledger dan dibayarkan terjadwal, sehingga biaya transfer tidak menggerus setiap order.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F7F8F4", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 22, fontWeight: "900", color: "#1E5B3A" },
  online: { backgroundColor: "#E2F2E6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  onlineText: { color: "#20723F", fontWeight: "800" },
  earningCard: { marginTop: 30, borderRadius: 24, backgroundColor: "#1E5B3A", padding: 20 },
  earningLabel: { color: "#CFE2D4", fontWeight: "700", fontSize: 12 },
  earningValue: { color: "#FFFFFF", fontWeight: "900", fontSize: 32, marginTop: 5 },
  earningMeta: { color: "#DDE9E0", marginTop: 8, fontSize: 12 },
  sectionTitle: { marginTop: 30, marginBottom: 12, fontSize: 18, fontWeight: "800", color: "#17251D" },
  jobCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#E5E8E4" },
  routeRow: { flexDirection: "row" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1E5B3A", marginTop: 5 },
  dotDestination: { backgroundColor: "#D56A45" },
  routeContent: { paddingLeft: 12 },
  routeLabel: { color: "#8B948E", fontSize: 10, fontWeight: "800" },
  routeTitle: { color: "#17251D", fontWeight: "800", marginTop: 2 },
  routeMeta: { color: "#808A83", fontSize: 12, marginTop: 3 },
  line: { width: 1, height: 24, backgroundColor: "#DDE2DE", marginLeft: 4.5, marginVertical: 4 },
  divider: { height: 1, backgroundColor: "#ECEFEC", marginVertical: 18 },
  jobBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fareLabel: { color: "#7E8981", fontSize: 11, fontWeight: "700" },
  fare: { color: "#17251D", fontSize: 20, fontWeight: "900", marginTop: 2 },
  accept: { backgroundColor: "#1E5B3A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  acceptText: { color: "#FFFFFF", fontWeight: "800" },
  payoutCard: { marginTop: 20, borderRadius: 18, backgroundColor: "#E9EEE9", padding: 16 },
  payoutTitle: { color: "#263B2F", fontWeight: "800" },
  payoutText: { color: "#5D6E63", fontSize: 12, lineHeight: 18, marginTop: 6 },
});
