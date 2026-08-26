import { calculateOrderQuote, formatRupiah, type NitipUserProfile } from "@nitip/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { apiConfigured, getMe } from "../lib/api";

const sample = calculateOrderQuote({ subtotal: 60_000, distanceKm: 3 });

export default function HomeScreen() {
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !apiConfigured) return;

    let active = true;
    setProfileLoading(true);
    setProfileError(null);

    getMe(user)
      .then((nextProfile) => {
        if (active) setProfile(nextProfile);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfileError(
          error instanceof Error ? error.message : "Gagal memuat profil Nitip",
        );
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const firstName =
    profile?.displayName?.split(" ")[0] ?? user.displayName?.split(" ")[0] ?? "Kamu";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>nitip.</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/profile")} style={styles.profileButton}>
            <Text style={styles.profileButtonText}>Profil</Text>
          </Pressable>
          <Pressable onPress={() => void signOut()} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Keluar</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.eyebrow}>Halo, {firstName} 👋</Text>
      <Text style={styles.title}>Mau nitip apa hari ini?</Text>

      {profileLoading && (
        <View style={styles.statusCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.statusText}>Menyinkronkan profil Nitip...</Text>
        </View>
      )}

      {!apiConfigured && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Firebase Auth sudah siap untuk dipakai</Text>
          <Text style={styles.statusText}>
            Set EXPO_PUBLIC_API_URL untuk menghubungkan akun Firebase ke profil MongoDB.
          </Text>
        </View>
      )}

      {profileError && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>API belum tersambung</Text>
          <Text style={styles.statusText}>{profileError}</Text>
        </View>
      )}

      {profile && (
        <Pressable onPress={() => router.push("/profile")} style={styles.identityCard}>
          <Text style={styles.identityLabel}>NITIP PROFILE</Text>
          <Text style={styles.identityValue}>{profile.email ?? "Tanpa email"}</Text>
          <Text style={styles.identityMeta}>
            Role: {profile.role} · {profile.phoneNumber ?? "Nomor HP belum diisi"}
          </Text>
        </Pressable>
      )}

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
        <View style={styles.merchantAvatar}>
          <Text style={styles.avatarText}>N</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Nasi Ayam Bu Rini</Text>
          <Text style={styles.cardMeta}>1,2 km · ±25 menit · Buka</Text>
          <Text style={styles.cardPrice}>Mulai Rp12.000</Text>
        </View>
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteLabel}>SIMULASI · Rp60.000 · 3 KM</Text>
        <Text style={styles.quoteValue}>{formatRupiah(sample.customerTotal)}</Text>
        <Text style={styles.quoteMeta}>
          Termasuk ongkir {formatRupiah(sample.deliveryFare)} dan biaya layanan {formatRupiah(sample.serviceFee)}.
        </Text>
      </View>
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
    container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
    brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 34 },
    brand: { fontSize: 29, fontWeight: "900", color: colors.primaryStrong, letterSpacing: -1.2 },
    headerActions: { flexDirection: "row", gap: 8 },
    profileButton: { backgroundColor: colors.surfaceAccent, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
    profileButtonText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 12 },
    logoutButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
    logoutText: { color: colors.text, fontWeight: "800", fontSize: 12 },
    eyebrow: { color: colors.primary, fontSize: 14, fontWeight: "700" },
    title: { marginTop: 4, fontSize: 32, lineHeight: 38, fontWeight: "900", color: colors.text, letterSpacing: -1.1 },
    statusCard: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAccent, padding: 15, gap: 6 },
    statusTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
    statusText: { color: colors.textMuted, lineHeight: 18, fontSize: 12 },
    identityCard: { marginTop: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 15 },
    identityLabel: { color: colors.primary, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
    identityValue: { color: colors.text, fontWeight: "800", fontSize: 14, marginTop: 5 },
    identityMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    searchBox: { marginTop: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16 },
    searchText: { color: colors.textMuted },
    sectionTitle: { marginTop: 30, marginBottom: 12, color: colors.text, fontWeight: "900", fontSize: 18 },
    categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    category: { backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: colors.border },
    categoryText: { color: colors.text, fontWeight: "700" },
    card: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.border },
    merchantAvatar: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.surfaceAccent, alignItems: "center", justifyContent: "center" },
    avatarText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 28 },
    cardContent: { flex: 1, paddingLeft: 14, justifyContent: "center" },
    cardTitle: { fontWeight: "800", fontSize: 16, color: colors.text },
    cardMeta: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
    cardPrice: { color: colors.primary, marginTop: 7, fontWeight: "900" },
    quoteCard: { marginTop: 24, borderRadius: 20, backgroundColor: colors.primaryStrong, padding: 18 },
    quoteLabel: { color: colors.secondary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
    quoteValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 6 },
    quoteMeta: { color: colors.secondary, lineHeight: 19, marginTop: 8, fontSize: 12 },
  });
}
