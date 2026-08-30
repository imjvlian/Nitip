import Ionicons from "@expo/vector-icons/Ionicons";
import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { createContext, useContext, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useUserTheme } from "../context/ThemeContext";

export type RootTab = "home" | "orders" | "favorites" | "promos" | "profile";
export const ROOT_BOTTOM_NAV_HEIGHT = 74;

const SuppressBottomNavigationContext = createContext(false);

export function BottomNavigationSuppressionProvider({ children }: { children: ReactNode }) {
  return (
    <SuppressBottomNavigationContext.Provider value>
      {children}
    </SuppressBottomNavigationContext.Provider>
  );
}

const labels = {
  id: {
    home: "Beranda",
    orders: "Pesanan",
    favorites: "Favorit",
    promos: "Promo",
    profile: "Profil",
  },
  en: {
    home: "Home",
    orders: "Orders",
    favorites: "Favorites",
    promos: "Offers",
    profile: "Profile",
  },
} as const;

const tabs = [
  { key: "home", href: "/home", outline: "home-outline", filled: "home" },
  { key: "orders", href: "/orders", outline: "receipt-outline", filled: "receipt" },
  { key: "favorites", href: "/favorites", outline: "heart-outline", filled: "heart" },
  { key: "promos", href: "/promos", outline: "pricetag-outline", filled: "pricetag" },
  { key: "profile", href: "/profile", outline: "person-outline", filled: "person" },
] as const;

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    alignSelf: "stretch",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    justifyContent: "space-around",
    minHeight: ROOT_BOTTOM_NAV_HEIGHT,
    overflow: "hidden",
    paddingBottom: 14,
    paddingHorizontal: 8,
    paddingTop: 8,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    position: "relative",
    width: 64,
  },
  activeLine: {
    height: 3,
    left: "50%",
    marginLeft: -17,
    position: "absolute",
    top: -8,
    width: 34,
  },
  iconStage: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    position: "relative",
    width: 46,
  },
  label: {
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 10,
    marginTop: 2,
    textAlign: "center",
  },
  selectedLabel: {
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.55,
  },
});

export function BottomNavigation({
  active,
  root = false,
}: {
  active: RootTab;
  root?: boolean;
}) {
  const suppressed = useContext(SuppressBottomNavigationContext);
  const { language } = useNitipLanguage();
  const { resolvedMode, theme } = useUserTheme();

  if (!root || suppressed) return null;

  const navigationSurface = resolvedMode === "dark" ? "#22242B" : "#FFFFFF";
  const navigationBorder = resolvedMode === "dark" ? "#2D3037" : "#E7E7E2";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: navigationSurface,
          borderTopColor: navigationBorder,
        },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const label = labels[language][tab.key];
        const iconColor = selected ? "#111318" : theme.colors.textMuted;
        const labelColor = selected ? theme.colors.text : theme.colors.textMuted;

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={6}
            key={tab.key}
            onPress={() => {
              if (!selected) router.replace(tab.href);
            }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            {selected ? (
              <View
                pointerEvents="none"
                style={[styles.activeLine, { backgroundColor: theme.colors.primary }]}
              />
            ) : null}

            <View style={styles.iconStage}>
              <Ionicons
                color={iconColor}
                name={selected ? tab.filled : tab.outline}
                size={selected ? 20 : 18}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                selected && styles.selectedLabel,
                { color: labelColor },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
