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
    savedMenus: "Menu tersimpan",
    remove: "Hapus dari favorit",
    unrated: "Belum ada rating",
  },
  en: {
    title: "Favorites",
    loading: "Loading favorites...",
    emptyTitle: "No favorite menus yet",
    emptyBody: "Save menus from their detail pages so you can find them quickly later.",
    browse: "Browse menus",
    savedMenus: "Saved menus",
    remove: "Remove from favorites",
    unrated: "No ratings yet",
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
        <AppHeader
          title={copy.title}
          showBack={false}
          right={
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <NitipIcon color={theme.colors.primary} name="favorite" size={18} variant="filled" />
            </View>
          }
        />

        {!favorites.ready ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{copy.loading}</Text>
          </View>
        ) : favorites.favorites.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name="favorite" size={24} variant="outline" />
            </View>
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{copy.emptyTitle}</Text>
            <Text style={[styles.stateBodyCentered, { color: theme.colors.textMuted }]}>{copy.emptyBody}</Text>
            <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
              <NitipIcon color="#FFFFFF" name="search" size={16} />
              <Text style={styles.primaryButtonText}>{copy.browse}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{copy.savedMenus}</Text>
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
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.shadow,
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={[styles.image, { backgroundColor: theme.colors.surfaceAccent }]} />
                    ) : (
                      <View style={[styles.imageFallback, { backgroundColor: theme.colors.surfaceAccent }]}>
                        <NitipIcon color={theme.colors.primary} name="food" size={26} />
                      </View>
                    )}

                    <View style={styles.cardCopy}>
                      <Text numberOfLines={2} style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
                      {item.description ? (
                        <Text numberOfLines={2} style={[styles.description, { color: theme.colors.textMuted }]}>{item.description}</Text>
                      ) : null}
                      <Text numberOfLines={1} style={[styles.merchant, { color: theme.colors.textMuted }]}>
                        {item.businessName} · {item.outletName}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[styles.price, { color: theme.colors.primary }]}>{formatRupiah(item.price)}</Text>
                        <Text style={[styles.rating, { color: theme.colors.textMuted }]}>
                          ★ {hasRating ? `${item.ratingAverage?.toFixed(1)} (${item.ratingCount})` : copy.unrated}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityLabel={copy.remove}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        favorites.removeProduct(item.id);
                      }}
                      style={[styles.removeButton, { backgroundColor: theme.colors.surfaceAccent }]}
                    >
                      <NitipIcon color={theme.colors.danger} name="favorite" size={17} variant="filled" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerIcon: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stateCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    marginBottom: 14,
    width: 56,
  },
  stateTitle: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  stateBody: { fontSize: 10, lineHeight: 16, marginTop: 10 },
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
  listSection: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "900" },
  list: { gap: 10, marginTop: 12 },
  card: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    minHeight: 118,
    padding: 11,
    position: "relative",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  image: { borderRadius: 16, height: 92, width: 92 },
  imageFallback: { alignItems: "center", borderRadius: 16, height: 92, justifyContent: "center", width: 92 },
  cardCopy: { flex: 1, minWidth: 0, paddingLeft: 13, paddingRight: 32 },
  productName: { fontSize: 12, fontWeight: "900", lineHeight: 16 },
  description: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  merchant: { fontSize: 8, lineHeight: 12, marginTop: 5 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 8 },
  price: { fontSize: 11, fontWeight: "900" },
  rating: { flex: 1, fontSize: 8, textAlign: "right" },
  removeButton: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 36 },
});
