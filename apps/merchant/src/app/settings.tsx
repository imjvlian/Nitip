import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { SettingsRow } from "../components/SettingsRow";
import { getMerchantCopy } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useMerchantTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { signOut, user } = useAuth();
  const { preference, theme } = useMerchantTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  if (!user) return <Redirect href="/login" />;

  const themeLabel = c.settings[preference];
  const languageLabel = language === "id" ? c.settings.indonesia : c.settings.english;
  const needle = query.trim().toLowerCase();
  const showBusiness = !needle || [c.home.businessProfile, c.home.subtitle].some((value) => value.toLowerCase().includes(needle));
  const showAccount = !needle || [c.settings.accountSection, c.settings.accountInfo, user.email ?? ""].some((value) => value.toLowerCase().includes(needle));
  const showLanguage = !needle || [c.settings.language, c.settings.languageDescription, languageLabel].some((value) => value.toLowerCase().includes(needle));
  const showAppearance = !needle || [c.settings.appearance, c.settings.appearanceDescription, themeLabel].some((value) => value.toLowerCase().includes(needle));
  const showSignOut = !needle || [c.settings.signOut, c.settings.signOutDescription].some((value) => value.toLowerCase().includes(needle));
  const anyResult = showBusiness || showAccount || showLanguage || showAppearance || showSignOut;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 12, paddingBottom: 30 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View className="min-h-11 flex-row items-center justify-between">
        <View className="w-11" />
        <Text className="flex-1 text-center text-[13px] font-black" style={{ color: theme.colors.text }}>{c.settings.title}</Text>
        <View className="w-11 items-end">
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-[11px] font-black" style={{ color: theme.colors.primary }}>{(user.email?.[0] ?? "M").toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 min-h-[48px] flex-row items-center rounded-[18px] px-4" style={{ backgroundColor: theme.colors.surface }}>
        <NitipIcon color={theme.colors.textMuted} name="settings" size={16} />
        <TextInput
          className="ml-3 flex-1 text-[11px]"
          onChangeText={setQuery}
          placeholder={c.settings.searchPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          style={{ color: theme.colors.text }}
          value={query}
        />
      </View>

      {showBusiness || showAccount ? (
        <View className="mt-7">
          <Text className="text-[15px] font-black" style={{ color: theme.colors.text }}>{c.settings.accountSection}</Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.settings.accountDescription}</Text>
          <View className="mt-3 overflow-hidden rounded-[22px]" style={{ backgroundColor: theme.colors.surface }}>
            {showBusiness ? (
              <SettingsRow
                icon="store"
                title={c.home.businessProfile}
                description={c.home.subtitle}
                onPress={() => router.push("/settings/business")}
                last={!showAccount}
              />
            ) : null}
            {showAccount ? (
              <SettingsRow
                icon="profile"
                title={c.settings.accountInfo}
                description={c.settings.accountInfoDescription}
                value={user.email ?? "—"}
                onPress={() => undefined}
                showChevron={false}
                last
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {showLanguage || showAppearance ? (
        <View className="mt-7">
          <Text className="text-[15px] font-black" style={{ color: theme.colors.text }}>{c.settings.preferences}</Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.settings.preferencesDescription}</Text>
          <View className="mt-3 overflow-hidden rounded-[22px]" style={{ backgroundColor: theme.colors.surface }}>
            {showLanguage ? (
              <SettingsRow
                icon="language"
                title={c.settings.language}
                description={c.settings.languageDescription}
                value={languageLabel}
                onPress={() => router.push("/settings/language")}
                last={!showAppearance}
              />
            ) : null}
            {showAppearance ? (
              <SettingsRow
                icon="theme"
                title={c.settings.appearance}
                description={c.settings.appearanceDescription}
                value={themeLabel}
                onPress={() => router.push("/settings/appearance")}
                last
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {showSignOut ? (
        <View className="mt-7">
          <Text className="text-[15px] font-black" style={{ color: theme.colors.text }}>{c.settings.accountSection}</Text>
          <View className="mt-3 overflow-hidden rounded-[22px]" style={{ backgroundColor: theme.colors.surface }}>
            <SettingsRow icon="logout" title={c.settings.signOut} description={c.settings.signOutDescription} danger onPress={() => void signOut()} last />
          </View>
        </View>
      ) : null}

      {!anyResult ? (
        <View className="mt-8 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <NitipIcon color={theme.colors.textMuted} name="settings" size={22} />
          <Text className="mt-3 text-[11px] font-black" style={{ color: theme.colors.text }}>{c.settings.noResult}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
