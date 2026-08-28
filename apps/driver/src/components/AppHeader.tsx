import { useNitipLanguage } from "@nitip/i18n";
import { router, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";

const CLEAN_ROOT_TABS = new Set(["/home", "/orders", "/settings"]);

export function AppHeader({
  title,
  showBack = true,
  onBack,
  right,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { language } = useNitipLanguage();
  const pathname = usePathname();
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";
  const surface = isDark ? theme.colors.surfaceRaised : "#FFFFFF";
  const cleanRoot = CLEAN_ROOT_TABS.has(pathname);

  return (
    <View style={styles.root}>
      <View style={styles.side}>
        {!cleanRoot && showBack ? (
          <Pressable
            accessibilityLabel={language === "id" ? "Kembali" : "Back"}
            accessibilityRole="button"
            onPress={onBack ?? (() => router.back())}
            style={[
              styles.back,
              {
                backgroundColor: surface,
                borderColor: isDark ? theme.colors.border : "#E8E9ED",
              },
            ]}
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" } as never}
              size={17}
              tintColor={theme.colors.text}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        <View style={[styles.titlePill, { backgroundColor: surface }]}> 
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}> 
            {title}
          </Text>
        </View>
      </View>

      <View style={[styles.side, styles.right]}>{cleanRoot ? null : right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", flexDirection: "row", minHeight: 44, width: "100%" },
  side: { alignItems: "flex-start", justifyContent: "center", width: 44 },
  right: { alignItems: "flex-end" },
  center: { alignItems: "center", flex: 1, paddingHorizontal: 8 },
  back: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  titlePill: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 18,
  },
  title: { fontSize: 11, fontWeight: "800", textAlign: "center" },
});
