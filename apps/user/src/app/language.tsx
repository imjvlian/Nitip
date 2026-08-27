import { useNitipTranslation } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { NitipIcon } from "../components/NitipIcon";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function LanguageScreen() {
  const { t } = useNitipTranslation();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 px-5"
      style={{
        backgroundColor: theme.colors.background,
        paddingTop: insets.top + 14,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <Pressable className="min-h-10 flex-row items-center justify-center self-start pr-4" onPress={() => router.back()}>
        <NitipIcon color={theme.colors.primary} name="back" size={18} />
        <Text className="ml-1 text-xs font-black" style={{ color: theme.colors.primary }}>
          {t("common.back")}
        </Text>
      </Pressable>
      <Text className="mt-7 text-3xl font-black tracking-tighter" style={{ color: theme.colors.text }}>
        {t("user.languageTitle")}
      </Text>
      <Text className="mb-6 mt-2 text-sm leading-6" style={{ color: theme.colors.textMuted }}>
        {t("user.languageDescription")}
      </Text>
      <View
        className="rounded-3xl border p-5"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <LanguageSwitcher />
      </View>
    </View>
  );
}
