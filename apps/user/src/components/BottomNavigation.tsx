import { useNitipTranslation } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

type RootTab = "home" | "orders" | "profile";

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

export function BottomNavigation({ active }: { active: RootTab }) {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="px-5 pt-2"
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        paddingBottom: Math.max(insets.bottom, 10),
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: theme.mode === "dark" ? 0.24 : 0.07,
        shadowRadius: 16,
        elevation: 12,
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
              className="flex-1 items-center justify-end py-1"
              key={tab.key}
              onPress={() => {
                if (!selected) router.replace(tab.href);
              }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: selected ? theme.colors.primary : "transparent" }}
              >
                <NitipIcon color={iconColor} name={tab.icon} size={20} />
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
