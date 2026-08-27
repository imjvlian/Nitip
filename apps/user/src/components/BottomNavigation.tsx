import { useNitipTranslation } from "@nitip/i18n";
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
  indicator: {
    borderRadius: 999,
    height: 3,
    marginBottom: 7,
    width: 24,
  },
  iconSlot: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
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
      className="px-5 pt-2"
      style={{
        backgroundColor: theme.colors.background,
        borderTopColor: theme.colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View className="flex-row items-stretch">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const label = t(tab.label);

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              className="min-h-[58px] flex-1 items-center justify-center py-1"
              key={tab.key}
              onPress={() => {
                if (!selected) router.replace(tab.href);
              }}
            >
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: selected ? theme.colors.primary : "transparent" },
                ]}
              />
              <View style={styles.iconSlot}>
                <NitipIcon
                  color={selected ? theme.colors.primary : theme.colors.textMuted}
                  name={tab.icon}
                  size={20}
                />
              </View>
              <Text
                className="mt-1 text-[9px] font-extrabold"
                style={{ color: selected ? theme.colors.primary : theme.colors.textMuted }}
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
