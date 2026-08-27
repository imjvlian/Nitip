import { useNitipTranslation } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNitipTheme } from "../hooks/useNitipTheme";

type RootTab = "home" | "orders" | "profile";

const tabs = [
  { key: "home", href: "/home", icon: "⌂", label: "navigation.home" },
  { key: "orders", href: "/orders", icon: "▣", label: "navigation.orders" },
  { key: "profile", href: "/profile", icon: "◎", label: "navigation.profile" },
] as const;

export function BottomNavigation({ active }: { active: RootTab }) {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-t px-3 pt-2"
      style={{
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View className="flex-row">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className="flex-1 items-center justify-center py-1"
              key={tab.key}
              onPress={() => {
                if (selected) return;
                if (tab.href === "/home") router.replace("/home");
                if (tab.href === "/orders") router.replace("/orders");
                if (tab.href === "/profile") router.replace("/profile");
              }}
            >
              <View
                className="h-8 min-w-12 items-center justify-center rounded-full px-3"
                style={{
                  backgroundColor: selected ? theme.colors.surfaceAccent : "transparent",
                }}
              >
                <Text
                  className="text-lg font-black"
                  style={{ color: selected ? theme.colors.primary : theme.colors.textMuted }}
                >
                  {tab.icon}
                </Text>
              </View>
              <Text
                className="mt-1 text-[10px] font-extrabold"
                style={{ color: selected ? theme.colors.primary : theme.colors.textMuted }}
              >
                {t(tab.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
