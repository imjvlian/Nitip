import { useNitipTranslation } from "@nitip/i18n";
import { router, usePathname } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

const ROOT_TAB_PATHS = new Set(["/orders", "/promos", "/cart", "/profile"]);

export function BackButton({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useNitipTranslation();
  const pathname = usePathname();
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }

    if (ROOT_TAB_PATHS.has(pathname)) {
      router.replace("/home");
      return;
    }

    router.back();
  }

  return (
    <Pressable
      accessibilityLabel={t("common.back")}
      accessibilityRole="button"
      onPress={handlePress}
      style={[
        styles.button,
        {
          backgroundColor: isDark ? theme.colors.surfaceRaised : "#FFFFFF",
          borderColor: isDark ? theme.colors.border : "#E8E9ED",
        },
        style,
      ]}
    >
      <NitipIcon color={theme.colors.text} name="back" size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
