import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { getMerchantCopy } from "../../constants/merchantCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";

export default function MerchantLanguageScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: 32 }} style={{ backgroundColor: theme.colors.background }}>
      <AppHeader title={c.settings.languageTitle} onBack={() => router.back()} />
      <View className="mt-7">
        <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.settings.languageTitle}</Text>
        <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.settings.languageDescription}</Text>
      </View>
      <View className="mt-5"><LanguageSwitcher /></View>
    </ScrollView>
  );
}
