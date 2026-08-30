import Ionicons from "@expo/vector-icons/Ionicons";
import { formatRupiah } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { ROOT_BOTTOM_NAV_HEIGHT } from "../components/BottomNavigation";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

const ROOT_TAB_SCROLL_CLEARANCE = ROOT_BOTTOM_NAV_HEIGHT + 28;

const COPY = {
  id: {
    title: "Favorit",
    loading: "Memuat favorit...",
    emptyTitle: "Belum ada menu favorit",
    emptyBody: "Simpan menu yang kamu suka dari halaman detail agar mudah ditemukan lagi.",
    browse: "Cari menu",
    remove: "Hapus dari favorit",
    unrated: "Belum ada rating",
    details: "Lihat detail",
  },
  en: {
    title: "Favorites",
    loading: "Loading favorites...",
    emptyTitle: "No favorite menus yet",
    emptyBody: "Save menus from their detail pages so you can find them quickly later.",
    browse: "Browse menus",
    remove: "Remove from favorites",
    unrated: "No ratings yet",
    details: "View details",
  },
} as const;

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const favorites = useFavorites();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const copy = COPY[language];

  if (!user) return <Redirect href="/login" />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: ROOT_TAB_SCROLL_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.title} showBack={false} />

        {!favorites.ready ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{copy.loading}</Text>
          </View>
        ) : favorites.favorites.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name="favorite" size={22} variant="filled" />
            </View>
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{copy.emptyTitle}</Text>
            <Text style={[styles.stateBodyCentered, { color: theme.colors.textMuted }]}>{copy.emptyBody}</Text>
            <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
              <NitipIcon color="#FFFFFF" name="search" size={16} />
              <Text style={styles.primaryButtonText}>{copy.browse}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.favorites.map((item) => {
              const hasRating = item.ratingCount > 0 && item.ratingAverage != null;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/product/[id]",
                      params: { id: item.id, outletId: item.outletId },
                    })
                  }
                  style={[
                    styles.favoriteCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.shadow,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    {item.imageUrl ? (
                      <Image
                        resizeMode="cover"
                        source={{ uri: item.imageUrl }}
                        style={[styles.productImage, { backgroundColor: theme.colors.surfaceAccent }]}
                      />
                    ) : (
                      <View style={[styles.productImageFallback, { backgroundColor: theme.colors.surfaceAccent }]}>
                        <NitipIcon color={theme.colors.primary} name="food" size={24} />
                      </View>
                    )}

                    <View style={styles.cardIdentity}>
                      <Text numberOfLines={2} style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
                      <Text numberOfLines={1} style={[styles.businessName, { color: theme.colors.textMuted }]}>{item.businessName}</Text>
                      <Text numberOfLines={1} style={[styles.outletName, { color: theme.colors.textMuted }]}>{item.outletName}</Text>
                    </View>

                    <Pressable
                      accessibilityLabel={copy.remove}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        favorites.removeProduct(item.id);
                      }}
                      style={[styles.favoriteButton, { backgroundColor: theme.colors.dangerSurface }]}
                    >
                      <Ionicons color={theme.colors.danger} name="heart" size={18} />
                    </Pressable>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                  <View style={styles.priceRow}>
                    <Text style={[styles.rating, { color: theme.colors.textMuted }]}>
                      ★ {hasRating ? `${item.ratingAverage?.toFixed(1)} (${item.ratingCount})` : copy.unrated}
                    </Text>
                    <Text style={[styles.price, { color: theme.colors.text }]}>{formatRupiah(item.price)}</Text>
                  </View>

                  {item.description ? (
                    <Text numberOfLines={2} style={[styles.description, { color: theme.colors.textMuted }]}>{item.description}</Text>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailText, { color: theme.colors.primary }]}>{copy.details}</Text>
                    <NitipIcon color={theme.colors.textMuted} name="next" size={15} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  stateCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 24,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginBottom: 14,
    width: 48,
  },
  stateTitle: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  stateBody: { fontSize: 10, lineHeight: 16, marginTop: 8 },
  stateBodyCentered: { fontSize: 10, lineHeight: 17, marginTop: 8, textAlign: "center" },
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
  list: { gap: 10, marginTop: 14 },
  favoriteCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  cardTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  productImage: { borderRadius: 15, height: 72, width: 72 },
  productImageFallback: { alignItems: "center", borderRadius: 15, height: 72, justifyContent: "center", width: 72 },
  cardIdentity: { flex: 1, minWidth: 0 },
  productName: { fontSize: 13, fontWeight: "900", lineHeight: 18 },
  businessName: { fontSize: 10, fontWeight: "800", marginTop: 5 },
  outletName: { fontSize: 9, marginTop: 2 },
  favoriteButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  divider: { height: 1, marginVertical: 14 },
  priceRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  rating: { flex: 1, fontSize: 9 },
  price: { fontSize: 13, fontWeight: "900" },
  description: { fontSize: 9, lineHeight: 14, marginTop: 7 },
  detailRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  detailText: { fontSize: 10, fontWeight: "900" },
});
