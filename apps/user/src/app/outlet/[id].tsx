import { formatRupiah } from "@nitip/domain";
import type { NitipCatalogOutlet } from "@nitip/domain/catalog";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getCatalogOutlet } from "../../lib/api";

export default function CatalogOutletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [catalog, setCatalog] = useState<NitipCatalogOutlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    getCatalogOutlet(id)
      .then((next) => {
        if (active) setCatalog(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Gagal memuat outlet");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Kembali</Text></Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.muted}>Memuat menu...</Text></View>
      ) : error || !catalog ? (
        <View style={styles.card}><Text style={styles.cardTitle}>Outlet tidak tersedia</Text><Text style={styles.muted}>{error ?? "Katalog tidak ditemukan"}</Text></View>
      ) : (
        <>
          <Text style={styles.eyebrow}>{catalog.acceptingOrders ? "MENERIMA PESANAN" : "SEDANG TUTUP"}</Text>
          <Text style={styles.title}>{catalog.businessName}</Text>
          <Text style={styles.outletName}>{catalog.name}</Text>
          <Text style={styles.address}>{catalog.addressLine}</Text>

          {catalog.categories.length === 0 ? (
            <View style={styles.card}><Text style={styles.cardTitle}>Menu belum tersedia</Text><Text style={styles.muted}>Merchant belum menambahkan produk aktif.</Text></View>
          ) : catalog.categories.map((category) => (
            <View key={category.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{category.name}</Text>
              {category.description ? <Text style={styles.sectionMeta}>{category.description}</Text> : null}
              {category.products.length === 0 ? (
                <Text style={styles.muted}>Belum ada produk di kategori ini.</Text>
              ) : category.products.map((product) => (
                <View key={product.id} style={[styles.productCard, !product.isAvailable && styles.unavailable]}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.image} />
                  ) : (
                    <View style={styles.placeholder}><Text style={styles.placeholderText}>N</Text></View>
                  )}
                  <View style={styles.productBody}>
                    <View style={styles.row}><Text style={styles.productName}>{product.name}</Text><Text style={styles.price}>{formatRupiah(product.price)}</Text></View>
                    {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
                    <Text style={product.isAvailable ? styles.available : styles.soldOut}>{product.isAvailable ? "Tersedia" : "Habis / tidak tersedia"}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: { background: string; surface: string; surfaceAccent: string; primary: string; primaryStrong: string; secondary: string; text: string; textMuted: string; border: string; onPrimary: string }) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 42 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    back: { color: colors.primary, fontWeight: "900" },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 24, letterSpacing: -1 },
    loading: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 20, alignItems: "center", gap: 8 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
    title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    outletName: { color: colors.primary, fontWeight: "800", marginTop: 5 },
    address: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 24 },
    section: { marginBottom: 24 },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
    sectionMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3, marginBottom: 10 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    productCard: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 12, marginTop: 9 },
    unavailable: { opacity: 0.58 },
    image: { width: 82, height: 82, borderRadius: 14, backgroundColor: colors.surfaceAccent },
    placeholder: { width: 82, height: 82, borderRadius: 14, backgroundColor: colors.surfaceAccent, alignItems: "center", justifyContent: "center" },
    placeholderText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 27 },
    productBody: { flex: 1, paddingLeft: 12 },
    row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    productName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "900" },
    price: { color: colors.primary, fontSize: 12, fontWeight: "900" },
    description: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 6 },
    available: { color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: 8 },
    soldOut: { color: "#B42318", fontSize: 10, fontWeight: "800", marginTop: 8 },
  });
}
