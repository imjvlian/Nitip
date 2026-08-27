import { useNitipTranslation } from "@nitip/i18n";
import { nitipLayout, nitipRadius, nitipSpacing } from "@nitip/theme";
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

export type RootTab = "home" | "orders" | "profile";

const SuppressBottomNavigationContext = createContext(false);

export function BottomNavigationSuppressionProvider({ children }: { children: ReactNode }) {
  return (
    <SuppressBottomNavigationContext.Provider value>
      {children}
    </SuppressBottomNavigationContext.Provider>
  );
}

const tabs: {
  key: RootTab;
  href: "/home" | "/orders" | "/profile";
  icon: NitipIconName;
  label: string;
}[] = [
  { key: "home", href: "/home", icon: "home", label: "navigation.home" },
  { key: "orders", href: "/orders", icon: "orders", label: "navigation.orders" },
  { key: "profile", href: "/profile", icon: "profile", label: "navigation.profile" },
];

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: nitipSpacing.sm,
    paddingTop: nitipSpacing.xs,
  },
  dock: {
    alignItems: "stretch",
    borderRadius: nitipRadius.xl,
    flexDirection: "row",
    minHeight: nitipLayout.bottomNavigationHeight,
    padding: nitipSpacing.xxs,
  },
  tab: {
    alignItems: "center",
    borderRadius: nitipRadius.lg,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: nitipSpacing.xs,
  },
  iconSlot: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 32,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.68,
  },
});

export function BottomNavigation({ active }: { active: RootTab }) {
  const suppressed = useContext(SuppressBottomNavigationContext);
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  if (suppressed) return null;

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: Math.max(insets.bottom, nitipSpacing.xs),
        },
      ]}
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            elevation: 8,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: theme.mode === "dark" ? 0.3 : 0.08,
            shadowRadius: 16,
          },
        ]}
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const label = t(tab.label);

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.key}
              onPress={() => {
                if (!selected) router.replace(tab.href);
              }}
              style={({ pressed }) => [
                styles.tab,
                selected && { backgroundColor: theme.colors.surfaceAccent },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconSlot}>
                <NitipIcon
                  color={selected ? theme.colors.primary : theme.colors.textMuted}
                  name={tab.icon}
                  size={20}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: selected ? theme.colors.primary : theme.colors.textMuted },
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
