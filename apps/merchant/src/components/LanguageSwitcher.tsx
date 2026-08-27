import { NITIP_LANGUAGES, useNitipLanguage } from "@nitip/i18n";
import { Pressable, Text, View } from "react-native";

import { getMerchantCopy } from "../constants/merchantCopy";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

export function LanguageSwitcher() {
  const { language, setLanguage } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const theme = useNitipTheme();

  return (
    <View className="gap-2">
      {NITIP_LANGUAGES.map((option) => {
        const selected = option === language;
        const label = option === "id" ? c.settings.indonesia : c.settings.english;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="min-h-[56px] flex-row items-center rounded-[18px] px-4"
            key={option}
            onPress={() => void setLanguage(option)}
            style={{ backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.surface }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <NitipIcon color={selected ? theme.colors.primary : theme.colors.textMuted} name="language" size={17} />
            </View>
            <Text className="ml-3 flex-1 text-[12px] font-black" style={{ color: theme.colors.text }}>{label}</Text>
            {selected ? <NitipIcon color={theme.colors.primary} name="check" size={16} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
