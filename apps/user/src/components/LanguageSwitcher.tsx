import {
  NITIP_LANGUAGES,
  useNitipLanguage,
  useNitipTranslation,
  type NitipLanguage,
} from "@nitip/i18n";
import { Pressable, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

function languageLabel(language: NitipLanguage, t: (key: string) => string) {
  return language === "id" ? t("common.indonesia") : t("common.english");
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useNitipLanguage();
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();

  return (
    <View>
      {!compact ? (
        <View className="mb-2 flex-row items-center gap-2">
          <NitipIcon color={theme.colors.textMuted} name="language" size={15} />
          <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
            {t("common.language")}
          </Text>
        </View>
      ) : null}
      <View
        className="flex-row gap-1 rounded-2xl p-1"
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderWidth: 1,
        }}
      >
        {NITIP_LANGUAGES.map((option) => {
          const active = option === language;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-1 rounded-xl px-3 py-2.5"
              key={option}
              onPress={() => void setLanguage(option)}
              style={({ pressed }) => ({
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Text
                className="text-center text-[10px] font-extrabold"
                style={{ color: active ? "#FFFFFF" : theme.colors.text }}
              >
                {languageLabel(option, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
