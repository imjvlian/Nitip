import { useNitipTranslation } from "@nitip/i18n";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { LanguageSwitcher } from "../components/LanguageSwitcher";

export default function LanguageScreen() {
  const { t } = useNitipTranslation();

  return (
    <View className="flex-1 bg-background px-5 pb-10 pt-16">
      <Pressable onPress={() => router.back()}>
        <Text className="font-extrabold text-primary">‹ {t("common.back")}</Text>
      </Pressable>
      <Text className="mt-8 text-3xl font-black tracking-tight text-foreground">
        {t("user.languageTitle")}
      </Text>
      <Text className="mb-6 mt-2 text-sm leading-5 text-muted">
        {t("user.languageDescription")}
      </Text>
      <LanguageSwitcher />
    </View>
  );
}
