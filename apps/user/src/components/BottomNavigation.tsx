import Ionicons from "@expo/vector-icons/Ionicons";
import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  {
    key: "home",
    href: "/home",
    iconOutline: "home-outline",
    iconFilled: "home",
  },
  {
    key: "orders",
    href: "/orders",
    iconOutline: "receipt-outline",
    iconFilled: "receipt",
  },
  {
    key: "promos",
    href: "/promos",
    iconOutline: "pricetag-outline",
    iconFilled: "pricetag",
  },
  {
    key: "cart",
    href: "/cart",
    iconOutline: "cart-outline",
    iconFilled: "cart",
  },
  {
    key: "profile",
    href: "/profile",
    iconOutline: "person-outline",
    iconFilled: "person",
  },
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: "row",
    flexShrink: 0,
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingTop: 10,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 62,
    width: 66,
  },
  iconArea: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 36,
  },
  label: {
    fontSize: 8,
    fontWeight: "600",
    lineHeight: 10,
    marginTop: 3,
    textAlign: "center",
  },
  selectedLabel: {
    fontWeight: "800",
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
  const insets = useSafeAreaInsets();

  if (!root || suppressed) return null;

  const bottomPadding = Platform.OS === "ios" ? Math.max(insets.bottom, 10) : 10;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surfaceRaised,
          elevation: 16,
          paddingBottom: bottomPadding,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: theme.mode === "dark" ? 0.3 : 0.14,
          shadowRadius: 18,
        },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const label = labels[language][tab.key];
        const color = selected ? theme.colors.text : theme.colors.textMuted;

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
            <View style={styles.iconArea}>
              <Ionicons
                color={color}
                name={selected ? tab.iconFilled : tab.iconOutline}
                size={selected ? 21 : 20}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                selected && styles.selectedLabel,
                { color },
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
