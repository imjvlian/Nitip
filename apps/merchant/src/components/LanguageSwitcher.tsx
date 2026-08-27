import {
  NITIP_LANGUAGES,
  useNitipLanguage,
  useNitipTranslation,
  type NitipLanguage,
} from "@nitip/i18n";
import { Pressable, Text, View } from "react-native";

function languageLabel(language: NitipLanguage, t: (key: string) => string) {
  return language === "id" ? t("common.indonesia") : t("common.english");
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useNitipLanguage();
  const { t } = useNitipTranslation();

  return (
    <View className="rounded-nitip border border-border bg-surface p-3">
      <Text className="text-xs font-extrabold uppercase tracking-wider text-muted">
        {t("common.language")}
      </Text>
      <View className="mt-2 flex-row rounded-xl bg-surface-accent p-1">
        {NITIP_LANGUAGES.map((option) => {
          const active = option === language;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 rounded-lg px-3 py-2 ${active ? "bg-primary" : "bg-transparent"}`}
              key={option}
              onPress={() => void setLanguage(option)}
            >
              <Text
                className={`text-center text-xs font-extrabold ${active ? "text-on-primary" : "text-foreground"}`}
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
