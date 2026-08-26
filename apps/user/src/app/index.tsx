import { calculateOrderQuote, formatRupiah } from "@nitip/domain";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const sample = calculateOrderQuote({ subtotal: 60_000, distanceKm: 3 });

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>nitip.</Text>
        <View style={styles.locationPill}>
          <Text style={styles.locationText}>Lumajang</Text>
        </View>
      </View>

      <Text style={styles.eyebrow}>Halo 👋</Text>
      <Text style={styles.title}>Mau nitip apa hari ini?</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchText}>Cari makanan, minuman, atau toko…</Text>
      </View>

      <Text style={styles.sectionTitle}>Jelajahi</Text>
      <View style={styles.categoryRow}>
        {["🍜 Makanan", "🥤 Minuman", "🛒 Toko"].map((category) => (
          <View key={category} style={styles.category}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Dekat kamu</Text>
      <View style={styles.card}>
        <View style={styles.merchantAvatar}><Text style={styles.avatarText}>N</Text></View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Nasi Ayam Bu Rini</Text>
          <Text style={styles.cardMeta}>1,2 km · ±25 menit · Buka</Text>
          <Text style={styles.cardPrice}>Mulai Rp12.000</Text>
        </View>
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteLabel}>Simulasi order Rp60.000 · 3 km</Text>
        <Text style={styles.quoteValue}>{formatRupiah(sample.customerTotal)}</Text>
        <Text style={styles.quoteMeta}>Sudah termasuk ongkir {formatRupiah(sample.deliveryFare)} dan biaya layanan {formatRupiah(sample.serviceFee)}.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F7F8F4", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 36 },
  brand: { fontSize: 28, fontWeight: "900", color: "#1E5B3A", letterSpacing: -1.2 },
  locationPill: { backgroundColor: "#E6EFE8", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  locationText: { color: "#1E5B3A", fontWeight: "700" },
  eyebrow: { color: "#708076", fontSize: 14, fontWeight: "600" },
  title: { marginTop: 4, fontSize: 32, lineHeight: 38, fontWeight: "900", color: "#17251D", letterSpacing: -1.1 },
  searchBox: { marginTop: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E8E2", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16 },
  searchText: { color: "#89928C" },
  sectionTitle: { marginTop: 30, marginBottom: 12, color: "#17251D", fontWeight: "800", fontSize: 18 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: { backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: "#E5E8E4" },
  categoryText: { color: "#30453A", fontWeight: "700" },
  card: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E5E8E4" },
  merchantAvatar: { width: 72, height: 72, borderRadius: 16, backgroundColor: "#DCEBDD", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#1E5B3A", fontWeight: "900", fontSize: 28 },
  cardContent: { flex: 1, paddingLeft: 14, justifyContent: "center" },
  cardTitle: { fontWeight: "800", fontSize: 16, color: "#17251D" },
  cardMeta: { color: "#758078", marginTop: 4, fontSize: 12 },
  cardPrice: { color: "#1E5B3A", marginTop: 7, fontWeight: "800" },
  quoteCard: { marginTop: 24, borderRadius: 20, backgroundColor: "#1E5B3A", padding: 18 },
  quoteLabel: { color: "#CFE2D4", fontSize: 12, fontWeight: "700" },
  quoteValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 5 },
  quoteMeta: { color: "#DCE8DF", lineHeight: 19, marginTop: 8, fontSize: 12 },
});
