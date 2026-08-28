import type { ReactNode } from "react";
import { router, usePathname } from "expo-router";
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
  const pathname = usePathname();
  const legacy = pathname.startsWith("/settings");

  if (legacy) {
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

  return (
    <View className="min-h-11 flex-row items-center">
      <View className="w-11">
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            className="h-9 w-9 items-center justify-center rounded-full"
            onPress={onBack ?? (() => router.back())}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderWidth: 1,
              elevation: 2,
              opacity: pressed ? 0.7 : 1,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme.mode === "dark" ? 0.22 : 0.08,
              shadowRadius: 7,
            })}
          >
            <NitipIcon color={theme.colors.text} name="back" size={16} />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 items-center px-2">
        <View
          className="rounded-full px-4 py-2"
          style={{ backgroundColor: theme.colors.surfaceRaised }}
        >
          <Text
            className="text-center text-[11px] font-black"
            numberOfLines={1}
            style={{ color: theme.colors.text }}
          >
            {title}
          </Text>
        </View>
      </View>

      <View className="w-11 items-end">{right}</View>
    </View>
  );
}
