import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

export function AppHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const theme = useNitipTheme();
  return (
    <View className="min-h-11 flex-row items-center justify-between">
      <View className="w-11">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center"
            onPress={onBack}
          >
            <NitipIcon color={theme.colors.text} name="back" size={18} />
          </Pressable>
        ) : null}
      </View>
      <Text className="flex-1 text-center text-[13px] font-black" numberOfLines={1} style={{ color: theme.colors.text }}>
        {title}
      </Text>
      <View className="w-11 items-end">{right}</View>
    </View>
  );
}
