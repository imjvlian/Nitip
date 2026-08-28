import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

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
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";
  const surface = isDark ? theme.colors.surfaceRaised : "#FFFFFF";
  const border = isDark ? theme.colors.border : "#E8E9ED";

  return (
    <View style={styles.root}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack ?? (() => router.back())}
            style={[
              styles.backButton,
              {
                backgroundColor: surface,
                borderColor: border,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <NitipIcon color={theme.colors.text} name="back" size={16} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        <View style={[styles.titlePill, { backgroundColor: surface, borderColor: border }]}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
        </View>
      </View>

      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 44,
    width: "100%",
  },
  side: {
    alignItems: "flex-start",
    justifyContent: "center",
    width: 44,
  },
  right: {
    alignItems: "flex-end",
  },
  center: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    height: 40,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    width: 40,
  },
  titlePill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
});
