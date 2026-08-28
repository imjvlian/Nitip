import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function LanguageScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const heading = language === "id" ? "Pilih bahasa." : "Choose language.";
  const subtitle = language === "id"
    ? "Bahasa yang dipilih digunakan di seluruh Nitip Driver."
    : "Your selected language is used throughout Nitip Driver.";

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 10 }]}> 
      <View style={styles.content}>
        <AppHeader title={t("driver.languageTitle")} />
        <Text style={[styles.heading, { color: theme.colors.text }]}>{heading}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <LanguageSwitcher />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flex: 1, paddingHorizontal: 20 }, heading: { fontSize: 27, fontWeight: "900", letterSpacing: -0.7, marginTop: 26 }, subtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 }, card: { borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 14 },
});
