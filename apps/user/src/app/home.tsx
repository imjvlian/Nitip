import { calculateOrderQuote, formatRupiah, type NitipUserProfile } from "@nitip/domain";
import type { NitipCatalogOutletSummary } from "@nitip/domain/catalog";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { apiConfigured, getMe, listCatalogOutlets } from "../lib/api";

const sample = calculateOrderQuote({ subtotal: 60_000, distanceKm: 3 });

export default function HomeScreen() {
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<NitipCatalogOutletSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!apiConfigured) return;

    let active = true;
    setCatalogLoading(true);
    setCatalogError(null);

    listCatalogOutlets()
      .then((items) => {
        if (active) setCatalog(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogError(
            error instanceof Error ? error.message : "Gagal memuat katalog",
          );
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!user) return <Redirect href="/login" />;

  const firstName =
    profile?.displayName?.split(" ")[0] ??
    user.displayName?.split(" ")[0] ??
    "Kamu";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>nitip.</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/orders")}
            style={styles.ordersButton}
          >
            <Text style={styles.ordersButtonText}>Pesanan</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/profile")}
            style={styles.profileButton}
          >
            <Text style={styles.profileButtonText}>Profil</Text>
          </Pressable>
          <Pressable
            onPress={() => void signOut()}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>Keluar</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.eyebrow}>Halo, {firstName} 👋</Text>
      <Text style={styles.title}>Mau nitip apa hari ini?</Text>

      {profileLoading ? (
        <View style={styles.statusCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.statusText}>Menyinkronkan profil Nitip...</Text>
        </View>
      ) : null}

      {!apiConfigured ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>API belum dikonfigurasi</Text>
          <Text style={styles.statusText}>
            Set EXPO_PUBLIC_API_URL untuk menghubungkan aplikasi ke Nitip API.
          </Text>
        </View>
      ) : null}

      {profileError ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Profil belum tersambung</Text>
          <Text style={styles.statusText}>{profileError}</Text>
        </View>
      ) : null}

      {profile ? (
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.identityCard}
        >
          <Text style={styles.identityLabel}>NITIP PROFILE</Text>
          <Text style={styles.identityValue}>
            {profile.email ?? "Tanpa email"}
          </Text>
          <Text style={styles.identityMeta}>
            Role: {profile.role} · {profile.phoneNumber ?? "Nomor HP belum diisi"}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => router.push("/orders")}
        style={styles.orderShortcut}
      >
        <View style={styles.orderShortcutBody}>
          <Text style={styles.orderShortcutEyebrow}>PESANAN SAYA</Text>
          <Text style={styles.orderShortcutTitle}>Pantau status & riwayat</Text>
          <Text style={styles.orderShortcutMeta}>
            Lihat pesanan aktif, selesai, atau dibatalkan.
          </Text>
        </View>
        <Text style={styles.orderShortcutArrow}>→</Text>
      </Pressable>

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

      <Text style={styles.sectionTitle}>Merchant Nitip</Text>
      {catalogLoading ? (
        <View style={styles.catalogLoading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.statusText}>Memuat katalog...</Text>
        </View>
      ) : catalogError ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Katalog belum tersedia</Text>
          <Text style={styles.statusText}>{catalogError}</Text>
        </View>
      ) : catalog.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.statusTitle}>Belum ada merchant publik</Text>
          <Text style={styles.statusText}>
            Katalog hanya menampilkan merchant berstatus approved. Merchant yang
            masih menunggu review tidak dipublikasikan.
          </Text>
        </View>
      ) : (
        catalog.map((outlet) => (
          <Pressable
            key={outlet.id}
            onPress={() => router.push(`/outlet/${outlet.id}`)}
            style={styles.card}
          >
            {outlet.imageUrl ? (
              <Image source={{ uri: outlet.imageUrl }} style={styles.merchantImage} />
            ) : (
              <View style={styles.merchantAvatar}>
                <Text style={styles.avatarText}>
                  {outlet.businessName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{outlet.businessName}</Text>
              <Text style={styles.cardMeta}>
                {outlet.name} · {outlet.acceptingOrders ? "Buka" : "Tutup"}
              </Text>
              <Text style={styles.cardMeta}>{outlet.productCount} produk</Text>
              <Text style={styles.cardPrice}>
                {outlet.minPrice == null
                  ? "Menu segera tersedia"
                  : `Mulai ${formatRupiah(outlet.minPrice)}`}
              </Text>
            </View>
          </Pressable>
        ))
      )}

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
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 40,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 34,
    },
    brand: {
      fontSize: 29,
      fontWeight: "900",
      color: colors.primaryStrong,
      letterSpacing: -1.2,
    },
    headerActions: { flexDirection: "row", gap: 6 },
    ordersButton: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    ordersButtonText: {
      color: colors.onPrimary,
      fontWeight: "900",
      fontSize: 11,
    },
    profileButton: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    profileButtonText: {
      color: colors.primaryStrong,
      fontWeight: "900",
      fontSize: 11,
    },
    logoutButton: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    logoutText: { color: colors.text, fontWeight: "800", fontSize: 11 },
    eyebrow: { color: colors.primary, fontSize: 14, fontWeight: "700" },
    title: {
      marginTop: 4,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -1.1,
    },
    statusCard: {
      marginTop: 18,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAccent,
      padding: 15,
      gap: 6,
    },
    statusTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
    statusText: { color: colors.textMuted, lineHeight: 18, fontSize: 12 },
    identityCard: {
      marginTop: 18,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
    },
    identityLabel: {
      color: colors.primary,
      fontWeight: "900",
      fontSize: 10,
      letterSpacing: 1.2,
    },
    identityValue: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
      marginTop: 5,
    },
    identityMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    orderShortcut: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
      borderRadius: 18,
      backgroundColor: colors.primaryStrong,
      padding: 16,
    },
    orderShortcutBody: { flex: 1 },
    orderShortcutEyebrow: {
      color: colors.secondary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },
    orderShortcutTitle: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "900",
      marginTop: 4,
    },
    orderShortcutMeta: {
      color: colors.secondary,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },
    orderShortcutArrow: {
      color: colors.onPrimary,
      fontSize: 24,
      fontWeight: "900",
      marginLeft: 12,
    },
    searchBox: {
      marginTop: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    searchText: { color: colors.textMuted },
    sectionTitle: {
      marginTop: 30,
      marginBottom: 12,
      color: colors.text,
      fontWeight: "900",
      fontSize: 18,
    },
    categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    category: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryText: { color: colors.text, fontWeight: "700" },
    catalogLoading: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      gap: 8,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    merchantAvatar: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    merchantImage: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: colors.surfaceAccent,
    },
    avatarText: {
      color: colors.primaryStrong,
      fontWeight: "900",
      fontSize: 28,
    },
    cardContent: { flex: 1, paddingLeft: 14, justifyContent: "center" },
    cardTitle: { fontWeight: "800", fontSize: 16, color: colors.text },
    cardMeta: { color: colors.textMuted, marginTop: 3, fontSize: 11 },
    cardPrice: { color: colors.primary, marginTop: 7, fontWeight: "900" },
    quoteCard: {
      marginTop: 24,
      borderRadius: 20,
      backgroundColor: colors.primaryStrong,
      padding: 18,
    },
    quoteLabel: {
      color: colors.secondary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    quoteValue: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "900",
      marginTop: 6,
    },
    quoteMeta: {
      color: colors.secondary,
      lineHeight: 19,
      marginTop: 8,
      fontSize: 12,
    },
  });
}
