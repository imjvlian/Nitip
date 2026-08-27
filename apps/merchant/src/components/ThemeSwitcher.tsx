import { useNitipLanguage } from "@nitip/i18n";
import { Pressable, Text, View } from "react-native";

import { getMerchantCopy } from "../constants/merchantCopy";
import { useMerchantTheme, type MerchantThemePreference } from "../context/ThemeContext";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

const options: { key: MerchantThemePreference; icon: NitipIconName }[] = [
  { key: "system", icon: "system" },
  { key: "light", icon: "sun" },
  { key: "dark", icon: "moon" },
];

export function ThemeSwitcher() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { preference, setPreference, theme } = useMerchantTheme();

  return (
    <View className="gap-2">
      {options.map((option) => {
        const selected = preference === option.key;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="min-h-[56px] flex-row items-center rounded-[18px] px-4"
            key={option.key}
            onPress={() => void setPreference(option.key)}
            style={{ backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.surface }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <NitipIcon color={selected ? theme.colors.primary : theme.colors.textMuted} name={option.icon} size={17} />
            </View>
            <Text className="ml-3 flex-1 text-[12px] font-black" style={{ color: theme.colors.text }}>
              {c.settings[option.key]}
            </Text>
            {selected ? <NitipIcon color={theme.colors.primary} name="check" size={16} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
