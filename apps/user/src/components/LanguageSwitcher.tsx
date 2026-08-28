import {
  NITIP_LANGUAGES,
  useNitipLanguage,
  useNitipTranslation,
  type NitipLanguage,
} from "@nitip/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

function languageLabel(language: NitipLanguage, t: (key: string) => string) {
  return language === "id" ? t("common.indonesia") : t("common.english");
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useNitipLanguage();
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";

  return (
    <View>
      {!compact ? (
        <View style={styles.labelRow}>
          <NitipIcon color={theme.colors.textMuted} name="language" size={15} />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t("common.language")}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.switcher,
          {
            backgroundColor: isDark ? theme.colors.surface : "#EEF1FF",
            borderColor: isDark ? theme.colors.border : "#E1E5F2",
          },
        ]}
      >
        {NITIP_LANGUAGES.map((option) => {
          const active = option === language;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => void setLanguage(option)}
              style={[
                styles.option,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : isDark
                      ? theme.colors.surfaceRaised
                      : "#FFFFFF",
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: active ? "#FFFFFF" : theme.colors.text },
                ]}
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

const styles = StyleSheet.create({
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
  },
  switcher: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 5,
  },
  option: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  optionText: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
});
