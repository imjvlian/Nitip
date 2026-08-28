import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { createContext, useContext, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NitipIcon, type NitipIconName } from "./NitipIcon";
import { useUserTheme } from "../context/ThemeContext";

export type RootTab = "home" | "orders" | "promos" | "cart" | "profile";

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
    promos: "Promo",
    cart: "Keranjang",
    profile: "Profil",
  },
  en: {
    home: "Home",
    orders: "Orders",
    promos: "Offers",
    cart: "Cart",
    profile: "Profile",
  },
} as const;

const tabs = [
  { key: "home", href: "/home", icon: "home" },
  { key: "orders", href: "/orders", icon: "orders" },
  { key: "promos", href: "/promos", icon: "promo" },
  { key: "cart", href: "/cart", icon: "cart" },
  { key: "profile", href: "/profile", icon: "profile" },
] as const satisfies readonly {
  key: RootTab;
  href: "/home" | "/orders" | "/promos" | "/cart" | "/profile";
  icon: NitipIconName;
}[];

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
    minHeight: 74,
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
  const navigationShadow = resolvedMode === "dark" ? theme.colors.shadow : "#111318";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: navigationSurface,
          borderTopColor: navigationBorder,
          elevation: 12,
          shadowColor: navigationShadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: resolvedMode === "dark" ? 0.24 : 0.08,
          shadowRadius: 14,
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
              <NitipIcon
                color={iconColor}
                name={tab.icon}
                size={selected ? 20 : 18}
                variant={selected ? "filled" : "outline"}
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
