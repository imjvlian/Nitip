import Ionicons from "@expo/vector-icons/Ionicons";
import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";

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
  { key: "home", href: "/home", iconOutline: "home-outline", iconFilled: "home" },
  { key: "orders", href: "/orders", iconOutline: "receipt-outline", iconFilled: "receipt" },
  { key: "promos", href: "/promos", iconOutline: "pricetag-outline", iconFilled: "pricetag" },
  { key: "cart", href: "/cart", iconOutline: "cart-outline", iconFilled: "cart" },
  { key: "profile", href: "/profile", iconOutline: "person-outline", iconFilled: "person" },
] as const satisfies readonly {
  key: RootTab;
  href: "/home" | "/orders" | "/promos" | "/cart" | "/profile";
  iconOutline: ComponentProps<typeof Ionicons>["name"];
  iconFilled: ComponentProps<typeof Ionicons>["name"];
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
    minHeight: 68,
    paddingBottom: 8,
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
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    height: 3,
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
  glowWide: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    height: 27,
    position: "absolute",
    top: -5,
    width: 46,
  },
  glowMedium: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    height: 22,
    position: "absolute",
    top: -4,
    width: 36,
  },
  glowCore: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    height: 16,
    position: "absolute",
    top: -3,
    width: 27,
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
  const theme = useNitipTheme();

  if (!root || suppressed) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.border,
          elevation: 12,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: theme.mode === "dark" ? 0.24 : 0.08,
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
              {selected ? (
                <>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.glowWide,
                      { backgroundColor: theme.colors.primary, opacity: 0.05 },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.glowMedium,
                      { backgroundColor: theme.colors.primary, opacity: 0.09 },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.glowCore,
                      { backgroundColor: theme.colors.primary, opacity: 0.16 },
                    ]}
                  />
                </>
              ) : null}

              <Ionicons
                color={iconColor}
                name={selected ? tab.iconFilled : tab.iconOutline}
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
