import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

export function BackButton({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";

  return (
    <Pressable
      accessibilityLabel={language === "id" ? "Kembali" : "Back"}
      accessibilityRole="button"
      onPress={onPress ?? (() => router.back())}
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
