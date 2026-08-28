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

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useNitipLanguage();
  const { t } = useNitipTranslation();

  return (
    <View className={compact ? "rounded-xl border border-border bg-surface p-1" : "rounded-nitip border border-border bg-surface p-3"}>
      {!compact ? (
        <Text className="text-xs font-extrabold uppercase tracking-wider text-muted">
          {t("common.language")}
        </Text>
      ) : null}
      <View className={compact ? "flex-row rounded-lg bg-surface-accent p-1" : "mt-2 flex-row rounded-xl bg-surface-accent p-1"}>
        {NITIP_LANGUAGES.map((option) => {
          const active = option === language;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 rounded-lg ${compact ? "px-2 py-1.5" : "px-3 py-2"} ${active ? "bg-primary" : "bg-transparent"}`}
              key={option}
              onPress={() => void setLanguage(option)}
            >
              <Text
                className={`${compact ? "text-[10px]" : "text-xs"} text-center font-extrabold ${active ? "text-on-primary" : "text-foreground"}`}
              >
                {compact ? option.toUpperCase() : languageLabel(option, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
