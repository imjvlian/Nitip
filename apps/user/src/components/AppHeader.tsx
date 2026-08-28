import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { BackButton } from "./BackButton";

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

  return (
    <View style={styles.root}>
      <View style={styles.side}>
        {showBack ? <BackButton onPress={onBack} /> : null}
      </View>

      <View style={styles.center}>
        <View style={[styles.titlePill, { backgroundColor: surface }]}>
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
  titlePill: {
    alignItems: "center",
    borderRadius: 999,
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
