import { useNitipTranslation } from "@nitip/i18n";
import { Pressable, Text, View } from "react-native";

import {
  useUserTheme,
  type UserThemePreference,
} from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

const options: {
  value: UserThemePreference;
  label: string;
  icon: NitipIconName;
}[] = [
  { value: "system", label: "common.system", icon: "system" },
  { value: "light", label: "common.light", icon: "sun" },
  { value: "dark", label: "common.dark", icon: "moon" },
];

export function ThemeSwitcher() {
  const { t } = useNitipTranslation();
  const { preference, setPreference } = useUserTheme();
  const theme = useNitipTheme();

  return (
    <View>
      <View className="mb-2 flex-row items-center gap-2">
        <NitipIcon color={theme.colors.textMuted} name="theme" size={16} />
        <Text className="text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
          {t("common.appearance")}
        </Text>
      </View>
      <View
        className="flex-row rounded-2xl p-1"
        style={{ backgroundColor: theme.colors.surfaceAccent }}
      >
        {options.map((option) => {
          const active = option.value === preference;
          const color = active ? "#FFFFFF" : theme.colors.text;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center rounded-xl px-2 py-2.5"
              key={option.value}
              onPress={() => void setPreference(option.value)}
              style={{ backgroundColor: active ? theme.colors.primary : "transparent" }}
            >
              <NitipIcon color={color} name={option.icon} size={16} />
              <Text
                className="mt-1 text-center text-[10px] font-extrabold"
                style={{ color }}
              >
                {t(option.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
