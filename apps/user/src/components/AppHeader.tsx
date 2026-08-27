import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

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

  return (
    <View className="min-h-10 flex-row items-center">
      <View className="w-10">
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={onBack ?? (() => router.back())}
            style={{ backgroundColor: theme.colors.surface }}
          >
            <NitipIcon color={theme.colors.text} name="back" size={18} />
          </Pressable>
        ) : null}
      </View>

      <Text
        className="flex-1 px-3 text-center text-sm font-black"
        numberOfLines={1}
        style={{ color: theme.colors.text }}
      >
        {title}
      </Text>

      <View className="w-10 items-end">{right}</View>
    </View>
  );
}
