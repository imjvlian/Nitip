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
  iconBubble: {
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    width: 38,
    borderRadius: 999,
    overflow: "hidden",
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
      <View className="flex-row items-end">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const iconColor = selected ? theme.colors.onPrimary : theme.colors.textMuted;
          const labelColor = selected ? theme.colors.primary : theme.colors.textMuted;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t(tab.label)}
              className="min-h-[54px] flex-1 items-center justify-end py-1"
              key={tab.key}
              onPress={() => {
                if (!selected) router.replace(tab.href);
              }}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: selected ? theme.colors.primary : "transparent" },
                ]}
              >
                <NitipIcon color={iconColor} name={tab.icon} size={19} />
              </View>
              <Text className="mt-1.5 text-[9px] font-extrabold" style={{ color: labelColor }}>
                {t(tab.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
