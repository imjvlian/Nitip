import { useNitipTranslation } from "@nitip/i18n";
import { nitipSpacing } from "@nitip/theme";
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: nitipSpacing.sm,
    paddingTop: 5,
  },
  dock: {
    alignItems: "stretch",
    flexDirection: "row",
    minHeight: 58,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 0,
  },
  iconSlot: {
    alignItems: "center",
    height: 23,
    justifyContent: "center",
    width: 30,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
    marginTop: 2,
    textAlign: "center",
    width: "100%",
  },
  pressed: {
    opacity: 0.58,
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
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, nitipSpacing.xs),
        },
      ]}
    >
      <View style={styles.dock}>
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
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View style={styles.iconSlot}>
                <NitipIcon
                  color={selected ? theme.colors.primary : theme.colors.textMuted}
                  name={tab.icon}
                  size={18}
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
