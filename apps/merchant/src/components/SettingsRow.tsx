import { Pressable, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

export function SettingsRow({
  icon,
  title,
  description,
  value,
  onPress,
  danger = false,
  last = false,
  showChevron = true,
}: {
  icon: NitipIconName;
  title: string;
  description?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  showChevron?: boolean;
}) {
  const theme = useNitipTheme();
  const color = danger ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      className={`min-h-[66px] flex-row items-center px-4 py-3 ${last ? "" : "border-b"}`}
      onPress={onPress}
      style={{ borderBottomColor: theme.colors.border }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surfaceRaised }}>
        <NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name={icon} size={16} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[11px] font-black" style={{ color }}>{title}</Text>
        {description ? <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{description}</Text> : null}
      </View>
      {value ? <Text className="mr-2 max-w-[110px] text-right text-[9px] font-extrabold" numberOfLines={1} style={{ color: theme.colors.textMuted }}>{value}</Text> : null}
      {!danger && showChevron ? <NitipIcon color={theme.colors.textMuted} name="next" size={15} /> : null}
    </Pressable>
  );
}
