import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
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
  shell: {
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  dock: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 58,
    overflow: "visible",
    width: "100%",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    width: "20%",
  },
  iconSlot: {
    alignItems: "center",
    height: 21,
    justifyContent: "center",
    width: 28,
  },
  label: {
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 10,
    marginTop: 2,
    textAlign: "center",
    width: "100%",
  },
  pressed: {
    opacity: 0.55,
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
        styles.shell,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            elevation: 10,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: theme.mode === "dark" ? 0.24 : 0.1,
            shadowRadius: 12,
          },
        ]}
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const label = labels[language][tab.key];

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.key}
              onPress={() => {
                if (!selected) router.replace(tab.href);
              }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View style={styles.iconSlot}>
                <NitipIcon
                  color={selected ? theme.colors.text : theme.colors.textMuted}
                  name={tab.icon}
                  size={18}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: selected ? theme.colors.text : theme.colors.textMuted },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
