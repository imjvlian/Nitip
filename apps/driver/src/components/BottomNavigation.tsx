import { useNitipLanguage } from "@nitip/i18n";
import { lightTheme } from "@nitip/theme";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type RootTab = "home" | "orders" | "settings";

const tabs: {
  key: RootTab;
  href: "/home" | "/orders" | "/settings";
  icon: { ios: string; android: string; web: string };
}[] = [
  { key: "home", href: "/home", icon: { ios: "house.fill", android: "home", web: "home" } },
  { key: "orders", href: "/orders", icon: { ios: "receipt.fill", android: "receipt_long", web: "receipt_long" } },
  { key: "settings", href: "/settings", icon: { ios: "gearshape.fill", android: "settings", web: "settings" } },
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
  const { language } = useNitipLanguage();
  const insets = useSafeAreaInsets();
  const labels = language === "id"
    ? { home: "Beranda", orders: "Pesanan", settings: "Pengaturan" }
    : { home: "Home", orders: "Orders", settings: "Settings" };

  return (
    <View
      className="px-5 pt-2"
      style={{
        backgroundColor: lightTheme.colors.background,
        borderTopColor: lightTheme.colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View className="flex-row items-stretch">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const label = labels[tab.key];
          const color = selected ? lightTheme.colors.primary : lightTheme.colors.textMuted;

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
                  { backgroundColor: selected ? lightTheme.colors.primary : "transparent" },
                ]}
              />
              <View style={styles.iconSlot}>
                <SymbolView name={tab.icon as never} size={20} tintColor={color} />
              </View>
              <Text className="mt-1 text-[9px] font-extrabold" style={{ color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
