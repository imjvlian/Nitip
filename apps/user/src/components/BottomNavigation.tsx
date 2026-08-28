import Ionicons from "@expo/vector-icons/Ionicons";
import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexShrink: 0,
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingTop: 0,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 66,
    paddingBottom: 4,
    paddingTop: 10,
    width: 66,
  },
  iconArea: {
    alignItems: "center",
    height: 31,
    justifyContent: "center",
    position: "relative",
    width: 44,
  },
  activeLine: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    height: 3,
    left: 8,
    position: "absolute",
    top: -10,
    width: 28,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    marginTop: 3,
    textAlign: "center",
  },
  selectedLabel: {
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.62,
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
          paddingBottom: Math.max(insets.bottom, 8),
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
            <View style={styles.iconArea}>
              {selected ? (
                <View
                  style={[
                    styles.activeLine,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              ) : null}

              <Ionicons
                color={iconColor}
                name={selected ? tab.iconFilled : tab.iconOutline}
                size={selected ? 22 : 21}
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
