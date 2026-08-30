import { formatRupiah } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { ROOT_BOTTOM_NAV_HEIGHT } from "../components/BottomNavigation";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { cartLineUnitPrice, useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

const CHECKOUT_BAR_SCROLL_CLEARANCE = ROOT_BOTTOM_NAV_HEIGHT + 104;

export default function CartScreen() {
  const { t } = useNitipTranslation();
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/login" />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: cart.items.length > 0 ? CHECKOUT_BAR_SCROLL_CLEARANCE : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={t("common.cart")} />

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            {cart.outlet?.businessName ?? t("cart.emptyTitle")}
          </Text>
          {cart.outlet ? (
            <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{cart.outlet.name}</Text>
          ) : null}
        </View>

        {cart.items.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name="cart" size={22} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("cart.noProducts")}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{t("cart.noProductsDescription")}</Text>
            <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
              <NitipIcon color="#FFFFFF" name="store" size={17} />
              <Text style={styles.primaryButtonText}>{t("cart.browseMerchants")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.list}>
              {cart.items.map((item) => {
                const maxQuantity = item.product.stockQuantity ?? 99;
                const unitPrice = cartLineUnitPrice(item);

                return (
                  <View
                    key={item.product.id}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.shadow,
                      },
                    ]}
                  >
                    {item.product.imageUrl ? (
                      <Image
                        source={{ uri: item.product.imageUrl }}
                        style={[styles.image, { backgroundColor: theme.colors.surfaceAccent }]}
                      />
                    ) : (
                      <View style={[styles.imageFallback, { backgroundColor: theme.colors.surfaceAccent }]}>
                        <NitipIcon color={theme.colors.primary} name="food" size={24} />
                      </View>
                    )}

                    <View style={styles.itemCopy}>
                      <Text numberOfLines={2} style={[styles.itemName, { color: theme.colors.text }]}>{item.product.name}</Text>
                      <Text style={[styles.unitPrice, { color: theme.colors.primary }]}>{formatRupiah(unitPrice)}</Text>

                      {item.selectedAddons.length > 0 ? (
                        <View style={styles.addons}>
                          {item.selectedAddons.map((addon) => (
                            <Text key={addon.id} style={[styles.addon, { color: theme.colors.textMuted }]}>
                              + {addon.name}{addon.price > 0 ? ` · ${formatRupiah(addon.price)}` : ""}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.quantityRow}>
                        <Pressable
                          onPress={() => cart.setQuantity(item.product.id, item.quantity - 1)}
                          style={[styles.quantityButton, { backgroundColor: theme.colors.surfaceAccent }]}
                        >
                          <NitipIcon color={theme.colors.text} name="minus" size={15} />
                        </Pressable>
                        <Text style={[styles.quantity, { color: theme.colors.text }]}>{item.quantity}</Text>
                        <Pressable
                          disabled={item.quantity >= maxQuantity}
                          onPress={() => cart.setQuantity(item.product.id, item.quantity + 1)}
                          style={[
                            styles.quantityButton,
                            {
                              backgroundColor: theme.colors.surfaceAccent,
                              opacity: item.quantity >= maxQuantity ? 0.35 : 1,
                            },
                          ]}
                        >
                          <NitipIcon color={theme.colors.text} name="plus" size={15} />
                        </Pressable>
                        <Pressable
                          onPress={() => cart.removeItem(item.product.id)}
                          style={[styles.quantityButton, styles.removeButton, { backgroundColor: theme.colors.dangerSurface }]}
                        >
                          <NitipIcon color={theme.colors.danger} name="trash" size={14} />
                        </Pressable>
                      </View>

                      <Text style={[styles.lineTotal, { color: theme.colors.text }]}>{formatRupiah(unitPrice * item.quantity)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>{t("cart.subtotal")}</Text>
                <Text style={[styles.summaryTotal, { color: theme.colors.text }]}>{formatRupiah(cart.subtotal)}</Text>
              </View>
              <Text style={[styles.summaryNote, { color: theme.colors.textMuted }]}>{t("cart.feeNote")}</Text>
            </View>

            <Pressable onPress={cart.clearCart} style={styles.clearButton}>
              <NitipIcon color={theme.colors.danger} name="trash" size={14} />
              <Text style={[styles.clearText, { color: theme.colors.danger }]}>{t("cart.clear")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {cart.items.length > 0 ? (
        <View
          style={[
            styles.checkoutBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              bottom: ROOT_BOTTOM_NAV_HEIGHT,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={styles.checkoutCopy}>
            <Text style={[styles.checkoutLabel, { color: theme.colors.textMuted }]}>{t("cart.subtotal")}</Text>
            <Text style={[styles.checkoutTotal, { color: theme.colors.text }]}>{formatRupiah(cart.subtotal)}</Text>
          </View>
          <Pressable onPress={() => router.push("/checkout")} style={[styles.checkoutButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.checkoutButtonText}>{t("cart.checkoutCta", { count: cart.itemCount })}</Text>
            <NitipIcon color="#FFFFFF" name="next" size={16} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  hero: { marginTop: 26 },
  heroTitle: { fontSize: 27, fontWeight: "900", letterSpacing: -0.7 },
  heroSubtitle: { fontSize: 11, marginTop: 5 },
  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
  },
  emptyIcon: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", marginBottom: 14, width: 50 },
  emptyTitle: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  emptyBody: { fontSize: 10, lineHeight: 17, marginTop: 8, textAlign: "center" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 48,
    width: "100%",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  list: { gap: 10, marginTop: 18 },
  itemCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  image: { borderRadius: 16, height: 86, width: 86 },
  imageFallback: { alignItems: "center", borderRadius: 16, height: 86, justifyContent: "center", width: 86 },
  itemCopy: { flex: 1, minWidth: 0, paddingLeft: 13 },
  itemName: { fontSize: 12, fontWeight: "900", lineHeight: 16 },
  unitPrice: { fontSize: 10, fontWeight: "800", marginTop: 5 },
  addons: { marginTop: 5 },
  addon: { fontSize: 8, lineHeight: 12 },
  quantityRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 10 },
  quantityButton: { alignItems: "center", borderRadius: 11, height: 32, justifyContent: "center", width: 32 },
  removeButton: { marginLeft: 2 },
  quantity: { fontSize: 11, fontWeight: "900", minWidth: 22, textAlign: "center" },
  lineTotal: { fontSize: 11, fontWeight: "900", marginTop: 8 },
  summaryCard: { borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 15 },
  summaryRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 10 },
  summaryTotal: { fontSize: 14, fontWeight: "900" },
  summaryNote: { fontSize: 9, lineHeight: 14, marginTop: 5 },
  clearButton: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 7, marginTop: 8, paddingHorizontal: 14, paddingVertical: 12 },
  clearText: { fontSize: 10, fontWeight: "900" },
  checkoutBar: {
    alignItems: "center",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    elevation: 10,
    flexDirection: "row",
    gap: 14,
    left: 0,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: "absolute",
    right: 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  checkoutCopy: { flex: 1 },
  checkoutLabel: { fontSize: 9, fontWeight: "700" },
  checkoutTotal: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  checkoutButton: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1.55,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  checkoutButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", textAlign: "center" },
});
