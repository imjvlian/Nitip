import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

export function SettingsGroup({ children }: { children: ReactNode }) {
  const theme = useNitipTheme();
  return (
    <View className="overflow-hidden rounded-[20px]" style={{ backgroundColor: theme.colors.surface }}>
      {children}
    </View>
  );
}

export function SettingsDivider() {
  const theme = useNitipTheme();
  return <View className="ml-[60px] h-px" style={{ backgroundColor: theme.colors.border }} />;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger = false,
}: {
  icon: NitipIconName;
  title: string;
  subtitle: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useNitipTheme();
  const accent = danger ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[64px] flex-row items-center px-4 py-3"
      onPress={onPress}
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surfaceRaised }}
      >
        <NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name={icon} size={15} />
      </View>
      <View className="ml-3 flex-1 pr-3">
        <Text className="text-[12px] font-black" style={{ color: accent }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[9px] leading-4" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
          {subtitle}
        </Text>
      </View>
      {value ? (
        <Text
          className="mr-2 max-w-[100px] text-right text-[9px] font-extrabold"
          numberOfLines={1}
          style={{ color: theme.colors.textMuted }}
        >
          {value}
        </Text>
      ) : null}
      <NitipIcon color={theme.colors.textMuted} name="next" size={15} />
    </Pressable>
  );
}
