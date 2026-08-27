import { useNitipTranslation } from "@nitip/i18n";
import { Pressable, Text, View } from "react-native";

import {
  useUserTheme,
  type UserThemePreference,
} from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

const options: { value: UserThemePreference; label: string }[] = [
  { value: "system", label: "common.system" },
  { value: "light", label: "common.light" },
  { value: "dark", label: "common.dark" },
];

export function ThemeSwitcher() {
  const { t } = useNitipTranslation();
  const { preference, setPreference } = useUserTheme();
  const theme = useNitipTheme();

  return (
    <View>
      <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
        {t("common.appearance")}
      </Text>
      <View
        className="flex-row rounded-2xl p-1"
        style={{ backgroundColor: theme.colors.surfaceAccent }}
      >
        {options.map((option) => {
          const active = option.value === preference;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-1 rounded-xl px-2 py-2.5"
              key={option.value}
              onPress={() => void setPreference(option.value)}
              style={{ backgroundColor: active ? theme.colors.primary : "transparent" }}
            >
              <Text
                className="text-center text-[11px] font-extrabold"
                style={{ color: active ? "#FFFFFF" : theme.colors.text }}
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
