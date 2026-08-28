import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { createContext, useContext, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

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

const tabs: {
  key: RootTab;
  href: "/home" | "/orders" | "/promos" | "/cart" | "/profile";
  icon: NitipIconName;
}[] = [
  { key: "home", href: "/home", icon: "home" },
  { key: "orders", href: "/orders", icon: "orders" },
  { key: "promos", href: "/promos", icon: "promo" },
  { key: "cart", href: "/cart", icon: "cart" },
  { key: "profile", href: "/profile", icon: "profile" },
];

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    alignSelf: "stretch",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexShrink: 0,
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingTop: 7,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    position: "relative",
    width: 66,
  },
  activeHalo: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 38,
  },
  iconSlot: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 38,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    marginTop: 2,
    textAlign: "center",
  },
  selectedLabel: {
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.62,
  },
  activeDot: {
    borderRadius: 999,
    height: 3,
    marginTop: 3,
    width: 14,
  },
});

export function BottomNavigation({ active }: { active: RootTab }) {
  const suppressed = useContext(SuppressBottomNavigationContext);
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  if (suppressed) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.border,
          elevation: 10,
          paddingBottom: Math.max(insets.bottom, 7),
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: theme.mode === "dark" ? 0.2 : 0.08,
          shadowRadius: 12,
        },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const label = labels[language][tab.key];
        const iconColor = selected ? theme.colors.primary : theme.colors.textMuted;
        const labelColor = selected ? theme.colors.primary : theme.colors.textMuted;

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
            <View
              style={[
                styles.iconSlot,
                selected && styles.activeHalo,
                selected && {
                  backgroundColor: theme.colors.surfaceAccent,
                  transform: [{ translateY: -2 }],
                },
              ]}
            >
              <NitipIcon color={iconColor} name={tab.icon} size={selected ? 19 : 18} />
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

            {selected ? (
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            ) : (
              <View style={{ height: 6 }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
