import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

export type RootTab = "home" | "orders" | "menu" | "settings";

const tabs: {
  key: RootTab;
  href: "/home" | "/orders" | "/menu" | "/settings";
  icon: NitipIconName;
}[] = [
  { key: "home", href: "/home", icon: "home" },
  { key: "orders", href: "/orders", icon: "orders" },
  { key: "menu", href: "/menu", icon: "menu" },
  { key: "settings", href: "/settings", icon: "settings" },
];

const labels = {
  id: { home: "Beranda", orders: "Pesanan", menu: "Menu", settings: "Pengaturan" },
  en: { home: "Home", orders: "Orders", menu: "Menu", settings: "Settings" },
} as const;

export function BottomNavigation({ active }: { active: RootTab }) {
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isDark ? "#22242B" : "#FFFFFF",
          borderTopColor: isDark ? "#2D3037" : "#E7E7E2",
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
            hitSlop={6}
            key={tab.key}
            onPress={() => {
              if (!selected) router.replace(tab.href);
            }}
            style={styles.tab}
          >
            {selected ? <View style={[styles.activeLine, { backgroundColor: theme.colors.primary }]} /> : null}
            <View style={styles.iconStage}>
              <NitipIcon
                color={selected ? "#111318" : theme.colors.textMuted}
                name={tab.icon}
                size={selected ? 20 : 18}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                selected && styles.selectedLabel,
                { color: selected ? theme.colors.text : theme.colors.textMuted },
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

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    alignSelf: "stretch",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    flexDirection: "row",
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
    width: 68,
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
    width: 46,
  },
  label: {
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 10,
    marginTop: 2,
    textAlign: "center",
  },
  selectedLabel: { fontWeight: "900" },
});
