import { formatRupiah } from "@nitip/domain";
import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function CartScreen() {
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      <Text style={styles.eyebrow}>KERANJANG</Text>
      <Text style={styles.title}>{cart.outlet?.businessName ?? "Keranjang kosong"}</Text>
      {cart.outlet ? <Text style={styles.subtitle}>{cart.outlet.name}</Text> : null}

      {cart.items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.cardTitle}>Belum ada produk</Text>
          <Text style={styles.muted}>Pilih produk dari merchant untuk mulai membuat pesanan.</Text>
          <Pressable onPress={() => router.replace("/home")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Cari merchant</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {cart.items.map((item) => {
            const maxQuantity = item.product.stockQuantity ?? 99;
            return (
              <View key={item.product.id} style={styles.itemCard}>
                {item.product.imageUrl ? (
                  <Image source={{ uri: item.product.imageUrl }} style={styles.image} />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>N</Text>
                  </View>
                )}
                <View style={styles.itemBody}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.price}>{formatRupiah(item.product.price)}</Text>
                  <View style={styles.quantityRow}>
                    <Pressable
                      onPress={() => cart.setQuantity(item.product.id, item.quantity - 1)}
                      style={styles.qtyButton}
                    >
                      <Text style={styles.qtyButtonText}>−</Text>
                    </Pressable>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Pressable
                      disabled={item.quantity >= maxQuantity}
                      onPress={() => cart.setQuantity(item.product.id, item.quantity + 1)}
                      style={[styles.qtyButton, item.quantity >= maxQuantity && styles.disabled]}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </Pressable>
                    <Pressable onPress={() => cart.removeItem(item.product.id)}>
                      <Text style={styles.removeText}>Hapus</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.lineTotal}>
                    {formatRupiah(item.product.price * item.quantity)}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatRupiah(cart.subtotal)}</Text>
            </View>
            <Text style={styles.note}>Ongkir dan biaya layanan dihitung oleh server saat checkout.</Text>
          </View>

          <Pressable onPress={() => router.push("/checkout")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Lanjut checkout · {cart.itemCount} item</Text>
          </Pressable>
          <Pressable onPress={cart.clearCart} style={styles.clearButton}>
            <Text style={styles.clearText}>Kosongkan keranjang</Text>
          </Pressable>
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
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 42 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    back: { color: colors.primary, fontWeight: "900" },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 24, letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
    title: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, marginTop: 5, marginBottom: 18 },
    emptyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, marginTop: 18 },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
    itemCard: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 12, marginTop: 10 },
    image: { width: 78, height: 78, borderRadius: 14, backgroundColor: colors.surfaceAccent },
    placeholder: { width: 78, height: 78, borderRadius: 14, backgroundColor: colors.surfaceAccent, alignItems: "center", justifyContent: "center" },
    placeholderText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 26 },
    itemBody: { flex: 1, paddingLeft: 12 },
    itemName: { color: colors.text, fontWeight: "900", fontSize: 14 },
    price: { color: colors.primary, fontWeight: "800", fontSize: 11, marginTop: 3 },
    quantityRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 10 },
    qtyButton: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    qtyButtonText: { color: colors.primaryStrong, fontSize: 17, fontWeight: "900" },
    quantity: { minWidth: 20, textAlign: "center", color: colors.text, fontWeight: "900" },
    disabled: { opacity: 0.35 },
    removeText: { color: "#B42318", fontWeight: "800", fontSize: 10, marginLeft: 4 },
    lineTotal: { color: colors.text, fontWeight: "900", fontSize: 11, marginTop: 9 },
    summaryCard: { backgroundColor: colors.surfaceAccent, borderRadius: 18, padding: 16, marginTop: 18 },
    summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    summaryValue: { color: colors.text, fontWeight: "900", fontSize: 15 },
    note: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 8 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 16 },
    primaryButtonText: { color: colors.onPrimary, fontWeight: "900" },
    clearButton: { alignItems: "center", paddingVertical: 14 },
    clearText: { color: "#B42318", fontWeight: "800", fontSize: 11 },
  });
}
