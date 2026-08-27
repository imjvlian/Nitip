import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMerchantCopy } from "../constants/merchantCopy";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

export type RootTab = "home" | "orders" | "settings";

const tabs: { key: RootTab; href: "/home" | "/orders" | "/settings"; icon: NitipIconName }[] = [
  { key: "home", href: "/home", icon: "home" },
  { key: "orders", href: "/orders", icon: "orders" },
  { key: "settings", href: "/settings", icon: "settings" },
];

const styles = StyleSheet.create({
  bubble: { height: 38, width: 38, borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center" },
});

export function BottomNavigation({ active }: { active: RootTab }) {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

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
          const label = c.navigation[tab.key];
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              className="min-h-[54px] flex-1 items-center justify-end py-1"
              key={tab.key}
              onPress={() => {
                if (!selected) router.replace(tab.href);
              }}
            >
              <View style={[styles.bubble, { backgroundColor: selected ? theme.colors.primary : "transparent" }]}>
                <NitipIcon color={selected ? theme.colors.onPrimary : theme.colors.textMuted} name={tab.icon} size={19} />
              </View>
              <Text className="mt-1.5 text-[9px] font-extrabold" style={{ color: selected ? theme.colors.primary : theme.colors.textMuted }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
