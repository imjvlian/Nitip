import { formatRupiah } from "@nitip/domain";
import type { NitipCatalogOutlet, NitipProduct } from "@nitip/domain/catalog";
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

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getCatalogOutlet } from "../../lib/api";

export default function CatalogOutletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const cart = useCart();
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
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Gagal memuat outlet");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!user) return <Redirect href="/login" />;

  function addProduct(product: NitipProduct) {
    if (!catalog || !catalog.acceptingOrders || !product.isAvailable) return;

    const outlet = {
      id: catalog.id,
      name: catalog.name,
      businessName: catalog.businessName,
    };
    const result = cart.addItem(outlet, product);

    if (result === "different_outlet") {
      Alert.alert(
        "Ganti keranjang?",
        "Nitip hanya mendukung satu outlet per pesanan. Keranjang sekarang akan diganti.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ganti",
            style: "destructive",
            onPress: () => cart.replaceWithItem(outlet, product),
          },
        ],
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat menu...</Text>
        </View>
      ) : error || !catalog ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Outlet tidak tersedia</Text>
          <Text style={styles.muted}>{error ?? "Katalog tidak ditemukan"}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.eyebrow}>
            {catalog.acceptingOrders ? "MENERIMA PESANAN" : "SEDANG TUTUP"}
          </Text>
          <Text style={styles.title}>{catalog.businessName}</Text>
          <Text style={styles.outletName}>{catalog.name}</Text>
          <Text style={styles.address}>{catalog.addressLine}</Text>

          {catalog.categories.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Menu belum tersedia</Text>
              <Text style={styles.muted}>Merchant belum menambahkan produk aktif.</Text>
            </View>
          ) : (
            catalog.categories.map((category) => (
              <View key={category.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{category.name}</Text>
                {category.description ? (
                  <Text style={styles.sectionMeta}>{category.description}</Text>
                ) : null}
                {category.products.length === 0 ? (
                  <Text style={styles.muted}>Belum ada produk di kategori ini.</Text>
                ) : (
                  category.products.map((product) => {
                    const quantity =
                      cart.outlet?.id === catalog.id
                        ? cart.items.find((item) => item.product.id === product.id)?.quantity ?? 0
                        : 0;
                    const canAdd = catalog.acceptingOrders && product.isAvailable;

                    return (
                      <View
                        key={product.id}
                        style={[styles.productCard, !product.isAvailable && styles.unavailable]}
                      >
                        {product.imageUrl ? (
                          <Image source={{ uri: product.imageUrl }} style={styles.image} />
                        ) : (
                          <View style={styles.placeholder}>
                            <Text style={styles.placeholderText}>N</Text>
                          </View>
                        )}
                        <View style={styles.productBody}>
                          <View style={styles.row}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.price}>{formatRupiah(product.price)}</Text>
                          </View>
                          {product.description ? (
                            <Text style={styles.description}>{product.description}</Text>
                          ) : null}
                          <Text style={product.isAvailable ? styles.available : styles.soldOut}>
                            {product.isAvailable ? "Tersedia" : "Habis / tidak tersedia"}
                          </Text>
                          <Pressable
                            disabled={!canAdd}
                            onPress={() => addProduct(product)}
                            style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
                          >
                            <Text style={styles.addButtonText}>
                              {quantity > 0 ? `Tambah lagi · ${quantity} di cart` : "Tambah"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            ))
          )}

          {cart.itemCount > 0 ? (
            <Pressable onPress={() => router.push("/cart")} style={styles.cartBar}>
              <View style={styles.cartBarBody}>
                <Text style={styles.cartBarTitle}>Keranjang · {cart.itemCount} item</Text>
                <Text style={styles.cartBarMeta}>{cart.outlet?.businessName}</Text>
              </View>
              <Text style={styles.cartBarPrice}>{formatRupiah(cart.subtotal)}</Text>
            </Pressable>
          ) : null}
        </>
      )}
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
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 24, letterSpacing: -1 },
    loading: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 20,
      alignItems: "center",
      gap: 8,
    },
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
    productCard: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      marginTop: 9,
    },
    unavailable: { opacity: 0.58 },
    image: { width: 82, height: 82, borderRadius: 14, backgroundColor: colors.surfaceAccent },
    placeholder: {
      width: 82,
      height: 82,
      borderRadius: 14,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 27 },
    productBody: { flex: 1, paddingLeft: 12 },
    row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    productName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "900" },
    price: { color: colors.primary, fontSize: 12, fontWeight: "900" },
    description: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 6 },
    available: { color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: 8 },
    soldOut: { color: "#B42318", fontSize: 10, fontWeight: "800", marginTop: 8 },
    addButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.primaryStrong,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 10,
    },
    addButtonDisabled: { opacity: 0.45 },
    addButtonText: { color: colors.onPrimary, fontSize: 10, fontWeight: "900" },
    cartBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryStrong,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 4,
    },
    cartBarBody: { flex: 1 },
    cartBarTitle: { color: colors.onPrimary, fontWeight: "900", fontSize: 13 },
    cartBarMeta: { color: colors.secondary, fontSize: 10, marginTop: 2 },
    cartBarPrice: { color: colors.onPrimary, fontWeight: "900", fontSize: 13 },
  });
}
