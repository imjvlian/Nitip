import Ionicons from "@expo/vector-icons/Ionicons";
import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";

export type RootTab = "home" | "orders" | "settings";

const tabs = [
  { key: "home", href: "/home", outline: "home-outline", filled: "home" },
  { key: "orders", href: "/orders", outline: "receipt-outline", filled: "receipt" },
  { key: "settings", href: "/settings", outline: "settings-outline", filled: "settings" },
] as const;

const labels = {
  id: { home: "Beranda", orders: "Pesanan", settings: "Pengaturan" },
  en: { home: "Home", orders: "Orders", settings: "Settings" },
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
              <Ionicons
                color={selected ? "#111318" : theme.colors.textMuted}
                name={selected ? tab.filled : tab.outline}
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
    paddingHorizontal: 12,
    paddingTop: 8,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    position: "relative",
    width: 76,
  },
  activeLine: {
    height: 3,
    left: "50%",
    marginLeft: -17,
    position: "absolute",
    top: -8,
    width: 34,
  },
  iconStage: { alignItems: "center", height: 30, justifyContent: "center", width: 46 },
  label: { fontSize: 8, fontWeight: "700", lineHeight: 10, marginTop: 2, textAlign: "center" },
  selectedLabel: { fontWeight: "900" },
});
