import { useNitipLanguage } from "@nitip/i18n";
import { Redirect } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { SETTINGS_COPY } from "../../constants/settingsCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";

export default function LanguageSettingsScreen() {
  const { language } = useNitipLanguage();
  const copy = SETTINGS_COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 28, 40),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={copy.language} />
      <View className="mt-7">
        <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {copy.language}
        </Text>
        <Text className="mt-1.5 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
          {copy.languagePageDescription}
        </Text>
      </View>
      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <LanguageSwitcher />
      </View>
    </ScrollView>
  );
}
