import { useNitipTranslation } from "@nitip/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  const isDark = theme.mode === "dark";

  return (
    <View>
      <View style={styles.labelRow}>
        <NitipIcon color={theme.colors.textMuted} name="theme" size={15} />
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          {t("common.appearance")}
        </Text>
      </View>

      <View
        style={[
          styles.switcher,
          {
            backgroundColor: isDark ? theme.colors.surface : "#EEF1FF",
            borderColor: isDark ? theme.colors.border : "#E1E5F2",
          },
        ]}
      >
        {options.map((option) => {
          const active = option.value === preference;
          const color = active ? "#FFFFFF" : theme.colors.textMuted;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option.value}
              onPress={() => void setPreference(option.value)}
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
              <NitipIcon color={color} name={option.icon} size={16} />
              <Text style={[styles.optionText, { color }]}>{t(option.label)}</Text>
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
    minHeight: 52,
    paddingHorizontal: 8,
  },
  optionText: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
});
