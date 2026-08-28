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
  filledFrame: {
    height: 22,
    position: "relative",
    width: 22,
  },
  homeRoof: {
    borderRadius: 2,
    height: 12,
    left: 5,
    position: "absolute",
    top: 2,
    transform: [{ rotate: "45deg" }],
    width: 12,
  },
  homeBody: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    height: 11,
    left: 4,
    position: "absolute",
    top: 9,
    width: 14,
  },
  receiptBody: {
    borderRadius: 2,
    height: 19,
    left: 4,
    position: "absolute",
    top: 1,
    width: 14,
  },
  receiptNotchOne: {
    bottom: 0,
    height: 4,
    left: 5,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 4,
  },
  receiptNotchTwo: {
    bottom: 0,
    height: 4,
    left: 13,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 4,
  },
  promoBody: {
    borderRadius: 3,
    height: 13,
    left: 3,
    position: "absolute",
    top: 5,
    transform: [{ rotate: "-38deg" }],
    width: 17,
  },
  promoHole: {
    borderRadius: 999,
    height: 4,
    left: 5,
    position: "absolute",
    top: 5,
    width: 4,
  },
  cartBasket: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    height: 10,
    left: 3,
    position: "absolute",
    top: 6,
    width: 16,
  },
  cartHandle: {
    borderRadius: 999,
    height: 3,
    left: 1,
    position: "absolute",
    top: 3,
    transform: [{ rotate: "18deg" }],
    width: 7,
  },
  cartWheelLeft: {
    borderRadius: 999,
    bottom: 1,
    height: 5,
    left: 5,
    position: "absolute",
    width: 5,
  },
  cartWheelRight: {
    borderRadius: 999,
    bottom: 1,
    height: 5,
    position: "absolute",
    right: 3,
    width: 5,
  },
  profileHead: {
    borderRadius: 999,
    height: 8,
    left: 7,
    position: "absolute",
    top: 1,
    width: 8,
  },
  profileBody: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    bottom: 1,
    height: 11,
    left: 3,
    position: "absolute",
    width: 16,
  },
});

function FilledTabIcon({
  color,
  cutoutColor,
  tab,
}: {
  color: string;
  cutoutColor: string;
  tab: RootTab;
}) {
  if (tab === "home") {
    return (
      <View style={styles.filledFrame}>
        <View style={[styles.homeRoof, { backgroundColor: color }]} />
        <View style={[styles.homeBody, { backgroundColor: color }]} />
      </View>
    );
  }

  if (tab === "orders") {
    return (
      <View style={styles.filledFrame}>
        <View style={[styles.receiptBody, { backgroundColor: color }]} />
        <View style={[styles.receiptNotchOne, { backgroundColor: cutoutColor }]} />
        <View style={[styles.receiptNotchTwo, { backgroundColor: cutoutColor }]} />
      </View>
    );
  }

  if (tab === "promos") {
    return (
      <View style={styles.filledFrame}>
        <View style={[styles.promoBody, { backgroundColor: color }]} />
        <View style={[styles.promoHole, { backgroundColor: cutoutColor }]} />
      </View>
    );
  }

  if (tab === "cart") {
    return (
      <View style={styles.filledFrame}>
        <View style={[styles.cartHandle, { backgroundColor: color }]} />
        <View style={[styles.cartBasket, { backgroundColor: color }]} />
        <View style={[styles.cartWheelLeft, { backgroundColor: color }]} />
        <View style={[styles.cartWheelRight, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={styles.filledFrame}>
      <View style={[styles.profileHead, { backgroundColor: color }]} />
      <View style={[styles.profileBody, { backgroundColor: color }]} />
    </View>
  );
}

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
                <FilledTabIcon color="#111318" cutoutColor={navigationSurface} tab={tab.key} />
              ) : (
                <NitipIcon
                  color={theme.colors.textMuted}
                  name={tab.icon}
                  size={18}
                  variant="outline"
                />
              )}
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
