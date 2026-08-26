import { formatRupiah } from "@nitip/domain";
import type { NitipCategory, NitipProduct } from "@nitip/domain/catalog";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  updateCategory,
  updateProduct,
} from "../lib/api";

export default function MenuScreen() {
  const { outletId, outletName } = useLocalSearchParams<{ outletId: string; outletName?: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [categories, setCategories] = useState<NitipCategory[]>([]);
  const [products, setProducts] = useState<NitipProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user || !outletId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextProducts] = await Promise.all([
        listCategories(user, outletId),
        listProducts(user, outletId),
      ]);
      setCategories(nextCategories);
      setProducts(nextProducts);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal memuat menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user, outletId]);

  if (!user) return <Redirect href="/login" />;

  async function toggleCategory(category: NitipCategory) {
    try {
      const next = await updateCategory(user, outletId, category.id, { isActive: !category.isActive });
      setCategories((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengubah kategori");
    }
  }

  async function toggleAvailability(product: NitipProduct) {
    try {
      const next = await updateProduct(user, outletId, product.id, { isAvailable: !product.isAvailable });
      setProducts((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengubah ketersediaan");
    }
  }

  async function toggleProductVisibility(product: NitipProduct) {
    try {
      const next = await updateProduct(user, outletId, product.id, { isActive: !product.isActive });
      setProducts((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengubah produk");
    }
  }

  function confirmDeleteProduct(product: NitipProduct) {
    Alert.alert("Hapus produk?", `${product.name} akan dihapus permanen.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => void (async () => {
          try {
            await deleteProduct(user, outletId, product.id);
            setProducts((current) => current.filter((item) => item.id !== product.id));
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Gagal menghapus produk");
          }
        })(),
      },
    ]);
  }

  function confirmDeleteCategory(category: NitipCategory) {
    Alert.alert("Hapus kategori?", "Kategori hanya bisa dihapus jika tidak memiliki produk.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => void (async () => {
          try {
            await deleteCategory(user, outletId, category.id);
            setCategories((current) => current.filter((item) => item.id !== category.id));
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Gagal menghapus kategori");
          }
        })(),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Kembali</Text></Pressable>
        <Text style={styles.brand}>nitip mitra.</Text>
      </View>
      <Text style={styles.eyebrow}>MENU OUTLET</Text>
      <Text style={styles.title}>{outletName || "Kelola menu"}</Text>
      <Text style={styles.subtitle}>Kategori dan produk di sini akan menjadi katalog customer setelah merchant disetujui Ops.</Text>

      <View style={styles.actionsTop}>
        <Pressable
          onPress={() => router.push({ pathname: "/category/new", params: { outletId, outletName: outletName ?? "" } })}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>+ Kategori</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/product/new", params: { outletId, outletName: outletName ?? "" } })}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>+ Produk</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingCard}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.muted}>Memuat menu...</Text></View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Kategori</Text>
          {categories.length === 0 ? (
            <View style={styles.card}><Text style={styles.cardTitle}>Belum ada kategori</Text><Text style={styles.muted}>Buat kategori seperti Makanan, Minuman, atau Paket.</Text></View>
          ) : categories.map((category) => (
            <View key={category.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}><Text style={styles.cardTitle}>{category.name}</Text><Text style={styles.muted}>{category.description || "Tanpa deskripsi"}</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText}>{category.isActive ? "TAMPIL" : "SEMBUNYI"}</Text></View>
              </View>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => void toggleCategory(category)}><Text style={styles.linkText}>{category.isActive ? "Sembunyikan" : "Tampilkan"}</Text></Pressable>
                <Pressable onPress={() => confirmDeleteCategory(category)}><Text style={styles.dangerText}>Hapus</Text></Pressable>
              </View>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Produk</Text>
          {products.length === 0 ? (
            <View style={styles.card}><Text style={styles.cardTitle}>Belum ada produk</Text><Text style={styles.muted}>Tambahkan produk setelah membuat minimal satu kategori.</Text></View>
          ) : products.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            return (
              <View key={product.id} style={styles.productCard}>
                {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : <View style={styles.productPlaceholder}><Text style={styles.placeholderText}>N</Text></View>}
                <View style={styles.productBody}>
                  <View style={styles.rowBetween}><Text style={styles.productName}>{product.name}</Text><Text style={styles.price}>{formatRupiah(product.price)}</Text></View>
                  <Text style={styles.muted}>{category?.name ?? "Tanpa kategori"} · {product.stockQuantity == null ? "Stok tidak dilacak" : `Stok ${product.stockQuantity}`}</Text>
                  <Text style={styles.meta}>{product.isActive ? "Tampil" : "Disembunyikan"} · {product.isAvailable ? "Tersedia" : "Habis/Tidak tersedia"}</Text>
                  <View style={styles.inlineActions}>
                    <Pressable onPress={() => void toggleAvailability(product)}><Text style={styles.linkText}>{product.isAvailable ? "Tandai habis" : "Tandai tersedia"}</Text></Pressable>
                    <Pressable onPress={() => void toggleProductVisibility(product)}><Text style={styles.linkText}>{product.isActive ? "Sembunyikan" : "Tampilkan"}</Text></Pressable>
                    <Pressable onPress={() => confirmDeleteProduct(product)}><Text style={styles.dangerText}>Hapus</Text></Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

      {error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>}
    </ScrollView>
  );
}

function createStyles(colors: { background: string; surface: string; surfaceAccent: string; primary: string; primaryStrong: string; secondary: string; text: string; textMuted: string; border: string; onPrimary: string }) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 42 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    back: { color: colors.primary, fontWeight: "900" },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 23, letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
    title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 7 },
    actionsTop: { flexDirection: "row", gap: 9, marginTop: 20 },
    primaryButton: { flex: 1, backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 13 },
    primaryText: { color: "#FFFFFF", fontWeight: "900" },
    secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 14, alignItems: "center", paddingVertical: 13 },
    secondaryText: { color: colors.primary, fontWeight: "900" },
    loadingCard: { marginTop: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, alignItems: "center", gap: 8 },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 28, marginBottom: 10 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15, marginBottom: 9 },
    cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
    flex: { flex: 1 },
    rowBetween: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    badge: { backgroundColor: colors.surfaceAccent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
    badgeText: { color: colors.primaryStrong, fontSize: 8, fontWeight: "900" },
    inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 11 },
    linkText: { color: colors.primary, fontWeight: "800", fontSize: 11 },
    dangerText: { color: "#B42318", fontWeight: "800", fontSize: 11 },
    productCard: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 12, marginBottom: 9 },
    productImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.surfaceAccent },
    productPlaceholder: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.surfaceAccent, alignItems: "center", justifyContent: "center" },
    placeholderText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 24 },
    productBody: { flex: 1, paddingLeft: 12 },
    productName: { flex: 1, color: colors.text, fontWeight: "900", fontSize: 14 },
    price: { color: colors.primary, fontWeight: "900", fontSize: 12 },
    meta: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 6 },
    errorCard: { marginTop: 14, backgroundColor: colors.surfaceAccent, borderRadius: 14, padding: 13 },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
  });
}
